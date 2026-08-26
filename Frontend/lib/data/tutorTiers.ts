export type TutorTier = {
  tier: number
  newMoves: string[]
}

// Display copy only, mirrors Backend/Models/avaliableTutors+TMS/tutorEggMoveInfo.js.
// Each tier is cumulative server-side; the resolver is the source of truth for legality.
export const TUTOR_TIERS: TutorTier[] = [
  { tier: 0, newMoves: ["Bug Bite"] },
  { tier: 1, newMoves: ["Stomping Tantrum"] },
  { tier: 2, newMoves: ["Fire Punch", "Ice Punch", "Thunder Punch", "Fire Fang", "Ice Fang", "Thunder Fang", "Psychic Fangs"] },
  { tier: 3, newMoves: ["Play Rough", "Iron Head", "Liquidation"] },
  { tier: 4, newMoves: ["Hydro Pump", "Drill Run", "Blaze Kick", "Pain Split", "Zen Headbutt", "Weather Ball", "Air Slash", "Hex", "Mystical Fire", "Leaf Blade", "Knock Off", "Power Gem", "Rock Blast", "Pin Missile", "Icicle Spear", "Tail Slap", "Body Slam", "Foul Play"] },
  { tier: 5, newMoves: ["Thunder Wave"] },
  { tier: 6, newMoves: ["Earth Power"] },
  { tier: 7, newMoves: ["Aura Sphere", "Heat Wave", "Hurricane", "Power Whip", "High Horsepower", "Bug Buzz", "Phantom Force", "Flare Blitz", "Stored Power", "Gunk Shot", "Megahorn"] },
]
