const CalculationService = require('../infrastructure/calculation/CalculationService');

const calculateDamage = (req, res) => {
  try {
    const { attacker, defender, move, field, abilityToggles } = req.body;
    const result = CalculationService.calculate({ attacker, defender, move, field, abilityToggles });
    return res.status(200).json({
      message: 'Successfully calculated damage with Radical Red mechanics',
      calculation: result,
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Failed to calculate damage', error: error.message });
  }
};

module.exports = { calculateDamage };
