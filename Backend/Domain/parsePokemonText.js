

const getPokemonInfo = (pokemonText, itemsList, megaStones, naturesList, movesList) => {

        const lines = pokemonText.split('\n');
        const findLine = (keyWord) => lines.find(line => line.includes(keyWord));

        const nameItemLine = lines[0].split('@'); 
        const levelLine = findLine("Level");
        const natureLine = findLine("Nature");
        const abilityLine = findLine("Ability").trim(); 

        let EVsLine = findLine("EVs");
        if (EVsLine) {
            EVsLine = EVsLine.split(': ')[1];
            EVsLine = EVsLine.split(" / ");
        } else {
            EVsLine = []; 
        }

        let IVsLine = findLine("IVs"); 
        if (IVsLine) {
            IVsLine = IVsLine.split(': ')[1];
            IVsLine = IVsLine.split(" / ");
        } else {
            IVsLine = []; 
        }
        
        let movesLines = lines.filter(line => line.trim().startsWith('- '));
        
        let level;
        let natureText;
        let ability;

        if (!levelLine) {
            level = 100;
        }
        if (!natureLine) {
            natureText = "Hardy";  
        }
        if (!abilityLine) {
            ability = ""
        }

        let name = nameItemLine[0].trim();
        let gender = 'Both';
        if (name.includes('(M)')) [name, gender] = [name.split('(M)')[0].trim(), 'M'];
        if (name.includes('(F)')) [name, gender] = [name.split('(F)')[0].trim(), 'F'];
        let itemText = nameItemLine.length > 1 ? nameItemLine[1].trim() : "";
        if (levelLine) level = Number(levelLine.slice(levelLine.indexOf(" ") + 1));
        if (natureLine) natureText = natureLine.slice(0, natureLine.indexOf(" ")); 
        if (abilityLine) ability = abilityLine.slice(abilityLine.indexOf(" ") + 1);
        let moves = movesLines.map(move => move.slice(2).trim());
        let EVs = {HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0};
        let IVs = {HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31}; 
        let item;

        if (!itemsList[itemText] && !(itemText === megaStones[name])) item = "None";
        if (!level) level = 100;
        if (!naturesList[natureText]) natureText = "Hardy";

        if (naturesList[natureText]) nature = naturesList[natureText];
        if (itemsList[itemText]) item = itemsList[itemText];

        moves.map(move => move in movesList ? move : '');

        for (let i = moves.length; i < 4; i++) {
            moves.push('None');
        }

        EVsLine.forEach(stat => {
            stat = stat.split(" "); 
            EVs[stat[1]] = Number(stat[0]); 
        })
        
        IVsLine.forEach(stat => {
            stat = stat.split(" "); 
            IVs[stat[1]] = Number(stat[0]);
        })



        return { name, gender, item, level, nature, ability, moves, EVs, IVs }

    }

module.exports = getPokemonInfo;