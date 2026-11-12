import { createContext, useContext, useState, useEffect } from "react";
import TeslaAppContext from "./TeslaAppContext";
import { sunTheme } from "../shared/sunTheme";

const ThemeContext = createContext();

// Theme mode from the header button, cycled Auto → Light → Dark.
// Light and Dark stay until the user cycles back to Auto.
const MODE_KEY = "tesla.themeMode.v1";
const MODES = ["auto", "light", "dark"];
const TICK_MS = 60 * 1000;
const DARK_QUERY = "(prefers-color-scheme: dark)";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

function loadMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (MODES.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  return "auto";
}

function storeMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.removeItem("tesla.themeOverride.v1"); // previous one-tap override, no longer used
  } catch { /* storage blocked */ }
}

/**
 * The browser's light/dark preference. The Tesla browser reports the car's
 * Day/Night display setting here (confirmed in the car, Nov 2026), so Auto
 * follows the car, including tunnels and garages. null when not reported.
 */
function readBrowserScheme() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  if (window.matchMedia(DARK_QUERY).matches) return "dark";
  if (window.matchMedia(LIGHT_QUERY).matches) return "light";
  return null;
}

export function ThemeProvider({ children }) {
  const { data } = useContext(TeslaAppContext);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState(loadMode);
  const [browserScheme, setBrowserScheme] = useState(readBrowserScheme);

  // Re-evaluate every minute for the sunrise/sunset fallback
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Follow the car's Day/Night switch as it happens
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setBrowserScheme(readBrowserScheme());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Auto: the car's setting when the browser reports one, else sunrise/sunset
  const autoTheme = browserScheme ?? sunTheme(now, data?.sys?.sunrise, data?.sys?.sunset).theme;
  const isDark = (mode === "auto" ? autoTheme : mode) === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
    storeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, followsCar: browserScheme != null, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
