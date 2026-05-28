require('dotenv').config();
const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
}

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DB || 'Radical-Red-Database');

const fetchModels = async () => {
    await client.connect(); 

    const abilitiesDoc = await db.collection('abilities').findOne({});
    const enemyTeamSetsDoc = await db.collection('enemyTeamSets').findOne({});
    const itemsDoc = await db.collection('items').findOne({});
    const movesDoc = await db.collection('moves').findOne({});
    const myBoxesDoc = await db.collection('myBoxes').findOne({}); 
    const myTeamSetsDoc = await db.collection('myTeamSets').findOne({});
    const naturesDoc = await db.collection('natures').findOne({});
    const statusesDoc = await db.collection('statuses').findOne({});
    const typeChartDoc = await db.collection('typeChart').findOne({});
    const speciesDoc = await db.collection('species2').findOne({});

    const { _id: id1, ...abilities } = abilitiesDoc; 
    const { _id: id2, ...enemyTeams } = enemyTeamSetsDoc; 
    const { _id: id3, ...items } = itemsDoc; 
    const { _id: id4, ...movesList } = movesDoc; 
    const { _id: id5, ...myBoxes } = myBoxesDoc; 
    const { _id: id6, ...myTeams } = myTeamSetsDoc; 
    const { _id: id7, ...natures } = naturesDoc; 
    const { _id: id8, ...statuses } = statusesDoc; 
    const { _id: id10, ...typeChart } = typeChartDoc; 
    const { _id: id11, NONE, ...species2 } = speciesDoc; 

    return { abilities, species2, enemyTeams, items, movesList, myBoxes, myTeams, natures, statuses, typeChart };

}

module.exports = { fetchModels, db };