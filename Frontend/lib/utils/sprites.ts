export const MEGA_SYMBOL = "/mega-stone.jpg";

const S3_URL = "https://pokemon-radical-red.s3.us-east-2.amazonaws.com"
export const ITEM_SPRITE = (itemName: string) => `${S3_URL}/items/${itemName.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}.png`
export const TYPE_SPRITES = (typeName: string) => `${S3_URL}/types/generation-viii/brilliant-diamond-and-shining-pearl/${typeName}.png`
export const TYPE_ICONS = (typeName: string) => `${S3_URL}/types/icons/${typeName}.jpg`
export const POKEMON_SPRITES = (pokemonID: string) => `${S3_URL}/pokemon/${pokemonID}.png`
export const FEMALE_POKEMON_SPRITES = (pokemonID: string) => `${S3_URL}/pokemon/female/${pokemonID}.png`

export const IS_MEGA_ITEM = (itemName: string) => {
  const megaItems = ['Mega Stone', 'Flapplite', 'Appletunite', 'Charizardite-X', 'Charizardite-Y', 'Mewtwonite-X', 'Mewtwonite-Y']; 
  return megaItems.includes(itemName);
}