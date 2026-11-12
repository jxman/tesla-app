import { createContext, useContext, useState, useEffect } from "react";
import TeslaAppContext from "./TeslaAppContext";
import { sunTheme } from "../shared/sunTheme";

const ThemeContext = createContext();

// Manual override from the sun/moon button: { theme, basis, until }.
// It lasts until Auto changes (the car switches Day/Night, or sunrise/sunset in
// the fallback) or 12 hours pass, then Auto takes over again.
const OVERRIDE_KEY = "tesla.themeOverride.v1";
const OVERRIDE_MAX_MS = 12 * 60 * 60 * 1000;
const TICK_MS = 60 * 1000;
const DARK_QUERY = "(prefers-color-scheme: dark)";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

function loadOverride() {
  try {
    const raw = JSON.parse(localStorage.getItem(OVERRIDE_KEY));
    if (raw && (raw.theme === "light" || raw.theme === "dark") && raw.until > Date.now()) return raw;
  } catch { /* storage blocked or bad JSON */ }
  return null;
}

function storeOverride(value) {
  try {
    if (value) localStorage.setItem(OVERRIDE_KEY, JSON.stringify(value));
    else localStorage.removeItem(OVERRIDE_KEY);
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
  const [override, setOverride] = useState(loadOverride);
  const [browserScheme, setBrowserScheme] = useState(readBrowserScheme);

  // Re-evaluate every minute (sunrise/sunset fallback and override expiry)
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
  const activeOverride = override && override.until > now && override.basis === autoTheme ? override : null;
  const isDark = (activeOverride ? activeOverride.theme : autoTheme) === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Override no longer applies (Auto changed or it expired): forget it
  useEffect(() => {
    if (override && !activeOverride) { setOverride(null); storeOverride(null); }
  }, [override, activeOverride]);

  // Flip the theme; flipping back to what Auto shows clears the override
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    const value = next === autoTheme ? null : { theme: next, basis: autoTheme, until: Date.now() + OVERRIDE_MAX_MS };
    setOverride(value);
    storeOverride(value);
  };

  return (
    <ThemeContext.Provider value={{ isDark, isAuto: !activeOverride, followsCar: browserScheme != null, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
