const changeActiveForm = (existingPokemon, newFormName) => {
  if (existingPokemon.form === '')
    throw new Error(`${existingPokemon.name} doesn't have any other forms`);
  if (!existingPokemon.alternateForms[newFormName])
    throw new Error(
      `${existingPokemon.form} doesn't have another form by the name of ${newFormName}`,
    );

  const desiredForm = existingPokemon.alternateForms[newFormName];

  existingPokemon.alternateForms[existingPokemon.form] = {
    form: existingPokemon.form,
    ID: existingPokemon.ID,
    sprite: existingPokemon.sprite,
    baseStats: existingPokemon.baseStats,
    type1: existingPokemon.type1,
    type2: existingPokemon.type2,
    ability: existingPokemon.ability,
    abilities: existingPokemon.abilities,
    allMoves: existingPokemon.allMoves,
  };

  existingPokemon.form = desiredForm.form;
  existingPokemon.ID = desiredForm.ID;
  existingPokemon.sprite = desiredForm.sprite;
  existingPokemon.baseStats = desiredForm.baseStats;
  existingPokemon.type1 = desiredForm.type1;
  existingPokemon.type2 = desiredForm.type2;

  const abilityIndex =
    existingPokemon.abilities.findIndex((ability) => ability === existingPokemon.ability) || 0;
  if (abilityIndex < desiredForm.abilities.length) {
    existingPokemon.ability = desiredForm.abilities[abilityIndex];
  } else {
    existingPokemon.ability = desiredForm.abilities[0];
  }

  existingPokemon.abilities = desiredForm.abilities;

  return existingPokemon;
};

module.exports = changeActiveForm;
