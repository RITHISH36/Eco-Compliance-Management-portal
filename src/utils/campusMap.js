export const BAIET_CAMPUS_CENTER = {
  lat: 11.4966,
  lng: 77.2778,
};

export const BAIET_CAMPUS_BOUNDS = {
  north: 11.5022,
  south: 11.4908,
  east: 77.2820,
  west: 77.2738,
};

export const BAIET_MAP_OPTIONS = {
  restriction: {
    latLngBounds: BAIET_CAMPUS_BOUNDS,
    strictBounds: true,
  },
  minZoom: 15,
  maxZoom: 20,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export const BAIET_BLOCK_COORDS = {
  IB: { lat: 11.49534, lng: 77.27663, zone: "IB Academic Core" },
  AS: { lat: 11.49534, lng: 77.27853, zone: "AS Academic Core" },
  SF: { lat: 11.49569, lng: 77.27998, zone: "East Academic Zone" },
  MECH: { lat: 11.49473, lng: 77.27998, zone: "East Academic Zone" },
  CAFETARIA: { lat: 11.49234, lng: 77.27855, zone: "South Campus Zone" },
  Ground: { lat: 11.49142, lng: 77.27842, zone: "Playground Zone" },
  Parking: { lat: 11.50054, lng: 77.27998, zone: "North-East Campus Zone" },
  "Girls Hostel": { lat: 11.49214, lng: 77.27592, zone: "Hostel Zone" },
  "Boys Hostel": { lat: 11.49297, lng: 77.28078, zone: "Hostel Zone" },
  Others: { lat: 11.4970, lng: 77.2771, zone: "Campus Zone" },
  "Block A": { lat: 11.49534, lng: 77.27663, zone: "IB Academic Core" },
  "Block B": { lat: 11.49534, lng: 77.27853, zone: "AS Academic Core" },
  "Block C": { lat: 11.49569, lng: 77.27998, zone: "East Academic Zone" },
  "IB Block": { lat: 11.49534, lng: 77.27663, zone: "IB Academic Core" },
  "Playground Area": { lat: 11.49142, lng: 77.27842, zone: "Playground Zone" },
  "Academic Block A": { lat: 11.49534, lng: 77.27663, zone: "IB Academic Core" },
  "Library Block": { lat: 11.49306, lng: 77.27765, zone: "Academic Core" },
  "Sports Complex": { lat: 11.49640, lng: 77.27450, zone: "Sports Zone" },
  "Hostel Block": { lat: 11.49214, lng: 77.27592, zone: "Hostel Zone" },
};

export const isPointInsideCampus = (point) => {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);

  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= BAIET_CAMPUS_BOUNDS.south
    && lat <= BAIET_CAMPUS_BOUNDS.north
    && lng >= BAIET_CAMPUS_BOUNDS.west
    && lng <= BAIET_CAMPUS_BOUNDS.east;
};

export const getCampusBlockFeatures = () => ({
  type: "FeatureCollection",
  features: Object.entries(BAIET_BLOCK_COORDS)
    .filter(([block]) => !["Others", "IB Block", "Playground Area", "Academic Block A", "Library Block", "Sports Complex", "Hostel Block"].includes(block))
    .map(([block, point]) => ({
      type: "Feature",
      properties: { block },
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    })),
});

export const getCampusPoint = (block, index = 0) =>
  BAIET_BLOCK_COORDS[block] || {
    lat: BAIET_CAMPUS_CENTER.lat + (index % 4) * 0.00035 - 0.0005,
    lng: BAIET_CAMPUS_CENTER.lng + (index % 3) * 0.0004 - 0.0004,
    zone: "Campus Zone",
  };

export const getBlockPoint = (block) => getCampusPoint(block, 0);
