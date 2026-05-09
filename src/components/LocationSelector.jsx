import { useState, useContext } from "react";
import { FiSearch, FiSettings, FiX } from "react-icons/fi";
import { BiCurrentLocation } from "react-icons/bi";
import TeslaAppContext from "../context/TeslaAppContext";

function LocationSelector() {
  const [zip, setZip] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { searchByZipCode, getCurrentLocation, data, isLoading } = useContext(TeslaAppContext);

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
      <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Enter zip code"
            className="flex-1 h-12 px-4 bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            disabled={isSearching}
          />
          <button
            type="button"
            onClick={() => { getCurrentLocation(); setIsSearchOpen(false); }}
            className="h-12 w-12 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            title="Use current location"
          >
            <BiCurrentLocation className="text-xl text-green-400" />
          </button>
          <button
            type="submit"
            disabled={!zip.trim() || isSearching}
            className="h-12 px-6 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-semibold transition-all disabled:opacity-40 flex-shrink-0 text-sm"
          >
            {isSearching ? "Searching…" : "Go"}
          </button>
        </form>
        <button
          onClick={() => { setIsSearchOpen(false); setZip(""); }}
          className="h-12 w-12 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        >
          <FiX className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-1 mb-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-white tracking-tight truncate">
          {locationName}
        </h1>
        {!isLoading && data?.name && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-[10px] font-mono tracking-widest uppercase flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live
          </span>
        )}
      </div>
      <button
        onClick={() => setIsSearchOpen(true)}
        className="h-11 w-11 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        title="Search location"
      >
        <FiSearch className="w-5 h-5 text-gray-400" />
      </button>
      <button
        className="h-11 w-11 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
        title="Settings"
      >
        <FiSettings className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
}

export default LocationSelector;
