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
    return false
  }
  try {
    const stored = window.localStorage.getItem(RESTRICTED_MODE_STORAGE_KEY)
    return stored === null ? false : JSON.parse(stored)
  } catch {
    return false
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
  // These start at their server-safe defaults so the first client render matches
  // the SSR output. The stored values are applied in the effect below, once the
  // component has mounted and localStorage is actually available.
  const [checkedTMs, setCheckedTMs] = useState<string[]>([])
  const [tutorTier, setTutorTier] = useState<number | null>(null)
  const [restrictedMode, setRestrictedMode] = useState<boolean>(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // localStorage is client-only, so these reads must happen after mount rather
    // than in the useState initializers — otherwise the first client render
    // disagrees with the server-rendered HTML and React throws a hydration
    // mismatch. The one-frame render at the default values is the deliberate
    // cost of keeping SSR and hydration in sync.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCheckedTMs(readStoredCheckedTMs())
    setTutorTier(readStoredTutorTier())
    setRestrictedMode(readStoredRestrictedMode())
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // The `hydrated` guard stops the first post-mount run from writing the default
  // back over the stored value before the read effect above has applied it.
  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(CHECKED_TMS_STORAGE_KEY, JSON.stringify(checkedTMs))
  }, [checkedTMs, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(TUTOR_TIER_STORAGE_KEY, JSON.stringify(tutorTier))
  }, [tutorTier, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(RESTRICTED_MODE_STORAGE_KEY, JSON.stringify(restrictedMode))
  }, [restrictedMode, hydrated])

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
