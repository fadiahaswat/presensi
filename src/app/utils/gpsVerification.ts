// GPS Verification with Spoofing Detection
import { GPS_CONFIG } from "../config/envConfig";

export interface VerifiedLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  isMocked: boolean;
  isWithinRadius: boolean;
  distanceMeters: number;
}

// Check if browser reports location as mocked
export function isLocationMocked(position: GeolocationPosition): boolean {
  // Check for common spoofing indicators
  const accuracy = position.coords.accuracy;

  // Very high accuracy with very round numbers can indicate mock
  const latRounded = Math.round(position.coords.latitude * 1000000) / 1000000;
  const lngRounded = Math.round(position.coords.longitude * 1000000) / 1000000;
  const isLatRounded = latRounded === position.coords.latitude;
  const isLngRounded = lngRounded === position.coords.longitude;

  // Check if accuracy is suspiciously good (less than 5m)
  const isSuspiciousAccuracy = accuracy < 5 && (isLatRounded || isLngRounded);

  // Check for constant mock locations (common test coordinates)
  const mockLocations = [
    { lat: 0, lng: 0 },
    { lat: -6.2, lng: 106.8 },
    { lat: -7.8, lng: 110.3 },
  ];

  for (const mock of mockLocations) {
    if (
      Math.abs(position.coords.latitude - mock.lat) < 0.001 &&
      Math.abs(position.coords.longitude - mock.lng) < 0.001
    ) {
      return true;
    }
  }

  return isSuspiciousAccuracy;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Verify location is within acceptable radius of target
export async function verifyLocation(
  targetLat: number,
  targetLng: number,
  radiusMeters: number = GPS_CONFIG.DEFAULT_RADIUS_METERS
): Promise<VerifiedLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const isMocked = GPS_CONFIG.ALLOW_SPOOFING_DETECTION && isLocationMocked(position);
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          targetLat,
          targetLng
        );

        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          isMocked,
          isWithinRadius: distance <= radiusMeters,
          distanceMeters: Math.round(distance),
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Check if accuracy meets minimum requirement
export function meetsAccuracyRequirement(accuracy: number): boolean {
  return accuracy <= GPS_CONFIG.MIN_ACCURACY_METERS;
}

// Get spoofing warning message
export function getSpoofingWarning(): string {
  return "Peringatan: Lokasi terdeteksi tidak valid. Jika ini adalah kesalahan, silakan aktifkan GPS dengan mode akurat dan pastikan tidak menggunakan aplikasi fake GPS.";
}
