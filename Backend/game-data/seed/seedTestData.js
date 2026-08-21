const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const COLLECTIONS = ['abilities', 'moves', 'items', 'natures', 'statuses', 'typeChart', 'species2'];

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
