import { useContext, useState, useRef, useMemo } from "react";
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
  const { data, forecastData, isLoading, currentLocation, refreshWeather } = useContext(TeslaAppContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWeather();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing weather:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Drag scrolling handlers
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  // Touch handlers for mobile/touchscreen
  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Memoize daily forecast from real API data only
  const dailyForecast = useMemo(() => {
    if (!forecastData?.list) return [];

    // Group forecast data by day
    const dailyData = {};
    forecastData.list.forEach(item => {
      const day = moment.unix(item.dt).format('YYYY-MM-DD');
      if (!dailyData[day]) {
        dailyData[day] = {
          date: item.dt,
          temps: [],
          weather: item.weather[0],
          pop: item.pop
        };
      }
      dailyData[day].temps.push(item.main.temp);
      if (item.pop > dailyData[day].pop) {
        dailyData[day].pop = item.pop;
      }
    });

    // Return only real API data (typically 5-6 days)
    return Object.values(dailyData);
  }, [forecastData]);

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
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Header with Location and Refresh */}
      <div className="flex justify-between items-start flex-shrink-0">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-wide">
            {moment().format("dddd, MMMM Do")}
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{data.name}</h2>
          {currentLocation && (
            <p className="text-sm text-blue-400 italic mt-1">{currentLocation}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Hourly/Daily Toggle - Even width buttons */}
          <div className="grid grid-cols-2 gap-2 bg-gray-700 rounded-lg p-2">
            <button
              onClick={() => setShowHourly(false)}
              className={`btn btn-sm px-4 py-2 text-xs rounded-md transition-all flex items-center justify-center ${
                !showHourly ? 'btn-active bg-blue-600 text-white btn-soft' : 'text-gray-300 hover:text-white btn-ghost'
              }`}
              tabIndex="0"
            >
              Daily
            </button>
            <button
              onClick={() => setShowHourly(true)}
              className={`btn btn-sm px-4 py-2 text-xs rounded-md transition-all flex items-center justify-center ${
                showHourly ? 'btn-active bg-blue-600 text-white btn-soft' : 'text-gray-300 hover:text-white btn-ghost'
              }`}
              tabIndex="0"
            >
              Hourly
            </button>
          </div>

          <div className="flex flex-col items-end">
            <button
              className={`btn btn-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                isRefreshing ? 'opacity-50 cursor-not-allowed btn-disabled' : 'btn-soft hover:shadow-lg'
              }`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Weather Data"
              tabIndex="0"
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
            <p className="text-xs text-gray-500 mt-1">
              Updated {moment(lastUpdated).fromNow()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Weather Display */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          {/* Temperature */}
          <div>
            <div className="text-5xl font-light text-white">
              {Math.floor(data.main.temp * (9 / 5) + 32)}
              <span className="text-2xl text-gray-400">&deg;F</span>
            </div>
            <div className="text-sm text-gray-400 mt-2">
              H: {Math.floor(data.main.temp_max * (9 / 5) + 32)}&deg; L: {Math.floor(data.main.temp_min * (9 / 5) + 32)}&deg;
            </div>
          </div>

          {/* Weather Condition */}
          <div>
            <div className="text-lg text-gray-300 capitalize">{data.weather[0].description}</div>
            <div className="text-sm text-gray-400 mt-1">
              Feels like {Math.floor(data.main.feels_like * (9 / 5) + 32)}&deg;F
            </div>
          </div>
        </div>
        
        {/* Weather Icon Area */}
        <div className="text-right">
          <div className="text-4xl mb-2">
            {getWeatherEmoji(data.weather[0].main)}
          </div>
          <div className="text-sm text-gray-400">
            {data.weather[0].main}
          </div>
        </div>
      </div>

      {/* Weather Details */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
          <FiSunrise className="text-lg text-yellow-500 mx-auto mb-1" />
          <div className="text-xs text-gray-400">Sunrise</div>
          <div className="text-sm font-medium text-white">
            {new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-US", {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
          <FiSunset className="text-lg text-orange-500 mx-auto mb-1" />
          <div className="text-xs text-gray-400">Sunset</div>
          <div className="text-sm font-medium text-white">
            {new Date(data.sys.sunset * 1000).toLocaleTimeString("en-US", {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
          <div className="text-lg text-blue-400 mb-1">💧</div>
          <div className="text-xs text-gray-400">Humidity</div>
          <div className="text-sm font-medium text-white">{data.main.humidity}%</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
          <div className="text-lg text-green-400 mb-1">💨</div>
          <div className="text-xs text-gray-400">Wind</div>
          <div className="text-sm font-medium text-white">
            {data.wind ? Math.round(data.wind.speed * 2.237) : 0} mph
          </div>
        </div>
      </div>

      {/* Forecast Section */}
      <div className="flex-1 overflow-hidden">
        <h3 className="text-lg font-semibold text-white mb-3">
          {showHourly ? 'Next 6 Hours' : '5-Day Forecast'}
        </h3>

        {/* Scroll container with gradient indicators */}
        <div className="relative h-full">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-x-auto overflow-y-hidden cursor-grab select-none"
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
          {showHourly ? (
            // 12-Hour Forecast (horizontal layout)
            <div className="flex space-x-3 pb-2">
              {(() => {
                const hourlyData = [];
                const now = new Date();
                
                // Generate next 6 hours
                for (let i = 1; i <= 6; i++) {
                  const hourTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
                  
                  // Find the closest forecast data points
                  let closestInterval = null;
                  let minTimeDiff = Infinity;
                  
                  forecastData?.list?.forEach(interval => {
                    const intervalTime = new Date(interval.dt * 1000);
                    const timeDiff = Math.abs(intervalTime - hourTime);
                    if (timeDiff < minTimeDiff) {
                      minTimeDiff = timeDiff;
                      closestInterval = interval;
                    }
                  });
                  
                  if (closestInterval) {
                    hourlyData.push({
                      time: hourTime,
                      data: closestInterval,
                      hour: i
                    });
                  }
                }
                
                const currentHour = now.getHours();

                return hourlyData.map((hour, index) => {
                  const hourValue = hour.time.getHours();
                  const isCurrentHour = index === 0 || hourValue === currentHour;

                  return (
                    <div key={index} className={`flex-shrink-0 rounded-lg p-4 border text-center w-[180px] h-[200px] select-none pointer-events-none ${
                      isCurrentHour
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-gray-800/30 border-gray-700/50'
                    }`}>
                      <div className={`text-base mb-3 ${isCurrentHour ? 'text-blue-300 font-semibold' : 'text-gray-400'}`}>
                        {index === 0 ? 'Now' : hour.time.toLocaleTimeString("en-US", {
                          hour: 'numeric',
                          hour12: true
                        })}
                      </div>
                      <div className="text-4xl mb-3">
                        {getWeatherEmoji(hour.data.weather[0].main)}
                      </div>
                      <div className="text-sm text-gray-400 capitalize mb-3 line-clamp-2 leading-tight">
                        {hour.data.weather[0].description}
                      </div>
                      <div className="text-2xl font-medium text-white mb-2">
                        {Math.round(hour.data.main.temp * (9 / 5) + 32)}&deg;
                      </div>
                      <div className="text-sm text-blue-400">
                        {hour.data.pop > 0.1 ? `${Math.round(hour.data.pop * 100)}%` : '\u00A0'}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            // Daily Summary (horizontal layout)
            <div className="flex space-x-3 pb-2">
              {dailyForecast.map((day, index) => {
                  const isToday = index === 0;

                  return (
                    <div key={index} className={`flex-shrink-0 rounded-lg p-4 border text-center w-[180px] h-[200px] select-none pointer-events-none ${
                      isToday
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-gray-800/30 border-gray-700/50'
                    }`}>
                      <div className={`text-base mb-3 ${isToday ? 'text-blue-300 font-semibold' : 'text-gray-400'}`}>
                        {isToday ? 'Today' : moment.unix(day.date).format('ddd')}
                      </div>
                      <div className="text-4xl mb-3">
                        {getWeatherEmoji(day.weather.main)}
                      </div>
                      <div className="text-sm text-gray-400 capitalize mb-3 line-clamp-2 leading-tight">
                        {day.weather.description}
                      </div>
                      <div className="text-base text-gray-300 mb-2">
                        <span className="font-medium">H:</span> {Math.round(Math.max(...day.temps) * (9 / 5) + 32)}&deg; <span className="font-medium">L:</span> {Math.round(Math.min(...day.temps) * (9 / 5) + 32)}&deg;
                      </div>
                      <div className="text-sm text-blue-400">
                        {day.pop > 0.1 ? `${Math.round(day.pop * 100)}%` : '\u00A0'}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;
