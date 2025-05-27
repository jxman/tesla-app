import Weather from "./components/Weather";
import Traffic from "./components/Traffic";
import News from "./components/News";
import Yelp from "./components/Yelp";
import LocationSelector from "./components/LocationSelector";
import { TeslaAppProvider } from "./context/TeslaAppContext";

function App() {
  return (
    <TeslaAppProvider>
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <LocationSelector />
        <div className="space-y-3">
          <div className="flex flex-row gap-4">
            <div className="flex-1 card shadow-xl bg-gray-800 border border-gray-700">
              <div className="card-body p-5">
                <Weather />
              </div>
            </div>

            <div className="flex-[2] card shadow-xl bg-gray-800 border border-gray-700">
              <div className="card-body p-5">
                <Traffic />
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex-[3] card shadow-xl bg-gray-800 border border-gray-700">
              <div className="card-body p-5">
                <News />
              </div>
            </div>
            <div className="flex-1 card shadow-xl bg-gray-800 border border-gray-700">
              <div className="card-body p-5">
                <Yelp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeslaAppProvider>
  );
}
export default App;
