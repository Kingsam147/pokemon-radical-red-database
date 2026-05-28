import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Props = {
    sidebarOpen: boolean, 
    setSidebarOpen: (open: boolean) => void 
    sidebarView: "import" | "notes"
    setSidebarView: (view: "import" | "notes") => void 
    activeBoxIndex: number 
    updateActiveBox: (box: any) => void 
    importText: string 
    setImportText: (text: string) => void 
    exportText: string 
    handleExport: () => void
    notes: string 
    setNotes: (notes: string) => void

}

export default function ToolSidebar ({
    sidebarOpen, setSidebarOpen, sidebarView, setSidebarView, 
    activeBoxIndex, updateActiveBox, importText, setImportText, 
    exportText, handleExport, notes, setNotes
}: Props) {
    return (
        <aside
        className={`fixed top-0 left-0 h-full bg-card border-r border-border transition-transform duration-300 z-50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-80`}
        >
            <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Tools</h2>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                ✕
                </Button>
            </div>

            <div className="flex gap-2 mb-4">
                <Button
                variant={sidebarView === "import" ? "default" : "outline"}
                size="sm"
                onClick={() => setSidebarView("import")}
                className="flex-1"
                >
                Import/Export
                </Button>
                <Button
                variant={sidebarView === "notes" ? "default" : "outline"}
                size="sm"
                onClick={() => setSidebarView("notes")}
                className="flex-1"
                >
                Notes
                </Button>
            </div>

            <div className="flex-1 overflow-auto">
                {sidebarView === "import" ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                    <Label className="text-sm font-semibold">Box Management</Label>
                    <Button
                        onClick={() => {
                        if(window.confirm(`Are you sure you want to clear Box ${activeBoxIndex + 1}? This cannot be undone.`)) {
                            updateActiveBox({}); // Clears only the currently selected box
                        }
                        }}
                        variant="destructive"
                        className="w-full"
                    >
                        Clear Box {activeBoxIndex + 1}
                    </Button>
                    </div>
                    <div className="space-y-2">
                    <Label className="text-sm font-semibold">Import Pokemon Data</Label>
                    <Textarea
                        placeholder="Paste Pokemon data here..."
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        className="min-h-[150px]"
                    />
                    
                    </div>
                    <div className="space-y-2">
                    <Label className="text-sm font-semibold">Export Current State</Label>
                    <Button onClick={handleExport} variant="secondary" className="w-full mb-2">
                        Generate Export
                    </Button>
                    <Textarea
                        placeholder="Export data will appear here..."
                        value={exportText}
                        readOnly
                        className="min-h-[150px]"
                    />
                    </div>
                </div>
                ) : (
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Battle Notes</Label>
                    <Textarea
                    placeholder="Type your battle notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[400px]"
                    />
                </div>
                )}
                </div>
            </div>
        </aside>
    )
}