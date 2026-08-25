const fs = require('fs');
const path = require('path');
const { fetchModels } = require('../infrastructure/mongodbOptions');

let models = {};

const loadModels = async () => {
  models = await fetchModels();
};

const getModels = () => models;

const avaliableTMS = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'Models', 'avaliableTutors+TMS', 'avaliableTMS.json'),
    'utf8',
  ),
);
const megaStones = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'Models', 'megaStones.json'), 'utf8'),
);

module.exports = { loadModels, getModels, avaliableTMS, megaStones };
