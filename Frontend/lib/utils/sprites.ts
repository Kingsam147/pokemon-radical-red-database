export const MEGA_SYMBOL = "/mega-stone.jpg";

const R2_URL = "https://pub-2fd2f404c7e245579c617852a1983848.r2.dev"
export const ITEM_SPRITE = (itemName: string) => `${R2_URL}/items/${itemName.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}.png`
export const TYPE_SPRITES = (typeName: string) => `${R2_URL}/types/generation-viii/brilliant-diamond-and-shining-pearl/${typeName}.png`
export const TYPE_ICONS = (typeName: string) => `${R2_URL}/types/icons/${typeName}.jpg`
export const POKEMON_SPRITES = (pokemonID: string) => `${R2_URL}/pokemon/${pokemonID}.png`
export const FEMALE_POKEMON_SPRITES = (pokemonID: string) => `${R2_URL}/pokemon/female/${pokemonID}.png`

export const IS_MEGA_ITEM = (itemName: string) => {
  const megaItems = ['Mega Stone', 'Flapplite', 'Appletunite', 'Charizardite-X', 'Charizardite-Y', 'Mewtwonite-X', 'Mewtwonite-Y']; 
  return megaItems.includes(itemName);
}