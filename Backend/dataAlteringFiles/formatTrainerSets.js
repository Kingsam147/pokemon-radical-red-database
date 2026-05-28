const fs = require("fs");

const trainerSets = JSON.parse(fs.readFileSync("../Models/boxes/enemyTeams.json", 'utf8'));
const trainerItems = JSON.parse(fs.readFileSync("./trainerItems.json", 'utf8'));
const species2 = require("../Models/species2.json");
const stats = require('../Domain/statCalculator');
const {natures, items, megaStones } = require('../Config/jsonOptions');

// move entry order
// add name entry
// 
// if mega ...
  // change pokemon key
  // add to forms the base form and mega form
  // add alternate forms 

// trainers with pokemon changes 
// 


const newTrainerSets = {}; 
const trainerMap = {
  "Rival Gary Venusaur Pallet Town": "Rival Gary - Pallet Town (Bulbasaur)",
  "Rival Gary Charizard Pallet Town": "Rival Gary - Pallet Town (Charmander)",
  "Rival Gary Blastoise Pallet Town": "Rival Gary - Pallet Town (Squirtle)",
  "Rival Gary Venusaur Route 22": "(Optional) Gary - Route 22 (Bulbasaur)",
  "Rival Gary Charizard Route 22": "(Optional) Gary - Route 22 (Charmander)",
  "Rival Gary Blastoise Route 22": "(Optional) Gary - Route 22 (Squirtle)",
  "Rival Brendan Viridian Forest": "Brendan - Viridian Forest",
  "Lass Anne Viridian Forest": "Lass Anne",
  "Bug Catcher Sammy Viridian Forest": "Catcher Sammy",
  "Johto Gym Leader Falkner Pewter City": "Falkner",
  "Leader Brock Pewter City": "Brock",
  "Lass Sally Route 3": "Lass Sally",
  "Fossil Maniac Miguel Mt. Moon": "Super Nerd Miguel",
  "Team Rocket Admin Archer Mt. Moon": "Archer - Mt. Moon",
  "Rival Gary Venusaur Cerulean City": "Gary - Cerulean City (Bulbasaur)",
  "Rival Gary Charizard Cerulean City": "Gary - Cerulean City (Charmander)",
  "Rival Gary Blastoise Cerulean City": "Gary - Cerulean City (Squirtle)",
  "Bug Catcher Cale Route 24": "Catcher Cale",
  "Lass Ali Route 24": "Lass Ali",
  "Youngster Timmy Route 24": "Youngster Timmy",
  "Camper Ethan Route 24": "Camper Ethan",
  "Nugget Bridge Rocket Grunt Route 24": "Rocket Grunt - Nugget Bridge",
  "Johto Leader Bugsy Route 25": "(Optional) Bugsy (Pre-Surge)",
  "Johto Leader Bugsy Route 25 Post Surge": "(Optional) Bugsy (Post-Surge)",
  "Leader Misty Cerulean City": "Misty",
  "Back of Dig House Rocket Grunt Cerulean City": "Rocket Grunt - Dig House",
  "Camper Jeff Route 6": "Camper Jeff",
  "Lass Anne S.S. Anne": "Lass Ann",
  "Gentleman Brooks S.S. Anne": "Gentleman Brooks",
  "Sailor Edmond S.S. Anne": "Sailor Edmond",
  "Sailor Trevor S.S. Anne": "Sailor Trevor",
  "Rival Brendan S.S. Anne": "Brendan - S.S Anne",
  "Leader Whitney Route 11": "(Optional) Whitney",
  "Gentleman Tucker S.S. Anne": "Gentleman Tucker",
  "Leader Lt. Surge S.S. Anne": "Lt. Surge",
  "Picnicker Alicia Route 9": "Picknicker Alicia",
  "Picnicker Caitlin Route 9": "Picknicker Caitlin",
  "Picnicker Dana Rock Tunnel": "Picknicker Dana",
  "Pokemaniac Herman Route 10 South": "Maniac Herman",
  "Johto Leader Morty Lavender Town": "(Optional) Morty",
  "Super Nerd Aiden Route 8": "Super Nerd Aidan",
  "Ace Trainer Mary Route 16": "Ace Trainer Mary",
  "Leader Erika Route 16": "Erika",
  "Team Rocket Poster Grunt Celadon Game Corner": "Rocket Game Corner Guard",
  "Left Team Rocket Grunt Team Rocket Hideout": "Rocket Left Guard - Rocket Hideout",
  "Right Team Rocket Grunt Team Rocket Hideout": "Rocket Right Guard - Rocket Hideout",
  "Rocket Leader Giovanni Team Rocket Hideout": "Giovanni - Rocket Hideout",
  "Channeler Ruth Pokemon Tower": "Channeler Ruth",
  "Ghost Marowak-Alola Pokemon Tower": "Ghost",
  "Team Rocket Grunt 1 Pokemon Tower": "Rocket Grunt 1 - Pokemon Tower",
  "Team Rocket Grunt 2 Pokemon Tower": "Rocket Grunt 2 - Pokemon Tower",
  "Team Rocket Grunt 3 Pokemon Tower": "Rocket Grunt 3 - Pokemon Tower",
  "Rival Gary Venusaur Silph Co.": "Gary - Silph Co. (Bulbasaur)",
  "Rival Gary Charizard Silph Co.": "Gary - Silph Co. (Charmander)",
  "Rival Gary Blastoise Silph Co.": "Gary - Silph Co. (Squirtle)",
  "Rocket Executive Ariana Silph Co.": "Ariana - Silph Co.",
  "Rocket Executive Archer Silph Co.": "Archer - Silph Co.",
  "Rival Brendan Silph Co.": "Brendan - Silph Co.",
  "Rocket Leader Giovanni Silph Co.": "Giovanni - Silph Co.",
  "Ace Trainer Cole Route 8": "(Optional) Ace Trainer Cole",
  "Ace Trainer Sam Celadon City": "(Optional) Beauty Sam",
  "Ace Trainer Shelly Celadon City": "(Optional) Beauty Shelly",
  "Johto Leader Chuck Fighting Dojo": "(Optional) Chuck",
  "Sabrina Saffron City Gym": "Sabrina",
  "Dumbass Kid Saffron City": "(Optional) Dumass Kid",
  "Rocker Luca Route 12": "Rocker Luca",
  "Camper Justin Route 12": "Camper Justin",
  "Fisherman Andrew Route 12": "Fisherman Andrew",
  "Bird Keeper Sebastian Route 13": "Bird Keeper Sebastian",
  "Picnicker Susie Route 13": "Picknicker Susie",
  "Picnicker Alma Route 13": "Picknicker Alma",
  "Beauty Lola Route 13": "Beauty Lola",
  "Beauty Sheila Route 13": "Beauty Sheila",
  "Bird Keeper Perry Route 13": "Bird Keeper Perry",
  "Biker Jared Route 13": "Biker Jared",
  "Bird Keeper Robert Route 13": "Bird Keeper Robert",
  "Sandaconda-Mega Trainer Route 15": "(Optional) Ace Trainer Haley",
  "Cue Ball Koji Route 16": "Cue Ball Koji",
  "Cue Ball Luke Route 16": "Cue Ball Luke",
  "Biker Ruben Route 16": "Biker Ruben",
  "Cue Ball Camron Route 16": "Cue Ball Camron",
  "Biker Hideo Route 16": "Biker Hideo",
  "Biker William Route 18": "Biker William",
  "Bird Keeper Jacob Route 18": "Bird Keeper Jacob",
  "Dragon Tamer Ramiro Route 18": "(Optional) Tamer Ramiro",
  "Ace Trainer Wilton Route 18": "Ace Trainer Wilton",
  "Rival Brendan Fuschia City": "Brendan - Safari Zone",
  "Gym Leader Brock Rematches": "Brock (Rematch)",
  "Gym Leader Misty Rematches": "Misty (Rematch)",
  "Gym Leader Surge Rematches": "Lt. Surge (Rematch)",
  "Gym Leader Erika Rematches": "(Optional) Erika (Rematch)",
  "Juggler Kayden Fuschia City Gym": "Juggler Kayden",
  "Gym Leader Koga Fuschia City Gym": "Koga",
  "Dumbass Jojo Fan Power Plant": "(Optional) Dumass Jojo Fan",
  "Johto Leader Pryce Team 1 Route 20": "(Optional) Pryce - Team 1",
  "Johto Leader Pryce Team 2 Route 20": "(Optional) Pryce - Team 2",
  "Rival May Cinnabar Island": "May",
  "Johto Leader Jasmine Cinnabar Island": "(Optional) Jasmine",
  "Pidgeot-Mega Trainer Pokemon Mansion": "(Optional) Scientist Ted",
  "Burglar Lewis Pokemon Mansion": "Burglar Lewis",
  "Ace Trainer Derek Pokemon Mansion": "Ace Trainer Derek",
  "Ace Trainer Lucy Pokemon Mansion": "Ace Trainer Lucy",
  "Ace Trainer Zac Pokemon Mansion": "Ace Trainer Zac",
  "Cinnabar Island Gym Leader Blaine Pokemon Mansion": "Blaine",
  "Rocket Grunt 1 Cerulean Cave": "Rocket Grunt 1 - Cerulean Cave",
  "Rocket Grunt 2 Cerulean Cave": "Rocket Grunt 2 - Cerulean Cave",
  "Rocket Admin Archer Cerulean Cave": "Archer - Cerulean Cave",
  "Rocket Admin Ariana Cerulean Cave": "Ariana - Cerulean Cave",
  "Rocket Leader Giovanni Cerulean Cave": "Giovanni - Cerulean Cave",
  "Partner Lance Cerulean Cave": "Lance - Cerulean Cave",
  "Black Belt Ketchup Day 1 Cerulean Cave": "(Optional) Black Belt Ketchup",
  "Black Belt Ketchup Day 2 Cerulean Cave": "(Optional) Black Belt Ketchup (Rematch)",
  "Leader Clair Viridian City Gym": "Clair",
  "Rival Gary Venusaur Route 22 Rematch": "Gary - Route 22 (Bulbasaur)",
  "Rival Gary Charizard Route 22 Rematch": "Gary - Route 22 (Charmander)",
  "Rival Gary Blastoise Route 22 Rematch": "Gary - Route 22 (Squirtle)",
  "Rival Brendan Route 23": "Brendan - Route 23",
  "Ace Trainer Naomi Victory Road": "Ace Trainer Naomi",
  "Ace Trainer Ronaldo Victory Road": "Ace Trainer Ronaldo",
  "Ace Trainer George Victory Road": "Ace Trainer George",
  "Ace Trainer Caroline Victory Road": "Ace Trainer Caroline",
  "Ace Trainer Colby Victory Road": "Ace Trainer Colby",
  "Ace Trainer Alexa Victory Road": "Ace Trainer Alexa",
  "Ace Trainer Ray Victory Road": "Ace Trainer Ray",
  "Ace Tyra Victory Road": "Ace Trainer Tyra",
  "Lorelei 1 Pokemon League": "Lorelei - Rain Team",
  "Lorelei 2 Pokemon League": "Lorelei - Snow Team",
  "Bruno 1 Pokemon League": "Bruno - Team 1",
  "Bruno 2 Pokemon League": "Bruno - Team 2",
  "Agatha Pokemon League": "Agatha",
  "Lance Pokemon League": "Lance",
  "Champion Gary Venusaur Pokemon League": "Gary - Champion (Bulbasaur)",
  "Champion Gary Charizard Pokemon League": "Gary - Champion (Charmander)",
  "Champion Gary Blastoise Pokemon League": "Gary - Champion (Squirtle)"
};
const myTrainerInfo = {
"Rival Gary - Pallet Town (Bulbasaur)" : {
  name: "Rival Gary - Pallet Town (Bulbasaur)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rival Gary - Pallet Town (Charmander)" : {
  name: "Rival Gary - Pallet Town (Charmander)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rival Gary - Pallet Town (Squirtle)" : {
  name: "Rival Gary - Pallet Town (Squirtle)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Gary - Route 22 (Bulbasaur)" : {
  name: "(Optional) Gary - Route 22 (Bulbasaur)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Gary - Route 22 (Charmander)" : {
  name: "(Optional) Gary - Route 22 (Charmander)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Gary - Route 22 (Squirtle)" : {
  name: "(Optional) Gary - Route 22 (Squirtle)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Brendan - Viridian Forest" : {
  name: "Brendan - Viridian Forest", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Lass Anne" : {
  name: "Lass Anne", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Ace Trainer Nelle" : {
  name: "(Optional) Ace Trainer Nelle", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Catcher Sammy" : {
  name: "Catcher Sammy", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Falkner" : {
  name: "Falkner", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Brock" : {
  name: "Brock", 
  "rules": "Permanent Sandstorm", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Lass Sally" : {
  name: "Lass Sally", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Super Nerd Miguel" : {
  name: "Super Nerd Miguel", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Archer - Mt. Moon" : {
  name: "Archer - Mt. Moon", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Cerulean City (Bulbasaur)" : {
  name: "Gary - Cerulean City (Bulbasaur)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Cerulean City (Charmander)" : {
  name: "Gary - Cerulean City (Charmander)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Cerulean City (Squirtle)" : {
  name: "Gary - Cerulean City (Squirtle)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Catcher Cale" : {
  name: "Catcher Cale", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Lass Ali" : {
  name: "Lass Ali", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Youngster Timmy" : {
  name: "Youngster Timmy", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Lass Reli" : {
  name: "Lass Reli", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Camper Ethan" : {
  name: "Camper Ethan", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Team Rocket Grunt - Nugget Bridge" : {
  name: "Rocket Grunt - Nugget Bridge", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Bugsy (Pre-Surge)" : {
  name: "(Optional) Bugsy", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Bugsy (Post-Surge)" : {
  name: "(Optional) Bugsy", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Misty" : {
  name: "Misty", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt - Dig House" : {
  name: "Rocket Grunt - Dig House", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Camper Jeff" : {
  name: "Camper Jeff", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Lass Ann & Gentleman Brooks" : {
  name: "Lass Ann & Gentleman Brooks", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "Gentleman Brooks", 
  "myPartner": ""
}, 
"Sailor Edmond & Sailor Treavor"  : {
  name: "Sailor Edmond & Sailor Treavor" , 
  "rules": "", 
  "format": "Doubles", 
  "partner": "yes", 
  "myPartner": ""
},
"Brendan - S.S Anne" : {
  name: "Brendan - S.S Anne", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Whitney" : {
  name: "(Optional) Whitney", 
  "rules": "Swellow is Pre-Burned", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gentleman Tucker" : {
  name: "Gentleman Tucker", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Lt. Surge" : {
  name: "Lt. Surge", 
  "rules": "Permanent Eletric Terrain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Picknicker Alicia" : {
  name: "Picknicker Alicia", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Picknicker Caitlin" : {
  name: "Picknicker Caitlin", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Picknicker Dana" : {
  name: "Picknicker Dana", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Maniac Herman" : {
  name: "Maniac Herman", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"(Optional) Morty" : {
  name: "(Optional) Morty", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Super Nerd Aidan" : {
  name: "Super Nerd Aidan", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Ace Trainer Mary" : {
  name: "Ace Trainer Mary", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Erika" : {
  name: "Erika", 
  "rules": "Permanent Grassy Terrain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Game Corner Guard" : {
  name: "Rocket Game Corner Guard", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Left Guard - Rocket Hideout" : {
  name: "Rocket Left Guard - Rocket Hideout", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Rocket Right Guard - Rocket Hideout" : {
  name: "Rocket Right Guard - Rocket Hideout", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Giovanni - Rocket Hideout" : {
  name: "Giovanni - Rocket Hideout", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Channeler Ruth" : {
  name: "Channeler Ruth", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Ghost" : {
  name: "Ghost", 
  "rules": "Omni-Boosted + 252HP EVs + Stats Can't be Reduced + Safeguard", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt 1 - Pokemon Tower" : {
  name: "Rocket Grunt 1 - Pokemon Tower", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt 2 - Pokemon Tower" : {
  name: "Rocket Grunt 2 - Pokemon Tower", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt 3 - Pokemon Tower" : {
  name: "Rocket Grunt 3 - Pokemon Tower", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Silph Co. (Bulbasaur)" : {
  name: "Gary - Silph Co. (Bulbasaur)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Silph Co. (Charmander)" : {
  name: "Gary - Silph Co. (Charmander)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Silph Co. (Squirtle)" : {
  name: "Gary - Silph Co. (Squirtle)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Admin Archer & Rocket Admin Ariana - Silph Co." : {
  name: "Rocket Admin Archer & Rocket Admin Ariana - Silph Co.", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "yes", 
  "myPartner": "Brendan - Silph Co."
},
"Brendan - Silph Co." : {
  name: "Brendan - Silph Co.", 
  "rules": "", 
  "format": "help", 
  "partner": "", 
  "myPartner": ""
},
"Giovanni - Silph Co." : {
  name: "Giovanni - Silph Co.", 
  "rules": "Permanent Sandstorm", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Ace Trainer Cole" : {
  name: "(Optional) Ace Trainer Cole", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Beauty Sam" : {
  name: "(Optional) Beauty Sam", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Beauty Shelly" : {
  name: "(Optional) Beauty Shelly", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Chuck" : {
  name: "(Optional) Chuck", 
  "rules": "Chuck's Pokemon have Endure status if above 75% of max HP", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Sabrina" : {
  name: "Sabrina", 
  "rules": "Permanent Trick Room", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"(Optional) Dumass Kid" : {
  name: "(Optional) Dumass Kid", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocker Luca" : {
  name: "Rocker Luca", 
  "rules": "Permanent Snow", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Camper Justin" : {
  name: "Camper Justin", 
  "rules": "Permanent Snow + Back to back with Fisherman Andrew", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Fisherman Andrew" : {
  name: "Fisherman Andrew", 
  "rules": "Fight right after Camper Justin", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Bird Keeper Sebastian" : {
  name: "Bird Keeper Sebastian", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Picknicker Susie" : {
  name: "Picknicker Susie", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Picknicker Alma" : {
  name: "Picknicker Alma", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Beauty Lola & Beauty Sheila" : {
  name: "Beauty Lola & Beauty Sheila", 
  "rules": "Permanent Sun", 
  "format": "Doubles", 
  "partner": "yes", 
  "myPartner": ""
},
"Bird Keeper Perry" : {
  name: "Bird Keeper Perry", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Biker Jared" : {
  name: "Biker Jared", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Bird Keeper Robert" : {
  name: "Bird Keeper Robert", 
  "rules": "Permanent Sun", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Ace Trainer Haley" : {
  name: "(Optional) Ace Trainer Haley", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Biker Lao" : {
  name: "Biker Lao", 
  "rules": "Permanent Sandstorm + Back to Back with Cue Ball Koji and Luke", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Cue Ball Koji" : {
  name: "Cue Ball Koji", 
  "rules": "Permanent Sandstorm + Fight right after Biker Lao then Fight Cue Ball Luke right after", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Cue Ball Luke" : {
  name: "Cue Ball Luke", 
  "rules": "Permanent Sandstorm + Fight right after Biker Lao then Cue Ball Koji", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Biker Ruben" : {
  name: "Biker Ruben", 
  "rules": "Permanent Sandstorm", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Cue Ball Camron" : {
  name: "Cue Ball Camron", 
  "rules": "Permanent Sandstorm", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Biker Hideo" : {
  name: "Biker Hideo", 
  "rules": "Permanent Sandstorm", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Biker William" : {
  name: "Biker William", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Bird Keeper Jacob" : {
  name: "Bird Keeper Jacob", 
  "rules": "Permanent Rain + Cramorant Starts in Gorging Form", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Tamer Ramiro" : {
  name: "(Optional) Tamer Ramiro", 
  "rules": "Permanent Rain", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Ace Trainer Wilton" : {
  name: "Ace Trainer Wilton", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Brendan - Safari Zone" : {
  name: "Brendan - Safari Zone", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Brock (Rematch)" : {
  name: "Brock (Rematch)", 
  "rules": "Permanent Sandstorm + Super effective moves deal 33% less to Brock", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Misty (Rematch)" : {
  name: "Misty (Rematch)", 
  "rules": "Permanent Rain + Palafin is Pre-Transformed", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Lt. Surge (Rematch)" : {
  name: "Lt. Surge (Rematch)", 
  "rules": "Permanent Eletric Terrain + Magnet Rise", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Erika (Rematch)" : {
  name: "(Optional) Erika (Rematch)", 
  "rules": "Permanent Grassy Terrain + Erika's Grass Type moves deal 75% more damage if resisted and ignore immunities", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Juggler Kayden" : {
  name: "Juggler Kayden", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Koga" : {
  name: "Koga", 
  "rules": "Permanent Tailwind", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Dumass Jojo Fan" : {
  name: "(Optional) Dumass Jojo Fan", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Pryce - Team 1" : {
  name: "(Optional) Pryce - Team 1", 
  "rules": "Permanent Snow", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Pryce - Team 2" : {
  name: "(Optional) Pryce - Team 2", 
  "rules": "Permanent Rain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"May" : {
  name: "May", 
  "rules": "Permanent Magma Storm (Fire Types are Immune)", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Jasmine" : {
  name: "(Optional) Jasmine", 
  "rules": "Jasmine is Immune to Fire Type attacks", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Scientist Ted" : {
  name: "(Optional) Scientist Ted", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Burglar Lewis" : {
  name: "Burglar Lewis", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Ace Trainer Derek" : {
  name: "Ace Trainer Derek", 
  "rules": "Permanent Desolate Land", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Lucy" : {
  name: "Ace Trainer Lucy", 
  "rules": "Permanent Desolate Land", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Zac" : {
  name: "Ace Trainer Zac", 
  "rules": "Permanent Desolate Land", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Blaine" : {
  name: "Blaine", 
  "rules": "Permanent Desolate Land", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt 1 - Cerulean Cave" : {
  name: "Rocket Grunt 1 - Cerulean Cave", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Rocket Grunt 2 - Cerulean Cave" : {
  name: "Rocket Grunt 2 - Cerulean Cave", 
  "rules": "Ursaring is Pre-Burned", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Archer - Cerulean Cave" : {
  name: "Archer - Cerulean Cave", 
  "rules": "Back to back with Ariana", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ariana - Cerulean Cave" : {
  name: "Ariana - Cerulean Cave", 
  "rules": "Fight right after Archer", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Giovanni - Cerulean Cave" : {
  name: "Giovanni - Cerulean Cave", 
  "rules": "Permanent Psychic Terrain + Mewtwo Mega-Evolves into Mew-Two Y after Fainting the first time", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": "Lance - Cerulean Cave"
},
"Lance - Cerulean Cave" : {
  name: "Giovanni - Cerulean Cave", 
  "rules": "", 
  "format": "Help", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Black Belt Ketchup" : {
  name: "(Optional) Black Belt Ketchup", 
  "rules": "Permanent Tailwind", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Black Belt Ketchup (Rematch)" : {
  name: "(Optional) Black Belt Ketchup", 
  "rules": "Ketchup's Pokemon will Endure a hit if above 75% of max HP", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Clair" : {
  name: "Clair", 
  "rules": "Unable to use fairy types + can't remove hazards", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Burglar Max" : {
  name: "(Optional) Burglar Max", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"(Optional) Burglar Anson" : {
  name: "(Optional) Burglar Anson", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Route 22 (Bulbasaur)" : {
  name: "Gary - Route 22 (Bulbasaur)", 
  "rules": "Permanent Swamp (Player's Pokemon Speed stat is Quartered", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Route 22 (Charmander)" : {
  name: "Gary - Route 22 (Charmander)", 
  "rules": "Permanent Magma Storm (Fire types are Immune)", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Route 22 (Squirtle)" : {
  name: "Gary - Route 22 (Squirtle)", 
  "rules": "Permanent Rain + Rival has Serene Grace effect", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Brendan - Route 23" : {
  name: "Brendan - Route 23", 
  "rules": "Permanent Swamp (Player's Pokemon Speed stat is Quartered", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Naomi" : {
  name: "Ace Trainer Naomi", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Ronaldo" : {
  name: "Ace Trainer Ronaldo", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer George" : {
  name: "Ace Trainer George", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Caroline" : {
  name: "Ace Trainer Caroline", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Colby" : {
  name: "Ace Trainer Colby", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Alexa" : {
  name: "Ace Trainer Alexa", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Ace Trainer Ray & Ace Trainer Tyra" : {
  name: "Ace Trainer Ray & Ace Trainer Tyra", 
  "rules": "", 
  "format": "Doubles", 
  "partner": "yes", 
  "myPartner": ""
},
"Lorelei - Rain Team" : {
  name: "Lorelei - Rain Team", 
  "rules": "Permanent Primordial Sea", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Lorelei - Snow Team" : {
  name: "Lorelei - Snow Team", 
  "rules": "Permanent Snow", 
  "format": "Doubles", 
  "partner": "True", 
  "myPartner": ""
},
"Bruno - Team 1" : {
  name: "Bruno - Team 1", 
  "rules": "Permanent Misty Terrain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Bruno - Team 2" : {
  name: "Bruno - Team 2", 
  "rules": "Permanent Misty Terrain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Agatha" : {
  name: "Agatha", 
  "rules": "Permanent Psychic Terrain", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Lance" : {
  name: "Lance", 
  "rules": "Can't remove Hazards", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Champion (Bulbasaur)" : {
  name: "Gary - Champion (Bulbasaur)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Champion (Charmander)" : {
  name: "Gary - Champion (Charmander)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
},
"Gary - Champion (Squirtle)"   : {
  name: "Gary - Champion (Squirtle)", 
  "rules": "", 
  "format": "Singles", 
  "partner": "", 
  "myPartner": ""
}
} 

const pokemonOrderMap = {
  "Rival Gary - Pallet Town (Bulbasaur)": "Bulbasaur",
  "Rival Gary - Pallet Town (Charmander)": "Charmander",
  "Rival Gary - Pallet Town (Squirtle)": "Squirtle",
  "(Optional) Gary - Route 22 (Bulbasaur)": "Snubbull",
  "(Optional) Gary - Route 22 (Charmander)": "Snubbull",
  "(Optional) Gary - Route 22 (Squirtle)": "Snubbull",
  "Brendan - Viridian Forest": "Meditite",
  "Lass Anne": "Stufful",
  "Catcher Sammy": "Kricketune",
  "Jhoto Leader Falkner": "Trumbeak",
  "Brock": "Hippopotas",
  "Lass Sally": "Pikachu-Flying",
  "Super Nerd Miguel": ["Thwackey", "Voltorb-Hisui"],
  "Archer - Mt. Moon": "Glimmet",
  "Gary - Cerulean City (Bulbasaur)": "Hitmonchan",
  "Gary - Cerulean City (Charmander)": "Hitmontop",
  "Gary - Cerulean City (Squirtle)": "Hitmonlee",
  "Catcher Cale": ["Vivillon", "Butterfree"],
  "Lass Ali": ["Jigglypuff", "Amaura"],
  "Youngster Timmy": ["Plusle", "Electrike"],
  "Lass Reli": "Greedent",
  "Camper Ethan": "Mabosstiff",
  "Rocket Grunt - Nugget Bridge": "Arcanine",
  "(Optional) Bugsy (Pre-Surge)": "Kleavor",
  "(Optional) Bugsy (Post-Surge)": "Kleavor",
  "Misty": "Politoed",
  "Rocket Grunt - Dig House": "Persian-Alola",
  "Camper Jeff": ["Ambipom", "Mr. Mime-Galar"],
  "Lass Ann": "Samurott",
  "Gentleman Brooks": "Decidueye",
  "Sailor Edmond": "Cradily",
  "Sailor Trevor": "Cramorant",
  "Brendan - S.S Anne": "Crawdaunt",
  "(Optional) Whitney": "Pyroar",
  "Gentleman Tucker": "Alakazam",
  "Lt. Surge": "Rotom-Frost",
  "Picknicker Alicia": "Roserade",
  "Picknicker Caitlin": "Smeargle",
  "Picknicker Dana": "Ribombee",
  "Maniac Herman": ["Ninetales", "Victreebel"],
  "(Optional) Morty": "Krookodile",
  "Super Nerd Aidan": ["Armarouge", "Tsareena"],
  "Ace Trainer Mary": ["Weavile", "Coalossal"],
  "Erika": "Cradily",
  "Rocket Game Corner Guard": "Samurott-Hisui",
  "Rocket Left Guard - Rocket Hideout": ["Weezing-Galar", "Slaking"],
  "Rocket Right Guard - Rocket Hideout": "Stunfisk",
  "Giovanni - Rocket Hideout": "Infernape",
  "Channeler Ruth": ["Pincurchin", "Grimmsnarl"],
  "Ghost": "Marowak-Alola",
  "Rocket Grunt 1 - Pokemon Tower": "Pelipper",
  "Rocket Grunt 2 - Pokemon Tower": "Klefki",
  "Rocket Grunt 3 - Pokemon Tower": "Slurpuff",
  "Gary - Silph Co. (Bulbasaur)": "Azelf",
  "Gary - Silph Co. (Charmander)": "Azelf",
  "Gary - Silph Co. (Squirtle)": "Azelf",
  "Ariana - Silph Co.": "Incineroar",
  "Archer - Silph Co.": "Articuno-Galar",
  "Brendan - Silph Co.": "Masquerain",
  "Giovanni - Silph Co.": "Mamoswine",
  "(Optional) Ace Trainer Cole": "Druddigon",
  "(Optional) Beauty Sam": "Tapu Koko",
  "(Optional) Beauty Shelly": "Dodrio",
  "(Optional) Chuck": "Cobalion",
  "Sabrina": ["Tapu Fini", "Camerupt"],
  "(Optional) Dumass Kid": "Beartic",
  "Rocker Luca": "Rotom-Frost",
  "Camper Justin": "Darmanitan-Galar",
  "Fisherman Andrew": "Froslass",
  "Bird Keeper Sebastian": "Landorus-Therian",
  "Picknicker Susie": "Shiftry",
  "Picknicker Alma": "Krookodile",
  "Beauty Lola": "Cherrim",
  "Beauty Sheila": "Goodra",
  "Bird Keeper Perry": "Rhyperior",
  "Biker Jared": "Crustle",
  "Bird Keeper Robert": "Exeggutor",
  "(Optional) Ace Trainer Haley": "Silvally-Fairy",
  "Biker Lao": "Mienshao",
  "Cue Ball Koji": "Kingler",
  "Cue Ball Luke": "Zygarde-10%",
  "Biker Ruben": "Accelgor",
  "Cue Ball Camron": "Swampert",
  "Biker Hideo": "Stunfisk",
  "Biker William": "Magnezone",
  "Bird Keeper Jacob": "Cramorant-Gorging",
  "(Optional) Tamer Ramiro": ["Regice", "Milotic"],
  "Ace Trainer Wilton": "Dragapult",
  "Brendan - Safari Zone": "Gengar",
  "Brock (Rematch)": "Terrakion",
  "Misty (Rematch)": "Iron Bundle",
  "Lt. Surge (Rematch)": "Pawmot",
  "(Optional) Erika (Rematch)": "Meowscarada",
  "Juggler Kayden": "Mr. Mime",
  "Koga": "Tapu Lele",
  "(Optional) Dumass Jojo Fan": "Hoopa-Unbound",
  "(Optional) Pryce - Team 1": "Jynx",
  "(Optional) Pryce - Team 2": "Sandslash-Alola",
  "May": "Aggron",
  "(Optional) Jasmine": "Gliscor",
  "(Optional) Scientist Ted": "Froslass",
  "Burglar Lewis": ["Arcanine", "Rillaboom"],
  "Ace Trainer Derek": "Zapdos-Galar",
  "Ace Trainer Lucy": "Lycanroc",
  "Ace Trainer Zac": ["Cinderace", "Salamence"],
  "Blaine": "Sandy Shocks",
  "Rocket Grunt 1 - Cerulean Cave": "Glimmora",
  "Rocket Grunt 2 - Cerulean Cave": "Grimmsnarl",
  "Archer - Cerulean Cave": "Ninetales",
  "Ariana - Cerulean Cave": "Wailord",
  "Giovanni - Cerulean Cave": ["Spiritomb", "Delphox"],
  "Lance - Cerulean Cave": "Dragapult",
  "(Optional) Black Belt Ketchup": "Galvantula",
  "(Optional) Black Belt Ketchup (Rematch)": "Necrozma",
  "Clair": "Shuckle",
  "Gary - Route 22 (Bulbasaur)": "Iron Hands",
  "Gary - Route 22 (Charmander)": "Charizard",
  "Gary - Route 22 (Squirtle)": "Zapdos",
  "Brendan - Route 23": "Tyrantrum",
  "Ace Trainer Naomi": "Maushold",
  "Ace Trainer Ronaldo": "Cyclizar",
  "Ace Trainer George": "Metagross",
  "Ace Trainer Caroline": "Lopunny",
  "Ace Trainer Colby": "Arcanine",
  "Ace Trainer Alexa": "Clefable",
  "Ace Trainer Ray": "Scrafty",
  "Ace Trainer Tyra": "Darmanitan",
  "Lorelei - Rain Team": ["Ludicolo", "Iron Bundle"],
  "Lorelei - Snow Team": ["Glaceon", "Landorus-Therian"],
  "Bruno - Team 1": "Infernape",
  "Bruno - Team 2": "Urshifu",
  "Agatha": "Krookodile",
  "Lance": "Glimmora",
  "Gary - Champion (Bulbasaur)": "Kyogre-Primal",
  "Gary - Champion (Charmander)": "Groudon-Primal",
  "Gary - Champion (Squirtle)": "Kyogre-Primal"
};
  // "Lass Reli": "Lass Reli Route 24",
  // "Biker Lao": "Biker Lao Route 15",


for (const [trainerName, team] of Object.entries(trainerSets)) {

  if (!team) {
    console.warn(`${trainerName}`)
    continue
  }

  const newTeam = {};

  if (!team.trainerInfo) {
    console.warn(`${trainerName} doesn't have any trainerInfo`); 
    continue; 
  }

  newTeam.trainerInfo = myTrainerInfo[trainerName];

  for (const [pokemonName, trainerPokemon] of Object.entries(team)) {
    
    if (pokemonName === "trainerInfo") continue;

    const newPokemon = {};

    if (!(pokemonName in species2)) throw new Error (`${pokemonName} doesn't exist in my list of pokemon`)
    const pokemon = species2[pokemonName !== "Greninja-Ash" ? pokemonName.replace('-Mega-Y', '').replace('-Mega-X', '').replace('-Mega', '') : "Greninja"];
    if (!pokemon) throw new Error (`Yeah ${pokemonName} doesn't exist buddy`);
    
    // name 
    newPokemon.name = pokemon.name;
    
    newPokemon.form = pokemon.name

    // ID 
      newPokemon.ID = species2[pokemonName].ID;
    // sprite 
      newPokemon.sprite = pokemon.sprite;
    // type1 
      newPokemon.type1 = pokemon.type1;
    // type2 
      newPokemon.type2 = pokemon.type1 === pokemon.type2 ? 'None': pokemon.type2;
    // gender 
      newPokemon.gender = "B";

      const femalePokemon = ["Alcremie", "Blissey", "Bounsweet", "Chansey", "Cresselia", "Enamorus", 
    "Flabébé", "Floette", "Florges", "Froslass", "Happiny", "Hatenna", 
    "Hatterene", "Hattrem", "Illumise", "Jynx", "Kangaskhan", "Latias", 
    "Lilligant", "Mandibuzz", "Milcery", "Miltank", "Nidoqueen", "Nidoran♀", 
    "Nidorina", "Ogerpon", "Petilil", "Salazzle", "Smoochum", "Steenee", 
    "Tinkatink", "Tinkaton", "Tinkatuff", "Tsareena", "Vespiquen", "Vullaby", 
    "Wormadam"
    ]

    const malePokemon = ["Braviary", "Fezandipiti", "Gallade", "Grimmsnarl", "Hitmonchan", 
    "Hitmonlee", "Hitmontop", "Impidimp", "Landorus", "Latios", 
    "Morgrem", "Mothim", "Munkidori", "Nidoking", "Nidoran♂", 
    "Nidorino", "Okidogi", "Rufflet", "Sawk", "Tauros", 
    "Throh", "Thundurus", "Tornadus", "Tyrogue", "Volbeat"]; 

    const genderlessNames = [
    "Magnemite", "Magneton", "Voltorb", "Electrode", "Staryu", "Starmie", "Ditto", "Porygon", 
    "Articuno", "Zapdos", "Moltres", "Mewtwo", "Mew", "Unown", "Porygon2", "Raikou", "Entei", 
    "Suicune", "Lugia", "Ho-Oh", "Celebi", "Shedinja", "Lunatone", "Solrock", "Baltoy", 
    "Claydol", "Beldum", "Metang", "Metagross", "Regirock", "Regice", "Registeel", "Kyogre", 
    "Groudon", "Rayquaza", "Jirachi", "Deoxys", "Bronzor", "Bronzong", "Magnezone", "Porygon-Z", 
    "Rotom", "Uxie", "Mesprit", "Azelf", "Dialga", "Palkia", "Regigigas", "Giratina", "Phione", 
    "Manaphy", "Darkrai", "Shaymin", "Arceus", "Victini", "Klink", "Klang", "Klinklang", 
    "Cryogonal", "Golett", "Golurk", "Cobalion", "Terrakion", "Virizion", "Reshiram", "Zekrom", 
    "Kyurem", "Keldeo", "Meloetta", "Genesect", "Carbink", "Xerneas", "Yveltal", "Zygarde", 
    "Diancie", "Hoopa", "Volcanion", "Type: Null", "Silvally", "Minior", "Dhelmise", 
    "Tapu Koko", "Tapu Lele", "Tapu Bulu", "Tapu Fini", "Cosmog", "Cosmoem", "Solgaleo", 
    "Lunala", "Nihilego", "Buzzwole", "Pheromosa", "Xurkitree", "Celesteela", "Kartana", 
    "Guzzlord", "Necrozma", "Magearna", "Marshadow", "Poipole", "Naganadel", "Stakataka", 
    "Blacephalon", "Zeraora", "Meltan", "Melmetal", "Sinistea", "Polteageist", "Falinks", 
    "Dracozolt", "Arctozolt", "Dracovish", "Arctovish", "Zacian", "Zamazenta", "Eternatus", 
    "Zarude", "Regieleki", "Regidrago", "Glastrier", "Spectrier", "Calyrex", "Tandemaus", 
    "Maushold", "Great Tusk", "Scream Tail", "Brute Bonnet", "Flutter Mane", "Slither Wing", 
    "Sandy Shocks", "Iron Treads", "Iron Bundle", "Iron Hands", "Iron Jugulis", "Iron Moth", 
    "Iron Thorns", "Gimmighoul", "Gholdengo", "Wo-Chien", "Chien-Pao", "Ting-Lu", "Chi-Yu", 
    "Roaring Moon", "Iron Valiant", "Koraidon", "Miraidon", "Walking Wake", "Iron Leaves", 
    "Poltchageist", "Sinistcha", "Gouging Fire", "Raging Bolt", "Iron Boulder", "Iron Crown", 
    "Pecharunt"]

    if (femalePokemon.includes(pokemon.name)) gender = "F";
    else if (malePokemon.includes(pokemon.name)) gender = "M"; 
    else if (genderlessNames.includes(pokemon.name)) gender = "N";

    newPokemon.femaleSprite = pokemon.femaleSprite;

    // level 
      newPokemon.level = trainerPokemon.level;
    // nature 
      newPokemon.nature = trainerPokemon.nature;
    // item  
      newPokemon.item = trainerPokemon.item;

    // ability 
      if (trainerPokemon.ability.includes('>')) {
        newPokemon.ability = trainerPokemon.ability.split('>')[0]
      } else {
          newPokemon.ability = trainerPokemon.ability;
      }

      const abilityIndex = pokemon.abilities.findIndex(ability => ability === trainerPokemon.ability);
    // abilities 
      newPokemon.abilities = [newPokemon.ability];
    // baseStats 
      newPokemon.baseStats = {
        HP: pokemon.baseHP, 
        Atk: pokemon.baseAttack, 
        Def: pokemon.baseDefense, 
        SpA: pokemon.baseSpAttack, 
        SpD: pokemon.baseSpDefense, 
        Spe: pokemon.baseSpeed
      };
    // EVs 
      newPokemon.EVs = {
        "HP": 0,
        "Atk": 0,
        "Def": 0,
        "SpA": 0,
        "SpD": 0,
        "Spe": 0
      };
    // IVs 
    // if (typeof(trainerPokemon.IVs) === "string") {

    //   const givenIVs = oldTrainerPokemon.IVs.split('/').map(IV => Number(IV.replace('E', '30').replace('O', '31'))); 
    //   newPokemon.IVs = {
    //     "HP": givenIVs[0],
    //     "Atk": givenIVs[1],
    //     "Def": givenIVs[2],
    //     "SpA": givenIVs[3],
    //     "SpD": givenIVs[4],
    //     "Spe": givenIVs[5]
    //   };

    // } else {
    //   newPokemon.IVs = trainerPokemon.IVs
    // }

    newPokemon.IVs = trainerPokemon.IVs

    const finalHp = stats.finalHP(newPokemon.baseStats.HP, newPokemon.EVs.HP, newPokemon.IVs.HP, newPokemon.level);
    const finalStats = {
        HP: finalHp, 
        ...stats.finalStats(newPokemon.baseStats, newPokemon.EVs, newPokemon.IVs, newPokemon.nature, newPokemon.level)
    };

    newPokemon.finalStats = finalStats
      
    // moveset 
      newPokemon.moveset = trainerPokemon.allMoves;
    //allMoves
      newPokemon.allMoves = trainerPokemon.allMoves;


    // alternateForms
      newPokemon.forms = {};
    
      // loop through forms and create another pokemon and store it in alternate forms 
        [newPokemon.form, ...pokemon.forms].forEach(form => {
                const pokemonForm = species2[form];

                const baseStats = {
                  HP: pokemonForm.baseHP, 
                  Atk: pokemonForm.baseAttack, 
                  Def: pokemonForm.baseDefense, 
                  SpA: pokemonForm.baseSpAttack, 
                  SpD: pokemonForm.baseSpDefense, 
                  Spe: pokemonForm.baseSpeed
                }

                const finalHp = stats.finalHP(baseStats.HP, newPokemon.EVs.HP, newPokemon.IVs.HP, newPokemon.level);
                const finalStats = {
                    HP: finalHp, 
                    ...stats.finalStats(baseStats, newPokemon.EVs, newPokemon.IVs, newPokemon.nature, newPokemon.level)
                };
           
                // console.log(newPokemon)

                newPokemon.forms[form] = {
                    formName: form, 
                    ID: pokemonForm.ID,
                    sprite: pokemonForm.sprite, 
                    type1: pokemonForm.type1, 
                    type2: pokemonForm.type1 === pokemonForm.type2 ? "None" : pokemonForm.type2,  
                    ability: pokemonForm.abilities[abilityIndex]  ? pokemonForm.abilities[abilityIndex] : (pokemonForm.abilities[abilityIndex - 1] ? pokemonForm.abilities[abilityIndex - 1] : pokemonForm.abilities[0]),
                    abilities: trainerPokemon.ability.split('>').length > 1 ? [trainerPokemon.ability.split('>')[1]] : pokemonForm.abilities, 
                    baseStats: {
                        HP: pokemonForm.baseHP, 
                        Atk: pokemonForm.baseAttack, 
                        Def: pokemonForm.baseDefense, 
                        SpA: pokemonForm.baseSpAttack, 
                        SpD: pokemonForm.baseSpDefense, 
                        Spe: pokemonForm.baseSpeed
                    }, 
                    'finalStats': finalStats,
                    allMoves: trainerPokemon.allMoves
                }

                // if form has hidden ability and main form doesn't, then something went wrong
                const hasHiddenAbility = abilityIndex === newPokemon.forms[form].abilities.length - 1;
                if (hasHiddenAbility && abilityIndex !== pokemon.abilities.length - 1) {
                newPokemon.forms[form].ability = newPokemon.forms[form].abilities[0];
            }
            })
        
    newTeam[pokemon.name] = newPokemon;

  }

  // 
  newTrainerSets[trainerName] = newTeam;
}

// --------------------
// Save Normalized Output
// --------------------

fs.writeFileSync("./updatedTrainerSets.json", JSON.stringify(newTrainerSets, null, 2), "utf8");

console.log("✅ updated the trainer sets");