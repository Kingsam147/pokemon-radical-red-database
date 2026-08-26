import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HM_LIST, TM_LIST, TM_HM_LIST } from "@/lib/data/tmHmList"
import { TUTOR_TIERS } from "@/lib/data/tutorTiers"
import "./toolSidebar.css"

type Props = {
    sidebarOpen: boolean,
    setSidebarOpen: (open: boolean) => void
    notes: string
    setNotes: (notes: string) => void
    checkedTMs: string[]
    toggleCheckedTM: (moveName: string) => void
    tutorTier: number | null
    setTutorTier: (tier: number | null) => void
    restrictedMode: boolean
    setRestrictedMode: (restricted: boolean) => void
}

export default function ToolSidebar({
    sidebarOpen, setSidebarOpen, notes, setNotes,
    checkedTMs, toggleCheckedTM, tutorTier, setTutorTier,
    restrictedMode, setRestrictedMode,
}: Props) {
    const handleTutorTierClick = (tier: number) => {
        const isCurrentlyChecked = tutorTier !== null && tier <= tutorTier
        setTutorTier(isCurrentlyChecked ? (tier === 0 ? null : tier - 1) : tier)
    }

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
                    <div className="tool-sidebar-notice">
                        {restrictedMode ? (
                            <p>
                                <strong>Only valid moves will appear for Pokemon in the move listings:</strong> moves
                                are valid if the pokemon is at or above the level, which they learn the move or the
                                designated TM/move tutor move is checked on the list.
                            </p>
                        ) : (
                            <p>
                                <strong>Restricted Mode is off:</strong> all moves are currently available to every
                                Pokemon, regardless of level, TM/HM eligibility, or tutor eligibility.
                            </p>
                        )}
                    </div>

                    <label className="tool-sidebar-restricted-mode-field">
                        <input
                            type="checkbox"
                            title="Toggle Restricted Mode"
                            checked={restrictedMode}
                            onChange={(e) => setRestrictedMode(e.target.checked)}
                            className="tool-sidebar-checkbox"
                        />
                        <span>
                            <strong>Restricted Mode</strong> enforces only valid move listings on Pokemon. Otherwise
                            all moves will be visible on a Pokemon regardless of whether they learn them or not, and
                            TMs/tutor moves will all be available to all Pokemon.
                        </span>
                    </label>

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

                    <div className="tool-sidebar-field">
                        <div className="tool-sidebar-field-label">
                            <Label className="tool-sidebar-label">TMs &amp; HMs</Label>
                            <span className="tool-sidebar-count">{checkedTMs.length} / {TM_HM_LIST.length} checked</span>
                        </div>
                        <div className="tool-sidebar-checklist">
                            <div className="tool-sidebar-checklist-group-label">Hidden Machines</div>
                            {HM_LIST.map((entry) => (
                                <label
                                    key={entry.id}
                                    className={`tool-sidebar-row tool-sidebar-row-hm ${checkedTMs.includes(entry.name) ? "tool-sidebar-row-checked" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        title={`Toggle ${entry.id} - ${entry.name}`}
                                        checked={checkedTMs.includes(entry.name)}
                                        onChange={() => toggleCheckedTM(entry.name)}
                                        className="tool-sidebar-checkbox"
                                    />
                                    <span className="tool-sidebar-row-id">{entry.id}</span>
                                    <span className="tool-sidebar-row-name">{entry.name}</span>
                                </label>
                            ))}
                            <div className="tool-sidebar-checklist-group-label">Technical Machines</div>
                            {TM_LIST.map((entry) => (
                                <label
                                    key={entry.id}
                                    className={`tool-sidebar-row ${checkedTMs.includes(entry.name) ? "tool-sidebar-row-checked" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        title={`Toggle ${entry.id} - ${entry.name}`}
                                        checked={checkedTMs.includes(entry.name)}
                                        onChange={() => toggleCheckedTM(entry.name)}
                                        className="tool-sidebar-checkbox"
                                    />
                                    <span className="tool-sidebar-row-id">{entry.id}</span>
                                    <span className="tool-sidebar-row-name">{entry.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="tool-sidebar-field">
                        <div className="tool-sidebar-field-label">
                            <Label className="tool-sidebar-label">Move Tutors</Label>
                            <span className="tool-sidebar-count">
                                {tutorTier === null ? "none unlocked" : `tiers 1–${tutorTier + 1} unlocked`}
                            </span>
                        </div>
                        <div className="tool-sidebar-tutor-list">
                            {TUTOR_TIERS.map((tierInfo) => {
                                const isChecked = tutorTier !== null && tierInfo.tier <= tutorTier
                                return (
                                    <div
                                        key={tierInfo.tier}
                                        className={`tool-sidebar-tutor-tier ${isChecked ? "tool-sidebar-tier-checked" : ""}`}
                                    >
                                        <label className="tool-sidebar-tutor-tier-head">
                                            <input
                                                type="checkbox"
                                                title={`Toggle tutor tier ${tierInfo.tier + 1}`}
                                                checked={isChecked}
                                                onChange={() => handleTutorTierClick(tierInfo.tier)}
                                                className="tool-sidebar-checkbox"
                                            />
                                            <span className="tool-sidebar-tutor-tier-title">Tier {tierInfo.tier + 1}</span>
                                            <span className="tool-sidebar-tutor-tier-count">
                                                {tierInfo.newMoves.length} move{tierInfo.newMoves.length === 1 ? "" : "s"}
                                            </span>
                                        </label>
                                        <ul className="tool-sidebar-tutor-move-list">
                                            {tierInfo.newMoves.map((moveName) => (
                                                <li key={moveName}>{moveName}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
