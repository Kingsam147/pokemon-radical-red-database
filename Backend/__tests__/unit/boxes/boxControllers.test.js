jest.mock('../../../boxes/BoxRepository');
jest.mock('../../../pokemon/createFromImportText');
jest.mock('../../../pokemon/HydrationService');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const BoxRepository = require('../../../boxes/BoxRepository');
const BoxEntity = require('../../../boxes/BoxEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');
const createFromImportText = require('../../../pokemon/createFromImportText');
const HydrationService = require('../../../pokemon/HydrationService');
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
