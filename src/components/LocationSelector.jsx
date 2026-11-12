import { useState, useContext } from "react";
import { FiMapPin, FiX, FiSun, FiMoon } from "react-icons/fi";
import { BiCurrentLocation } from "react-icons/bi";
import TeslaAppContext from "../context/TeslaAppContext";
import { useTheme } from "../context/ThemeContext";

function LocationSelector() {
  const [zip, setZip] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { searchByZipCode, getCurrentLocation, data, isLoading } = useContext(TeslaAppContext);
  const { isDark, isAuto, followsCar, toggle } = useTheme();

  const locationName = data?.name || "Loading...";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zip.trim()) return;
    setIsSearching(true);
    await searchByZipCode(zip.trim());
    setIsSearching(false);
    setZip("");
    setIsSearchOpen(false);
  };

  if (isSearchOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Enter zip code"
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
            disabled={!zip.trim() || isSearching}
            className="h-12 px-6 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-semibold transition-all disabled:opacity-40 flex-shrink-0 text-base"
          >
            {isSearching ? "Finding…" : "Go"}
          </button>
        </form>
        <button
          onClick={() => { setIsSearchOpen(false); setZip(""); }}
          aria-label="Cancel"
          title="Cancel"
          className="h-12 w-12 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        >
          <FiX className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </button>
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
        title="Change location (zip code or current location)"
      >
        <FiMapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        Change location
      </button>
      <button
        onClick={toggle}
        className="relative h-11 w-11 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        title={isAuto
          ? `Auto (${followsCar ? "follows the car's display" : "sunrise/sunset"}). Tap for ${isDark ? "light" : "dark"}`
          : `Manual until the ${followsCar ? "car's display changes" : "next sunrise/sunset"}. Tap to return to Auto`}
        aria-label={isAuto ? "Theme: Auto. Tap to override" : "Theme: manual. Tap to return to Auto"}
      >
        {isDark
          ? <FiSun className="w-5 h-5 text-gray-400" />
          : <FiMoon className="w-5 h-5 text-gray-500" />
        }
        {isAuto && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-5 text-center">
            A
          </span>
        )}
      </button>
    </div>
  );
}

export default LocationSelector;
