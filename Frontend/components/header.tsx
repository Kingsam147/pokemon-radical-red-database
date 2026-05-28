import { Tabs, TabsTrigger,  TabsList, } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"


type Props = {
    battleMode: any 
    setBattleMode: (mode: any) => void
    setSidebarOpen: (sidebar: any) => void
}

export default function Header({battleMode, setBattleMode, setSidebarOpen}: Props) {
    return (
        <>
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                ☰ Tools
                </Button>
                <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Pokemon Battle Simulator!!
                </h1>
                <div className="w-20" />
            </div>

            <div className="flex justify-center mb-6">
                <Tabs value={battleMode} onValueChange={(v)  => setBattleMode(v as "singles" | "doubles")}>
                <TabsList className="grid w-64 grid-cols-2">
                    <TabsTrigger value="singles">Singles</TabsTrigger>
                    <TabsTrigger value="doubles">Doubles</TabsTrigger>
                </TabsList>
                </Tabs>
            </div>
        </>
    );
}