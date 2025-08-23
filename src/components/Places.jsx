import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { FaMapMarkerAlt, FaClock, FaRoute, FaSync } from "react-icons/fa";
import { BiRefresh } from "react-icons/bi";
import TeslaAppContext from "../context/TeslaAppContext";

function Places() {
  const { lat, long, currentLocation } = useContext(TeslaAppContext);
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('restaurants');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Simple category mapping for OpenStreetMap - memoized to prevent unnecessary re-renders
  const categories = useMemo(() => [
    { id: 'restaurants', name: 'Food', icon: '🍽️', query: 'restaurant|fast_food|cafe|bar|pub' },
    { id: 'gas', name: 'Gas', icon: '⛽', query: 'fuel' },
    { id: 'charging', name: 'Charging', icon: '⚡', query: 'charging_station' },
    { id: 'lodging', name: 'Hotels', icon: '🏨', query: 'hotel|motel|hostel' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', query: 'supermarket|mall|shop' },
    { id: 'attractions', name: 'Fun', icon: '🎯', query: 'attraction|museum|park' },
    { id: 'services', name: 'Services', icon: '🔧', query: 'bank|pharmacy|hospital|car_repair' }
  ], []);

  // Drag scrolling handlers
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  // Handle place click (open in maps)
  const handlePlaceClick = (place) => {
    let mapsUrl;
    
    if (place.coordinates) {
      // Use coordinates for most accurate location
      mapsUrl = `https://maps.google.com/?q=${place.coordinates.lat},${place.coordinates.lon}`;
    } else if (place.address && place.address !== 'Address not available') {
      // Use address if available
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(place.address)}`;
    } else {
      // Use place name as fallback
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(place.name)}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  // Get distance in miles
  const getDistance = (place) => {
    const miles = (place.distance * 0.621371).toFixed(1);
    return `${miles} mi`;
  };

  // Load places when component mounts or category changes
  useEffect(() => {
    const fetchPlaces = async () => {
      if (!lat || !long) {
        setError('Location not available');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const category = categories.find(cat => cat.id === selectedCategory);
        const radius = 10000; // 10km

        // Build Overpass API query
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"~"${category.query}"](around:${radius},${lat},${long});
            way["amenity"~"${category.query}"](around:${radius},${lat},${long});
          );
          out geom;
        `;

        // Debug: Log the exact query being sent
        console.log('Overpass API Query for', category.name, ':', query);
        console.log('Search coordinates:', lat, long);

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Process results
        const processedPlaces = data.elements
          ?.filter(element => element.tags?.name) // Only places with names
          ?.map(element => {
            const center = element.type === 'node' 
              ? { lat: element.lat, lon: element.lon }
              : element.center || { lat: element.lat, lon: element.lon };

            // Build simple address
            const tags = element.tags;
            let address = 'Address not available';
            
            if (tags['addr:street'] && tags['addr:city']) {
              const parts = [];
              if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
              if (tags['addr:street']) parts.push(tags['addr:street']);
              if (tags['addr:city']) parts.push(tags['addr:city']);
              if (tags['addr:state']) parts.push(tags['addr:state']);
              address = parts.join(' ');
            } else if (tags['addr:city']) {
              address = tags['addr:city'];
            }

            // Debug: Log places without addresses
            if (address === 'Address not available') {
              console.log('Place without address:', {
                name: tags.name,
                coordinates: center,
                availableTags: Object.keys(tags),
                tags: tags
              });
            }

            return {
              id: `${element.type}_${element.id}`,
              name: tags.name,
              address: address,
              coordinates: center,
              distance: calculateDistance(lat, long, center.lat, center.lon),
              category: tags.amenity?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Place'
            };
          })
          ?.sort((a, b) => a.distance - b.distance)
          ?.slice(0, 20) || [];

        setPlaces(processedPlaces);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error fetching places:', err);
        setError(`Failed to load places: ${err.message}`);
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [selectedCategory, lat, long, refreshTrigger, categories]);

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <FaMapMarkerAlt className="text-lg text-blue-400" />
            <h2 className="text-xl font-bold text-white">Nearby Places</h2>
          </div>
          {currentLocation && (
            <p className="text-sm text-blue-400 italic mt-1">{currentLocation}</p>
          )}
          {lastUpdated && (
            <p className="text-xs text-gray-400 flex items-center space-x-1 mt-1">
              <FaClock className="w-3 h-3" />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </p>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={`btn btn-xl p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 group ${
            isLoading ? 'btn-disabled opacity-50' : 'btn-soft hover:shadow-lg'
          }`}
          title="Refresh Places"
          tabIndex="0"
        >
          <BiRefresh className={`w-4 h-4 text-gray-300 group-hover:text-white transition-colors ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
        </button>
      </div>

      {/* Category Tabs - Even width buttons */}
      <div className="grid grid-cols-7 gap-2 flex-shrink-0">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`btn btn-xl px-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center space-y-1 h-16 ${
              selectedCategory === category.id
                ? 'btn-active bg-blue-600 text-white shadow-lg btn-soft'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white btn-ghost hover:shadow-md'
            }`}
            tabIndex="0"
          >
            <span className="text-xl">{category.icon}</span>
            <span className="text-xs leading-tight">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FaMapMarkerAlt className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Places Unavailable</h3>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="btn btn-xl px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 btn-soft hover:shadow-lg"
              tabIndex="0"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FaSync className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Finding nearby places...</p>
          </div>
        </div>
      )}

      {/* Places List */}
      {!isLoading && !error && places.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-3">
            {categories.find(cat => cat.id === selectedCategory)?.name} Near You
          </h3>
          
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-x-auto overflow-y-hidden cursor-grab select-none"
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex space-x-4 pb-2">
              {places.map((place) => (
                <div 
                  key={place.id}
                  className="card card-xl card-border flex-shrink-0 bg-gray-800/30 rounded-lg p-5 border border-gray-700/50 min-w-[280px] cursor-pointer hover:bg-gray-800/50 hover:shadow-lg transition-all duration-200 select-none pointer-events-auto"
                  onClick={() => handlePlaceClick(place)}
                  tabIndex="0"
                  onKeyDown={(e) => e.key === 'Enter' && handlePlaceClick(place)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-medium text-sm truncate flex-1">
                        {place.name}
                      </h4>
                      <div className="flex items-center space-x-1 ml-2 text-xs text-gray-400">
                        <FaRoute className="w-3 h-3" />
                        <span>{getDistance(place)}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 truncate">
                      {place.address}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {place.category}
                      </span>
                      
                      <div className="text-xs text-blue-400 hover:text-blue-300">
                        Open in Maps →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Places State */}
      {!isLoading && !error && places.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FaMapMarkerAlt className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">No Places Found</h3>
            <p className="text-sm text-gray-400">
              No {categories.find(cat => cat.id === selectedCategory)?.name.toLowerCase()} found nearby
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Places;