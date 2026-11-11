import { createContext, useState, useEffect, useCallback } from "react";
import { getWeather, geocodeZip } from "../api/client";

// Not secrets: just the fallback map position when geolocation is unavailable.
const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 42.364506;
const DEFAULT_LON = parseFloat(import.meta.env.VITE_DEFAULT_LON) || -71.038887;

const TeslaAppContext = createContext();

export const TeslaAppProvider = ({ children }) => {
  const [long, setLong] = useState(DEFAULT_LON);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [data, setData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Boston, MA');

  // Fetches current weather + forecast through /api/weather.
  // On failure, `data` gets an OWM-style { cod, message } so Weather.jsx shows its error state.
  const fetchWeatherByCoords = useCallback(async ({ latitude, longitude }) => {
    setIsLoading(true);
    try {
      const { current, forecast } = await getWeather(latitude, longitude);
      setData(current);
      setForecastData(forecast);
    } catch (error) {
      console.error('Weather API Error:', error);
      setData({ cod: error.status || 500, message: error.message || 'Failed to fetch weather data' });
      setForecastData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fallbackToDefault = (error) => {
      if (error) console.log('Geolocation error:', error);
      setLat(DEFAULT_LAT);
      setLong(DEFAULT_LON);
      setCurrentLocation('Boston, MA');
      fetchWeatherByCoords({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
    };

    if (!navigator.geolocation) {
      fallbackToDefault();
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLat(coords.latitude);
      setLong(coords.longitude);
      setCurrentLocation('Current Location');
      fetchWeatherByCoords(coords);
    }, fallbackToDefault);
  }, [fetchWeatherByCoords]);

  const searchByZipCode = async (zipCode) => {
    setIsLoading(true);
    try {
      const geo = await geocodeZip(zipCode);
      setLat(geo.lat);
      setLong(geo.lon);
      setCurrentLocation(`${geo.name}, ${geo.country}`);
      await fetchWeatherByCoords({ latitude: geo.lat, longitude: geo.lon });
    } catch (error) {
      console.error('Zip code search error:', error);
      setData({
        cod: 404,
        message: error.status === 422 || error.status === 400
          ? 'Please check your zip code and try again'
          : error.message,
      });
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLat(coords.latitude);
        setLong(coords.longitude);
        setCurrentLocation('Current Location');
        await fetchWeatherByCoords(coords);
      },
      (error) => {
        console.log('Geolocation error:', error);
        setCurrentLocation('Location access denied');
        setIsLoading(false);
      }
    );
  };

  const refreshWeather = async () => {
    if (lat && long) {
      await fetchWeatherByCoords({ latitude: lat, longitude: long });
    }
  };

  return (
    <TeslaAppContext.Provider
      value={{
        long,
        lat,
        data,
        forecastData,
        isLoading,
        currentLocation,
        searchByZipCode,
        getCurrentLocation,
        refreshWeather,
      }}
    >
      {children}
    </TeslaAppContext.Provider>
  );
};

export default TeslaAppContext;
