const BoxRepository = require('./BoxRepository');
const BoxEntity = require('./BoxEntity');
const createFromImportText = require('../pokemon/createFromImportText');
const { checkMega, addMega } = require('../forms/checkMega');
const HydrationService = require('../pokemon/HydrationService');
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');

const parseBoxIndex = (param) => {
  const index = Number(param);
  return Number.isInteger(index) && index >= 0 ? index : null;
};

const hydrateBox = (box) => {
  const result = {};
  box.listPokemon().forEach((entity) => {
    result[entity.name] = HydrationService.hydrate(entity, { includeAllMoves: false });
  });
  return result;
};

const getAllMyBoxes = async (req, res) => {
  const { userId } = req;
  const boxes = await BoxRepository.loadAll(userId);
  res.status(200).json({ message: 'Successfully found my boxes', allBoxes: boxes.map(hydrateBox) });
};

const getBoxCount = async (req, res) => {
  const { userId } = req;
  const cached = await BoxRepository.getCachedCount(userId);
  if (cached !== null) return res.status(200).json({ count: cached });

  const boxes = await BoxRepository.loadAll(userId);
  if (boxes.length === 0) {
    boxes.push(new BoxEntity([]));
    await BoxRepository.saveAll(userId, boxes);
    logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_init' });
  }

  await BoxRepository.setCachedCount(userId, boxes.length);
  BoxRepository.preWarmCache(userId, boxes).catch(() => {});

  return res.status(200).json({ count: boxes.length });
};

const findBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const box = await BoxRepository.loadOne(userId, index);
  if (!box) return res.status(404).json({ message: `Box ${index} not found` });
  return res.status(200).json({ message: 'Successfully found my box', box: hydrateBox(box) });
};

const addBox = async (req, res) => {
  const { userId } = req;
  const boxes = await BoxRepository.loadAll(userId);
  boxes.push(new BoxEntity([]));
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateCachedCount(userId);
  logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: boxes.length - 1 });
  return res.status(200).json({ message: 'a box was successfully added', count: boxes.length });
};

const removeBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

  const boxes = await BoxRepository.loadAll(userId);
  boxes.splice(index, 1);
  if (boxes.length === 0) {
    boxes.push(new BoxEntity([]));
    logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_restore' });
  }
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateAll(userId);
  await BoxRepository.invalidateCachedCount(userId);

  const newActiveIndex = Math.min(index, boxes.length - 1);
  logger.info(USER_ACTION_EVENTS.BOX_REMOVED, { userId, removedIndex: index });
  return res.status(200).json({ message: 'removed the box', count: boxes.length, newActiveIndex });
};

const addToBox = async (req, res) => {
  try {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

    const { pokemonData } = req.body;
    const boxes = await BoxRepository.loadAll(userId);
    if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const box = boxes[index];

    const newPokemons = pokemonData
      .trim()
      .split(/\n\s*\n/)
      .map((pokemonText) =>
        checkMega(pokemonText) ? addMega(pokemonText, 1) : createFromImportText(pokemonText, 1),
      );

    const claimedNames = new Set();
    const duplicates = [];
    const validPokemon = [];
    newPokemons.forEach((entity) => {
      if (box.hasPokemon(entity.name) || claimedNames.has(entity.name)) {
        duplicates.push(entity);
      } else {
        claimedNames.add(entity.name);
        validPokemon.push(entity);
      }
    });
    validPokemon.forEach((entity) => box.addPokemon(entity));

    boxes[index] = box;
    await BoxRepository.saveAll(userId, boxes);
    await BoxRepository.invalidateOne(userId, index);

    if (duplicates.length > 0) {
      logger.warn(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
        userId,
        boxIndex: index,
        imported: validPokemon.map((p) => p.name),
        skippedDuplicates: duplicates.map((p) => p.name),
        partialSuccess: true,
      });
      return res.status(409).json({
        partialSuccess: `still added ${validPokemon.map((p) => p.name).join(', ')} to my box`,
        error: `${duplicates.map((p) => p.name).join(', ')} already exists in my box`,
        addedPokemon: validPokemon.map((entity) => HydrationService.hydrate(entity, { includeAllMoves: false })),
        updatedBox: hydrateBox(box),
      });
    }

    logger.info(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
      userId,
      boxIndex: index,
      imported: newPokemons.map((p) => p.name),
      count: newPokemons.length,
    });
    return res.status(201).json({
      message: `Successfully added ${newPokemons.map((p) => p.name)} to my box`,
      addedPokemon: validPokemon.map((entity) => HydrationService.hydrate(entity, { includeAllMoves: false })),
      updatedBox: hydrateBox(box),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || 'Failed to add pokemon, double check the imported text',
    });
  }
};

const findInBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const pokemonName = req.params.pokemonName;
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  const entity = boxes[index].getPokemon(pokemonName);
  if (!entity) return res.status(404).json({ message: `${pokemonName} not found in my box` });
  return res.status(200).json({ message: `Successfully found ${pokemonName}`, pokemon: HydrationService.hydrate(entity, { includeAllMoves: false }) });
};

const deleteInBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const pokemonName = req.params.pokemonName;
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  const box = boxes[index];

  if (!box.hasPokemon(pokemonName)) return res.status(404).json({ message: `${pokemonName} not found in my box` });

  const removed = box.removePokemon(pokemonName);
  boxes[index] = box;
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateOne(userId, index);

  logger.info(USER_ACTION_EVENTS.POKEMON_DELETED, { userId, boxIndex: index, pokemonName });
  return res.status(200).json({
    message: `${pokemonName} successfully deleted from my box`,
    deletedPokemon: HydrationService.hydrate(removed, { includeAllMoves: false }),
    updatedBox: hydrateBox(box),
  });
};

const updateInBox = async (req, res) => {
  try {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

    const pokemonName = req.params.pokemonName;
    const { pokemonData } = req.body;
    const boxes = await BoxRepository.loadAll(userId);
    if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const box = boxes[index];

    if (!box.hasPokemon(pokemonName))
      return res.status(404).json({ message: `${pokemonName} doesn't exists in my box` });

    const updatedEntity = createFromImportText(pokemonData, 1);
    box.updatePokemon(pokemonName, updatedEntity);
    boxes[index] = box;
    await BoxRepository.saveAll(userId, boxes);
    await BoxRepository.invalidateOne(userId, index);

    logger.info(USER_ACTION_EVENTS.POKEMON_UPDATED, { userId, boxIndex: index, pokemonName: updatedEntity.name });
    return res.status(200).json({
      message: `${updatedEntity.name} was successfully updated in my box`,
      theUpdatedPokemon: HydrationService.hydrate(updatedEntity, { includeAllMoves: false }),
      allBoxes: (await BoxRepository.loadAll(userId)).map(hydrateBox),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || `failed to update pokemon in box` });
  }
};

const clearMyBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  boxes[index].clear();
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateOne(userId, index);

  logger.info(USER_ACTION_EVENTS.BOX_CLEARED, { userId, boxIndex: index });
  return res.status(200).json({ message: `my box was successfully cleared`, updatedBox: hydrateBox(boxes[index]) });
};

const clearMyBoxes = async (req, res) => {
  const { userId } = req;
  await BoxRepository.saveAll(userId, []);
  logger.info(USER_ACTION_EVENTS.BOX_CLEARED_ALL, { userId });
  return res.status(200).json({
    message: `All my boxes have been successfully cleared`,
    allBoxes: (await BoxRepository.loadAll(userId)).map(hydrateBox),
  });
};

module.exports = {
  getAllMyBoxes,
  getBoxCount,
  findBox,
  addBox,
  removeBox,
  addToBox,
  findInBox,
  deleteInBox,
  updateInBox,
  clearMyBox,
  clearMyBoxes,
};
