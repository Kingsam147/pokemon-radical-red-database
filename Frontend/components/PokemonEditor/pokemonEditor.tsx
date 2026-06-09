"use client"

import React, { useEffect, useRef, useState, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { runCalc, runAllCalcs } from "@/lib/api/runCalcs"
import EffectivenessTooltip from "@/components/PokemonEditor/typePopup";
import {
    pokemonPayload,
    teamPayload,
    PokemonType,
    PokemonTypes,
    Nature,
    Natures,
    Item,
    Items,
    Ability,
    Abilities,
    PokemonStats,
    PokemonMove,
    PokemonMoves,
    PokemonForm,
    PokemonForms,
    Gender,
    PokemonStatus,
    Pokemon,
    Team,
    Teams,
    Box,
    TurnData,
    createPokemon,
    TrainerInfo
} from "@/lib/utils/types";
import { ITEM_SPRITE, TYPE_SPRITES, POKEMON_SPRITES, FEMALE_POKEMON_SPRITES, IS_MEGA_ITEM, TYPE_ICONS, MEGA_SYMBOL } from "@/lib/utils/sprites";
import { fetchTypeInteractions } from "@/lib/api/misc"
import { useAuth0 } from "@auth0/auth0-react";
import { activateSession, patchSession, saveSession } from "@/lib/api/session";
import "./pokemonEditor.css"

type Props = {
    pokemon: Pokemon | null
    player: 1 | 2
    slotIndex: number
    battleMode: string
    doublesType: string
    teamName?: string
    toggleHazard: any
    p1Hazards: any
    p2Hazards: any
    activeEffects: string[]
    natureOptions: any
    itemOptions: any
    statusOptions: any
    player1Bench: (Pokemon | null)[]
    player2Bench: (Pokemon | null)[]
    faintPokemon: any

    updatePokemonForm: (player: 1 | 2, slotIndex: number, newFormName: string) => void
    updatePokemonHp: (player: 1 | 2, slotIndex: number, hp: number) => void
    updatePokemonStatus: (player: 1 | 2, slotIndex: number, status: string) => void
    updatePokemonNature: (player: 1 | 2, slotIndex: number, natuerName: string) => void
    updatePokemonItem: (player: 1 | 2, slotIndex: number, itemName: string) => void
    updatePokemonAbility: (player: 1 | 2, slotIndex: number, abilityName: string) => void
    updateAbilityToggle: (player: 1 | 2, slotIndex: number, toggledOn: boolean) => void
    updatePokemonMove: (player: 1 | 2, slotIndex: number, moveIndex: number, newMoveName: string | undefined, newType: string | undefined, newCategory: string | undefined) => void
    updatePokemonGender: (player: 1 | 2, slotIndex: number, gender: Gender) => void
    updatePokemonStat: (player: 1 | 2, slotIndex: number, statCategory: "baseStats" | "IVs" | "EVs" | "statBoosts", statName: keyof PokemonStats, value: string) => void
    updatePokemonLevel: (player: 1 | 2, slotIndex: number, level: string) => void
}

export default function PokemonEditor({
    pokemon, player, slotIndex,
    battleMode, doublesType,
    teamName,
    toggleHazard, p1Hazards, p2Hazards, activeEffects,
    natureOptions, itemOptions, statusOptions,
    updatePokemonForm, updatePokemonHp, updatePokemonStatus,
    updatePokemonNature, updatePokemonItem, updatePokemonAbility, updateAbilityToggle,
    updatePokemonMove, updatePokemonGender, updatePokemonStat, updatePokemonLevel,
    player1Bench, player2Bench, faintPokemon
}: Props) {

    const { isAuthenticated } = useAuth0();

    const isDoubles = battleMode === "doubles"
    const isTrueDoubles = doublesType === "True"
    const hazards = player === 1 ? p1Hazards : p2Hazards;

    const [moveCrits, setMoveCrits] = useState<Record<string, boolean[]>>({});
    const [moveZPowered, setMoveZPowered] = useState<Record<string, boolean[]>>({});
    const [abilityToggles, setAbilityToggles] = useState<Record<string, boolean>>({});
    const [selectedMove, setSelectedMove] = useState<{ player: Number, slot: Number, moveIdx: number } | null>(null)
    const [damageResults, setDamageResults] = useState<Record<string, { range: [string, string], damage: number[], description: string } | null>>({});
    const [calcLoadingKeys, setCalcLoadingKeys] = useState<Set<string>>(new Set());

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [typeInteractions, setTypeInteractions] = useState({
        "immunities": [],
        "doubleResistances": [],
        "resistances": [],
        "weaknesses": [],
        "doubleWeaknesses": [],
    });

    const toggleMoveCrit = (key: string, moveIdx: number) => {
        setMoveCrits(prev => {
            const current = prev[key] ?? [false, false, false, false];
            const updated = [...current];
            updated[moveIdx] = !updated[moveIdx];
            return { ...prev, [key]: updated };
        });
    };

    const toggleMoveZ = (key: string, moveIdx: number) => {
        setMoveZPowered(prev => {
            const current = prev[key] ?? [false, false, false, false];
            const updated = [...current];
            updated[moveIdx] = !updated[moveIdx];
            return { ...prev, [key]: updated };
        });
    };

    const getAbilityToggle = (player: number, slotIndex: number, ability?: Ability): boolean => {
        const key = `p${player}-${slotIndex}`;
        if (key in abilityToggles) return abilityToggles[key];
        return ability?.toggledOn ?? false;
    };

    useEffect(() => {
        if (!isAuthenticated || !teamName || !pokemon || player !== 1) return;

        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);
        setSaveStatus('idle');

        activateSession(newSessionId, 1, teamName, pokemon.name).catch(() => {
            setSessionId(null);
        });

        return () => {
            if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
        };
    }, [pokemon?.name, teamName, isAuthenticated, player]);

    const immediatePatch = (changes: Record<string, unknown>) => {
        if (!sessionId) return;
        patchSession(sessionId, changes).catch(() => {});
    };

    const debouncedPatch = (changes: Record<string, unknown>) => {
        if (!sessionId) return;
        if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
        patchTimerRef.current = setTimeout(() => {
            patchSession(sessionId, changes).catch(() => {});
        }, 400);
    };

    const handleSave = async () => {
        if (!sessionId || !teamName || !pokemon) return;
        setSaveStatus('saving');
        try {
            await saveSession(sessionId, teamName, pokemon.name);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    useEffect(() => {
        if (!pokemon) return;
        fetchTypeInteractions(pokemon.type1.name, pokemon.type2.name)
            .then((res) => setTypeInteractions(res.TypeInteractions))
            .catch(() => console.error("Error fetching type interactions"));
    }, [pokemon?.types]);

    useEffect(() => {
        if (!pokemon) return;
        runAllCalcs(player1Bench, player2Bench, p1Hazards, p2Hazards, activeEffects, abilityToggles, moveCrits, moveZPowered, setDamageResults, setCalcLoadingKeys)
    }, [
        player1Bench[0]?.name, player2Bench[0]?.name,
        player1Bench[0]?.level, player2Bench[0]?.level,
        player1Bench[0]?.nature?.name, player2Bench[0]?.nature?.name,
        player1Bench[0]?.item?.name, player2Bench[0]?.item?.name,
        player1Bench[0]?.ability?.name, player2Bench[0]?.ability?.name,
        player1Bench[0]?.currentHp, player2Bench[0]?.currentHp,
        player1Bench[0]?.status, player2Bench[0]?.status,
        player1Bench[0]?.gender, player2Bench[0]?.gender,
        player1Bench[0]?.form?.formName, player2Bench[0]?.form?.formName,
        JSON.stringify(player1Bench[0]?.EVs), JSON.stringify(player2Bench[0]?.EVs),
        JSON.stringify(player1Bench[0]?.IVs), JSON.stringify(player2Bench[0]?.IVs),
        JSON.stringify(player1Bench[0]?.statBoosts), JSON.stringify(player2Bench[0]?.statBoosts),
        JSON.stringify(player1Bench[0]?.moveset), JSON.stringify(player2Bench[0]?.moveset),
        JSON.stringify({ moveCrits, moveZPowered, abilityToggles }),
        JSON.stringify(activeEffects), JSON.stringify(p1Hazards), JSON.stringify(p2Hazards),
    ]);

    if (!pokemon) return null;

    const getSaveButtonClass = () => {
        if (saveStatus === 'saved') return "pokemon-editor-save-button pokemon-editor-save-button-saved";
        if (saveStatus === 'error') return "pokemon-editor-save-button pokemon-editor-save-button-error";
        return "pokemon-editor-save-button pokemon-editor-save-button-idle";
    };

    const getHealthBarClass = () => {
        const ratio = pokemon.currentHp / pokemon.maxHp;
        if (ratio > 0.5) return "pokemon-editor-health-bar-fill pokemon-editor-health-bar-high";
        if (ratio > 0.2) return "pokemon-editor-health-bar-fill pokemon-editor-health-bar-medium";
        return "pokemon-editor-health-bar-fill pokemon-editor-health-bar-low";
    };

    return (
        <Card
            key={`${player}-${slotIndex}`}
            className={`pokemon-editor-card ${isDoubles ? "pokemon-editor-card-doubles" : "pokemon-editor-card-singles"}`}
        >
            {player === 2 ?
                <p className="pokemon-editor-switch-score">{`Switch-in Score: ${pokemon.switchInScore}`}</p>
                : <p></p>
            }
            <div className={isDoubles ? "pokemon-editor-scroll-wrapper-doubles" : ""}>
                <CardContent className="p-4">

                    <div className="pokemon-editor-hazard-grid">
                        <button
                            type="button"
                            onClick={() => toggleHazard(player as 1 | 2, "spikes")}
                            title="Toggle Spikes (0-3 layers)"
                            className={`pokemon-editor-hazard-button ${hazards.spikes > 0 ? "pokemon-editor-hazard-button-active" : "pokemon-editor-hazard-button-inactive"}`}
                        >
                            SPIKES: {hazards.spikes}
                        </button>

                        <button
                            type="button"
                            onClick={() => toggleHazard(player as 1 | 2, "tSpikes")}
                            title="Toggle Toxic Spikes (0-2 layers)"
                            className={`pokemon-editor-hazard-button ${hazards.tSpikes > 0 ? "pokemon-editor-hazard-button-active" : "pokemon-editor-hazard-button-inactive"}`}
                        >
                            T-SPIKES: {hazards.tSpikes}
                        </button>

                        {[
                            { id: "stealthRocks", label: "STEALTH ROCKS" },
                            { id: "stickyWebs", label: "STICKY WEBS" },
                        ].map((h) => (
                            <button
                                type="button"
                                key={h.id}
                                onClick={() => toggleHazard(player as 1 | 2, h.id)}
                                title={`Toggle ${h.label}`}
                                className={`pokemon-editor-hazard-button ${hazards[h.id as keyof typeof hazards] ? "pokemon-editor-hazard-button-active" : "pokemon-editor-hazard-button-inactive"}`}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>

                    <div className={isDoubles ? "pokemon-editor-header-sticky" : "pokemon-editor-header-standard"}>
                        <div className={isDoubles ? "pokemon-editor-header-row-doubles" : "pokemon-editor-header-row-singles"}>
                            <div className="pokemon-editor-header-left">
                                <img
                                    src={(pokemon.gender === "F" && pokemon.femaleSprite) ?
                                        FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                                    alt={pokemon.name}
                                    className="pokemon-editor-sprite"
                                />
                                <div>
                                    <h3 className="pokemon-editor-pokemon-name">{pokemon.name}</h3>
                                    <div className="pokemon-editor-level-row">
                                        <label htmlFor={`pokemon-level-${player}-${slotIndex}`} className="pokemon-editor-level-label">Lv.</label>
                                        <Input
                                            id={`pokemon-level-${player}-${slotIndex}`}
                                            type="number"
                                            title="Pokemon Level (1-100)"
                                            placeholder="1"
                                            value={pokemon.level}
                                            onChange={(e) => {
                                                updatePokemonLevel(player, slotIndex, e.target.value);
                                                debouncedPatch({ level: Number(e.target.value) || 1 });
                                            }}
                                            className="pokemon-editor-level-input"
                                        />
                                    </div>
                                    <div className="pokemon-editor-type-sprites-column">
                                        <TooltipProvider>
                                            {pokemon.types.map((type) => (
                                                <Tooltip key={type.name} delayDuration={100}>
                                                    <TooltipTrigger asChild>
                                                        <img
                                                            className={isDoubles ? "pokemon-editor-type-sprite-doubles" : "pokemon-editor-type-sprite-singles"}
                                                            src={TYPE_SPRITES(type.name)}
                                                            alt={type.name}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="pokemon-editor-tooltip-content">
                                                        <EffectivenessTooltip typeInteractions={typeInteractions} />
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                            <>
                                <div className="pokemon-editor-form-gender-grid">
                                    <Label className="pokemon-editor-select-label">Form:</Label>
                                    <Select
                                        value={pokemon.form.formName}
                                        onValueChange={(val) => updatePokemonForm(player, slotIndex, val)}
                                    >
                                        <SelectTrigger className="pokemon-editor-form-trigger" title="Select Pokemon Form">
                                            <SelectValue placeholder="Select Form" className="truncate" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" side="bottom">
                                            {Object.keys(pokemon.forms).map((form) => (
                                                <SelectItem key={form} value={form}>{form}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Label className="pokemon-editor-select-label">Gender:</Label>
                                    <Select
                                        value={pokemon.gender}
                                        onValueChange={(val) => updatePokemonGender(player, slotIndex, val as Gender)}
                                    >
                                        <SelectTrigger className="pokemon-editor-gender-trigger" title="Select Pokemon Gender">
                                            <SelectValue placeholder="Select Gender" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" side="bottom">
                                            {["M", "F", "Both", "N"].map((gender) => (
                                                <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>

                            <div className="pokemon-editor-pills-column">
                                <span className="pokemon-editor-nature-pill">{pokemon.nature.name}</span>
                                <span className="pokemon-editor-item-pill">
                                    {pokemon.item.name}
                                    <img className="pokemon-editor-item-pill-sprite" src={ITEM_SPRITE(pokemon.item.name)} alt={`${pokemon.item.name} icon`} />
                                </span>
                                <span className="pokemon-editor-ability-pill">{pokemon.ability.name}</span>
                                {player === 1 && isAuthenticated && teamName && sessionId && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={saveStatus === 'saving'}
                                        onClick={handleSave}
                                        className={getSaveButtonClass()}
                                    >
                                        {saveStatus === 'saving' ? 'Saving…' :
                                            saveStatus === 'saved' ? 'Saved!' :
                                                saveStatus === 'error' ? 'Error' :
                                                    'Save'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pokemon-editor-hp-row">
                        <span className={isDoubles ? "pokemon-editor-hp-label-doubles" : "pokemon-editor-hp-label-singles"}>HP:</span>
                        <div className="pokemon-editor-hp-inputs-wrapper">
                            <div className="pokemon-editor-hp-inputs-row">
                                <div className="pokemon-editor-hp-current-section">
                                    <label htmlFor={`hp-current-${player}-${slotIndex}`} className="sr-only">Current HP</label>
                                    <Input
                                        id={`hp-current-${player}-${slotIndex}`}
                                        type="number"
                                        title="Current HP"
                                        placeholder="HP"
                                        value={pokemon.currentHp}
                                        onChange={(e) => {
                                            const val = Math.max(0, Math.min(Number(e.target.value) || 0, pokemon.maxHp));
                                            updatePokemonHp(player, slotIndex, val);
                                        }}
                                        className={isDoubles ? "pokemon-editor-hp-current-input-doubles" : "pokemon-editor-hp-current-input-singles"}
                                    />
                                    <span className="pokemon-editor-hp-max-label">/ {pokemon.maxHp}</span>
                                </div>

                                <div className="pokemon-editor-hp-percent-section">
                                    <label htmlFor={`hp-percent-${player}-${slotIndex}`} className="sr-only">HP Percentage</label>
                                    <Input
                                        id={`hp-percent-${player}-${slotIndex}`}
                                        type="number"
                                        title="HP Percentage (0-100)"
                                        placeholder="%"
                                        value={Math.round((pokemon.currentHp / pokemon.maxHp) * 100)}
                                        onChange={(e) => {
                                            const percent = Math.max(0, Math.min(Number(e.target.value) || 0, 100));
                                            const calculatedHp = Math.round((percent / 100) * pokemon.maxHp);
                                            updatePokemonHp(player, slotIndex, calculatedHp);
                                        }}
                                        className="pokemon-editor-hp-percent-input"
                                    />
                                    <span className="pokemon-editor-hp-percent-label">%</span>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        title={pokemon.status.name === "Fainted" ? "Restore this Pokemon from fainted" : "Faint this Pokemon"}
                                        className="pokemon-editor-faint-button"
                                        onClick={() => faintPokemon(player, slotIndex)}
                                    >
                                        {pokemon.status.name === "Fainted" ? "Unfaint" : "Faint"}
                                    </Button>
                                </div>
                            </div>

                            <div className="pokemon-editor-health-bar-wrapper">
                                <div
                                    className={getHealthBarClass()}
                                    style={{ "--health-width": `${(pokemon.currentHp / pokemon.maxHp) * 100}%` } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pokemon-editor-damage-rolls-label">
                        {(() => {
                            const activeMoveIdx = selectedMove?.player === player && selectedMove?.slot === slotIndex ? selectedMove.moveIdx : null;
                            if (activeMoveIdx === null) return "Damage Rolls: click a move";
                            const activeKey = `p${player}-${slotIndex}-move${activeMoveIdx}`;
                            if (calcLoadingKeys.has(activeKey)) {
                                return <span className="pokemon-editor-calc-shimmer" />;
                            }
                            const result = damageResults[activeKey];
                            if (!result) return "Damage Rolls: —";
                            return `Damage Rolls: (${result.damage.join(", ")})`;
                        })()}
                    </div>

                    {pokemon.baseStats && pokemon.statBoosts && (
                        <div className="pokemon-editor-stats-section">
                            <div className="pokemon-editor-stats-moves-row">
                                <div className="pokemon-editor-stats-container">
                                    <Label className="pokemon-editor-stats-label">Stats</Label>
                                    <div className="pokemon-editor-stats-grid">
                                        <div></div>
                                        <div className="pokemon-editor-stats-header-cell">Base</div>
                                        <div className="pokemon-editor-stats-header-cell">IV</div>
                                        <div className="pokemon-editor-stats-header-cell">EV</div>
                                        <div className="pokemon-editor-stats-header-cell">Boost</div>
                                        <div className="pokemon-editor-stats-header-cell">Final</div>

                                        {(["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const).map((stat) => {
                                            const statLabels = { HP: "HP", Atk: "Atk", Def: "Def", SpA: "SpA", SpD: "SpD", Spe: "Spe" }
                                            const finalStat = pokemon.finalStats[stat];
                                            const isIncrease = stat !== "HP" && pokemon.nature.increase === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                                            const isDecrease = stat !== "HP" && pokemon.nature.decrease === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                                            const statLabelClass = isIncrease
                                                ? "pokemon-editor-stat-label-increase"
                                                : isDecrease
                                                    ? "pokemon-editor-stat-label-decrease"
                                                    : "pokemon-editor-stat-label-neutral";
                                            return (
                                                <Fragment key={stat}>
                                                    <div className={statLabelClass}>{statLabels[stat]}</div>
                                                    <Input type="number" aria-label={`${stat} Base Stat`} title={`${stat} Base Stat`} placeholder="Base" value={pokemon.baseStats![stat]} onChange={(e) => updatePokemonStat(player, slotIndex, "baseStats", stat, e.target.value)} className="pokemon-editor-base-stat-input" />
                                                    <Input type="number" aria-label={`${stat} IV (0-31)`} title={`${stat} IV (0-31)`} placeholder="IV" value={Math.max(0, Math.min(pokemon.IVs[stat] || 0, 31))} onChange={(e) => {
                                                        updatePokemonStat(player, slotIndex, "IVs", stat, e.target.value);
                                                        debouncedPatch({ IVs: { ...pokemon.IVs, [stat]: Number(e.target.value) || 0 } });
                                                    }} className="pokemon-editor-iv-input" />
                                                    <Input type="number" aria-label={`${stat} EV (0-252)`} title={`${stat} EV (0-252)`} placeholder="EV" value={Math.max(0, Math.min(pokemon.EVs[stat] || 0, 252))} onChange={(e) => {
                                                        updatePokemonStat(player, slotIndex, "EVs", stat, e.target.value);
                                                        debouncedPatch({ EVs: { ...pokemon.EVs, [stat]: Number(e.target.value) || 0 } });
                                                    }} className="pokemon-editor-ev-input" />
                                                    {stat === "HP" ? (
                                                        <div className="h-7" />
                                                    ) : (
                                                        <select aria-label={`${stat} Stat Boost Stage`} title={`${stat} Stat Boost Stage`} value={pokemon.statBoosts![stat] || ""} onChange={(e) => updatePokemonStat(player, slotIndex, "statBoosts", stat, e.target.value || "0")} className="pokemon-editor-boost-select">
                                                            {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((stage) => (
                                                                <option key={stage} value={stage === 0 ? "" : stage.toString()}>
                                                                    {stage === 0 ? "--" : (stage > 0 ? `+${stage}` : stage)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <div className="pokemon-editor-final-stat-cell">{finalStat}</div>
                                                </Fragment>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="pokemon-editor-moves-container">
                                    <Label className="pokemon-editor-moves-label">Moves</Label>
                                    {pokemon.moveset.map((move, moveIdx) => {
                                        const accuracy = move.accuracy;
                                        const hasSecondary = move.secondary !== null && move.secondary !== undefined;
                                        const isStatus = move.category === "Status";
                                        const resultKey = `p${player}-${slotIndex}-move${moveIdx}`;
                                        const result = damageResults[resultKey];
                                        const isCalcLoading = calcLoadingKeys.has(resultKey);
                                        const isSelected = selectedMove?.player === player && selectedMove?.slot === slotIndex && selectedMove?.moveIdx === moveIdx;

                                        const accuracyClass = isStatus ? "" : accuracy !== null && accuracy < 90
                                            ? "pokemon-editor-move-button-low-accuracy"
                                            : accuracy !== null && accuracy < 100
                                                ? "pokemon-editor-move-button-mid-accuracy"
                                                : "";
                                        const moveNameClass = isStatus
                                            ? "pokemon-editor-move-name-status"
                                            : hasSecondary
                                                ? "pokemon-editor-move-name-secondary"
                                                : "pokemon-editor-move-name-default";

                                        return (
                                            <button
                                                type="button"
                                                key={moveIdx}
                                                title={`Calculate damage for ${move.name || `Move ${moveIdx + 1}`}`}
                                                onClick={async () => {
                                                    const isSame = isSelected;
                                                    setSelectedMove(isSame ? null : { player, slot: slotIndex, moveIdx });
                                                    await runCalc(player, slotIndex, moveIdx, pokemon, player1Bench, player2Bench, p1Hazards, p2Hazards, activeEffects, abilityToggles, moveCrits, moveZPowered, setDamageResults, setCalcLoadingKeys);
                                                }}
                                                className={`pokemon-editor-move-button ${isSelected ? "pokemon-editor-move-button-selected" : `pokemon-editor-move-button-unselected ${accuracyClass}`}`}
                                            >
                                                <span className={`pokemon-editor-move-name-span ${moveNameClass}`}>{move.name || `Move ${moveIdx + 1}`}</span>
                                                <span className={`pokemon-editor-move-result-span ${isStatus ? "pokemon-editor-move-result-status" : ""}`}>
                                                    {isCalcLoading && !isStatus
                                                        ? <span className="pokemon-editor-calc-shimmer" />
                                                        : result && move.category !== "Status"
                                                            ? `${result.range[0]} – ${result.range[1]}`
                                                            : "—"
                                                    }
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pokemon-editor-dropdowns-row">
                                <div className="pokemon-editor-dropdowns-left">
                                    <div className="pokemon-editor-dropdown-grid">
                                        <Label className="pokemon-editor-nature-label">Nature:</Label>
                                        <Select value={pokemon.nature.name} onValueChange={(val) => { updatePokemonNature(player, slotIndex, val); immediatePatch({ nature: val }); }}>
                                            <SelectTrigger className="pokemon-editor-nature-trigger" title="Select Pokemon Nature">
                                                <SelectValue placeholder="Select Nature" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(natureOptions).map((nature) => (
                                                    <SelectItem key={nature} value={nature} className="pokemon-editor-nature-option">{nature}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="pokemon-editor-dropdown-grid">
                                        <Label className="pokemon-editor-item-label">Item:</Label>
                                        <Select value={pokemon.item.name} onValueChange={(val) => { updatePokemonItem(player, slotIndex, val); immediatePatch({ item: val }); }}>
                                            <SelectTrigger className="pokemon-editor-item-trigger" title="Select Held Item">
                                                <SelectValue placeholder="Select Item" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(itemOptions).map((item) => (
                                                    <SelectItem key={item} value={item} className="pokemon-editor-item-option">{item}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="pokemon-editor-dropdown-grid">
                                        <Label className="pokemon-editor-ability-label">Ability:</Label>
                                        <div className="pokemon-editor-ability-row">
                                            <Select value={pokemon.ability.name} onValueChange={(val) => { updatePokemonAbility(player, slotIndex, val); immediatePatch({ ability_id: val }); }}>
                                                <SelectTrigger className="pokemon-editor-ability-trigger" title="Select Pokemon Ability">
                                                    <SelectValue placeholder="Select Ability" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" side="bottom">
                                                    {pokemon.abilities.map((ability) => (
                                                        <SelectItem key={ability.name} value={ability.name} className="pokemon-editor-ability-option">{ability.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {pokemon.ability.toggle && (
                                                <label className="pokemon-editor-ability-toggle-label" title="Toggle ability effect on/off">
                                                    <input
                                                        type="checkbox"
                                                        title="Toggle ability effect"
                                                        checked={getAbilityToggle(player, slotIndex, pokemon.ability)}
                                                        onChange={(e) => updateAbilityToggle(player, slotIndex, e.target.checked)}
                                                        className="pokemon-editor-ability-toggle-input"
                                                    />
                                                    Active
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pokemon-editor-dropdown-grid">
                                        <Label className="pokemon-editor-status-label">Status:</Label>
                                        <Select value={pokemon.status.name} onValueChange={(val) => updatePokemonStatus(player, slotIndex, val)}>
                                            <SelectTrigger className="pokemon-editor-status-trigger" title="Select Pokemon Status">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(statusOptions).map((status) => (
                                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="pokemon-editor-move-editor-rows">
                                    {pokemon.moveset.map((move, moveIdx) => {
                                        const moveKey = `p${player}-${slotIndex}`;
                                        const isCrit = moveCrits[moveKey]?.[moveIdx] ?? false;
                                        const isZ = moveZPowered[moveKey]?.[moveIdx] ?? false;
                                        const allTypes = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
                                            "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"];
                                        return (
                                            <div key={moveIdx} className="pokemon-editor-move-editor-row">
                                                <Select value={move.name} onValueChange={(val) => {
                                                    updatePokemonMove(player, slotIndex, moveIdx, val, undefined, undefined);
                                                    const updatedMoveIds = pokemon.moveset.map((m, i) => i === moveIdx ? (val || '') : (m?.name || ''));
                                                    immediatePatch({ move_ids: updatedMoveIds });
                                                }}>
                                                    <SelectTrigger className="pokemon-editor-move-name-trigger" title={`Move ${moveIdx + 1} Name`}>
                                                        <SelectValue placeholder={`Move ${moveIdx + 1}`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="None" className="pokemon-editor-move-none-option">None</SelectItem>
                                                        {pokemon.allMoves.map((m) => (
                                                            <SelectItem key={m.name} value={m.name} className="pokemon-editor-move-option">{m.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <div className="pokemon-editor-move-base-power-cell">
                                                    {move.basePower ?? 0}
                                                </div>

                                                <Select value={move.type ?? "Normal"} onValueChange={(val) => updatePokemonMove(player, slotIndex, moveIdx, undefined, val, undefined)}>
                                                    <SelectTrigger className="pokemon-editor-move-type-trigger" title={`Move ${moveIdx + 1} Type`}>
                                                        <img
                                                            src={TYPE_ICONS(move.type ?? "Normal")}
                                                            alt={`${move.type ?? "Normal"} type`}
                                                            className="pokemon-editor-move-type-image"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allTypes.map((t) => (
                                                            <SelectItem key={t} value={t}>
                                                                <div className="pokemon-editor-move-type-option-wrapper">
                                                                    <img src={TYPE_ICONS(t)} alt={t} className="pokemon-editor-move-type-option-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                                    <span className="pokemon-editor-move-category-option">{t}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select value={move.category ?? "Physical"} onValueChange={(val) => updatePokemonMove(player, slotIndex, moveIdx, undefined, undefined, val)}>
                                                    <SelectTrigger className="pokemon-editor-move-category-trigger" title={`Move ${moveIdx + 1} Category`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["Physical", "Special", "Status"].map((cat) => (
                                                            <SelectItem key={cat} value={cat} className="pokemon-editor-move-category-option">{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleMoveCrit(moveKey, moveIdx)}
                                                    title="Toggle critical hit"
                                                    className={`pokemon-editor-crit-button ${isCrit ? "pokemon-editor-crit-button-active" : "pokemon-editor-crit-button-inactive"}`}
                                                >
                                                    Crit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleMoveZ(moveKey, moveIdx)}
                                                    title="Toggle Z-Power"
                                                    className={`pokemon-editor-z-button ${isZ ? "pokemon-editor-z-button-active" : "pokemon-editor-z-button-inactive"}`}
                                                >
                                                    Z
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pokemon-editor-hazard-grid-bottom">
                        {[
                            { id: "reflect", label: "REFLECT" },
                            { id: "lightScreen", label: "LIGHT SCREEN" },
                            { id: "auroraVeil", label: "AURORA VEIL" },
                            { id: "leechSeed", label: "LEECH SEED" },
                            { id: "tailWind", label: "TAILWIND" },
                            { id: "protect", label: "PROTECT" },
                            { id: "switchingOut", label: "SWITCHING OUT" },
                            { id: "helpingHand", label: "HELPING HAND" },
                            { id: "flowerGift", label: "FLOWER GIFT" },
                            { id: "friendGuard", label: "FRIEND GUARD" },
                        ].map((h) => (
                            <button
                                type="button"
                                key={h.id}
                                onClick={() => toggleHazard(player as 1 | 2, h.id)}
                                title={`Toggle ${h.label}`}
                                className={`pokemon-editor-hazard-button ${hazards[h.id as keyof typeof hazards] ? "pokemon-editor-hazard-button-active" : "pokemon-editor-hazard-button-inactive"}`}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>

                </CardContent>
            </div>
        </Card>
    )
}
