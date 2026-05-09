import { useContext } from "react";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";

function Traffic() {
  const { lat, long, currentLocation } = useContext(TeslaAppContext);

  if (!lat || !long || lat === 0 || long === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <FiMapPin className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Location Required</h3>
          <p className="text-sm text-gray-500 mb-4">
            Allow location access or enter a zip code to view traffic
          </p>
          {currentLocation && (
            <p className="text-xs text-gray-600">Current: {currentLocation}</p>
          )}
        </div>
      </div>
    );
  }

  const wazeUrl = `https://embed.waze.com/iframe?zoom=11&lat=${lat}&lon=${long}&pin=1&desc=1&ct=livemap`;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Minimal header: just Open in Waze CTA */}
      <div className="flex items-center justify-end flex-shrink-0">
        <button
          onClick={() => window.open(`https://www.waze.com/livemap?lat=${lat}&lon=${long}`, '_blank', 'noopener,noreferrer')}
          className="h-11 px-5 flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm rounded-xl transition-all"
        >
          <FiNavigation className="w-4 h-4" />
          Open in Waze
        </button>
      </div>

      {/* Map — flush to card edges, Waze header clipped */}
      <div className="flex-1 rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
        <iframe
          src={wazeUrl}
          width="100%"
          title="Waze Traffic Map"
          style={{
            position: 'absolute',
            top: '-56px',
            left: 0,
            width: '100%',
            height: 'calc(100% + 56px)',
            border: 'none',
          }}
        />
      </div>
    </div>
  );
}

export default Traffic;
