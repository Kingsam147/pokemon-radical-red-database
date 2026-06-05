import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import "./importModal.css"

type Props = {
    isOpen: boolean,
    onClose: () => void
    onImport: (text: string) => void
}

export default function ImportModal({ isOpen, onClose, onImport }: Props) {
    const [importModalText, setImportModalText] = useState("");

    if (!isOpen) return null;

    return (
        <div className="import-modal-overlay">
            <div className="import-modal-panel">
                <h2 className="import-modal-title">Import Pokemon</h2>
                <label htmlFor="import-modal-text" className="import-modal-description">
                    Paste your import text below. You can import multiple Pokemon at once.
                </label>
                <Textarea
                    id="import-modal-text"
                    data-testid="import-modal-textarea"
                    title="Pokemon import text"
                    value={importModalText}
                    onChange={(e) => setImportModalText(e.target.value)}
                    placeholder="Paste Pokemon import text here..."
                    className="import-modal-textarea"
                />
                <div className="import-modal-actions">
                    <button
                        type="button"
                        onClick={() => { onClose(); setImportModalText(""); }}
                        className="import-modal-cancel-button"
                        data-testid="import-modal-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onImport(importModalText)}
                        className="import-modal-confirm-button"
                        data-testid="import-modal-confirm"
                    >
                        Import
                    </button>
                </div>
            </div>
        </div>
    )
}
