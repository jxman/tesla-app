import { useState, useContext, useEffect, useRef } from "react";
import { FiMapPin, FiX, FiSun, FiMoon } from "react-icons/fi";
import { LuSunMoon } from "react-icons/lu";
import { BiCurrentLocation } from "react-icons/bi";
import TeslaAppContext from "../context/TeslaAppContext";
import { searchTowns } from "../api/client";
import { useTheme } from "../context/ThemeContext";

// Header theme button cycles Auto → Light → Dark
const THEME_LABEL = { auto: "Auto", light: "Light", dark: "Dark" };
const THEME_ICON = { auto: LuSunMoon, light: FiSun, dark: FiMoon };
const NEXT_MODE = { auto: "light", light: "dark", dark: "auto" };

function LocationSelector() {
  const [zip, setZip] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { searchByZipCode, selectTown, townName, getCurrentLocation, data, isLoading, lat, long } = useContext(TeslaAppContext);
  const [towns, setTowns] = useState([]);
  const [townError, setTownError] = useState(null);
  const latestQuery = useRef(0);

  const query = zip.trim();
  const isZip = /^\d{5}(-\d{4})?$/.test(query);
  const looksLikeTown = /[a-z]/i.test(query) && query.length >= 3;

  // Town suggestions as you type (debounced; zip codes skip this)
  useEffect(() => {
    if (!isSearchOpen || !looksLikeTown) { setTowns([]); setTownError(null); return undefined; }
    const id = ++latestQuery.current;
    const timer = setTimeout(async () => {
      try {
        const { results = [] } = await searchTowns(query, lat, long);
        if (id === latestQuery.current) { setTowns(results.slice(0, 4)); setTownError(results.length ? null : "No matching towns"); }
      } catch (err) {
        if (id === latestQuery.current) { setTowns([]); setTownError(err.message); }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, looksLikeTown, isSearchOpen, lat, long]);
  const { mode, followsCar, cycle } = useTheme();
  const ThemeIcon = THEME_ICON[mode];

  const locationName = townName || data?.name || "Loading...";

  const close = () => { setIsSearchOpen(false); setZip(""); setTowns([]); setTownError(null); };

  const chooseTown = async (town) => {
    setIsSearching(true);
    await selectTown(town);
    setIsSearching(false);
    close();
  };

  // Enter / Go: a zip code looks up as before; a town name picks the top suggestion
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query) return;
    if (!isZip) {
      if (towns[0]) await chooseTown(towns[0]);
      return;
    }
    setIsSearching(true);
    await searchByZipCode(query.slice(0, 5));
    setIsSearching(false);
    close();
  };

  if (isSearchOpen) {
    return (
      <div className="relative z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Zip code or town"
            aria-label="Zip code or town"
            autoComplete="off"
            className="flex-1 h-12 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-base"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            disabled={isSearching}
          />
          <button
            type="button"
            onClick={() => { getCurrentLocation(); setIsSearchOpen(false); }}
            className="h-12 w-12 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            title="Use current location"
            aria-label="Use current location"
          >
            <BiCurrentLocation className="text-xl text-green-500" />
          </button>
          <button
            type="submit"
            disabled={!query || isSearching || (!isZip && !towns[0])}
            className="h-12 px-6 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-semibold transition-all disabled:opacity-40 flex-shrink-0 text-base"
          >
            {isSearching ? "Finding…" : "Go"}
          </button>
        </form>
        <button
          onClick={close}
          aria-label="Cancel"
          title="Cancel"
          className="h-12 w-12 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        >
          <FiX className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </button>

        {/* Town suggestions: max 4 rows so they stay above the Tesla keyboard */}
        {!isZip && (towns.length > 0 || townError) && (
          <div className="absolute left-0 right-0 top-full mt-2 p-2 flex flex-col gap-1 rounded-2xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {townError && <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{townError}</p>}
            {towns.map((t) => (
              <button
                key={`${t.lat},${t.lon}`}
                onClick={() => chooseTown(t)}
                disabled={isSearching}
                className="flex items-center gap-3 px-3 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ minHeight: 48 }}
              >
                <FiMapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">{t.label}</span>
                {t.detail && <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{t.detail}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-1 mb-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
          {locationName}
        </h1>
        {!isLoading && data?.name && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-600 dark:text-green-400 text-xs font-mono tracking-widest uppercase flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
            Live
          </span>
        )}
      </div>
      <button
        onClick={() => setIsSearchOpen(true)}
        className="h-11 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center gap-2 transition-all flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        title="Change location (zip code, town or current location)"
      >
        <FiMapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        Change location
      </button>
      <button
        onClick={cycle}
        className="h-11 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center gap-2 transition-all flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        title={`Theme: ${THEME_LABEL[mode]}${mode === "auto" ? (followsCar ? " (follows the car's display)" : " (sunrise/sunset)") : ""}. Tap for ${THEME_LABEL[NEXT_MODE[mode]]}`}
        aria-label={`Theme: ${THEME_LABEL[mode]}. Tap for ${THEME_LABEL[NEXT_MODE[mode]]}`}
      >
        <ThemeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span className="w-10 text-left">{THEME_LABEL[mode]}</span>
      </button>
    </div>
  );
}

export default LocationSelector;
