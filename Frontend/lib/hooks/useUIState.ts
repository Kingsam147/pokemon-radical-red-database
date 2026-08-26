import { useState, useEffect } from "react"

const CHECKED_TMS_STORAGE_KEY = "rr_checked_tms"
const TUTOR_TIER_STORAGE_KEY = "rr_tutor_tier"
const RESTRICTED_MODE_STORAGE_KEY = "rr_restricted_mode"

export function readStoredCheckedTMs(): string[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const stored = window.localStorage.getItem(CHECKED_TMS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function readStoredTutorTier(): number | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const stored = window.localStorage.getItem(TUTOR_TIER_STORAGE_KEY)
    return stored === null ? null : JSON.parse(stored)
  } catch {
    return null
  }
}

export function readStoredRestrictedMode(): boolean {
  if (typeof window === "undefined") {
    return true
  }
  try {
    const stored = window.localStorage.getItem(RESTRICTED_MODE_STORAGE_KEY)
    return stored === null ? true : JSON.parse(stored)
  } catch {
    return true
  }
}

export function nextCheckedTMs(current: string[], moveName: string): string[] {
  return current.includes(moveName)
    ? current.filter((name) => name !== moveName)
    : [...current, moveName]
}

export function useUIState() {
  const [notes, setNotes] = useState("")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [removeMode, setRemoveMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checkedTMs, setCheckedTMs] = useState<string[]>(readStoredCheckedTMs)
  const [tutorTier, setTutorTier] = useState<number | null>(readStoredTutorTier)
  const [restrictedMode, setRestrictedMode] = useState<boolean>(readStoredRestrictedMode)

  useEffect(() => {
    window.localStorage.setItem(CHECKED_TMS_STORAGE_KEY, JSON.stringify(checkedTMs))
  }, [checkedTMs])

  useEffect(() => {
    window.localStorage.setItem(TUTOR_TIER_STORAGE_KEY, JSON.stringify(tutorTier))
  }, [tutorTier])

  useEffect(() => {
    window.localStorage.setItem(RESTRICTED_MODE_STORAGE_KEY, JSON.stringify(restrictedMode))
  }, [restrictedMode])

  const toggleCheckedTM = (moveName: string) => {
    setCheckedTMs((previous) => nextCheckedTMs(previous, moveName))
  }

  return {
    notes, setNotes,
    importModalOpen, setImportModalOpen,
    removeMode, setRemoveMode,
    sidebarOpen, setSidebarOpen,
    checkedTMs, toggleCheckedTM,
    tutorTier, setTutorTier,
    restrictedMode, setRestrictedMode,
  }
}
