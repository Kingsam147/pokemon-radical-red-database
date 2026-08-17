import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import "./toolSidebar.css"

type Props = {
    sidebarOpen: boolean,
    setSidebarOpen: (open: boolean) => void
    notes: string
    setNotes: (notes: string) => void
}

export default function ToolSidebar({
    sidebarOpen, setSidebarOpen, notes, setNotes
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

                <div className="tool-sidebar-content">
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
                </div>
            </div>
        </aside>
    )
}
