const { calculate, Pokemon, Move, Field, Side, Generations } = require('@smogon/calc');
const { getModels } = require('../Config/jsonOptions');
const {items, abilities } = require('../Config/tsOptions');
const calcDefenseType = require('../Domain/typeInteractions');
const getPokemonOverrides = (pokemonName, species2) => {
    const data = species2[pokemonName];
    if (!data) return {};

    const types = [data.type1, data.type2].filter(t => t && t !== "None");

    return {
        rawStats: {
            hp: data.baseHP,
            atk: data.baseAttack,
            def: data.baseDefense,
            spa: data.baseSpAttack,
            spd: data.baseSpDefense,
            spe: data.baseSpeed
        },
        types
    };
};

// Create field (weather, terrain, etc.)
const fieldMap = {
    "Sun": "Sun",
    "Harsh Sunshine": "Harsh Sunshine",
    "Rain": "Rain",
    "Heavy Rain": "Heavy Rain",
    "Sand": "Sand",
    "Snow": "Snow",
    "Strong Winds": "Strong Winds",
};

const terrainMap = {
    "Electric Terrain": "Electric",
    "Grassy Terrain": "Grassy",
    "Misty Terrain": "Misty",
    "Psychic Terrain": "Psychic",
};

const changedAbilities = ["Illusion", "Defeatist", "Corrosion", "Iron Fist", "Rivalry", "Mega Launcher", "Bulletproof", "Water Compaction", "Flower Gift", "Liquid Voice", "Reckless"]
    
const newAbilities = ["Striker", "Feline Prowess", "Sage Power", "ORAORAORAORA", "Bad Company", "Parasitic Waste", "Mountaineer", "Bull Rush", "Primal Armor", "Self Sufficient", "Fatal Precision", "Bone Zone", "Blubber Defense", "Cash Splash", "Quill Rush", "Phoenix Down"];


