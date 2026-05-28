// given an ability and a pokemon, return their legal ability 

const legalAbility = (pokemonName, givenAbility, bannedAbilities, abilityExceptions) => {

    // console.log(bannedAbilities);
    if (givenAbility in bannedAbilities) {
        // if the banned ability has a substitute than return that instead 
        // otherwise return the legal version of the banned ability
        return abilityExceptions[pokemonName] ? abilityExceptions[pokemonName][1] : bannedAbilities[givenAbility]; 
    } 

    return givenAbility; 

} 

module.exports = legalAbility; 