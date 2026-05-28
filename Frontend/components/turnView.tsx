import { Badge } from "@/components/ui/badge";
import { TurnData } from "@/lib/utils/types.ts"

export default function TurnViewComponent ({ turn }: {turn: TurnData}) {
    return (
        <div className="space-y-4">
            <div className="text-center">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary text-primary-foreground">
                Turn {turn.turnNumber}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">{turn.action}</p>
            </div>
        </div>
    )
}