const applyRadicalRedAbilityFixes = (damageArray, attacker, defender, move, field, abilityToggles = {}, typeChart) => {
    
    let modifier = 1;

    // if illusion is up then gets damage boost
    if (attacker.ability === "Illusion" && abilityToggles.illusion) {
        modifier *= 1.3;
    }

    // defeatist threshold has been decreased to 33% from 50%
    if (attacker.ability === "Defeatist") {
        const hpPercent = attacker.currentHP / attacker.maxHP; 
        const vanillaBoost = hpPercent <= 0.5 ? 0.5 : 1;
        const rrBoost = hpPercent <= 0.33 ? 0.5 : 1; 
        modifier *= rrBoost / vanillaBoost;
    }

    // iron fist got a damage boost and no longer boosts wicked blow
    if (attacker.ability === "Iron Fist" && move.flags?.punch === 1) {
            modifier *= 1.3 / 1.2; // RR boost / vanilla boost
    }

    // rivalry always gives damage boost regardless of gender
    if (attacker.ability === "Rivalry") {
        if (attacker.gender !== defender.gender) {
            // vanilla applied 0.75 reduction; undo it and apply 1.25 boost
            modifier *= (1.25 / 0.75);
        }
        // same gender already has 1.25 applied by vanilla, no change needed
    }

    // mega launcher now also boosts Snipe Shot, Flash Cannon, Spike Cannon
    if (attacker.ability === "Mega Launcher" && (move.name === "Flash Cannon" || move.name === "Spike Cannon" || move.name === "Snipe Shot")) {
        modifier *= 1.5;
    }

    // also gives a 1.2 boost to all sound moves
    if (attacker.ability === "Liquid Voice" && move.flags?.sound === 1) {
        modifier *= 1.2;
    }

    // now also boosts explosion, self-destruct, and misty explosion
    if (attacker.ability === "Reckless" && (move.name === "Explosion" || move.name === "Self-Destruct" || move.name === "Misty Explosion")) {
        modifier *= 1.2;
    }

    // Now also blocks Snipe Shot, Flash Cannon, and Spike Cannon
    if (defender.ability === "Bulletproof" && (move.name === "Snipe Shot" || move.name === "Flash Cannon" || move.name === "Spike Cannon")) {
        modifier *= 0;
    }

    // Now reduces water type damage by 50% on top of what it does
    if (defender.ability === "Water Compaction" && move.type === "Water") {
        modifier *= 0.5;
    }

    // no longer boosts special defense
    if (defender.ability === "Flower Gift" && field?.weather === "Sun") {
        modifier /= 1.5;
    }

    // boosts power of kicking moves
    if (attacker.ability === "Striker" && move.flags?.kick === 1) {
        modifier *= 1.3;
    }

    // doubles all special attacks
    if (attacker.ability === "Feline Prowess" && move.category === "Special") {
        modifier *= 2;
    }

    // boosts special attacks 
    if (attacker.ability === "Sage Power" && move.category === "Special") {
        modifier *= 1.5;
    }

    // boosts power of punching moves
    if (attacker.ability === "ORAORAORAORA" && move.flags?.punch === 1) {
        modifier *= 1.5;
    }

    // boosts attack if ability is toggled
    if (attacker.ability === "Bull Rush" && abilityToggles.bullRush && move.category === "Physical") {
        modifier *= 1.2;
    }

    // if move is super effective then move gets boosted
    if (attacker.ability === "Fatal Precision") {
        const defenseData = calcDefenseType(defender.types, typeChart);
        if (defenseData.weaknesses.includes(move.type) || defenseData.doubleWeaknesses.includes(move.type)) {
            modifier *= 1.2;
        }
    }

    // moves with bone in their name ignore type immunities and do double damage against pokemon that resists it
    // NOTE: immunity bypasses (Flying type, Levitate, Earth Eater, Air Balloon) are handled
    if (attacker.ability === "Bone Zone" && move.type === "Ground") {
        const defenseData = calcDefenseType(defender.types, typeChart);
        const resistedTypes = [...defenseData.resistances, ...defenseData.doubleResists];
        if (resistedTypes.includes(move.type)) {
            modifier *= 2;
        }
    }

    // boosts the power of water moves by x2 and immune to burns
    if (attacker.ability === "Cash Splash") {
        if (move.type === "Water") {
            modifier *= 2;
        }
        // Burn normally halves physical damage — undo that here
        if (attacker.status === "Burned" && move.category === "Physical") {
            modifier *= 2;
        }
    }

    // boosts attacks if ability is toggled
    if (attacker.ability === "Quill Rush" && abilityToggles.quillRush && move.category === "Physical") {
        modifier *= 2;
    }

    // immune to rock type moves and stealth rocks
    if (defender.ability === "Mountaineer" && move.type === "Rock") {
        modifier *= 0;
    }

    // reduces damage from super effective moves
    if (defender.ability === "Primal Armor") {
        const defenseData = calcDefenseType(defender.types, typeChart);
        if (defenseData.weaknesses.includes(move.type) || defenseData.doubleWeaknesses.includes(move.type)) {
            modifier *= 0.5;
        }
    }

    // reduces damage if HP is full
    if (defender.ability === "Blubber Defense" && defender.rawStats.hp === defender.originalCurHP) {
        modifier *= 0.5;
    }

    // takes 0.5 damage from fire type moves
    if (defender.ability === "Cash Splash" && move.type === "Fire") {
        modifier *= 0.5;
    }

    // Apply modifier to all damage rolls
    return damageArray.map(d => Math.floor(d * modifier));
};

