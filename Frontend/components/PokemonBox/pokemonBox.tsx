"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Plus, Trash2, Loader2 } from "lucide-react"
import { Pokemon, Box } from "@/lib/utils/types.ts"
import BoxPokemonCard from "@/components/PokemonBox/boxPokemonCard"
import "./pokemonBox.css"

type PokemonBoxProps = {
  p1Boxes: (Box | null)[];
  p1BoxNames: string[];
  activeBoxIndex: number;
  isBoxLoading: boolean;
  removeMode: boolean;
  onActiveBoxChange: (index: number) => void;
  isInBench: (pokemon: Pokemon, player: 1 | 2, boxKey?: string) => boolean;
  onDragStart: (pokemon: Pokemon, source: string) => void;
  onTogglePokemonInBench: (pokemon: Pokemon, player: 1 | 2, boxKey: string) => void;
  onRemoveFromBox: (boxIndex: number, pokemonName: string, slotKey: string) => Promise<void>;
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
  isBoxLoading,
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

            <button
              type="button"
              onClick={onRemoveBox}
              disabled={isBoxLoading}
              title={isBoxLoading ? "Cannot delete while box is loading" : "Delete the current box permanently"}
              aria-label="Delete Box"
              className={`pokemon-box-delete-button ${isBoxLoading ? "pokemon-box-button-disabled" : ""}`}
            >
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
                {isBoxLoading && index === activeBoxIndex
                  ? <Loader2 size={14} className="animate-spin inline mr-1" />
                  : null}
                {p1BoxNames[index] ?? `Box ${index + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {p1Boxes.map((box, boxIndex) => (
            <TabsContent key={boxIndex} value={`box-${boxIndex}`}>
              {box === null || (isBoxLoading && boxIndex === activeBoxIndex) ? (
                <div className="pokemon-box-grid">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="pokemon-box-skeleton-slot animate-pulse" />
                  ))}
                </div>
              ) : (
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
                        isInBench={isInBench(pokemon, 1, slotKey)}
                        onDragStart={onDragStart}
                        onToggleInBench={() => onTogglePokemonInBench(pokemon, 1, slotKey)}
                        onRemoveFromBox={() => onRemoveFromBox(boxIndex, pokemon.name, slotKey)}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
