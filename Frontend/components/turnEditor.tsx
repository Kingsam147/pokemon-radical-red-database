import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import { TurnData } from "@/lib/utils/types.ts"
import TurnViewComponent from "@/components/turnView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"


type Props = {
    healTeam: () => void
    player1Active: any 
    player2Active: any
}

export default function TurnEditor({healTeam, player1Active, player2Active}: Props) {

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
          player1Hp: player1Active?.currentHp || 150,
          player2Hp: player2Active?.currentHp || 150,
          action: "Turn added",
        }
        setTurns([...turns, newTurn])
        setCurrentTurn(newTurnNumber)
    }

    const TurnView = ({ turn }: { turn: TurnData }) => {
        const p1Pokemon = { ...player1Active!, currentHp: turn.player1Hp }
        const p2Pokemon = { ...player2Active!, currentHp: turn.player2Hp }
    
        return <TurnViewComponent turn={turn}/>
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Turn History</CardTitle>
              <Button
                onClick={() => healTeam()}
                variant="outline"
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                Heal All Pokemon
              </Button>
              <Button onClick={handleAddTurn} variant="default">
                Add Turn
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={currentTurn.toString()} onValueChange={(v) => setCurrentTurn(Number.parseInt(v))}>
                <TabsList className="flex w-full">
                  {turns.map((turn) => (
                    <TabsTrigger
                      key={turn.turnNumber}
                      value={turn.turnNumber.toString()}
                      className="flex-1 min-w-0 cursor-pointer hover:bg-white hover:text-black"
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