import React from "react";
import { FaYelp, FaMapMarkerAlt } from "react-icons/fa";

function Yelp() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FaYelp className="text-2xl text-red-500" />
          <div>
            <h2 className="text-lg font-bold text-white">Nearby Places</h2>
            <p className="text-xs text-gray-400">Yelp integration coming soon</p>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <FaMapMarkerAlt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Yelp Integration</h3>
          <p className="text-sm text-gray-400 mb-4">
            This section will show nearby restaurants, coffee shops, gas stations, and more.
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-500">
              🔧 Feature under development
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Yelp;