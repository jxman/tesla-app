import { useState, useContext, useEffect } from "react";
import { BiCurrentLocation } from "react-icons/bi";
import { FiWifi, FiWifiOff, FiMapPin, FiRefreshCw } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";

function LocationSelector() {
  const [zip, setZip] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [locationStatus, setLocationStatus] = useState('available');
  const { searchByZipCode, getCurrentLocation, data, isLoading } = useContext(TeslaAppContext);

  // Monitor connection and location status
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    };

    const checkLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationStatus('available'),
          () => setLocationStatus('denied'),
          { timeout: 5000 }
        );
      } else {
        setLocationStatus('unavailable');
      }
    };

    checkConnection();
    checkLocation();

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  const handleChange = (e) => setZip(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (zip.trim()) {
      setIsSearching(true);
      await searchByZipCode(zip.trim());
      setIsSearching(false);
      setZip(""); // Clear input after search
    }
  };

  const handleCurrentLocation = () => {
    getCurrentLocation();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-gray-800 shadow-2xl rounded-2xl border border-gray-700 mb-4 overflow-hidden">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Tesla Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Tesla Dashboard</h1>
              <p className="text-xs text-gray-400">Weather & Navigation Hub</p>
            </div>
          </div>
          
          {/* Search and Controls */}
          <div className="flex items-center space-x-4">
            {/* Search Section */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter zip code"
                  className="w-64 h-12 pl-4 pr-20 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  value={zip}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  disabled={isSearching}
                />
                <button
                  type="submit"
                  className={`btn btn-sm absolute right-2 top-2 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium ${
                    isSearching ? 'opacity-50 cursor-not-allowed' : 'btn-soft hover:shadow-lg'
                  }`}
                  disabled={!zip.trim() || isSearching}
                >
                  {isSearching ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching</span>
                    </div>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </form>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Current Location Button - Enhanced */}
              <button 
                className={`btn btn-xl h-12 px-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-xl transition-all duration-200 flex items-center space-x-2 hover:shadow-lg group ${
                  locationStatus === 'denied' ? 'btn-disabled opacity-50' : 'btn-soft'
                }`}
                onClick={handleCurrentLocation} 
                title={`Use Current Location - ${locationStatus}`}
                disabled={locationStatus === 'denied' || locationStatus === 'unavailable'}
                tabIndex="0"
              >
                <BiCurrentLocation className={`text-xl group-hover:scale-110 transition-transform duration-200 ${
                  locationStatus === 'available' ? 'text-green-400' : 'text-red-400'
                }`} />
                <span className="hidden lg:inline text-sm font-medium">Current Location</span>
              </button>
              
              {/* Settings/Menu Button - Enhanced */}
              <button 
                className="btn btn-xl h-12 w-12 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center hover:shadow-lg group btn-soft"
                title="Settings"
                tabIndex="0"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Enhanced Status Indicators */}
              <div className="flex items-center space-x-4 pl-2">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  <div className={`status ${connectionStatus === 'connected' ? 'status-success' : 'status-error'}`}>
                    {connectionStatus === 'connected' ? (
                      <FiWifi className="w-3 h-3" />
                    ) : (
                      <FiWifiOff className="w-3 h-3" />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 hidden xl:inline">
                    {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                {/* Location Status */}
                <div className="flex items-center space-x-2">
                  <div className={`status ${
                    locationStatus === 'available' ? 'status-success' : 
                    locationStatus === 'denied' ? 'status-error' : 'status-warning'
                  }`}>
                    <FiMapPin className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-gray-400 hidden xl:inline">
                    {locationStatus === 'available' ? 'GPS' : 
                     locationStatus === 'denied' ? 'No GPS' : 'GPS?'}
                  </span>
                </div>
                
                {/* API Status */}
                <div className="flex items-center space-x-2">
                  <div className={`status ${
                    data && !isLoading ? 'status-success' : 
                    isLoading ? 'status-warning' : 'status-error'
                  }`}>
                    <FiRefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </div>
                  <span className="text-xs text-gray-400 hidden xl:inline">
                    {data && !isLoading ? 'APIs' : isLoading ? 'Loading' : 'No Data'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationSelector;
