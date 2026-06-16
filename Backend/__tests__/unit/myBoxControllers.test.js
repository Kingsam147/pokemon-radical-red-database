jest.mock('../../Config/jsonOptions', () => ({
  loadMyBoxes: jest.fn(),
  saveMyBoxes: jest.fn(),
  findMyBox: jest.fn(),
  loadBox: jest.fn(),
  invalidateBoxCache: jest.fn(),
  invalidateAllBoxCache: jest.fn(),
}));

jest.mock('../../Services/pokemonService', () => ({
  createPokemon: jest.fn(),
  hasDuplicate: jest.fn(),
}));

jest.mock('../../Services/formService', () => ({
  checkMega: jest.fn(),
  addMega: jest.fn(),
}));

jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const { loadMyBoxes, saveMyBoxes, loadBox, invalidateBoxCache, invalidateAllBoxCache } = require('../../Config/jsonOptions');
const { createPokemon, hasDuplicate } = require('../../Services/pokemonService');
const { checkMega } = require('../../Services/formService');
const {
  getAllMyBoxes, getBoxCount, findBox, addBox, removeBox,
  addToBox, deleteInBox, clearMyBox, clearMyBoxes,
} = require('../../Controllers/myBoxControllers');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const userId = 'user-abc';
const fakePokemon = { name: 'Charizard', types: ['Fire', 'Flying'] };
const fakeBox = { Charizard: fakePokemon };

describe('myBoxControllers', () => {
  let res;

  beforeEach(() => {
    res = buildRes();
    jest.clearAllMocks();
    invalidateBoxCache.mockResolvedValue();
    invalidateAllBoxCache.mockResolvedValue();
  });

  describe('getAllMyBoxes', () => {
    test('returns all boxes with 200', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      const req = { userId };
      await getAllMyBoxes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ allBoxes: [fakeBox] }));
    });
  });

  describe('getBoxCount', () => {
    test('returns count when boxes already exist', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox, {}]);
      const req = { userId };
      await getBoxCount(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ count: 2 });
      expect(saveMyBoxes).not.toHaveBeenCalled();
    });

    test('auto-creates one empty box when user has none and returns count 1', async () => {
      loadMyBoxes.mockResolvedValue([]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId };
      await getBoxCount(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [{}]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ count: 1 });
    });
  });

  describe('findBox', () => {
    test('returns 400 for non-integer index', async () => {
      const req = { userId, params: { index: 'abc' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(loadBox).not.toHaveBeenCalled();
    });

    test('returns 400 for negative index', async () => {
      const req = { userId, params: { index: '-1' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when box index does not exist', async () => {
      loadBox.mockResolvedValue(undefined);
      const req = { userId, params: { index: '5' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns box at valid index with 200', async () => {
      loadBox.mockResolvedValue(fakeBox);
      const req = { userId, params: { index: '0' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ box: fakeBox }));
    });
  });

  describe('addBox', () => {
    test('adds a new empty box and returns count', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId };
      await addBox(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [fakeBox, {}]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });
  });

  describe('removeBox', () => {
    test('returns 400 for non-integer index', async () => {
      const req = { userId, params: { index: 'x' } };
      await removeBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('removes box at index, invalidates all cache, and returns count + newActiveIndex', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox, {}]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0' } };
      await removeBox(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [{}]);
      expect(invalidateAllBoxCache).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1, newActiveIndex: 0 }));
    });

    test('auto-creates empty box when last box is deleted', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0' } };
      await removeBox(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [{}]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1, newActiveIndex: 0 }));
    });
  });

  describe('addToBox (Pokemon import)', () => {
    test('returns 400 for invalid index', async () => {
      const req = { userId, params: { index: 'bad' }, body: { pokemonData: 'Pikachu' } };
      await addToBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when target box does not exist', async () => {
      loadMyBoxes.mockResolvedValue([]);
      const req = { userId, params: { index: '0' }, body: { pokemonData: 'Pikachu' } };
      await addToBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('imports Pokemon with no duplicates, invalidates cache, returns 201', async () => {
      const pikachu = { name: 'Pikachu' };
      loadMyBoxes.mockResolvedValue([{}]);
      saveMyBoxes.mockResolvedValue();
      checkMega.mockReturnValue(false);
      createPokemon.mockReturnValue(pikachu);
      hasDuplicate.mockReturnValue(false);

      const req = { userId, params: { index: '0' }, body: { pokemonData: 'Pikachu\n' } };
      await addToBox(req, res);

      expect(invalidateBoxCache).toHaveBeenCalledWith(userId, 0);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ addedPokemon: [pikachu] }));
    });

    test('returns 409 partial success when duplicate names exist', async () => {
      const existing = { name: 'Charizard' };
      const incoming = { name: 'Charizard' };
      loadMyBoxes.mockResolvedValue([{ Charizard: existing }]);
      saveMyBoxes.mockResolvedValue();
      checkMega.mockReturnValue(false);
      createPokemon.mockReturnValue(incoming);
      hasDuplicate.mockReturnValue(true);

      const req = { userId, params: { index: '0' }, body: { pokemonData: 'Charizard\n' } };
      await addToBox(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Charizard'),
      }));
    });
  });

  describe('deleteInBox', () => {
    test('returns 400 for invalid index', async () => {
      const req = { userId, params: { index: 'nope', pokemonName: 'Pikachu' } };
      await deleteInBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when Pokemon name not found in box', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      const req = { userId, params: { index: '0', pokemonName: 'Pikachu' } };
      await deleteInBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deletes Pokemon, invalidates cache, returns 200', async () => {
      loadMyBoxes.mockResolvedValue([{ Charizard: fakePokemon }]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0', pokemonName: 'Charizard' } };
      await deleteInBox(req, res);
      expect(invalidateBoxCache).toHaveBeenCalledWith(userId, 0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deletedPokemon: fakePokemon }));
    });
  });

  describe('clearMyBox', () => {
    test('returns 400 for invalid index', async () => {
      const req = { userId, params: { index: '1.5' } };
      await clearMyBox(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when box index does not exist', async () => {
      loadMyBoxes.mockResolvedValue([]);
      const req = { userId, params: { index: '0' } };
      await clearMyBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('clears box, invalidates cache, returns 200', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0' } };
      await clearMyBox(req, res);
      expect(invalidateBoxCache).toHaveBeenCalledWith(userId, 0);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('clearMyBoxes', () => {
    test('clears all boxes and returns 200', async () => {
      saveMyBoxes.mockResolvedValue();
      loadMyBoxes.mockResolvedValue([]);
      const req = { userId };
      await clearMyBoxes(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, []);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
