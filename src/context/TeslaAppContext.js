import { createContext, useState, useEffect } from "react";
const OW_API_URL = process.env.REACT_APP_API_URL;
const OW_API_KEY = process.env.REACT_APP_API_KEY;
// const OW_ICON_URL = process.env.REACT_APP_ICON_URL; for future integration

const TeslaAppContext = createContext();

export const TeslaAppProvider = ({ children }) => {
  const [long, setLong] = useState([-71.038887]);
  const [lat, setLat] = useState([42.364506]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCoords();
  }, [long, lat]);

  // Function to get location
  const fetchCoords = async () => {
    navigator.geolocation.getCurrentPosition(success, error);
  };

  // If succesfful call other functions
  async function success(position) {
    const { coords } = position;
    setLat(coords.latitude);
    setLong(coords.longitude);
    fetchWeather(coords);

    // if (position.length !== 0) {
    //   console.log(`check position ${position}`);
    //   fetchWeather(coords);
    // }
  }

  // Default to Boston if geolocation is denied or not available
  function error(error) {
    console.log(error);
    setLong(-71.038887);
    setLat(42.364506);
    const { coords } = {
      "coords.latitude": 42.364506,
      "coords.longitude": -71.038887,
    };
    fetchWeather(coords);
  }

  // Weather Function
  async function fetchWeather(coords) {
    const response = await fetch(
      `${OW_API_URL}/weather/?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&APPID=${OW_API_KEY}`
    );
    const data = await response.json();

    setData(data);
    setIsLoading(false);
  }
  return (
    <TeslaAppContext.Provider
      value={{
        long,
        lat,
        data,
        isLoading,
      }}
    >
      {children}
    </TeslaAppContext.Provider>
  );
};

export default TeslaAppContext;
