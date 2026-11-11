import { useContext } from "react";
import { FiMapPin } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";
import TrafficCard from "./TrafficCard";

function Traffic() {
  const { lat, long, currentLocation } = useContext(TeslaAppContext);

  if (!lat || !long || lat === 0 || long === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <FiMapPin className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Location Required</h3>
          <p className="text-base text-gray-500 mb-4">
            Allow location access or enter a zip code to view traffic
          </p>
          {currentLocation && (
            <p className="text-sm text-gray-600">Current: {currentLocation}</p>
          )}
        </div>
      </div>
    );
  }

  // Full-width traffic card: drive times to saved places + traffic near me
  return <TrafficCard lat={lat} lon={long} />;
}

export default Traffic;
