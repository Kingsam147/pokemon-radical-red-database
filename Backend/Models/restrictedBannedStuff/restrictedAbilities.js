const bannedAbilities = {
    "Drought": "Sheer Force", 
    "Desolate Land": "Sheer Force", 
    "Grassy Surge": "Self Sufficient", 
    "Seed Power": "Self Sufficient", 
    "Sand Stream": "Sand Force", 
    "Sand Spit": "Sand Force", 
    "Drizzle": "Adaptability", 
    "Primordial Sea": "Adaptability", 
    "Defiant": "Clear Body", 
    "Competitive": "Clear Body", 
    "Misty Surge": "Telepathy", 
    "Electric Surge": "Telepathy", 
    "Moxie": "Unnerve",  
    "Chilling Neigh": "Unnerve", 
    "Grim Neigh": "Unnerve", 
    "Soul-Heart": "Unnerve", 
    "Beast Boost": "Unnerve",
    "Orichalcum Pulse": "Protosynthesis", 
    "Hadron Engine": "Quark Drive", 
    "Speed Boost": "Infiltrator", 
    "Imposter": "Limber", 
    "Magic Bounce": "Magic Guard", 
    "Blazing Soul": "Flash Fire", 
    "Triage": "Natural Cure", 
    "Trace": "Synchronize", 
    "Stamina": "Inner Focus", 
    "Contrary": "Bad Company", 
    "Psychic Surge": "Dazzling", 
    "Snow Warning": "Slush Rush", 
    "Toxic Debris": "Corrosion", 
    "Anger Shell": "Regenerator"
};

const abilityExceptions = {
    "Tyranitar": ["Sand Stream", "Intimidate"], 
    "Tyranitar-Mega": ["Sand Stream", "Intimidate"], 
    "Blaziken-Mega": ["Speed Boost", "Striker"], 
    "Spinda": ["Contrary", "Contrary"], 
    "Gigalith": ["Sand Stream", "Solid Rock"], 
    "Comfey": ["Triage", "Triage"], 
    "Rillaboom": ["Grassy Surge", "Intimidate"], 
    "Espathra": ["Speed Boost", "Speed Boost"]
};

module.exports = { bannedAbilities, abilityExceptions }; 