const { GUEST_STARTER_PIKACHU } = require('./guestStarterService');

// PUBLIC — no auth required: static guest onboarding data, identical for every
// guest, mirrors /public/enemy-preview.
const getGuestStarterPikachu = async (_req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.set('CDN-Cache-Control', 'max-age=3600');
    return res.status(200).json({ pokemon: GUEST_STARTER_PIKACHU });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getGuestStarterPikachu };
