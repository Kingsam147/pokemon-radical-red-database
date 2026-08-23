jest.mock('../../../battling/CalculationService', () => ({
  calculate: jest.fn(),
}));

jest.mock('../../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const CalculationService = require('../../../battling/CalculationService');
const { calculateDamage, calculateDamageBatch } = require('../../../battling/damageController');

const buildRequest = (body = {}) => ({ body });
const buildResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const samplePayload = {
  attacker: {
    name: 'Charizard', level: 50, ability: 'Blaze', nature: 'Timid', evs: {}, ivs: {}, boosts: {},
    status: 'Healthy', gender: 'M', currentHP: 155, maxHP: 155,
    rawStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    types: ['Fire', 'Flying'],
  },
  defender: {
    name: 'Blastoise', level: 50, ability: 'Torrent', nature: 'Bold', evs: {}, ivs: {}, boosts: {},
    status: 'Healthy', gender: 'M', currentHP: 162, maxHP: 162,
    rawStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
    types: ['Water'],
  },
  move: {
    name: 'Flamethrower', isCrit: false, isZ: false,
    basePower: 90, type: 'Fire', category: 'Special', flags: {},
  },
  field: {},
  abilityToggles: {},
};

describe('calculateDamage controller', () => {
  let req, res;

  beforeEach(() => {
    req = buildRequest(samplePayload);
    res = buildResponse();
    jest.clearAllMocks();
  });

  test('returns 200 with calculation result on success', async () => {
    const fakeResult = {
      damage: Array(16).fill(80),
      range: ['49%', '57%'],
      description: 'Charizard Flamethrower vs Blastoise',
      rrModifiersApplied: true,
    };
    CalculationService.calculate.mockReturnValue(fakeResult);

    calculateDamage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Successfully calculated damage with Radical Red mechanics',
      calculation: fakeResult,
    });
  });

  test('returns 404 when move is not found in database', () => {
    const error = new Error('Move "Fake Move" not found in database');
    error.status = 404;
    CalculationService.calculate.mockImplementation(() => { throw error; });

    calculateDamage(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });

  test('returns 500 on unexpected calculation error', () => {
    CalculationService.calculate.mockImplementation(() => {
      throw new Error('Smogon internal failure');
    });

    calculateDamage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Failed to calculate damage',
    }));
  });

  test('passes all payload fields to CalculationService', () => {
    CalculationService.calculate.mockReturnValue({ damage: [], range: ['0%', '0%'], description: '', rrModifiersApplied: true });

    calculateDamage(req, res);

    expect(CalculationService.calculate).toHaveBeenCalledWith({
      attacker: samplePayload.attacker,
      defender: samplePayload.defender,
      move: samplePayload.move,
      field: samplePayload.field,
      abilityToggles: samplePayload.abilityToggles,
    });
  });
});

describe('calculateDamageBatch controller', () => {
  let res;

  beforeEach(() => {
    res = buildResponse();
    jest.clearAllMocks();
  });

  test('returns 200 with a keyed result for every calculation on success', () => {
    const fakeResult = {
      damage: Array(16).fill(80),
      range: ['49%', '57%'],
      description: 'Charizard Flamethrower vs Blastoise',
      rrModifiersApplied: true,
    };
    CalculationService.calculate.mockReturnValue(fakeResult);

    const req = buildRequest({
      calculations: [
        { key: 'p1-0-move0', ...samplePayload },
        { key: 'p1-0-move1', ...samplePayload },
      ],
    });

    calculateDamageBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Successfully calculated damage batch with Radical Red mechanics',
      results: [
        { key: 'p1-0-move0', calculation: fakeResult },
        { key: 'p1-0-move1', calculation: fakeResult },
      ],
    });
  });

  test('returns partial success when one calculation fails and others succeed', () => {
    const fakeResult = { damage: [1], range: ['1%', '1%'], description: '', rrModifiersApplied: true };
    CalculationService.calculate
      .mockImplementationOnce(() => fakeResult)
      .mockImplementationOnce(() => { throw new Error('Move "Fake Move" not found in database'); })
      .mockImplementationOnce(() => fakeResult);

    const req = buildRequest({
      calculations: [
        { key: 'p1-0-move0', ...samplePayload },
        { key: 'p1-0-move1', ...samplePayload },
        { key: 'p1-0-move2', ...samplePayload },
      ],
    });

    calculateDamageBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Successfully calculated damage batch with Radical Red mechanics',
      results: [
        { key: 'p1-0-move0', calculation: fakeResult },
        { key: 'p1-0-move1', error: 'Move "Fake Move" not found in database' },
        { key: 'p1-0-move2', calculation: fakeResult },
      ],
    });
  });

  test('returns 200 with an empty results array for an empty batch', () => {
    const req = buildRequest({ calculations: [] });

    calculateDamageBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ results: [] }));
    expect(CalculationService.calculate).not.toHaveBeenCalled();
  });

  test('returns 400 when calculations is not an array', () => {
    const req = buildRequest({ calculations: 'not-an-array' });

    calculateDamageBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'calculations must be an array' });
  });
});
