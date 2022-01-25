import React from "react";
import moment from "moment";
import { FiSunrise, FiSunset } from "react-icons/fi";

// Function to initiate a reload and refresh of data for the component
const refresh = () => {
  window.location.reload();
};

const Weather = ({ weatherData }) => (
  <div className="grid grid-cols-2 gap-4 auto-rows-max	">
    <div>
      {moment().format("dddd")}, <span>{moment().format("LL")}</span>
      <p className="text-3xl font-bold ">{weatherData.name}</p>
    </div>
    <div>
      <p className="text-6xl font-bold text-right">
        {Math.floor(weatherData.main.temp * (9 / 5) + 32)} &deg;F
      </p>
      <p className="text-center"> {weatherData.weather[0].main}</p>

      {/* <p className="text-right">Humidity: {weatherData.main.humidity} %</p> */}
    </div>
    <div class="col-span-2">___________________________________________</div>

    <div>
      <p className="text-left align-bottom">
        Sunrise:{" "}
        {new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString("en-IN")}
      </p>
    </div>
    <div>
      <p className="text-left">
        Sunset:{" "}
        {new Date(weatherData.sys.sunset * 1000).toLocaleTimeString("en-IN")}
      </p>
    </div>

    <div>
      {" "}
      <FiSunrise className="text-6xl " />
    </div>
    <div>
      {" "}
      <FiSunset className="text-6xl" />
    </div>

    <button className="btn btn-tiny" onClick={refresh}>
      refresh
    </button>
  </div>
);

export default Weather;
