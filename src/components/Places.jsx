import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { FiNavigation, FiRefreshCw, FiAlertCircle, FiMapPin, FiCoffee, FiDroplet, FiZap, FiHome, FiShoppingBag, FiStar, FiTool } from "react-icons/fi";
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

  const categories = useMemo(() => [
    { id: 'restaurants', name: 'Food',     Icon: FiCoffee,      query: 'restaurant|fast_food|cafe|bar|pub' },
    { id: 'gas',         name: 'Gas',      Icon: FiDroplet,     query: 'fuel' },
    { id: 'charging',    name: 'Charging', Icon: FiZap,         query: 'charging_station' },
    { id: 'lodging',     name: 'Hotels',   Icon: FiHome,        query: 'hotel|motel|hostel' },
    { id: 'shopping',    name: 'Shopping', Icon: FiShoppingBag, query: 'supermarket|mall|shop' },
    { id: 'attractions', name: 'Fun',      Icon: FiStar,        query: 'attraction|museum|park' },
    { id: 'services',    name: 'Services', Icon: FiTool,        query: 'bank|pharmacy|hospital|car_repair' },
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

  const visiblePlaces = places.filter(p => p.coordinates);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">

      {/* Category tabs + refresh */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="grid grid-cols-7 gap-2 flex-1">
          {categories.map(({ id, name, Icon }) => (
            <button
              key={id}
              onClick={() => handleCategoryChange(id)}
              className={`h-14 flex flex-col items-center justify-center gap-1 rounded-xl font-medium text-xs transition-all ${
                selectedCategory === id
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-gray-700/60 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              tabIndex="0"
            >
              <Icon className="w-4 h-4" />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-14 w-14 flex items-center justify-center bg-gray-700/60 hover:bg-gray-700 border border-gray-600/50 rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
          title="Refresh"
        >
          <FiRefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Places Unavailable</h3>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors" tabIndex="0">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <FiRefreshCw className="w-7 h-7 text-gray-500 animate-spin" />
        </div>
      )}

      {/* Place cards — horizontal scroll */}
      {!isLoading && !error && visiblePlaces.length > 0 && (
        <div className="flex-1 overflow-hidden min-h-0">
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
            <div className="flex gap-3 h-full pb-2">
              {visiblePlaces.map((place) => (
                <div
                  key={place.id}
                  className="flex-shrink-0 flex flex-col justify-between bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 min-w-[220px] max-w-[240px] select-none pointer-events-auto"
                >
                  {/* Distance — lead element */}
                  <div className="flex items-center gap-2 mb-3">
                    <FiMapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-2xl font-bold text-white leading-none">{getDistance(place)}</span>
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-h-0">
                    <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1">
                      {place.name}
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono uppercase tracking-wide">
                      {place.category}
                    </span>
                    {place.address && place.address !== 'Address not available' && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{place.address}</p>
                    )}
                  </div>

                  {/* Navigate CTA */}
                  <button
                    onClick={() => handlePlaceClick(place)}
                    className="mt-4 w-full h-12 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm rounded-xl transition-all"
                    tabIndex="0"
                  >
                    <FiNavigation className="w-4 h-4" />
                    Navigate
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && visiblePlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FiMapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-medium text-white mb-1">No Places Found</h3>
            <p className="text-sm text-gray-500">
              No {categories.find(c => c.id === selectedCategory)?.name.toLowerCase()} found nearby
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Places;