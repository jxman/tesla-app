import { useContext } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import TeslaAppContext from "../context/TeslaAppContext";

function Traffic() {
  const { lat, long, currentLocation } = useContext(TeslaAppContext);

  // Check if we have valid coordinates (fix the array length bug)
  if (!lat || !long || lat === 0 || long === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <FaMapMarkerAlt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Location Required</h3>
          <p className="text-sm text-gray-400 mb-4">
            Please allow location access or enter a zip code to view traffic
          </p>
          {currentLocation && (
            <p className="text-xs text-gray-500">
              Current: {currentLocation}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Generate Waze URL with proper coordinates
  const wazeUrl = `https://embed.waze.com/iframe?zoom=11&lat=${lat}&lon=${long}&pin=1&desc=1&ct=livemap`;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🚗</div>
          <div>
            <h2 className="text-lg font-bold text-white">Traffic Conditions</h2>
            {currentLocation && (
              <p className="text-xs text-gray-400 flex items-center space-x-1">
                <FaMapMarkerAlt className="w-3 h-3" />
                <span>{currentLocation}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(`https://www.waze.com/livemap?lat=${lat}&lon=${long}`, '_blank')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            Open in Waze
          </button>
        </div>
      </div>

      {/* Waze Embed */}
      <div className="flex-1 rounded-lg overflow-hidden border border-gray-700">
        <iframe
          src={wazeUrl}
          width="100%"
          height="100%"
          style={{ minHeight: '400px' }}
          title="Waze Traffic Map"
          className="rounded-lg"
        />
      </div>

      {/* Footer Info */}
      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Live Traffic:</span>
            <span className="text-green-400">Connected</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-500">
            <span>Powered by Waze</span>
            <span>•</span>
            <span>Real-time Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Traffic;