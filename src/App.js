import Weather from "./components/Weather";
import Traffic from "./components/Traffic";
import News from "./components/News";
import Yelp from "./components/Yelp";
import { TeslaAppProvider } from "./context/TeslaAppContext";

function App() {
  return (
    <TeslaAppProvider>
      <div>
        <div className="flex flex-row">
          <div className="basis-1/3 card shadow-lg card-bordered	">
            <div className="card-body">
              <Weather />
            </div>
          </div>

          <div className="basis-2/3 card shadow-lg card-bordered	">
            <div className="card-body">
              <Traffic />
            </div>
          </div>
        </div>
        <div className="flex flex-row">
          <div className="basis-3/4 card shadow-lg card-bordered	">
            <div className="card-body">
              <News />
            </div>
          </div>
          <div className="basis-1/4 card shadow-lg card-bordered	">
            <div className="card-body">
              <Yelp />
            </div>
          </div>
        </div>
      </div>
    </TeslaAppProvider>
  );
}
export default App;
