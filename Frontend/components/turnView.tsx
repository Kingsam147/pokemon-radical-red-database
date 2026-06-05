import { Badge } from "@/components/ui/badge"
import { TurnData } from "@/lib/utils/types.ts"
import "./turnView.css"

export default function TurnViewComponent({ turn }: { turn: TurnData }) {
    return (
        <div className="turn-view-container">
            <div className="turn-view-content">
                <Badge variant="secondary" className="turn-view-badge">
                    Turn {turn.turnNumber}
                </Badge>
                <p className="turn-view-action">{turn.action}</p>
            </div>
        </div>
    )
}
