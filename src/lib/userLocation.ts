export const LOCATION_STORAGE_KEY = "wroob_skillup_location";

export interface StoredLocation {
  lat: number;
  lng: number;
  capturedAt: number;
}

export function getStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") return parsed;
  } catch {}
  return null;
}

export function storeLocation(lat: number, lng: number) {
  localStorage.setItem(
    LOCATION_STORAGE_KEY,
    JSON.stringify({ lat, lng, capturedAt: Date.now() })
  );
}

export function requestBrowserLocation(): Promise<StoredLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          capturedAt: Date.now(),
        };
        storeLocation(loc.lat, loc.lng);
        resolve(loc);
      },
      (err) => {
        reject(
          new Error(
            err.code === 1
              ? "Location access denied. Please enable it in your browser settings."
              : "Could not get your location. Please try again."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Haversine distance in kilometers
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const NEARBY_RADIUS_KM = 5;
