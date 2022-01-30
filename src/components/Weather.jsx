import { useContext } from "react";
import moment from "moment";
import { FiSunrise, FiSunset } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";
import Spinner from "../shared/Spinner";

// Function to initiate a reload and refresh of data for the component
const refresh = () => {
  window.location.reload();
};

function Weather() {
  const { data, isLoading } = useContext(TeslaAppContext);
  console.log({ data });

  if (!isLoading && (!data || data.length === 0)) {
    return <p>Loading....</p>;
  }

  return isLoading ? (
    <Spinner />
  ) : (
    <div className="grid grid-cols-2 gap-4 auto-rows-max	">
      <div>
        {moment().format("dddd")}, <span>{moment().format("LL")}</span>
        <p className="text-3xl font-bold ">{data.name}</p>
      </div>
      <div>
        <p className="text-6xl font-bold text-right">
          {Math.floor(data.main.temp * (9 / 5) + 32)} &deg;F
        </p>
        <p className="text-center"> {data.weather[0].main}</p>
      </div>
      <div class="col-span-2">
        <div class="divider"></div>
      </div>

      <div>
        <p className="text-left align-bottom">
          Sunrise:{" "}
          {new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-IN")}
        </p>
      </div>
      <div>
        <p className="text-left">
          Sunset: {new Date(data.sys.sunset * 1000).toLocaleTimeString("en-IN")}
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
      <div class="col-span-2">
        <div class="divider"></div>
      </div>
      <button className="btn btn-tiny" onClick={refresh}>
        refresh
      </button>
    </div>
  );
}

export default Weather;
