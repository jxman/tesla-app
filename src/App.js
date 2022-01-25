import React, { useEffect, useState } from "react";
import Weather from "./components/weather";
import Traffic from "./components/traffic";
import News from "./components/news";

function App() {
  const [lat, setLat] = useState([]);
  const [long, setLong] = useState([]);
  const [data, setData] = useState([]);

  // Get current coordinates and then call Weather API with log and lat
  useEffect(() => {
    const fetchData = async () => {
      navigator.geolocation.getCurrentPosition(function (position) {
        setLat(position.coords.latitude);
        setLong(position.coords.longitude);
      });

      await fetch(
        `${process.env.REACT_APP_API_URL}/weather/?lat=${lat}&lon=${long}&units=metric&APPID=${process.env.REACT_APP_API_KEY}`
      )
        .then((res) => res.json())
        .then((result) => {
          setData(result);
        });
    };
    fetchData();
  }, [lat, long]);

  return (
    <div>
      <div className="flex flex-row">
        <div className="basis-1/3 card shadow-lg card-bordered	">
          <div className="card-body">
            {typeof data.main != "undefined" ? (
              <Weather weatherData={data} />
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </div>

        <div className="basis-2/3 card shadow-lg card-bordered	">
          <div className="card-body">
            <Traffic lat={lat} long={long} />
          </div>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="flex-auto card shadow-lg card-bordered	">
          <div className="card-body">
            <News />
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
