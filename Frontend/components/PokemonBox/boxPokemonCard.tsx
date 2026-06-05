"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { Pokemon } from "@/lib/utils/types.ts"
import { FEMALE_POKEMON_SPRITES } from "@/lib/utils/sprites"
import "./boxPokemonCard.css"

type BoxPokemonCardProps = {
  pokemon: Pokemon;
  slotKey: string;
  boxIndex: number;
  removeMode: boolean;
  isInBench: boolean;
  onDragStart: (pokemon: Pokemon, source: string) => void;
  onToggleInBench: () => void;
  onRemoveFromBox: () => Promise<void>;
}

export default function BoxPokemonCard({
  pokemon,
  slotKey,
  boxIndex,
  removeMode,
  isInBench,
  onDragStart,
  onToggleInBench,
  onRemoveFromBox,
}: BoxPokemonCardProps) {
  return (
    <div
      className={`box-pokemon-card ${removeMode ? "box-pokemon-card-remove-mode" : ""}`}
      onClick={async () => {
        if (!removeMode) return;
        if (!window.confirm(`Remove ${pokemon.name} from this box?`)) return;
        await onRemoveFromBox();
      }}
    >
      <div
        draggable
        onDragStart={() => onDragStart(pokemon, `box-${boxIndex}-${slotKey}`)}
        className="box-pokemon-drag-handle group"
      >
        <img
          src={(pokemon.gender === "F" && pokemon.femaleSprite) ?
                FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
          alt={pokemon.name}
          className="box-pokemon-sprite"
        />
        <div className="box-pokemon-tooltip">
          <p className="box-pokemon-tooltip-name">{pokemon.name}</p>
          <p>Lv.{pokemon.level}</p>
          <p>{pokemon.nature.name}</p>
          <p>{pokemon.item.name}</p>
        </div>
      </div>

      <div className="box-pokemon-types">
        {pokemon.types.map((type) => (
          <div
            key={type.name}
            className={`box-pokemon-type-badge type-bg-${type.name.toLowerCase()} type-border-${type.name.toLowerCase()}`}
          >
            {type.name}
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant={isInBench ? "destructive" : "default"}
        title={isInBench ? `Remove ${pokemon.name} from team` : `Add ${pokemon.name} to team`}
        className="box-pokemon-bench-button"
        onClick={() => onToggleInBench()}
      >
        {isInBench ? (
          <>
            <X className="box-pokemon-bench-icon-remove" />
            Remove
          </>
        ) : (
          <>
            <Plus className="box-pokemon-bench-icon-add" />
            Add
          </>
        )}
      </Button>
    </div>
  );
}
