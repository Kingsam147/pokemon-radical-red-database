jest.mock('../../../boxes/BoxRepository');
jest.mock('../../../pokemon/createFromImportText');
jest.mock('../../../pokemon/HydrationService');
jest.mock('../../../forms/checkMega');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const BoxRepository = require('../../../boxes/BoxRepository');
const BoxEntity = require('../../../boxes/BoxEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');
const createFromImportText = require('../../../pokemon/createFromImportText');
const HydrationService = require('../../../pokemon/HydrationService');
const { checkMega } = require('../../../forms/checkMega');
const {
  getAllMyBoxes, findBox, addBox, addToBox, findInBox, deleteInBox, updateInBox, clearMyBox,
} = require('../../../boxes/boxControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// BoxEntity is not mocked in this suite (its real add/update/hasPokemon behavior is
// exactly what we want to exercise), so it still enforces its `instanceof PokemonEntity`
// invariant. A plain-object stub would fail that check, so build a minimal-but-real
// PokemonEntity instead.
const fakeEntity = (name) => PokemonEntity.create({
  name,
  form: name,
  gender: 'N',
  level: 50,
  nature: 'Hardy',
  item: '',
  ability_id: 'Some Ability',
  move_ids: [],
  EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  player: 1,
});

beforeEach(() => {
  jest.clearAllMocks();
  HydrationService.hydrate.mockImplementation((entity) => ({ hydrated: entity.name }));
  checkMega.mockReturnValue(false);
});

describe('boxControllers.getAllMyBoxes', () => {
  test('returns all boxes hydrated', async () => {
    const box = new BoxEntity([]);
    box.addPokemon(fakeEntity('Ditto'));
    BoxRepository.loadAll.mockResolvedValue([box]);

    const req = { userId: 'user-1' };
    const res = mockRes();
    await getAllMyBoxes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allBoxes: [{ Ditto: { hydrated: 'Ditto' } }] }),
    );
  });
});

describe('boxControllers.findBox', () => {
  test('returns 400 for a non-numeric index', async () => {
    const res = mockRes();
    await findBox({ userId: 'user-1', params: { index: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when the box is not found', async () => {
    BoxRepository.loadOne.mockResolvedValue(undefined);
    const res = mockRes();
    await findBox({ userId: 'user-1', params: { index: '0' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('boxControllers.updateInBox (regression test for the pre-existing findMyBox 500 bug)', () => {
  test('successfully updates a Pokemon in the box instead of throwing findMyBox is not a function', async () => {
    const box = new BoxEntity([]);
    box.addPokemon(fakeEntity('Ditto'));
    BoxRepository.loadAll.mockResolvedValue([box]);
    createFromImportText.mockReturnValue(fakeEntity('Ditto'));

    const req = {
      userId: 'user-1',
      params: { index: '0', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updateInBox(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(BoxRepository.saveAll).toHaveBeenCalled();
  });

  test('returns 404 when the target Pokemon does not exist in the box', async () => {
    BoxRepository.loadAll.mockResolvedValue([new BoxEntity([])]);
    const req = {
      userId: 'user-1',
      params: { index: '0', pokemonName: 'Mew' },
      body: { pokemonData: 'Mew\nLevel: 50' },
    };
    const res = mockRes();
    await updateInBox(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('boxControllers.addToBox (regression test for the same-batch duplicate crash bug)', () => {
  test('adds a single new Pokemon to an empty box and returns 201', async () => {
    const box = new BoxEntity([]);
    BoxRepository.loadAll.mockResolvedValue([box]);
    createFromImportText.mockReturnValue(fakeEntity('Ditto'));

    const req = {
      userId: 'user-1',
      params: { index: '0' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addToBox(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(BoxRepository.saveAll).toHaveBeenCalled();
    expect(box.hasPokemon('Ditto')).toBe(true);
  });

  test('returns 409 and reports the duplicate when the imported Pokemon already exists in the box', async () => {
    const box = new BoxEntity([]);
    box.addPokemon(fakeEntity('Ditto'));
    BoxRepository.loadAll.mockResolvedValue([box]);
    createFromImportText.mockReturnValue(fakeEntity('Ditto'));

    const req = {
      userId: 'user-1',
      params: { index: '0' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addToBox(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toContain('Ditto');
    expect(responseBody.partialSuccess).not.toContain('Ditto');
  });

  test('does not throw/500 when the same species is pasted twice in one batch against an empty box, and reports the second as a duplicate', async () => {
    const box = new BoxEntity([]);
    BoxRepository.loadAll.mockResolvedValue([box]);
    createFromImportText.mockImplementation((pokemonText) => fakeEntity(pokemonText.split('\n')[0].trim()));

    const req = {
      userId: 'user-1',
      params: { index: '0' },
      body: { pokemonData: 'Ditto\nLevel: 50\n\nDitto\nLevel: 50' },
    };
    const res = mockRes();
    await addToBox(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toContain('Ditto');
    expect(responseBody.partialSuccess).toContain('Ditto');
    expect(box.hasPokemon('Ditto')).toBe(true);
    expect(box.size).toBe(1);
    expect(BoxRepository.saveAll).toHaveBeenCalled();
  });
});
