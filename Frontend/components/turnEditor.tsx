import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TurnData, Pokemon } from "@/lib/utils/types.ts"
import TurnViewComponent from "@/components/turnView"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"
import "./turnEditor.css"

type ActivePokemon = Pokemon | (Pokemon | null)[] | null

const getCurrentHp = (active: ActivePokemon): number | undefined =>
    Array.isArray(active) ? undefined : active?.currentHp

type Props = {
    healTeam: () => void
    player1Active: ActivePokemon
    player2Active: ActivePokemon
}

export default function TurnEditor({ healTeam, player1Active, player2Active }: Props) {

    const [turns, setTurns] = useState<TurnData[]>([
        { turnNumber: 1, player1Hp: 150, player2Hp: 150, action: "Battle Start" },
        { turnNumber: 2, player1Hp: 135, player2Hp: 120, action: "Pikachu used Thunderbolt!" },
        { turnNumber: 3, player1Hp: 100, player2Hp: 120, action: "Charizard used Flamethrower!" },
        { turnNumber: 4, player1Hp: 100, player2Hp: 80, action: "Pikachu used Thunderbolt!" },
    ])

    const [currentTurn, setCurrentTurn] = useState(1)

    const handleAddTurn = () => {
        const newTurnNumber = turns.length + 1
        const newTurn: TurnData = {
            turnNumber: newTurnNumber,
            player1Hp: getCurrentHp(player1Active) || 150,
            player2Hp: getCurrentHp(player2Active) || 150,
            action: "Turn added",
        }
        setTurns([...turns, newTurn])
        setCurrentTurn(newTurnNumber)
    }

    const TurnView = ({ turn }: { turn: TurnData }) => {
        return <TurnViewComponent turn={turn} />
    }

    return (
        <Card>
            <CardHeader className="turn-editor-header">
                <CardTitle>Turn History</CardTitle>
                <Button
                    onClick={() => healTeam()}
                    variant="outline"
                    className="turn-editor-heal-button"
                >
                    Heal All Pokemon
                </Button>
                <Button onClick={handleAddTurn} variant="default">
                    Add Turn
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs value={currentTurn.toString()} onValueChange={(v) => setCurrentTurn(Number.parseInt(v))}>
                    <TabsList className="turn-editor-tabs-list">
                        {turns.map((turn) => (
                            <TabsTrigger
                                key={turn.turnNumber}
                                value={turn.turnNumber.toString()}
                                className="turn-editor-tab-trigger"
                            >
                                Turn {turn.turnNumber}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {turns.map((turn) => (
                        <TabsContent key={turn.turnNumber} value={turn.turnNumber.toString()}>
                            <TurnView turn={turn} />
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    )
}
