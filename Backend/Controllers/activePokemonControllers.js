const { checkMega, changeActiveForm } = require('../Services/formService');


const getOtherForms = (req, res) => {
    const player = Number(req.params.player); 
    const { pokemon } = req.body; 

    return res.status(200).json({
        message: `successfully retrieved the other forms of ${pokemon.name}`, 
        forms: pokemon.alternateForms
    })
 
} 

const changeForm = (req, res) => {
    // name of the new form and active pokemon
    const player = Number(req.params.player)
    const newFormName = req.params.newFormName
    const { pokemon } = req.body

    if (!pokemon.alternateForms[newFormName]) return res.status(404).json({message: `${newFormName} isn't a form of ${pokemon.name}`})
    const desiredForm = changeActiveForm(pokemon, newFormName)

    return res.status(200).json({
        message: `${pokemon.name} successfully changed to ${newFormName}`, 
        newForm: desiredForm
    });

} 

const resetForm = (req, res) => {
    // assuming I dragged the pokemon back or something reset it to it's default form
    const player = Number(req.params.player); 
    const { pokemon } = req.body; 

    if (pokemon.form === pokemon.name) return res.status(200).json({message: `${pokemon.name} is already in it's original form`, pokemon})
    if (!pokemon.alternateForms[pokemon.name]) return res.status(400).json({message: `Can't find the original form of ${pokemon.form}`})

    const givenForm = pokemon.form;
    const defaultForm = changeActiveForm(pokemon, pokemon.name);

    return res.status(200).json({
        message: `Successfully reset ${givenForm} to ${pokemon.name}`, 
        pokemon: defaultForm
    });
}

module.exports = { getOtherForms, changeForm, resetForm };