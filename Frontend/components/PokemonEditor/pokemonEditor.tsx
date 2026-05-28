"use client"

import React, { useEffect, useState, Fragment } from "react"; 
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { runCalc, runAllCalcs } from "@/lib/api/runCalcs"
import EffectivenessTooltip from "@/components/PokemonEditor/typePopup";
import { pokemonPayload,
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
    TrainerInfo} from "@/lib/utils/types"; 
import {ITEM_SPRITE, TYPE_SPRITES, POKEMON_SPRITES, FEMALE_POKEMON_SPRITES, IS_MEGA_ITEM, TYPE_ICONS, MEGA_SYMBOL } from "@/lib/utils/sprites";
import { fetchTypeInteractions } from "@/lib/api/misc"


type Props = {
    pokemon: Pokemon | null
    player: 1 | 2 
    slotIndex: number 
    battleMode: string
    doublesType: string
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



export default function PokemonEditor ({ 
    pokemon, player, slotIndex,
    battleMode, doublesType,
    toggleHazard, p1Hazards, p2Hazards, activeEffects,
    natureOptions, itemOptions, statusOptions, 
    updatePokemonForm, updatePokemonHp, updatePokemonStatus, 
    updatePokemonNature, updatePokemonItem, updatePokemonAbility, updateAbilityToggle,
    updatePokemonMove, updatePokemonGender, updatePokemonStat, updatePokemonLevel,
    player1Bench, player2Bench, faintPokemon}: Props) {

    const isDoubles = battleMode === "doubles"
    const isTrueDoubles = doublesType === "True"
    const hazards = player === 1 ? p1Hazards : p2Hazards; 
    
    // state variables
    const [moveCrits, setMoveCrits] = useState<Record<string, boolean[]>>({});
    const [moveZPowered, setMoveZPowered] = useState<Record<string, boolean[]>>({});
    const [abilityToggles, setAbilityToggles] = useState<Record<string, boolean>>({});
    const [selectedMove, setSelectedMove] = useState<{player: Number, slot: Number, moveIdx: number} | null>(null)
    const [damageResults, setDamageResults] = useState<Record<string, { range: [string, string], damage: number[], description: string } | null>>({});
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

    // on pokemon type change --> change type interactions
    useEffect(() => {    
        if (!pokemon) return;
        fetchTypeInteractions(pokemon.type1.name, pokemon.type2.name) 
            .then((res) => setTypeInteractions(res.TypeInteractions))
            .catch(() => console.error("Error fetching type interactions"));
    }, [pokemon?.types]);

    // change pokemon level, move, nature, etc --> recompute damage calcs
    useEffect(() => {
        if (!pokemon) return;
        runAllCalcs(player1Bench, player2Bench, p1Hazards, p2Hazards, activeEffects, abilityToggles, moveCrits, moveZPowered, setDamageResults)
    }, [
        player1Bench[0]?.name, player2Bench[0]?.name,
        player1Bench[0]?.level, player2Bench[0]?.level,
        player1Bench[0]?.nature?.name, player2Bench[0]?.nature?.name,
        player1Bench[0]?.item?.name, player2Bench[0]?.item?.name,
        player1Bench[0]?.ability?.name, player2Bench[0]?.ability?.name,
        player1Bench[0]?.status, player2Bench[0]?.status,
        player1Bench[0]?.gender, player2Bench[0]?.gender,
        player1Bench[0]?.form?.formName, player2Bench[0]?.form?.formName,
        JSON.stringify(player1Bench[0]?.EVs), JSON.stringify(player2Bench[0]?.EVs),
        JSON.stringify(player1Bench[0]?.IVs), JSON.stringify(player2Bench[0]?.IVs),
        JSON.stringify(player1Bench[0]?.statBoosts), JSON.stringify(player2Bench[0]?.statBoosts),
        JSON.stringify(player1Bench[0]?.moveset), JSON.stringify(player2Bench[0]?.moveset),
        JSON.stringify({moveCrits, moveZPowered, abilityToggles}),
        JSON.stringify(activeEffects), JSON.stringify(p1Hazards), JSON.stringify(p2Hazards),
    ]);

    if (!pokemon) return null; 
     
    return (
        <Card 
            key={`${player}-${slotIndex}`} 
            className={`relative overflow-hidden border-2 flex flex-col transition-all duration-300 ${
                isDoubles ? "h-[450px]" : "h-auto"}`}
        >

            {player === 2 ? 
                <p className="mx-auto text-xl font-bold">{`Switch-in Score: ${pokemon.switchInScore}`}</p>
                : <p></p>
            }
            <div className={`${isDoubles ? "overflow-y-auto flex-1 p-1 custom-scrollbar" : ""}`}>
                <CardContent className="p-4">

                    <div className="grid grid-cols-4 p-2 gap-x-2 border-b border-white mb-7">
                        {/* Incremental Hazard: Spikes */}
                        <button 
                            onClick={() => toggleHazard(player as 1 | 2, "spikes")}
                            className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards.spikes > 0 ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
                        >
                            SPIKES: {hazards.spikes}
                        </button>

                        {/* Incremental Hazard: T-Spikes */}
                        <button 
                            onClick={() => toggleHazard(player as 1 | 2, "tSpikes")}
                            className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards.tSpikes > 0 ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
                        >
                            T-SPIKES: {hazards.tSpikes}
                        </button>

                        {/* Boolean Hazards */}
                        {[
                            { id: "stealthRocks", label: "STEALTH ROCKS" },
                            { id: "stickyWebs", label: "STICKY WEBS" }, 
                        ].map((h) => (
                            <button
                                key={h.id}
                                onClick={() => toggleHazard(player as 1 | 2, h.id)}
                                className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards[h.id as keyof typeof hazards] ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>

                    { /* sticky pokemon header (only stick in double battles) */ }
                    <div className= {`${isDoubles ? "sticky top-0 z-10 bg-white p-1.5" : "p-3"}`}>
                        <div className={`flex items-center justify-between ${isDoubles ? "gap-2" : "mb-3"}` }>
                            <div className={`flex items-center gap-2`}>
                                <img
                                    src={(pokemon.gender === "F" && pokemon.femaleSprite) ? 
                                        FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                                    alt={pokemon.name}
                                    className="w-25 h-25 pixelated"
                                />
                                <div>
                                    <h3 className="font-bold text-lg">{pokemon.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-muted-foreground">Lv.</span>
                                        <Input
                                            type="number"
                                            value={pokemon.level}
                                            onChange={(e) => updatePokemonLevel(player, slotIndex, e.target.value)}
                                            className="w-16 h-7 text-sm mb-2 px-1 py-0"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <TooltipProvider>
                                            {pokemon.types.map((type) => (
                                                <Tooltip key={type.name} delayDuration={100}>
                                                    <TooltipTrigger asChild>
                                                        <img
                                                            className={`${isDoubles ? "h-4 w-24" : "h-5 w-24"} cursor-help shadow-sm transition-transform hover:scale-105`}
                                                            src={TYPE_SPRITES(type.name)}
                                                            alt={type.name}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-md border shadow-xl p-0">
                                                        <EffectivenessTooltip typeInteractions={typeInteractions}/>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                            <>
                                <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 items-center">                
                                    <Label className="font-semibold mt-2.5">Form:</Label>

                                    <Select 
                                        value={pokemon.form.formName} 
                                        onValueChange={(val) => updatePokemonForm(player, slotIndex, val)}
                                    >
                                        <SelectTrigger className="h-7 w-full max-w-[200px]">
                                            <SelectValue placeholder="Select Form" className="truncate" />
                                        </SelectTrigger>

                                        <SelectContent position="popper" side="bottom">
                                            {Object.keys(pokemon.forms).map((form) => (
                                                <SelectItem key={form} value={form} className="">
                                                    {form}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Label className="font-semibold mt-2.5">Gender:</Label>

                                    <Select 
                                        value={pokemon.gender} 
                                        onValueChange={(val) => updatePokemonGender(player, slotIndex, val as Gender)}
                                    >
                                        <SelectTrigger className="h-7">
                                            <SelectValue placeholder="Select Form" />
                                        </SelectTrigger>

                                        <SelectContent position="popper" side="bottom">
                                            {["M", "F", "Both", "N"].map((gender) => (
                                                <SelectItem key={gender} value={gender} className="">
                                                    {gender}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>

                            <div className="flex flex-col gap-1 mr-7">
                                <span className="inline-flex items-center justify-center whitespace-nowrap w-fit px-2 py-1 bg-cyan-600 text-primary-foreground rounded-full">{pokemon.nature.name}</span>
                                <span className="inline-flex items-center justify-center whitespace-nowrap gap-1 w-fit px-2 py-1 bg-primary text-primary-foreground rounded-full">
                                    {pokemon.item.name}
                                    <img className="h-10 w-10" src={ITEM_SPRITE(pokemon.item.name)} alt={"image not found"}></img>
                                </span>
                                <span className="inline-flex items-center justify-center whitespace-nowrap w-fit px-2 py-1 bg-emerald-700 text-primary-foreground rounded-full">{pokemon.ability.name}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* // editing HP */}
                    <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isDoubles ? "text-[10px] w-6" : "text-sm w-10"}`}>HP:</span>
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                                
                                {/* Current HP Input & Fixed Max HP Label */}
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        value={pokemon.currentHp}
                                        onChange={(e) => {
                                            const val = Math.max(0, Math.min(Number(e.target.value) || 0, pokemon.maxHp));
                                            updatePokemonHp(player, slotIndex, val);
                                        }}
                                        className={`${isDoubles ? "h-6 w-13 text-[10px]" : "h-6 w-16"} px-1 py-0 text-center border-slate-300`}
                                    />
                                    <span className="text-muted-foreground font-bold">/ {pokemon.maxHp}</span>
                                </div>

                                {/* Linked Percentage Input */}
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        value={Math.round((pokemon.currentHp / pokemon.maxHp) * 100)}
                                        onChange={(e) => {
                                            const percent = Math.max(0, Math.min(Number(e.target.value) || 0, 100));
                                            // Convert percentage back to raw HP for the state update
                                            const calculatedHp = Math.round((percent / 100) * pokemon.maxHp);
                                            updatePokemonHp(player, slotIndex, calculatedHp);
                                        }}
                                        className={`${isDoubles ? "h-6 w-13 text-[10px]" : "h-6 w-13"} px-1 py-0 text-center border-slate-300`}
                                    />
                                    <span className="text-muted-foreground font-bold">%</span>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-6 px-2 text-[10px] font-bold transition-all hover:bg-red-700 hover:scale-105 active:scale-95"
                                        onClick={() => faintPokemon(player, slotIndex)}
                                    >
                                        {pokemon.status.name === "Fainted" ? "Unfaint" : "Faint"}
                                    </Button>
                                </div>
                            </div>

                            {/* Visual Health Bar */}
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-300 mb-3">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        (pokemon.currentHp / pokemon.maxHp) > 0.5 ? "bg-green-500" : (pokemon.currentHp / pokemon.maxHp) > 0.2 ? "bg-yellow-400" : "bg-red-500"
                                    }`}
                                    style={{ width: `${(pokemon.currentHp / pokemon.maxHp) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground px-1">
                        {(() => {
                            const activeMoveIdx = selectedMove?.player === player && selectedMove?.slot === slotIndex ? selectedMove.moveIdx : null;
                            if (activeMoveIdx === null) return "Damage Rolls: click a move";
                            const result = damageResults[`p${player}-${slotIndex}-move${activeMoveIdx}`];
                            if (!result) return "Damage Rolls: —";
                            return `Damage Rolls: (${result.damage.join(", ")})`;
                        })()}
                    </p>
                    {pokemon.baseStats && pokemon.statBoosts && (
                        <div className="flex flex-col gap-3 border-t pt-2 mb-2">

                            {/* ROW 1: Stat grid + displayed move boxes */}
                            <div className="flex gap-6 items-center">

                                {/* Stat Grid */}
                                <div className="flex-shrink-0">
                                    <Label className="text-sm font-semibold mb-1 block">Stats</Label>
                                    <div className="grid grid-cols-[40px_50px_50px_60px_60px_60px] gap-x-1 gap-y-1 items-center text-[10px]">
                                        <div></div>
                                        <div className="text-muted-foreground font-medium text-center">Base</div>
                                        <div className="text-muted-foreground font-medium text-center">IV</div>
                                        <div className="text-muted-foreground font-medium text-center">EV</div>
                                        <div className="text-muted-foreground font-medium text-center">Boost</div>
                                        <div className="text-muted-foreground font-medium text-center">Final</div>

                                        {(["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const).map((stat) => {
                                            const statLabels = { HP: "HP", Atk: "Atk", Def: "Def", SpA: "SpA", SpD: "SpD", Spe: "Spe" }
                                            const finalStat = pokemon.finalStats[stat];
                                            const isIncrease = stat !== "HP" && pokemon.nature.increase === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                                            const isDecrease = stat !== "HP" && pokemon.nature.decrease === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                                            return (
                                                <Fragment key={stat}>
                                                    <div className={`text-sm font-medium ${isIncrease ? "text-red-500 font-bold" : isDecrease ? "text-blue-500 font-bold" : "text-muted-foreground"}`}>
                                                        {statLabels[stat]}
                                                    </div>
                                                    <Input type="number" value={pokemon.baseStats![stat]} onChange={(e) => updatePokemonStat(player, slotIndex, "baseStats", stat, e.target.value)} className="h-8 text-sm px-0.5 w-full text-center" />
                                                    <Input type="number" value={Math.max(0, Math.min(pokemon.IVs[stat] || 0, 31))} onChange={(e) => updatePokemonStat(player, slotIndex, "IVs", stat, e.target.value)} className="h-7 text-sm px-0.5 w-full text-center" />
                                                    <Input type="number" value={Math.max(0, Math.min(pokemon.EVs[stat] || 0, 252))} onChange={(e) => updatePokemonStat(player, slotIndex, "EVs", stat, e.target.value)} className="h-7 text-lg px-0.5 w-full p-3" />
                                                    {stat === "HP" ? (
                                                        <div className="h-7" />
                                                    ) : (
                                                        <select title="statBoosts" value={pokemon.statBoosts![stat] || ""} onChange={(e) => updatePokemonStat(player, slotIndex, "statBoosts", stat, e.target.value || "0")} className="h-7 text-sm px-0.5 w-full text-center border rounded bg-background">
                                                            {[6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6].map((stage) => (
                                                                <option key={stage} value={stage === 0 ? "" : stage.toString()}>
                                                                    {stage === 0 ? "--" : (stage > 0 ? `+${stage}` : stage)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <div className="h-7 text-sm px-1 border rounded bg-muted flex items-center justify-center font-semibold w-full">{finalStat}</div>
                                                </Fragment>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Displayed move boxes */}
                                <div className="flex-1 space-y-1">
                                    <Label className="text-sm font-semibold mb-1 block">Moves</Label>
                                    {pokemon.moveset.map((move, moveIdx) => {
                                        const accuracy = move.accuracy;
                                        const hasSecondary = move.secondary !== null && move.secondary !== undefined;
                                        const isStatus = move.category === "Status";
                                        const bgColor = isStatus ? "" : accuracy !== null && accuracy < 90 ? "bg-orange-100/60" : accuracy !== null && accuracy < 100 ? "bg-yellow-100/60" : "";
                                        const textColor = isStatus ? "text-yellow-600 font-semibold" : hasSecondary ? "text-blue-600 font-semibold" : "text-foreground";

                                        const resultKey = `p${player}-${slotIndex}-move${moveIdx}`;
                                        const result = damageResults[resultKey];
                                        const isSelected = selectedMove?.player === player && selectedMove?.slot === slotIndex && selectedMove?.moveIdx === moveIdx;

                                        // Auto-calc all moves on first render when both sides have pokemon
                                        
                                        return (
                                            <button
                                                key={moveIdx}
                                                onClick={async () => {
                                                    const isSame = isSelected;
                                                    setSelectedMove(isSame ? null : { player, slot: slotIndex, moveIdx });
                                                    await runCalc(player, slotIndex, moveIdx, pokemon, player1Bench, player2Bench, p1Hazards, p2Hazards, activeEffects, abilityToggles, moveCrits, moveZPowered, setDamageResults);
                                                }}
                                                className={`flex items-center justify-between w-full rounded border px-3 py-1.5 text-base transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-100 ring-2 ring-blue-300"
                                                        : `border-border ${bgColor} hover:shadow-md`
                                                }`}
                                            >
                                                <span className={`max-w-[100px] truncate flex-1 font-medium ${textColor}`}>{move.name || `Move ${moveIdx + 1}`}</span>
                                                <span className={`text-sm text-muted-foreground ml-2 whitespace-nowrap ${move.category === "Status" ? "mx-auto" : ""}`}>
                                                    {result && move.category !== "Status" ? `${result.range[0]} – ${result.range[1]}` : "—"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ROW 2: Nature/Item/Ability/Status dropdowns + Move editor rows */}
                            <div className="flex items-start border-t pt-2">

                                {/* Left: dropdowns */}
                                <div className="flex-shrink-0 space-y-1 w-42">
                                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                                        <Label className="font-semibold whitespace-nowrap text-cyan-600">Nature:</Label>
                                        <Select value={pokemon.nature.name} onValueChange={(val) => updatePokemonNature(player, slotIndex, val)}>
                                            <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-cyan-700 border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">
                                                <SelectValue placeholder="Select Nature"/>
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(natureOptions).map((nature) => (
                                                    <SelectItem key={nature} value={nature} className="text-sm text-cyan-700">{nature}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                                        <Label className="font-semibold whitespace-nowrap text-primary">Item:</Label>
                                        <Select value={pokemon.item.name} onValueChange={val => updatePokemonItem(player, slotIndex, val)}>
                                            <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-primary border-slate-300 focus:ring-2 outline-none">
                                                <SelectValue placeholder="Select Item"/>
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(itemOptions).map((item) => (
                                                    <SelectItem key={item} value={item} className="text-sm text-primary">{item}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                                        <Label className="font-semibold whitespace-nowrap text-emerald-700">Ability:</Label>
                                        <div className="flex flex-row gap-2">
                                            <Select value={pokemon.ability.name} onValueChange={val => updatePokemonAbility(player, slotIndex, val)}>
                                                <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-emerald-700 border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
                                                    <SelectValue placeholder="Select Ability"/>
                                                </SelectTrigger>
                                                <SelectContent position="popper" side="bottom">
                                                    {pokemon.abilities.map((ability) => (
                                                        <SelectItem key={ability.name} value={ability.name} className="text-sm text-emerald-700">{ability.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {pokemon.ability.toggle && (
                                                <label className="flex items-center gap-1 text-xs mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={getAbilityToggle(player, slotIndex, pokemon.ability)}
                                                        onChange={(e) => updateAbilityToggle(player, slotIndex, e.target.checked)}
                                                        className="cursor-pointer"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                                        <Label className="font-semibold whitespace-nowrap">Status:</Label>
                                        <Select value={pokemon.status.name} onValueChange={(val) => updatePokemonStatus(player, slotIndex, val)}>
                                            <SelectTrigger className="text-sm px-2 py-1 border rounded bg-background h-8">
                                                <SelectValue placeholder="Select Status"/>
                                            </SelectTrigger>
                                            <SelectContent position="popper" side="bottom">
                                                {Object.keys(statusOptions).map((status) => (
                                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Right: Move editor rows */}
                                <div className="flex-1 space-y-1 self-center flex flex-col items-center mx-auto">
                                    {pokemon.moveset.map((move, moveIdx) => {
                                        const moveKey = `p${player}-${slotIndex}`;
                                        const isCrit = moveCrits[moveKey]?.[moveIdx] ?? false;
                                        const isZ = moveZPowered[moveKey]?.[moveIdx] ?? false;
                                        const allTypes = ["Normal","Fire","Water","Electric","Grass","Ice","Fighting",
                                            "Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
                                        return (
                                            <div key={moveIdx} className="flex items-center gap-1">
                                                <Select value={move.name} onValueChange={(val) => updatePokemonMove(player, slotIndex, moveIdx, val, undefined, undefined)}>
                                                    <SelectTrigger className="h-7 text-sm border-slate-300 w-37 flex-shrink-0">
                                                        <SelectValue placeholder={`Move ${moveIdx + 1}`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="None" className="text-med text-muted-foreground">None</SelectItem>
                                                        {pokemon.allMoves.map((m) => (
                                                            <SelectItem key={m.name} value={m.name} className="text-xs">{m.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <div className="h-7 w-8 text-xs border rounded bg-muted flex items-center justify-center font-semibold flex-shrink-0">
                                                    {move.basePower ?? 0}
                                                </div>

                                                <Select value={move.type ?? "Normal"} onValueChange={(val) => updatePokemonMove(player, slotIndex, moveIdx, undefined, val, undefined)}>
                                                    <SelectTrigger className="h-8 w-8 p-0 rounded-full border-2 border-slate-300 flex-shrink-0 overflow-hidden [&>svg]:hidden aspect-square">
                                                        <img
                                                            src={TYPE_ICONS(move.type ?? "Normal")}
                                                            alt={move.type?.name ?? "Normal"}
                                                            className="w-full h-full object-cover rounded-full"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allTypes.map((t) => (
                                                            <SelectItem key={t} value={t}>
                                                                <div className="flex items-center gap-2">
                                                                    <img src={TYPE_ICONS(t)} alt={t} className="h-5 w-4 object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                                    <span className="text-xs">{t}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select value={move.category ?? "Physical"} onValueChange={(val) => updatePokemonMove(player, slotIndex, moveIdx, undefined, undefined, val)}>
                                                    <SelectTrigger className="h-7 text-xs border-slate-300 w-24 flex-shrink-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["Physical", "Special", "Status"].map((cat) => (
                                                            <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <button
                                                    onClick={() => toggleMoveCrit(moveKey, moveIdx)}
                                                    className={`h-7 px-2 text-xs font-bold rounded border transition-colors cursor-pointer flex-shrink-0 ${isCrit ? "bg-yellow-400 text-black border-yellow-500" : "bg-muted text-muted-foreground border-slate-300 hover:bg-yellow-100"}`}
                                                >
                                                    Crit
                                                </button>

                                                <button
                                                    onClick={() => toggleMoveZ(moveKey, moveIdx)}
                                                    className={`h-7 px-2 text-xs font-bold rounded border transition-colors cursor-pointer flex-shrink-0 ${isZ ? "bg-purple-500 text-white border-purple-600" : "bg-muted text-muted-foreground border-slate-300 hover:bg-purple-100"}`}
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

                    <div className="grid grid-cols-3">
                    
                        {/* Rest of the Boolean Hazards */}
                        {[
                            { id: "reflect", label: "REFLECT" },
                            { id: "lightScreen", label: "LIGHT SCREEN" },
                            { id: "auroraVeil", label: "AURORA VEIL"}, 
                            
                            { id: "leechSeed", label: "LEECH SEED"}, 
                            { id: "tailWind", label: "TAILWIND"}, 
                            { id: "protect", label: "PROTECT"}, 
                            { id: "switchingOut", label: "SWITCHING OUT"},

                            // DOUBLES
                            { id: "helpingHand", label: "HELPING HAND"}, 
                            { id: "flowerGift", label: "FLOWER GIFT"}, 
                            { id: "friendGuard", label: "FRIEND GUARD"}, 
                        ].map((h) => (
                            <button
                                key={h.id}
                                onClick={() => toggleHazard(player as 1 | 2, h.id)}
                                className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards[h.id as keyof typeof hazards] ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
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