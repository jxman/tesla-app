import { createContext, useState, useEffect } from "react";
const OW_API_URL = process.env.REACT_APP_API_URL;
const OW_API_KEY = process.env.REACT_APP_API_KEY;

const TeslaAppContext = createContext();

export const TeslaAppProvider = ({ children }) => {
  const [long, setLong] = useState(-71.038887);
  const [lat, setLat] = useState(42.364506);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Boston, MA');

  useEffect(() => {
    // Function to get location
    const fetchCoords = async () => {
      navigator.geolocation.getCurrentPosition(success, error);
    };
    
    // If successful call other functions
    async function success(position) {
      const { coords } = position;
      setLat(coords.latitude);
      setLong(coords.longitude);
      setCurrentLocation('Current Location');
      fetchWeatherInitial(coords);
    }

    // Default to Boston if geolocation is denied or not available
    function error(error) {
      console.log('Geolocation error:', error);
      const defaultLat = parseFloat(process.env.REACT_APP_DEFAULT_LAT) || 42.364506;
      const defaultLon = parseFloat(process.env.REACT_APP_DEFAULT_LON) || -71.038887;
      
      setLong(defaultLon);
      setLat(defaultLat);
      setCurrentLocation('Boston, MA');
      
      const fallbackCoords = {
        latitude: defaultLat,
        longitude: defaultLon,
      };
      fetchWeatherInitial(fallbackCoords);
    }

    // Weather Function (defined here for the initial load)
    async function fetchWeatherInitial(coords) {
      try {
        const response = await fetch(
          `${OW_API_URL}/weather/?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&APPID=${OW_API_KEY}`
        );
        const data = await response.json();
        
        console.log('API Response:', data);
        
        setData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Weather API Error:', error);
        setData({ error: 'Failed to fetch weather data', message: error.message });
        setIsLoading(false);
      }
    }
    
    fetchCoords();
  }, []);

  // Function to search by zip code
  const searchByZipCode = async (zipCode) => {
    setIsLoading(true);
    try {
      // Use OpenWeather's geocoding API to convert zip to coordinates
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode}&appid=${OW_API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Invalid zip code or API error');
      }
      
      const geoData = await geoResponse.json();
      
      // Update coordinates
      setLat(geoData.lat);
      setLong(geoData.lon);
      const locationName = `${geoData.name}, ${geoData.country}`;
      setCurrentLocation(locationName);
      
      // Fetch weather for new location
      await fetchWeatherByCoords({ latitude: geoData.lat, longitude: geoData.lon });
      
    } catch (error) {
      console.error('Zip code search error:', error);
      setData({ 
        error: 'Location not found', 
        message: 'Please check your zip code and try again',
        cod: 404
      });
      setIsLoading(false);
    }
  };

  // Function to manually get current location
  const getCurrentLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { coords } = position;
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

  // Extracted weather fetching function for reuse
  const fetchWeatherByCoords = async (coords) => {
    try {
      const response = await fetch(
        `${OW_API_URL}/weather/?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&APPID=${OW_API_KEY}`
      );
      const data = await response.json();
      
      console.log('API Response:', data);
      
      setData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Weather API Error:', error);
      setData({ error: 'Failed to fetch weather data', message: error.message });
      setIsLoading(false);
    }
  };

  // Function to refresh weather data for current location
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