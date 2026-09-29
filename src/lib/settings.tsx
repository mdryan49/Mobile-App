import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../config/defaultSettings'
import { getSetting, setSetting } from './db'

const KEY = 'app-settings'

/** Merge saved settings over defaults so newly added fields always have a value. */
function withDefaults(saved: Partial<AppSettings> | undefined): AppSettings {
  const d = DEFAULT_SETTINGS
  return {
    pin: saved?.pin ?? d.pin,
    renderAccessCode: saved?.renderAccessCode ?? d.renderAccessCode,
    company: { ...d.company, ...saved?.company },
    salesperson: { ...d.salesperson, ...saved?.salesperson },
    pricing: { ...d.pricing, ...saved?.pricing },
  }
}

interface Ctx {
  settings: AppSettings
  loaded: boolean
  save: (s: AppSettings) => Promise<void>
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, save: async () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSetting<Partial<AppSettings>>(KEY)
      .then((s) => setSettings(withDefaults(s)))
      .finally(() => setLoaded(true))
  }, [])

  const save = useCallback(async (s: AppSettings) => {
    setSettings(s)
    await setSetting(KEY, s)
  }, [])

  return <SettingsContext.Provider value={{ settings, loaded, save }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
