const { getHydratedEnemyPreview } = require('./enemyPreviewService');

// PUBLIC — no auth required: enemy trainer data is global (not user-specific),
// so it's safe to serve unauthenticated and cache at the Cloudflare edge.
const getEnemyPreview = async (_req, res) => {
  try {
    const preview = await getHydratedEnemyPreview();
    if (!preview)
      return res
        .status(404)
        .json({ message: 'No enemy trainer data available' });

    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.set('CDN-Cache-Control', 'max-age=3600');
    return res.status(200).json(preview);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getEnemyPreview };
