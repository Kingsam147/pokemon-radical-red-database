const fs = require('fs');
const path = require('path');

// import the species object (keyed by name)
const species = require('./species');

// convert keys → { name, ...data }
const converted = Object.entries(species).map(([name, data]) => ({
  name,
  ...data
}));

// write to JSON
fs.writeFileSync(
  path.join(__dirname, 'species.withNames.json'),
  JSON.stringify(converted, null, 2)
);

console.log('Species converted successfully.');
