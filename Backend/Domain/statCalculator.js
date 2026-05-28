// now given an base stat, EV and IV number for each stat, along with a nature and level and stat boost
// calculate each stat

// Evs = {HP: 0, Att: 0, Def: 0, SpAtt: 0, SpDef: 0, Spe: 0}
// Ivs = {HP: 0, Att: 0, Def: 0, SpAtt: 0, SpDef: 0, Spe: 0} 
// baseStats = {HP: 0, Att: 0, Def: 0, SpAtt: 0, SpDef: 0, Spe: 0}
// nature = "Adamant": {increase: "Att", decrease: "Att"}
// statBoost = {HP: 1, Atk: 1, Def: 1, SpA: 1, SpD: 1, Spe: 1}

const finalHP = (baseHP, HpEvs, HpIvs, level) => 
    Math.floor( ((2 * baseHP + HpIvs + Math.floor(HpEvs / 4)) * level / 100) + level + 10)

const finalStats = (baseStats, EVs, IVs, nature, level, statBoosts = {Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0}) => 
{
    let finalValues = {}; 

    Object.keys(baseStats).forEach(stat => {
        if (stat === "HP") return;
        let natureMultiplier = 1; 
        if (nature.increase !== nature.decrease) {
            if(nature.increase === stat) natureMultiplier = 1.1; 
            if(nature.decrease === stat) natureMultiplier = 0.9;
        } 

        let boostMultiplier = 1; 

        switch (statBoosts[stat] || 0) {
            case 6: boostMultiplier = 4; break;
            case 5: boostMultiplier = 3.5; break;
            case 4: boostMultiplier = 3; break;
            case 3: boostMultiplier = 2.5; break;
            case 2: boostMultiplier = 2; break;
            case 1: boostMultiplier = 1.5; break;
            case -1: boostMultiplier = 2/3; break;
            case -2: boostMultiplier = 1/2; break;
            case -3: boostMultiplier = 2/5; break;
            case -4: boostMultiplier = 1/3; break;
            case -5: boostMultiplier = 2/7; break;
            case -6: boostMultiplier = 1/4; break;
        }


        finalValues[stat] =  Math.floor(Math.floor(( Math.floor((2 * baseStats[stat] + IVs[stat] + Math.floor(EVs[stat] / 4)) * level / 100) + 5) * natureMultiplier) * boostMultiplier); 
        
    });

    // console.log(finalValues)

    return finalValues
}

// console.log(`Final HP: ${finalHP(80, 0, 31, 47)}`); 
// console.log(finalStats(baseStats, evs, ivs, "Docile", 47));

module.exports = { finalHP, finalStats };