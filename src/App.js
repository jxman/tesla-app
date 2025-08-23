import { useState } from "react";
import Weather from "./components/Weather";
import Traffic from "./components/Traffic";
import News from "./components/News";
import Places from "./components/Places";
import LocationSelector from "./components/LocationSelector";
import { TeslaAppProvider } from "./context/TeslaAppContext";
import { FiCloud, FiNavigation, FiRss, FiMapPin } from "react-icons/fi";

function App() {
  const [activeTab, setActiveTab] = useState('weather');

  const tabs = [
    { id: 'weather', name: 'Weather', icon: FiCloud, component: Weather },
    { id: 'traffic', name: 'Traffic', icon: FiNavigation, component: Traffic },
    { id: 'news', name: 'News', icon: FiRss, component: News },
    { id: 'places', name: 'Places', icon: FiMapPin, component: Places }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Weather;

  return (
    <TeslaAppProvider>
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <LocationSelector />
        
        {/* Tab Navigation - Enhanced spacing */}
        <div className="bg-gray-800 border border-gray-700 mb-4 p-3 rounded-xl">
          <div className="flex space-x-3">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 h-16 px-6 gap-3 flex items-center justify-center transition-all duration-200 rounded-xl ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                  tabIndex="0"
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Content - Enhanced with DaisyUI 5.0 */}
        <div className="card card-xl card-border shadow-xl bg-gray-800 border border-gray-700 h-[calc(100vh-200px)]">
          <div className="card-body p-6 h-full overflow-hidden">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </TeslaAppProvider>
  );
}
export default App;
