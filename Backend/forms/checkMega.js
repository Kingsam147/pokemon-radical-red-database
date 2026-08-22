const { getModels } = require('../game-data/loadModels');

const BANNED_IMPORT_FORMS = ['-Mega', 'Greninja-Ash'];

const checkMega = (importedPokemon) => {
  if (typeof importedPokemon === 'string') {
    const firstLine = importedPokemon.split('\n')[0];
    const name = firstLine.split('@')[0];
    return BANNED_IMPORT_FORMS.some((bannedForm) => name.includes(bannedForm));
  }
  if (typeof importedPokemon === 'object' && importedPokemon !== null) {
    return BANNED_IMPORT_FORMS.some((bannedForm) => importedPokemon.name.includes(bannedForm));
  }
  return false;
};

const addMega = (importText, player) => {
  // Bug fix: the original called `getModels` without invoking it, so `species2` was
  // always undefined here. Now correctly calls getModels().
  const { species2 } = getModels();
  const firstLine = importText.split('\n')[0];
  const [megaName, originalItem] = firstLine.split('@');
  const isAshGreninja = megaName === 'Greninja-Ash';

  const normalName = !isAshGreninja ? megaName.split('-Mega')[0] : 'Greninja';
  const isRayquaza = normalName === 'Rayquaza';
  const originalAbility = importText
    .split('\n')
    .find((line) => line.includes('Ability'))
    .split('Ability: ')[1];

  if (!species2[megaName]) throw new Error(`${megaName} isn't a pokemon in the database (addMega)`);
  const megaPokemon = species2[megaName];

  const abilitiesIndex = megaPokemon.abilities.includes(originalAbility)
    ? megaPokemon.abilities.findIndex((ability) => ability === originalAbility)
    : 0;

  // Bug fix: the original referenced a bare `species` identifier that was never
  // imported or defined -- this would throw a ReferenceError if ever invoked.
  const normalPokemon = species2[normalName];

  const newFirstLine = normalName + (!isRayquaza ? ' @ Mega Stone' : ` @ ${originalItem}` || '');

  const newImportText = [newFirstLine, ...importText.split('\n').slice(1)]
    .map((line) => {
      if (line.includes('Ability')) return 'Ability: ' + normalPokemon.abilities[abilitiesIndex];
      return line;
    })
    .join('\n');

  const createFromImportText = require('../pokemon/createFromImportText');
  return createFromImportText(newImportText, player);
};

module.exports = { checkMega, addMega };
