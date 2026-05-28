

const moveToFormat = (moveName) => 
    moveName 
        .replaceAll(' ', '')
        .replaceAll('-', '')
        .replaceAll('\'', '')
        .toUpperCase()

const nameToFormat = (pokemonName) => {
    const watchNames = {
        "Aegislash-Both": "AEGISLASH",
        "Greninja-Ash": "GRENINJA",
        "Urshifu": "URSHIFU_SINGLE",
        "Urshifu-Rapid-Strike": "URSHIFU_RAPID",
        "Charizard-Mega-X": "CHARIZARD_MEGA_X",
        "Charizard-Mega-Y": "CHARIZARD_MEGA_Y",
        "Zygarde-10%": "ZYGARDE_10",
        "Oricorio-Sensu": "ORICORIO_S",
        "Oricorio-Pa'u": "ORICORIO_P",
        "Oricorio-Pom-Pom": "ORICORIO_Y",
        "Farfetch’d-Galar": "FARFETCHD_G",
        "Farfetch’d": "FARFETCHED",
        "Sirfetch’d": "SIRFETCHD",
        "Mr. Mime": "MR_MIME",
        "Mr. Mime-Galar": "MR_MIME_G",
        "Mr. Rime": "MR_RIME",
        "Mime Jr.": "MIME_JR",
        "Type: Null": "NULL",
        "Flabébé": "FLABEBE",
        "Porygon2": "PORYGON2",
        "Tapu Koko": "TAPU_KOKO",
        "Tapu Lele": "TAPU_LELE",
        "Tapu Bulu": "TAPU_BULU",
        "Tapu Fini": "TAPU_FINI"
    };

    if (watchNames[pokemonName]) return watchNames[pokemonName];

    return pokemonName
        .replaceAll('-Galar', '_G')
        .replaceAll('-Alola', '_A')
        .replaceAll('-Hisui', '_H')
        .replaceAll('-Mega', '_MEGA')
        .replaceAll('-', '_')
        .replaceAll(' ', '')
        .toUpperCase();
}

const abilityToFormat = (abilityName) => 
    abilityName
        .replaceAll(' ', '')
        .replaceAll('-', '')
        .toUpperCase()

const typeToFormat = (typeName) =>typeName.toUpperCase();

const moveFromFormat = (moveName, movesList) => {
    if ( !(moveName in movesList) ) throw new Error (`${moveName} not found in normalized names`)
    return movesList[moveName]
}

const nameFromFormat = (pokemonName, pokemonList) => {
    if ( !(pokemonName in pokemonList) ) throw new Error (`${pokemonName} not found in normalized names`)
    return pokemonList[pokemonName]
}

const abilityFromFormat = (abilityName, abilityList) => {
    if ( !(abilityName in abilityList) ) throw new Error (`${abilityName} not found in normalized names`)
    return abilityList[abilityName]
}

const typeFromFormat = (typeName) => typeName[0] + typeName.slice(1).toLowerCase()


module.exports = { moveToFormat, nameToFormat, abilityToFormat, typeToFormat, moveFromFormat, nameFromFormat, abilityFromFormat, typeFromFormat };