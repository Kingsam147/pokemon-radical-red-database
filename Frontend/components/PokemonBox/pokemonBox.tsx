"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Plus, Trash2 } from "lucide-react"
import { Pokemon, Box } from "@/lib/utils/types.ts"
import BoxPokemonCard from "@/components/PokemonBox/boxPokemonCard"
import "./pokemonBox.css"

type PokemonBoxProps = {
  p1Boxes: Box[];
  p1BoxNames: string[];
  activeBoxIndex: number;
  removeMode: boolean;
  onActiveBoxChange: (index: number) => void;
  isInBench: (pokemon: Pokemon, player: 1 | 2) => boolean;
  onDragStart: (pokemon: Pokemon, source: string) => void;
  onTogglePokemonInBench: (pokemon: Pokemon, player: 1 | 2) => void;
  onRemoveFromBox: (boxIndex: number, pokemonName: string) => Promise<void>;
  onAddBox: () => void;
  onClearBox: () => void;
  onRemoveBox: () => void;
  onImportOpen: () => void;
  onToggleRemoveMode: () => void;
}

export default function PokemonBox({
  p1Boxes,
  p1BoxNames,
  activeBoxIndex,
  removeMode,
  onActiveBoxChange,
  isInBench,
  onDragStart,
  onTogglePokemonInBench,
  onRemoveFromBox,
  onAddBox,
  onClearBox,
  onRemoveBox,
  onImportOpen,
  onToggleRemoveMode,
}: PokemonBoxProps) {
  return (
    <Card>
      <CardHeader>
        <div className="pokemon-box-header">
          <CardTitle>Pokemon Box</CardTitle>
          <div className="pokemon-box-actions">
            <button type="button" onClick={onAddBox} title="Add a new Pokemon box" className="pokemon-box-add-button" aria-label="Add Box">
              <div className="pokemon-box-button-inner">
                <p>Add Box</p>
                <Plus size={20} />
              </div>
            </button>

            <button type="button" onClick={onClearBox} title="Clear all Pokemon from current box" aria-label="Clear Box" className="pokemon-box-clear-button">
              <div className="pokemon-box-button-inner">
                <p>Clear Box</p>
                <Trash2 size={20} />
              </div>
            </button>

            <button type="button" onClick={onRemoveBox} title="Delete the current box permanently" aria-label="Delete Box" className="pokemon-box-delete-button">
              <div className="pokemon-box-button-inner">
                <p>Delete Box</p>
                <X />
              </div>
            </button>

            <button
              type="button"
              onClick={onImportOpen}
              title="Import Pokemon from import text"
              aria-label="Import Pokemon"
              className="pokemon-box-import-button"
              data-testid="open-import-modal"
            >
              <div className="pokemon-box-button-inner-tall">
                <p>Import Pokemon</p>
                <Plus size={20} />
              </div>
            </button>

            <button
              type="button"
              onClick={onToggleRemoveMode}
              title={removeMode ? "Cancel remove mode" : "Enter remove mode to delete Pokemon from box"}
              aria-label={removeMode ? "Cancel Remove" : "Remove Pokemon"}
              className={`pokemon-box-remove-button ${removeMode ? "pokemon-box-remove-button-active" : "pokemon-box-remove-button-inactive"}`}
            >
              <div className="pokemon-box-button-inner">
                <p>{removeMode ? "Cancel Remove" : "Remove Pokemon"}</p>
                <Trash2 size={20} />
              </div>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={`box-${activeBoxIndex}`} onValueChange={(val) => onActiveBoxChange(parseInt(val.split("-")[1]))}>
          <TabsList className="pokemon-box-tabs-list">
            {p1Boxes.map((_, index) => (
              <TabsTrigger
                key={index}
                value={`box-${index}`}
                className="pokemon-box-tab-trigger"
              >
                {p1BoxNames[index] ?? `Box ${index + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {p1Boxes.map((box, boxIndex) => (
            <TabsContent key={boxIndex} value={`box-${boxIndex}`}>
              <div className="pokemon-box-grid">
                {Object.entries(box).map(([slotKey, pokemon]) => {
                  if (!pokemon) {
                    return (
                      <div
                        key={slotKey}
                        className="pokemon-box-empty-slot"
                      />
                    );
                  }
                  return (
                    <BoxPokemonCard
                      key={slotKey}
                      pokemon={pokemon}
                      slotKey={slotKey}
                      boxIndex={boxIndex}
                      removeMode={removeMode}
                      isInBench={isInBench(pokemon, 1)}
                      onDragStart={onDragStart}
                      onToggleInBench={() => onTogglePokemonInBench(pokemon, 1)}
                      onRemoveFromBox={() => onRemoveFromBox(boxIndex, pokemon.name)}
                    />
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
