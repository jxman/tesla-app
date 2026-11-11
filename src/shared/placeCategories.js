// Places category definitions shared by the browser (Places.jsx adds labels and
// icons) and the /api/places Netlify function (builds the Geoapify request).
// Keep this file free of JSX and browser-only imports.
//
// `geoapify` lists Geoapify Places category keys:
// https://apidocs.geoapify.com/docs/places/#categories
// `radius` is the search radius in metres, tuned to how dense each POI type is.

export const PLACE_CATEGORIES = [
  {
    id: "restaurants", radius: 5000,
    geoapify: [
      "catering.restaurant", "catering.fast_food", "catering.cafe", "catering.bar",
      "catering.pub", "catering.food_court", "catering.ice_cream",
    ],
  },
  {
    id: "charging", radius: 16000,
    geoapify: ["service.vehicle.charging_station"],
  },
  {
    id: "lodging", radius: 8000,
    geoapify: ["accommodation.hotel", "accommodation.motel", "accommodation.hostel", "accommodation.guest_house"],
  },
  {
    id: "shopping", radius: 4000,
    geoapify: [
      "commercial.supermarket", "commercial.convenience", "commercial.department_store",
      "commercial.shopping_mall", "commercial.clothing", "commercial.elektronics",
    ],
  },
  {
    id: "fun", radius: 5000,
    geoapify: [
      "entertainment.cinema", "entertainment.culture.theatre", "entertainment.culture.arts_centre",
      "entertainment.bowling_alley", "entertainment.museum", "entertainment.culture.gallery",
      "entertainment.theme_park", "entertainment.zoo", "entertainment.aquarium",
      "leisure.park", "sport.fitness.fitness_centre", "sport.swimming_pool", "tourism.attraction",
    ],
  },
  {
    id: "services", radius: 4000,
    geoapify: [
      "service.financial.bank", "service.financial.atm", "healthcare.pharmacy", "healthcare.hospital",
      "service.vehicle.repair.car", "service.post.office", "healthcare.dentist",
      "healthcare.clinic_or_praxis", "service.police",
    ],
  },
];

export const PLACE_CATEGORY_IDS = PLACE_CATEGORIES.map((c) => c.id);
