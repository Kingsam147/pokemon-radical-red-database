require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require("mongoose");
const { loadModels } = require('./Config/jsonOptions');

const PORT = process.env.PORT || 3500;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemonDB';
const MONGODB_DB = process.env.MONGODB_DB || 'pokemonDB';

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Hold incoming requests until DB + models are ready (serverless compatible)
let ready = false;
const pendingReqs = [];

app.use((_req, _res, next) => {
    if (ready) return next();
    pendingReqs.push(next);
});

const init = mongoose.connect(MONGODB_URI, { 
    dbName: MONGODB_DB,
    useNewUrlParser: true,
    useUnifiedTopology: true 
})
.then(async () => {
    await loadModels();

    // Routes must be registered after loadModels() — services use getModels() at load time
    app.use('/activePokemon', require('./Routes/activePokemonRoutes'));
    app.use('/myBoxes', require('./Routes/myBoxRoutes'));
    app.use('/teams', require('./Routes/teamRoutes'));
    app.use('/misc', require('./Routes/miscRoutes'));
    app.use('/', require('./Routes/pokemonRoutes'));

    ready = true;
    pendingReqs.splice(0).forEach(next => next());
});

if (require.main === module) {
    init.then(() => {
        console.log("Connected to MongoDB Atlas");
        app.listen(PORT, () => console.log(`\nServer running on http://localhost:${PORT}`));
    }).catch(console.error);
}

module.exports = app;