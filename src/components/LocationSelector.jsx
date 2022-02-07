import { useState } from "react";
import { BiCurrentLocation } from "react-icons/bi";

function LocationSelector() {
  const [zip, setZip] = useState("");

  const handleChange = (e) => setZip(e.target.value);

  return (
    <div className="navbar mb-2 shadow-lg bg-neutral text-neutral-content rounded-box">
      <div className="flex-1 px-2 mx-2">
        <span className="text-lg font-bold">My Tesla Home Page</span>
      </div>
      <div className="flex-none form-control">
        <div className="relative">
          <input
            type="text"
            placeholder="Enter Zip"
            className="w-full pr-16 bg-gray-200 input input-lg input-bordered text-black"
            value={zip}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="absolute top-0 right-0 rounded-l-none btn btn-lg"
          >
            go
          </button>
        </div>
      </div>
      <div className="flex-none px-2 mx-2 text-xl">
        <button className="btn">
          <BiCurrentLocation />
        </button>
      </div>
    </div>
  );
}

export default LocationSelector;
