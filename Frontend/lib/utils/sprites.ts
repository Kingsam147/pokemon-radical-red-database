export const MEGA_SYMBOL = "/mega-stone.jpg";

const CLOUDINARY_URL = "https://res.cloudinary.com/dqfuunqw/image/upload"
export const ITEM_SPRITE = (itemName: string) => `${CLOUDINARY_URL}/items/${itemName.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}.png`
export const TYPE_SPRITES = (typeName: string) => `${CLOUDINARY_URL}/types/generation-viii/brilliant-diamond-and-shining-pearl/${typeName}.png`
export const TYPE_ICONS = (typeName: string) => `${CLOUDINARY_URL}/types/icons/${typeName}.jpg`
export const POKEMON_SPRITES = (pokemonID: string) => `${CLOUDINARY_URL}/pokemon/${pokemonID}.png`
export const FEMALE_POKEMON_SPRITES = (pokemonID: string) => `${CLOUDINARY_URL}/pokemon/female/${pokemonID}.png`

export const IS_MEGA_ITEM = (itemName: string) => {
  const megaItems = ['Mega Stone', 'Flapplite', 'Appletunite', 'Charizardite-X', 'Charizardite-Y', 'Mewtwonite-X', 'Mewtwonite-Y']; 
  return megaItems.includes(itemName);
}