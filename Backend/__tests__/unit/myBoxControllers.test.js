jest.mock('../../Config/jsonOptions', () => ({
  loadMyBoxes: jest.fn(),
  saveMyBoxes: jest.fn(),
  findMyBox: jest.fn(),
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

const { loadMyBoxes, saveMyBoxes } = require('../../Config/jsonOptions');
const { createPokemon, hasDuplicate } = require('../../Services/pokemonService');
const { checkMega } = require('../../Services/formService');
const {
  getAllMyBoxes, findBox, addBox, removeBox,
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

  describe('findBox', () => {
    test('returns 404 when box index does not exist', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      const req = { userId, params: { index: '5' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns box at valid index with 200', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      const req = { userId, params: { index: '0' } };
      await findBox(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ box: fakeBox }));
    });
  });

  describe('addBox', () => {
    test('adds a new empty box and returns 200', async () => {
      loadMyBoxes
        .mockResolvedValueOnce([fakeBox])
        .mockResolvedValueOnce([fakeBox, {}]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId };
      await addBox(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [fakeBox, {}]);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeBox', () => {
    test('removes box at index and returns 200', async () => {
      loadMyBoxes
        .mockResolvedValueOnce([fakeBox, {}])
        .mockResolvedValueOnce([{}]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0' } };
      await removeBox(req, res);
      expect(saveMyBoxes).toHaveBeenCalledWith(userId, [{}]);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addToBox (Pokemon import)', () => {
    test('returns 404 when target box does not exist', async () => {
      loadMyBoxes.mockResolvedValue([]);
      const req = { userId, params: { index: '0' }, body: { pokemonData: 'Pikachu' } };
      await addToBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('imports Pokemon with no duplicates and returns 201', async () => {
      const pikachu = { name: 'Pikachu' };
      loadMyBoxes
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ Pikachu: pikachu }]);
      saveMyBoxes.mockResolvedValue();
      checkMega.mockReturnValue(false);
      createPokemon.mockReturnValue(pikachu);
      hasDuplicate.mockReturnValue(false);

      const req = { userId, params: { index: '0' }, body: { pokemonData: 'Pikachu\n' } };
      await addToBox(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        addedPokemon: [pikachu],
      }));
    });

    test('returns 409 partial success when duplicate names exist', async () => {
      const existing = { name: 'Charizard' };
      const incoming = { name: 'Charizard' };
      loadMyBoxes
        .mockResolvedValueOnce([{ Charizard: existing }])
        .mockResolvedValueOnce([{ Charizard: existing }]);
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
    test('returns 404 when Pokemon name not found in box', async () => {
      loadMyBoxes.mockResolvedValue([fakeBox]);
      const req = { userId, params: { index: '0', pokemonName: 'Pikachu' } };
      await deleteInBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deletes Pokemon and returns 200', async () => {
      loadMyBoxes
        .mockResolvedValueOnce([{ Charizard: fakePokemon }])
        .mockResolvedValueOnce([{}]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0', pokemonName: 'Charizard' } };
      await deleteInBox(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        deletedPokemon: fakePokemon,
      }));
    });
  });

  describe('clearMyBox', () => {
    test('returns 404 when box index does not exist', async () => {
      loadMyBoxes.mockResolvedValue([]);
      const req = { userId, params: { index: '0' } };
      await clearMyBox(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('clears box and returns 200', async () => {
      loadMyBoxes
        .mockResolvedValueOnce([fakeBox])
        .mockResolvedValueOnce([{}]);
      saveMyBoxes.mockResolvedValue();
      const req = { userId, params: { index: '0' } };
      await clearMyBox(req, res);
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
