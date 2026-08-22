import { useState } from "react"

export function useUIState() {
  const [notes, setNotes] = useState("")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [removeMode, setRemoveMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return {
    notes, setNotes,
    importModalOpen, setImportModalOpen,
    removeMode, setRemoveMode,
    sidebarOpen, setSidebarOpen,
  }
}
