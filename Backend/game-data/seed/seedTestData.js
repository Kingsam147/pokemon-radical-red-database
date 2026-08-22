const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const COLLECTIONS = ['abilities', 'moves', 'items', 'natures', 'statuses', 'typeChart', 'species2'];

// mongodbOptions.js's fetchModels() also requires these three collections to
// have at least one document (findOne({}) must not return null), but nothing
// downstream ever reads the value it returns for them (getModels().myBoxes /
// .myTeams / .enemyTeams are dead reads) — it's a boot-time liveness check
// only. myBoxes/myTeamSets hold real per-user data in production, so a
// synthetic placeholder is seeded here instead of exporting real user documents.
const PLACEHOLDER_COLLECTIONS = ['enemyTeamSets', 'myBoxes', 'myTeamSets'];

const seedTestData = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemonDB';
    const dbName = process.env.MONGODB_DB || 'Radical-Red-Database';

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    for (const name of COLLECTIONS) {
        const filePath = path.join(__dirname, `${name}.json`);
        const { _id, ...doc } = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await db.collection(name).deleteMany({});
        await db.collection(name).insertOne(doc);
        console.log(`[SEED] ${name} seeded`);
    }

    for (const name of PLACEHOLDER_COLLECTIONS) {
        await db.collection(name).deleteMany({});
        // Deliberately no fields beyond _id: TeamRepository.loadAllTeams treats
        // every top-level key of an enemyTeamSets document as a team name, so a
        // placeholder field here (e.g. `seedPlaceholder: true`) leaks into the
        // UI as a literal selectable "team." An empty document still satisfies
        // fetchModels()'s findOne({}) !== null liveness check.
        await db.collection(name).insertOne({});
        console.log(`[SEED] ${name} seeded (placeholder)`);
    }

    await client.close();
};

seedTestData()
    .then(() => {
        console.log('[SEED] Reference data seeding complete');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[SEED_ERROR]', err.message);
        process.exit(1);
    });
