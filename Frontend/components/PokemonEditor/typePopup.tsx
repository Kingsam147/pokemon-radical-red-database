import { Badge } from "@/components/ui/badge"

type TypeInteractions = {
  immunities: string[]
  doubleResistances: string[]
  resistances: string[]
  weaknesses: string[]
  doubleWeaknesses: string[]
}

export default function EffectivenessTooltip({ typeInteractions }: {typeInteractions: TypeInteractions}) {
  return (
    <div className="p-2 space-y-2 max-w-[500px]">
      {/* Weaknesses */}
      {(typeInteractions.doubleWeaknesses.length > 0 || typeInteractions.weaknesses.length > 0) && (
        <div>
          <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Weaknesses</p>
          <div className="flex flex-wrap gap-1">
            {typeInteractions.doubleWeaknesses.map((t: string) => <Badge key={t} className="text-[14px] h-5 bg-red-600">{t}</Badge>)}
            {typeInteractions.weaknesses.map((t: string) => <Badge key={t} className="text-[14px] h-5 bg-orange-500">{t}</Badge>)}
          </div>
        </div>
      )}
      {/* Resistances */}
      {(typeInteractions.doubleResistances.length > 0 || typeInteractions.resistances.length > 0) && (
        <div>
          <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Resistances</p>
          <div className="flex flex-wrap gap-1">
            {typeInteractions.resistances.map((t: string) => <Badge key={t} className="text-[14px] h-5 bg-green-500">{t}</Badge>)}
            {typeInteractions.doubleResistances.map((t: string) => <Badge key={t} className="text-[14px] h-5 bg-emerald-700">{t}</Badge>)}
          </div>
        </div>
      )}
      {/* Immunities */}
      {typeInteractions.immunities.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Immune</p>
          <div className="flex flex-wrap gap-1">
            {typeInteractions.immunities.map((t: string) => <Badge key={t} className="text-[14px] h-5 bg-slate-800">{t}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
};