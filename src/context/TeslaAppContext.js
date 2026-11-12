import { createContext, useState, useEffect, useCallback } from "react";
import { getWeather, geocodeZip } from "../api/client";
import { loadLastLocation, storeLastLocation } from "../shared/savedLocation";

// Not secrets: just the fallback map position when geolocation is unavailable.
const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 42.364506;
const DEFAULT_LON = parseFloat(import.meta.env.VITE_DEFAULT_LON) || -71.038887;

// GPS can stall in some browsers; give up and use the saved/default location.
const GPS_OPTIONS = { timeout: 10000, maximumAge: 5 * 60 * 1000 };

const TeslaAppContext = createContext();

export const TeslaAppProvider = ({ children }) => {
  const [long, setLong] = useState(DEFAULT_LON);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [data, setData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Boston, MA');
  // Town chosen by name in Change location ("Medfield, MA"); the header shows it
  // instead of OpenWeather's station name. Cleared by GPS and zip lookups.
  const [townName, setTownName] = useState(null);

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
    // No GPS: use the last location the user set, then the Boston default
    const fallbackToSaved = (error) => {
      if (error) console.log('Geolocation error:', error);
      const saved = loadLastLocation();
      const latitude = saved?.lat ?? DEFAULT_LAT;
      const longitude = saved?.lon ?? DEFAULT_LON;
      setLat(latitude);
      setLong(longitude);
      setCurrentLocation(saved ? saved.label || 'Saved location' : 'Boston, MA');
      setTownName(saved?.town ?? null);
      fetchWeatherByCoords({ latitude, longitude });
    };

    if (!navigator.geolocation) {
      fallbackToSaved();
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLat(coords.latitude);
      setLong(coords.longitude);
      setCurrentLocation('Current Location');
      setTownName(null);
      storeLastLocation({ lat: coords.latitude, lon: coords.longitude, label: null });
      fetchWeatherByCoords(coords);
    }, fallbackToSaved, GPS_OPTIONS);
  }, [fetchWeatherByCoords]);

  const searchByZipCode = async (zipCode) => {
    setIsLoading(true);
    try {
      const geo = await geocodeZip(zipCode);
      setLat(geo.lat);
      setLong(geo.lon);
      setCurrentLocation(`${geo.name}, ${geo.country}`);
      setTownName(null);
      storeLastLocation({ lat: geo.lat, lon: geo.lon, label: `${geo.name}, ${geo.country}` });
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

  /** Town picked from the Change location suggestions: { label: "Medfield, MA", lat, lon } */
  const selectTown = async ({ label, lat: townLat, lon: townLon }) => {
    setLat(townLat);
    setLong(townLon);
    setCurrentLocation(label);
    setTownName(label);
    storeLastLocation({ lat: townLat, lon: townLon, label, town: label });
    await fetchWeatherByCoords({ latitude: townLat, longitude: townLon });
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLat(coords.latitude);
        setLong(coords.longitude);
        setCurrentLocation('Current Location');
        setTownName(null);
        storeLastLocation({ lat: coords.latitude, lon: coords.longitude, label: null });
        await fetchWeatherByCoords(coords);
      },
      (error) => {
        console.log('Geolocation error:', error);
        setCurrentLocation('Location access denied');
        setIsLoading(false);
      },
      GPS_OPTIONS
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
        selectTown,
        townName,
        getCurrentLocation,
        refreshWeather,
      }}
    >
      {children}
    </TeslaAppContext.Provider>
  );
};

export default TeslaAppContext;
