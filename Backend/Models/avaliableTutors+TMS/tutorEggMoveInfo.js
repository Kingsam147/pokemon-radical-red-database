// do I have access to egg moves
const isEggMoves = false; 

// what is my current tutor level
const tutorLevel = 3; 

const tutorTable = {};
    tutorTable[0] = ['Bug Bite'];
    tutorTable[1] = [ ...tutorTable[0], 'Stomping Tantrum']; 
    tutorTable[2] = [ ...tutorTable[1], 'Fire Punch', 'Ice Punch', 'Thunder Punch', 'Fire Fang', 'Ice Fang', 'Thunder Fang', 'Psychic Fangs']; 
    tutorTable[3] = [ ...tutorTable[2], 'Play Rough', 'Iron Head', 'Liquidation']; 
    tutorTable[4] = [ ...tutorTable[3], 'Hydro Pump', 'Drill Run', 'Blaze Kick', 'Pain Split', 'Zen Headbutt', 'Weather Ball', 'Air Slash', 'Hex', 'Mystical Fire', 'Leaf Blade', 'Knock Off', 'Power Gem', 'Rock Blast', 'Pin Missile', 'Icicle Spear', 'Tail Slap', 'Body Slam', 'Foul Play']; 
    tutorTable[5] = [ ...tutorTable[4], 'Thunder Wave']; 
    tutorTable[6] = [ ...tutorTable[5], 'Earth Power']; 
    tutorTable[7] = [ ...tutorTable[6], 'Aura Sphere', 'Heat Wave', 'Hurricane', 'Power Whip', 'High Horsepower', 'Bug Buzz', 'Phantom Force', 'Flare Blitz', 'Stored Power', 'Gunk Shot', 'Megahorn']; 

module.exports = { isEggMoves, tutorLevel, tutorTable }; 