const calculateDamage = (req, res) => {
    try {
        const {species2, movesList: allMoves, typeChart } = getModels();
        const { attacker, defender, move, field } = req.body;
        const gen = Generations.get(9);
        // console.log(gen)

        // Sanitize item — blank out anything the calc doesn't know
        // console.log(items);
        const sanitizeItem = (itemName) => {
            if (!itemName) return "";
            try { return items.includes(itemName) ? itemName : ""; } 
            catch { return ""; }
        };

        // Sanitize ability — blank out RR custom abilities so calc doesn't crash
        // console.log(abilities);
        const sanitizeAbility = (abilityName) => {
            if (!abilityName) return "No Ability";
            try { return abilities.includes(abilityName) ? abilityName : "No Ability"; } 
            catch { return "No Ability"; }
        };

        // Map your status names to smogon calc status strings
        const statusMap = {
            "Healthy": "",
            "Burn": "brn",
            "Burned": "brn",
            "Freeze": "frz",
            "Frozen": "frz",
            "Paralysis": "par",
            "Paralyzed": "par",
            "Poison": "psn",
            "Poisoned": "psn",
            "Badly Poison": "tox",
            "Badly Poisoned": "tox",
            "Sleep": "slp",
            "Asleep": "slp",
            "Fainted": "",
        };

        const attackerOverrides = getPokemonOverrides(attacker.name, species2);
        const defenderOverrides = getPokemonOverrides(defender.name, species2);

        // For Bone Zone: strip Flying type and immunity abilities/items from defender before calc
        let p2Overrides = { ...defenderOverrides };
        if (attacker.ability === "Bone Zone" && move.name && allMoves[move.name.toLowerCase().replace(/[^a-z0-9]/g, '')]?.type === "Ground") {
            p2Overrides.types = p2Overrides.types?.filter(t => t !== "Flying") ?? defenderOverrides.types;
            if (defender.ability === "Levitate" || defender.ability === "Earth Eater") {
                p2Overrides.ability = "";
            }
            if (defender.item === "Air Balloon") {
                p2Overrides.item = "";
            }
        }

        // For Corrosion: strip Steel type from defender so Poison moves hit
        if (attacker.ability === "Corrosion" && move.type === "Poison" && defender.types?.includes("Steel")) {
            p2Overrides.types = p2Overrides.types?.filter(t => t !== "Steel");
        }

        const p1 = new Pokemon(gen, attacker.name, {
            level: attacker.level,
            nature: attacker.nature?.toLowerCase().replace(/\s/g, ''),
            evs: attacker.evs,
            ivs: attacker.ivs,
            boosts: attacker.boosts,
            item: sanitizeItem(attacker.item),
            ability: sanitizeAbility(attacker.ability),
            abilityOn: attacker.abilityOn,
            status: statusMap[attacker.status] ?? "",
            gender: attacker.gender,
            originalCurHP: attacker.currentHP,
            alliesFainted: attacker.alliesFainted ?? 0,
            ...attackerOverrides,
        });

        // console.log(p1.ability);

        const p2 = new Pokemon(gen, defender.name, {
            level: defender.level,
            nature: defender.nature?.toLowerCase().replace(/\s/g, ''),
            evs: defender.evs,
            ivs: defender.ivs,
            boosts: defender.boosts,
            item: sanitizeItem(p2Overrides.item ?? defender.item),
            ability: sanitizeAbility(p2Overrides.ability ?? defender.ability),
            abilityOn: defender.abilityOn,
            status: statusMap[defender.status] ?? "",
            gender: defender.gender,
            originalCurHP: defender.currentHP,
            ...p2Overrides,
        });

        // console.log(p1);
        // console.log(p1.ability);

        // Get move data
        const sanitizedName = move.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const moveData = allMoves[sanitizedName];

        if (!moveData) {
            return res.status(404).json({ message: `Move "${move.name}" not found in database` });
        }

        const moveObj = new Move(gen, move.name, {
            isCrit: move.isCrit ?? false,
            isZ: move.isZ ?? false,
            overrides: moveData
        });

        // Build field properly
        const weatherMap = {
            "Sun": "Sun", "Harsh Sunshine": "Harsh Sunshine",
            "Rain": "Rain", "Heavy Rain": "Heavy Rain",
            "Sand": "Sand", "Snow": "Snow", "Strong Winds": "Strong Winds",
        };
        const terrainMap = {
            "Electric Terrain": "Electric", "Grassy Terrain": "Grassy",
            "Misty Terrain": "Misty", "Psychic Terrain": "Psychic",
        };

        const fieldData = new Field({
            weather: weatherMap[field?.weather] ?? undefined,
            terrain: terrainMap[field?.terrain] ?? undefined,
            isGravity: field?.isGravity ?? false,
            isMagicRoom: field?.isMagicRoom ?? false,
            isWonderRoom: field?.isWonderRoom ?? false,
            attackerSide: new Side({
                isReflect: field?.attackerSide?.isReflect ?? false,
                isLightScreen: field?.attackerSide?.isLightScreen ?? false,
                isAuroraVeil: field?.attackerSide?.isAuroraVeil ?? false,
                isTailwind: field?.attackerSide?.isTailwind ?? false,
                isHelpingHand: field?.attackerSide?.isHelpingHand ?? false,
                isFlowerGift: field?.attackerSide?.isFlowerGift ?? false,
                isFriendGuard: field?.attackerSide?.isFriendGuard ?? false,
            }),
            defenderSide: new Side({
                isReflect: field?.defenderSide?.isReflect ?? false,
                isLightScreen: field?.defenderSide?.isLightScreen ?? false,
                isAuroraVeil: field?.defenderSide?.isAuroraVeil ?? false,
                isTailwind: field?.defenderSide?.isTailwind ?? false,
                spikes: field?.defenderSide?.spikes ?? 0,
                isSR: field?.defenderSide?.isSR ?? false,
                isStickyWeb: field?.defenderSide?.isStickyWeb ?? false,
            }),
        });

        const result = calculate(gen, p1, p2, moveObj, fieldData);

        // Normalize damage — can be a number, array, or nested array
        let rawDamage;
        if (!result.damage || result.damage === 0) {
            rawDamage = Array(16).fill(0);
        } else if (!Array.isArray(result.damage)) {
            rawDamage = Array(16).fill(result.damage);
        } else if (Array.isArray(result.damage[0])) {
            // multi-hit: sum each hit
            const summed = result.damage.map(roll => roll.reduce((a, b) => a + b, 0));
            rawDamage = summed.length === 1 ? Array(16).fill(summed[0]) : summed;
        } else {
            // pad single-roll arrays to 16 so desc() doesn't choke
            rawDamage = result.damage.length === 1
                ? Array(16).fill(result.damage[0])
                : result.damage;
        }

        const correctedDamage = applyRadicalRedAbilityFixes(
            rawDamage,
            {
                ability: attacker.ability,
                currentHP: attacker.currentHP,
                maxHP: attacker.maxHP || p1.maxHP(),
                status: attacker.status,
                gender: attacker.gender,
                types: p1.types,
                rawStats: attackerOverrides.rawStats,
                evs: attacker.evs,
                ivs: attacker.ivs,
                level: attacker.level,
                originalCurHP: attacker.currentHP
            },
            {
                ability: defender.ability,
                item: defender.item,
                types: p2.types,
                gender: defender.gender,
                rawStats: defenderOverrides.rawStats,
                evs: defender.evs,
                ivs: defender.ivs,
                level: defender.level,
                originalCurHP: defender.currentHP
            },
            moveData,
            field,
            req.body.abilityToggles || {}, 
            typeChart
        );
        // console.log(p1);
        // console.log(p2);

        const defenderHP = p2.maxHP();
        const correctedMin = Math.min(...correctedDamage);
        const correctedMax = Math.max(...correctedDamage);

        let description;
        try {
            description = result.desc();
        } catch (e) {
            description = result.moveDesc ?? move.name ?? '';
        }

        return res.status(200).json({
            message: "Successfully calculated damage with Radical Red mechanics", 
            calculation: {
                damage: correctedDamage,
                range: [
                    `${Math.round(((correctedMin / defenderHP) * 100).toFixed(1))}%`,
                    `${Math.round(((correctedMax / defenderHP) * 100).toFixed(1))}%`
                ],
                'description': description,
                rrModifiersApplied: true
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to calculate damage", error: error.message });
    }
}

module.exports = { calculateDamage };