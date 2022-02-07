import { useContext } from "react";
import TeslaAppContext from "../context/TeslaAppContext";

function Traffic() {
  const { lat, long } = useContext(TeslaAppContext);
  const wazeUrl = `https://embed.waze.com/iframe?zoom=11&lat=${lat}&lon=${long}&pin=1&desc=1&ct=livemap`;

  if (lat.length !== 0 || long.length !== 0) {
    return (
      <div>
        <iframe
          src={wazeUrl}
          width="100%"
          height="450"
          title="wazeFrame"
          // allowFullScreen
        ></iframe>
      </div>
    );
  }
}

export default Traffic;
