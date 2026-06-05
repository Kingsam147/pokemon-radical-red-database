"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Save, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

import { Pokemon, Natures, Items, PokemonStatuses, PokemonStats, Gender, TrainerInfo } from "@/lib/utils/types.ts"
import { getStatusStyle } from "@/lib/utils/formatters.ts"
import { ITEM_SPRITE, FEMALE_POKEMON_SPRITES, IS_MEGA_ITEM, MEGA_SYMBOL } from "@/lib/utils/sprites"
import PokemonEditor from "@/components/PokemonEditor/pokemonEditor"
import "./teamBench.css"

type Hazards = {
  spikes: number;
  tSpikes: number;
  sRock: boolean;
  reflect: boolean;
  lightScreen: boolean;
  protect: boolean;
  stickyWebs: boolean;
  leechSeed: boolean;
  helpingHand: boolean;
  tailWind: boolean;
  flowerGift: boolean;
  friendGuard: boolean;
  auroraVeil: boolean;
  switchingOut: boolean;
}

type TeamBenchProps = {
  player: 1 | 2;
  teamNames: string[];
  selectedTeamIndex: string;
  bench: (Pokemon | null)[];
  player1Bench: (Pokemon | null)[];
  player2Bench: (Pokemon | null)[];
  activeIndices: number[];
  battleMode: "singles" | "doubles";
  doublesType: "True" | "Partner" | "None";
  p1Hazards: Hazards;
  p2Hazards: Hazards;
  activeEffects: string[];
  natureOptions: Natures;
  itemOptions: Items;
  statusOptions: PokemonStatuses;
  onTeamChange: (player: 1 | 2, teamName: string) => void;
  onDragStart: (pokemon: Pokemon, source: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDropOnBench: (player: 1 | 2, index: number) => void;
  onRemoveFromBench: (player: 1 | 2, index: number) => void;
  toggleHazard: (player: 1 | 2, key: string) => void;
  updatePokemonForm: (player: 1 | 2, slotIndex: number, newFormName: string) => void;
  updatePokemonHp: (player: 1 | 2, slotIndex: number, newHp: number) => void;
  updatePokemonStatus: (player: 1 | 2, slotIndex: number, statusName: string) => void;
  updatePokemonNature: (player: 1 | 2, slotIndex: number, natureName: string) => void;
  updatePokemonItem: (player: 1 | 2, slotIndex: number, itemName: string) => void;
  updatePokemonAbility: (player: 1 | 2, slotIndex: number, abilityName: string) => void;
  updateAbilityToggle: (player: 1 | 2, slotIndex: number, toggledOn: boolean) => void;
  updatePokemonMove: (player: 1 | 2, slotIndex: number, moveIndex: number, newMoveName?: string, newType?: string, newCategory?: string) => void;
  updatePokemonGender: (player: 1 | 2, slotIndex: number, gender: Gender) => void;
  updatePokemonStat: (player: 1 | 2, slotIndex: number, statCategory: "baseStats" | "IVs" | "EVs" | "statBoosts", statName: keyof PokemonStats, value: string) => void;
  updatePokemonLevel: (player: 1 | 2, slotIndex: number, level: string) => void;
  faintPokemon: (player: 1 | 2, slotIndex: number) => void;
  // Player 1 specific
  onSaveTeam?: () => void;
  onDeleteTeam?: () => void;
  // Player 2 specific
  trainerInfo?: TrainerInfo | null;
  onNavigate?: (direction: "prev" | "next") => void;
}

export default function TeamBench({
  player,
  teamNames,
  selectedTeamIndex,
  bench,
  player1Bench,
  player2Bench,
  activeIndices,
  battleMode,
  doublesType,
  p1Hazards,
  p2Hazards,
  activeEffects,
  natureOptions,
  itemOptions,
  statusOptions,
  onTeamChange,
  onDragStart,
  onDragOver,
  onDropOnBench,
  onRemoveFromBench,
  toggleHazard,
  updatePokemonForm,
  updatePokemonHp,
  updatePokemonStatus,
  updatePokemonNature,
  updatePokemonItem,
  updatePokemonAbility,
  updateAbilityToggle,
  updatePokemonMove,
  updatePokemonGender,
  updatePokemonStat,
  updatePokemonLevel,
  faintPokemon,
  onSaveTeam,
  onDeleteTeam,
  trainerInfo,
  onNavigate,
}: TeamBenchProps) {
  const isP1 = player === 1;
  const playerKey = isP1 ? "p1" : "p2";

  const getBenchSlotClass = (index: number) => {
    if (isP1) return "team-bench-slot team-bench-slot-p1";
    if (doublesType === "Partner" && index > 2) return "team-bench-slot team-bench-slot-p2-partner";
    return "team-bench-slot team-bench-slot-p2";
  };

  return (
    <Card className={isP1 ? "" : "team-bench-card-p2"}>
      <CardHeader>
        <CardTitle className={isP1 ? "team-bench-title-p1" : "team-bench-title-p2"}>
          {isP1 ? "Player 1 Team" : "Player 2 Team"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="team-bench-selector-row">
          <div className="team-bench-selector-controls">
            {!isP1 && (
              <button
                type="button"
                onClick={() => onNavigate?.("prev")}
                title="Previous Team"
                className="team-bench-nav-button"
                aria-label="Previous Team"
              >
                <ChevronLeft />
              </button>
            )}
            <label htmlFor={`${playerKey}-team-select`} className="sr-only">
              {isP1 ? "Player 1 Team" : "Player 2 Team"}
            </label>
            <select
              id={`${playerKey}-team-select`}
              title={isP1 ? "Select Player 1 Team" : "Select Player 2 Team"}
              className={`team-bench-select ${isP1 ? "team-bench-select-p1" : "team-bench-select-p2"}`}
              value={selectedTeamIndex}
              onChange={(e) => onTeamChange(player, e.target.value)}
              aria-label={isP1 ? "Select Team 1" : "Select Team 2"}
            >
              {isP1 && <option value="">Select a Team</option>}
              {teamNames.map((teamName) => (
                <option key={teamName} value={teamName}>{teamName}</option>
              ))}
            </select>
            {isP1 ? (
              <>
                <button type="button" onClick={onSaveTeam} className="team-bench-save-button" title="Save Team" aria-label="Save Team">
                  <Save size={20} />
                </button>
                <button type="button" onClick={onDeleteTeam} className="team-bench-delete-button" title="Clear Team" aria-label="Clear Team">
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.("next")}
                title="Next Team"
                className="team-bench-nav-button"
                aria-label="Next Team"
              >
                <ChevronRight />
              </button>
            )}
          </div>
        </div>

        {!isP1 && trainerInfo && trainerInfo.rules !== "" && (
          <div className="team-bench-trainer-info">
            <p className="team-bench-trainer-info-label">Condition: </p>
            <p className="font-weight-black">{trainerInfo.rules}</p>
          </div>
        )}

        <div className={`team-bench-active-area ${isP1 ? "team-bench-active-area-p1" : "team-bench-active-area-p2"}`}>
          <p className="team-bench-active-area-label">Active Pokemon (First Bench Slot)</p>
          {activeIndices.map((idx) =>
            <PokemonEditor
              key={`${playerKey}-${idx}`}
              pokemon={bench[idx]}
              player={player}
              slotIndex={idx}
              teamName={isP1 ? (selectedTeamIndex || undefined) : undefined}
              battleMode={battleMode}
              doublesType={doublesType}
              toggleHazard={toggleHazard}
              p1Hazards={p1Hazards}
              p2Hazards={p2Hazards}
              activeEffects={activeEffects}
              natureOptions={natureOptions}
              itemOptions={itemOptions}
              statusOptions={statusOptions}
              updatePokemonForm={updatePokemonForm}
              updatePokemonHp={updatePokemonHp}
              updatePokemonStatus={updatePokemonStatus}
              updatePokemonNature={updatePokemonNature}
              updatePokemonItem={updatePokemonItem}
              updatePokemonAbility={updatePokemonAbility}
              updateAbilityToggle={updateAbilityToggle}
              updatePokemonMove={updatePokemonMove}
              updatePokemonGender={updatePokemonGender}
              updatePokemonStat={updatePokemonStat}
              updatePokemonLevel={updatePokemonLevel}
              player1Bench={player1Bench}
              player2Bench={player2Bench}
              faintPokemon={faintPokemon}
            />
          )}
        </div>

        <div>
          <p className="team-bench-section-label">Bench (6 Pokemon)</p>
          <div className="team-bench-grid">
            {bench.map((pokemon, index) => (
              <div
                key={index}
                onDragOver={onDragOver}
                onDrop={() => onDropOnBench(player, index)}
                className={getBenchSlotClass(index)}
              >
                {pokemon && IS_MEGA_ITEM(pokemon.item.name) && (
                  <img
                    src={MEGA_SYMBOL}
                    alt="Mega Capable"
                    className="team-bench-mega-symbol"
                  />
                )}
                {pokemon ? (
                  <div draggable onDragStart={() => onDragStart(pokemon, `${playerKey}-bench-${index}`)}>
                    <div className="team-bench-pokemon-card">
                      {!isP1 && (
                        <Badge variant="outline" className="text-xs">
                          {pokemon.switchInScore}
                        </Badge>
                      )}
                      <img
                        src={(pokemon.gender === "F" && pokemon.femaleSprite) ?
                              FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                        alt={pokemon.name}
                        className="team-bench-pokemon-sprite"
                      />
                      {pokemon.status.name !== "Healthy" && (
                        <div className="team-bench-status-banner-wrapper">
                          <div className={`team-bench-status-banner ${getStatusStyle(pokemon.status.name)}`}>
                            {pokemon.status.name}
                          </div>
                        </div>
                      )}
                      <p className="team-bench-pokemon-name">{pokemon.name}</p>
                      <p className="team-bench-pokemon-level">Lv.{pokemon.level}</p>
                      <Badge variant="outline" className="team-bench-ability-badge">
                        {pokemon.ability ? pokemon.ability.name : "None"}
                      </Badge>
                      {pokemon.ability.toggle && (
                        <label className="team-bench-ability-toggle-label" title="Toggle ability effect">
                          <input
                            type="checkbox"
                            title="Toggle ability effect"
                            checked={pokemon.ability.toggledOn ?? false}
                            onChange={(e) => updateAbilityToggle(player, index, e.target.checked)}
                            className="team-bench-ability-toggle-input"
                          />
                        </label>
                      )}
                      <span className="team-bench-item-wrapper">
                        <Badge variant="outline" className="team-bench-item-badge">
                          <img className="team-bench-item-sprite" src={ITEM_SPRITE(pokemon.item.name)} alt={`${pokemon.item.name} icon`} />
                          {pokemon.item.name}
                        </Badge>
                      </span>
                      {pokemon.status.name !== "Healthy" && (
                        <span className={`team-bench-status-pill ${getStatusStyle(pokemon.status.name)}`}>
                          {pokemon.status.name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Remove ${pokemon.name} from bench`}
                        className="team-bench-remove-button"
                        onClick={() => onRemoveFromBench(player, index)}
                      >
                        <X className="team-bench-remove-icon" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="team-bench-empty-slot">
                    Empty
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
