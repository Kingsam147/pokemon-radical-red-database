// given the type combination of a pokemon list out what it's immunities, resistances, and weaknesses


// return an dictionary in this format 
/* {
    immunities: []
    resistances: []
    normal: []
    weaknesses: []
 } */


const calcDefenseType = (pokemonTypes, typeChart) => {

    let [type1, type2] = pokemonTypes;

    type1 = typeChart[type1]; 
    type2 = typeChart[type2];

    const typeDefenses = {
        "immunities": [], 
        "doubleResistances": [],
        "resistances": [], 
        "normal": [],
        "weaknesses": [],
        "doubleWeaknesses": []
    };  

    let newChart = { ...type1};

    if (type2.name !== "None") {
        // console.log(type1); 
        // console.log(type2);
        
        for (const type of Object.keys(type1)) {
            if (type === "name") continue;
            // console.log(type)
            // console.log(`type 1: ${type1[type]} type2: ${type2[type]}`)
            newChart[type] = type1[type] * type2[type];
        }
    }

    delete newChart.name;

    for (const [type, value] of Object.entries(newChart)) {
        if (value === 0) {
            typeDefenses.immunities.push(type);
        } else if (value === 0.25) {
            typeDefenses.doubleResistances.push(type);
        } else if (value === 0.5) {
            typeDefenses.resistances.push(type)
        } else if (value === 2) {
            typeDefenses.weaknesses.push(type)
        } else if (value === 4) {
            typeDefenses.doubleWeaknesses.push(type);
        } else if (value === 1) {
            typeDefenses.normal.push(type);
        } else {
            console.error("Something wront with the type weaknesses function");
        }
    }

    return typeDefenses;
        
}

module.exports = calcDefenseType;