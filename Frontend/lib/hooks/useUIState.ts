import { useState } from "react"

export function useUIState() {
  const [importText, setImportText] = useState("")
  const [exportText, setExportText] = useState("")
  const [notes, setNotes] = useState("")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importModalText, setImportModalText] = useState("")
  const [removeMode, setRemoveMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState<"import" | "notes">("import")

  return {
    importText, setImportText,
    exportText, setExportText,
    notes, setNotes,
    importModalOpen, setImportModalOpen,
    importModalText, setImportModalText,
    removeMode, setRemoveMode,
    sidebarOpen, setSidebarOpen,
    sidebarView, setSidebarView,
  }
}
