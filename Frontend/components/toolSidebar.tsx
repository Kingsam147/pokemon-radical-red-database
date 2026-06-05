import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import "./toolSidebar.css"

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

export default function ToolSidebar({
    sidebarOpen, setSidebarOpen, sidebarView, setSidebarView,
    activeBoxIndex, updateActiveBox, importText, setImportText,
    exportText, handleExport, notes, setNotes
}: Props) {
    return (
        <aside className={`tool-sidebar ${sidebarOpen ? "tool-sidebar-open" : "tool-sidebar-closed"}`}>
            <div className="tool-sidebar-inner">
                <div className="tool-sidebar-header">
                    <h2 className="tool-sidebar-title">Tools</h2>
                    <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                        ✕
                    </Button>
                </div>

                <div className="tool-sidebar-view-toggle">
                    <Button
                        variant={sidebarView === "import" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSidebarView("import")}
                        className="tool-sidebar-view-button"
                    >
                        Import/Export
                    </Button>
                    <Button
                        variant={sidebarView === "notes" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSidebarView("notes")}
                        className="tool-sidebar-view-button"
                    >
                        Notes
                    </Button>
                </div>

                <div className="tool-sidebar-content">
                    {sidebarView === "import" ? (
                        <div className="tool-sidebar-section">
                            <div className="tool-sidebar-field">
                                <Label className="tool-sidebar-label">Box Management</Label>
                                <Button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to clear Box ${activeBoxIndex + 1}? This cannot be undone.`)) {
                                            updateActiveBox({});
                                        }
                                    }}
                                    variant="destructive"
                                    className="tool-sidebar-clear-button"
                                >
                                    Clear Box {activeBoxIndex + 1}
                                </Button>
                            </div>
                            <div className="tool-sidebar-field">
                                <Label htmlFor="sidebar-import-text" className="tool-sidebar-label">Import Pokemon Data</Label>
                                <Textarea
                                    id="sidebar-import-text"
                                    title="Paste Pokemon import data"
                                    placeholder="Paste Pokemon data here..."
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    className="tool-sidebar-import-textarea"
                                />
                            </div>
                            <div className="tool-sidebar-field">
                                <Label htmlFor="sidebar-export-text" className="tool-sidebar-label">Export Current State</Label>
                                <Button onClick={handleExport} variant="secondary" className="tool-sidebar-export-button">
                                    Generate Export
                                </Button>
                                <Textarea
                                    id="sidebar-export-text"
                                    title="Exported battle state data"
                                    placeholder="Export data will appear here..."
                                    value={exportText}
                                    readOnly
                                    className="tool-sidebar-export-textarea"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="tool-sidebar-notes-field">
                            <Label htmlFor="sidebar-notes" className="tool-sidebar-label">Battle Notes</Label>
                            <Textarea
                                id="sidebar-notes"
                                title="Battle notes and observations"
                                placeholder="Type your battle notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="tool-sidebar-notes-textarea"
                            />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
