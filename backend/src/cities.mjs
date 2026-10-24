// Home cities and candidate meeting cities (US). Coordinates are approximate city centers.
const RAW = [
  ['Seattle', 47.6062, -122.3321], ['Portland', 45.5152, -122.6784],
  ['San Francisco', 37.7749, -122.4194], ['Los Angeles', 34.0522, -118.2437],
  ['San Diego', 32.7157, -117.1611], ['Las Vegas', 36.1699, -115.1398],
  ['Phoenix', 33.4484, -112.0740], ['Salt Lake City', 40.7608, -111.8910],
  ['Denver', 39.7392, -104.9903], ['Albuquerque', 35.0844, -106.6504],
  ['Dallas', 32.7767, -96.7970], ['Houston', 29.7604, -95.3698],
  ['Austin', 30.2672, -97.7431], ['San Antonio', 29.4241, -98.4936],
  ['Oklahoma City', 35.4676, -97.5164], ['Kansas City', 39.0997, -94.5786],
  ['Omaha', 41.2565, -95.9345], ['Minneapolis', 44.9778, -93.2650],
  ['Chicago', 41.8781, -87.6298], ['St. Louis', 38.6270, -90.1994],
  ['Memphis', 35.1495, -90.0490], ['Nashville', 36.1627, -86.7816],
  ['New Orleans', 29.9511, -90.0715], ['Atlanta', 33.7490, -84.3880],
  ['Miami', 25.7617, -80.1918], ['Orlando', 28.5383, -81.3792],
  ['Charlotte', 35.2271, -80.8431], ['Raleigh', 35.7796, -78.6382],
  ['Washington DC', 38.9072, -77.0369], ['Philadelphia', 39.9526, -75.1652],
  ['New York', 40.7128, -74.0060], ['Boston', 42.3601, -71.0589],
  ['Pittsburgh', 40.4406, -79.9959], ['Cleveland', 41.4993, -81.6944],
  ['Detroit', 42.3314, -83.0458], ['Columbus', 39.9612, -82.9988],
  ['Cincinnati', 39.1031, -84.5120], ['Indianapolis', 39.7684, -86.1581],
  ['Louisville', 38.2527, -85.7585], ['Birmingham', 33.5186, -86.8104],
];

export const CITIES = RAW.map(([name, lat, lon]) => ({ name, lat, lon }));

const ALIASES = { nyc: 'New York', dc: 'Washington DC', 'washington d.c.': 'Washington DC',
  sf: 'San Francisco', la: 'Los Angeles', 'saint louis': 'St. Louis', 'st louis': 'St. Louis',
  'kc': 'Kansas City', 'slc': 'Salt Lake City', 'nola': 'New Orleans', 'vegas': 'Las Vegas' };

const norm = (s) => String(s).toLowerCase().replace(/,.*$/, '').replace(/\s+/g, ' ').trim();
const BY_KEY = new Map(CITIES.map((c) => [norm(c.name), c]));

export function findCity(input) {
  if (!input) return null;
  const key = norm(input);
  return BY_KEY.get(key) || BY_KEY.get(norm(ALIASES[key] || '')) || null;
}
