import { createContext, useContext, useState, useEffect, useMemo } from "react";
import TeslaAppContext from "./TeslaAppContext";
import { sunTheme } from "../shared/sunTheme";

const ThemeContext = createContext();

// Manual override from the sun/moon button: { theme: "light" | "dark", until: epoch ms }.
// It lasts until the next sunrise or sunset, then Auto takes over again.
const OVERRIDE_KEY = "tesla.themeOverride.v1";
const TICK_MS = 60 * 1000;

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
    localStorage.removeItem("tesla-theme"); // pre-Auto setting, no longer used
  } catch { /* storage blocked */ }
}

// What the browser reports for prefers-color-scheme (for the in-car test indicator)
function readBrowserScheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "unsupported";
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "none";
}

export function ThemeProvider({ children }) {
  const { data } = useContext(TeslaAppContext);
  const sunrise = data?.sys?.sunrise;
  const sunset = data?.sys?.sunset;

  const [now, setNow] = useState(() => Date.now());
  const [override, setOverride] = useState(loadOverride);
  const [browserScheme, setBrowserScheme] = useState(readBrowserScheme);

  // Re-evaluate every minute so sunrise/sunset and override expiry apply on time
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setBrowserScheme(readBrowserScheme());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const auto = useMemo(() => sunTheme(now, sunrise, sunset), [now, sunrise, sunset]);
  const activeOverride = override && override.until > now ? override : null;
  const theme = activeOverride ? activeOverride.theme : auto.theme;
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Expired override: drop it from storage too
  useEffect(() => {
    if (override && !activeOverride) { setOverride(null); storeOverride(null); }
  }, [override, activeOverride]);

  // Flip the theme until the next sunrise/sunset. Flipping back to what Auto
  // would show clears the override, so two taps return to Auto.
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    const value = next === auto.theme ? null : { theme: next, until: auto.nextChange };
    setOverride(value);
    storeOverride(value);
  };

  return (
    <ThemeContext.Provider value={{ isDark, isAuto: !activeOverride, toggle, browserScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
