export const APP_NAME = "AquaGuard IoT";
export const REFRESH_INTERVAL = 30000; // 30 seconds
export const NO_FLOW_THRESHOLD = 120000; // 2 minutes in milliseconds

export const SECTIONS = [
  "Main Supply Line A",
  "Secondary Distribution B",
  "Residential Zone C",
  "Industrial Sector D",
  "Agricultural Feed E"
];

export const MOCK_SENSORS = [
  {
    id: "SN-001",
    location: { lat: 40.7128, lng: -74.0060 },
    status: "flowing",
    lastUpdate: new Date().toISOString(),
    battery: 85,
    section: "Main Supply Line A",
    isMaintenanceMode: false
  },
  {
    id: "SN-002",
    location: { lat: 40.7228, lng: -74.0160 },
    status: "no-flow",
    lastUpdate: new Date().toISOString(),
    battery: 92,
    section: "Secondary Distribution B",
    isMaintenanceMode: false
  },
  {
    id: "SN-003",
    location: { lat: 40.7328, lng: -74.0260 },
    status: "offline",
    lastUpdate: new Date().toISOString(),
    battery: 45,
    section: "Residential Zone C",
    isMaintenanceMode: false
  }
];
