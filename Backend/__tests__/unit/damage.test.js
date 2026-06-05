jest.mock('../../infrastructure/calculation/CalculationService', () => ({
  calculate: jest.fn(),
}));

jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const CalculationService = require('../../infrastructure/calculation/CalculationService');
const { calculateDamage } = require('../../Controllers/damageController');

const buildRequest = (body = {}) => ({ body });
const buildResponse = () => {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const samplePayload = {
  attacker: { name: 'Charizard', level: 50, ability: 'Blaze', nature: 'Timid', evs: {}, ivs: {}, boosts: {}, status: 'Healthy', gender: 'M', currentHP: 155, maxHP: 155 },
  defender: { name: 'Blastoise', level: 50, ability: 'Torrent', nature: 'Bold', evs: {}, ivs: {}, boosts: {}, status: 'Healthy', gender: 'M', currentHP: 162, maxHP: 162 },
  move: { name: 'Flamethrower', isCrit: false, isZ: false },
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
