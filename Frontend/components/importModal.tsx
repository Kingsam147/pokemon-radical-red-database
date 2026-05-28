import { Textarea } from "@/components/ui/textarea"; 
import { useState } from "react"

type Props = {
    isOpen: boolean, 
    onClose: () => void 
    onImport: (text: string) => void
} 

export default function ImportModal ({ isOpen, onClose, onImport }: Props) {
    const [importModalText, setImportModalText] = useState(""); 

    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background border rounded-lg p-6 w-[500px] flex flex-col gap-4 shadow-xl">
          <h2 className="text-lg font-semibold">Import Pokemon</h2>
          <p className="text-sm text-muted-foreground">
            Paste your import text below. You can import multiple Pokemon at once.
          </p>
          <Textarea
            value={importModalText}
            onChange={(e) => setImportModalText(e.target.value)}
            placeholder="Paste Pokemon import text here..."
            className="min-h-[200px] max-h-[300px] overflow-y-auto resize-none font-mono text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { onClose(); setImportModalText(""); }}
              className="px-4 py-2 rounded bg-muted hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={() => onImport(importModalText)}
              className="px-4 py-2 rounded bg-[#4E9152] hover:bg-green-600 text-white"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    )
}