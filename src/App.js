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
        
        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 mb-4 overflow-hidden">
          <div className="flex">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Content */}
        <div className="card shadow-xl bg-gray-800 border border-gray-700 h-[calc(100vh-200px)]">
          <div className="card-body p-6 h-full overflow-hidden">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </TeslaAppProvider>
  );
}
export default App;
