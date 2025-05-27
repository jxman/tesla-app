import { useContext, useState } from "react";
import moment from "moment";
import { FiSunrise, FiSunset } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";
import Spinner from "../shared/Spinner";

// Function to get weather emoji based on condition
const getWeatherEmoji = (condition) => {
  const weatherEmojis = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  return weatherEmojis[condition] || '🌤️';
};

function Weather() {
  const { data, isLoading, currentLocation, refreshWeather } = useContext(TeslaAppContext);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWeather();
    } catch (error) {
      console.error('Error refreshing weather:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debug: log the data to see what we're getting
  console.log('Weather data:', data);

  if (isLoading) {
    return <Spinner />;
  }

  // Check if we have no data or if the API returned an error
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-gray-300">No Weather Data</p>
        <p className="text-sm text-gray-400 mb-4">Please check your API key in the .env file</p>
        <button 
          className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '🔄 Loading...' : '🔄 Retry'}
        </button>
      </div>
    );
  }

  // Check if API returned an error (like 401 for invalid API key)
  if (data.cod && data.cod !== 200) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-red-400">API Error</p>
        <p className="text-sm text-gray-400 mb-4">
          {data.message || `Error ${data.cod}: Please check your API key`}
        </p>
        <button 
          className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '🔄 Loading...' : '🔄 Retry'}
        </button>
      </div>
    );
  }

  // Check if we have the expected data structure
  if (!data.main || !data.weather || !data.sys) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-yellow-400">Unexpected Data Format</p>
        <p className="text-sm text-gray-400 mb-4">Weather data structure is not as expected</p>
        <button 
          className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '🔄 Loading...' : '🔄 Retry'}
        </button>
      </div>
    );
  }

  // If we get here, we have valid weather data
  return (
    <div className="space-y-6">
      {/* Header with Location and Refresh */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-wide">
            {moment().format("dddd, MMMM Do")}
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">{data.name}</h2>
          {currentLocation && (
            <p className="text-sm text-blue-400 italic mt-1">{currentLocation}</p>
          )}
        </div>
        <button 
          className={`btn btn-sm bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300 transition-all duration-200 ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh Weather Data"
        >
          <svg 
            className={`w-4 h-4 mr-1 transition-transform duration-300 ${
              isRefreshing ? 'animate-spin' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Main Weather Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Temperature */}
          <div className="text-6xl font-light text-white">
            {Math.floor(data.main.temp * (9 / 5) + 32)}
            <span className="text-3xl text-gray-400">&deg;F</span>
          </div>
          
          {/* Weather Condition */}
          <div>
            <div className="text-xl text-gray-300 capitalize">{data.weather[0].description}</div>
            <div className="text-sm text-gray-400 mt-1">
              Feels like {Math.floor(data.main.feels_like * (9 / 5) + 32)}&deg;F
            </div>
          </div>
        </div>
        
        {/* Weather Icon Area */}
        <div className="text-right">
          <div className="text-5xl mb-2">
            {getWeatherEmoji(data.weather[0].main)}
          </div>
          <div className="text-sm text-gray-400">
            {data.weather[0].main}
          </div>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sun Times */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <FiSunrise className="text-2xl text-yellow-500" />
            <div>
              <div className="text-sm text-gray-400">Sunrise</div>
              <div className="text-lg font-medium text-white">
                {new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-US", {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <FiSunset className="text-2xl text-orange-500" />
            <div>
              <div className="text-sm text-gray-400">Sunset</div>
              <div className="text-lg font-medium text-white">
                {new Date(data.sys.sunset * 1000).toLocaleTimeString("en-US", {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Weather Info */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Humidity</span>
              <span className="text-lg font-medium text-white">{data.main.humidity}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Pressure</span>
              <span className="text-lg font-medium text-white">{data.main.pressure} hPa</span>
            </div>
            
            {data.visibility && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Visibility</span>
                <span className="text-lg font-medium text-white">{(data.visibility / 1000).toFixed(1)} km</span>
              </div>
            )}
            
            {data.wind && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Wind</span>
                <span className="text-lg font-medium text-white">{Math.round(data.wind.speed * 2.237)} mph</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;
