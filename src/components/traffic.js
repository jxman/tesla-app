import React from "react";

function Traffic({ lat, long }) {
  const wazeUrl = `https://embed.waze.com/iframe?zoom=10&lat=${lat}&lon=${long}&pin=1&desc=1&ct=livemap`;

  return (
    <div>
      <iframe
        // src="https://embed.waze.com/iframe?zoom=11&lat=42.204870&lon=-71.239128&ct=livemap"
        src={wazeUrl}
        width="100%"
        height="450"
        title="wazeFrame"
        // allowFullScreen
      ></iframe>
    </div>
  );
}

export default Traffic;
