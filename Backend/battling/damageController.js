const CalculationService = require('./CalculationService');

const calculateDamage = (req, res) => {
  try {
    const { attacker, defender, move, field, abilityToggles } = req.body;
    const result = CalculationService.calculate({ attacker, defender, move, field, abilityToggles });
    return res.status(200).json({
      message: 'Successfully calculated damage with Radical Red mechanics',
      calculation: result,
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    if (error.status === 404) return res.status(404).json({ message: error.message });
    return res.status(500).json({ message: 'Failed to calculate damage', error: error.message });
  }
};

const calculateDamageBatch = (req, res) => {
  const { calculations } = req.body;
  if (!Array.isArray(calculations)) {
    return res.status(400).json({ message: 'calculations must be an array' });
  }

  const results = calculations.map(({ key, attacker, defender, move, field, abilityToggles }) => {
    try {
      const calculation = CalculationService.calculate({ attacker, defender, move, field, abilityToggles });
      return { key, calculation };
    } catch (error) {
      return { key, error: error.message };
    }
  });

  return res.status(200).json({
    message: 'Successfully calculated damage batch with Radical Red mechanics',
    results,
  });
};

module.exports = { calculateDamage, calculateDamageBatch };
