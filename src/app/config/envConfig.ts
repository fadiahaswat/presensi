// Environment Configuration - Admin & System Settings
// Move sensitive config out of hardcoded values

// Admin Database Access - email-based (should match Google account)
export const ADMIN_DB_EMAILS = (import.meta.env.VITE_ADMIN_DB_EMAILS || "andiaqillahfadiahaswat@gmail.com")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

// SCRUD Kalender - Multiple admins can manage calendar
export const ADMIN_SCRUD_EMAILS = (import.meta.env.VITE_ADMIN_SCRUD_EMAILS || "andiaqillahfadiahaswat@gmail.com")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

// Pamong Assignment by ID - Maps pamong user ID to their assigned asramas
export const PAMONG_ASRAMA_ASSIGNMENTS: Record<string, string[]> = {
  p5: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"],
  p6: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"],
  p7: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"],
  p8: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"],
};

// Special pamong cases - name-based fallback (only for existing users during transition)
export const PAMONG_NAME_FALLBACK: Record<string, { names: string[]; emails: string[]; asramas: string[] }> = {
  sedayu: {
    names: ["rais", "ahnaf", "marzuq", "ismail", "ariel", "amarta"],
    emails: ["raiscutis@gmail.com", "cutisrais@gmail.com", "ahnaflubab@muallimin.sch.id", "izmaelpoenya04@gmail.com", "arilamarta@gmail.com"],
    asramas: [
      "Asrama Sedayu Gedung A",
      "Asrama Sedayu Gedung B",
      "Asrama Sedayu Gedung C",
      "Asrama Sedayu Gedung D",
    ],
  },
  anang: {
    names: ["anang"],
    emails: ["abukaysan86"],
    asramas: ["Asrama 8B", "Asrama 8C"],
  },
  abdan: {
    names: ["abdan"],
    emails: ["auliaabdan"],
    asramas: ["Asrama 8A", "Asrama 8C"],
  },
};

// Rate Limiting Configuration
export const RATE_LIMITS = {
  // Max attempts before temporary lockout
  MAX_LOGIN_ATTEMPTS: 5,
  // Lockout duration in milliseconds (5 minutes)
  LOGIN_LOCKOUT_DURATION: 5 * 60 * 1000,
  // Max presensi submissions per minute
  PRESENSI_RATE_LIMIT: 10,
  // Max API calls per minute
  API_RATE_LIMIT: 60,
};

// GPS Configuration
export const GPS_CONFIG = {
  // Default radius in meters
  DEFAULT_RADIUS_METERS: 500,
  // Allow spoofing detection (requires server-side validation in production)
  ALLOW_SPOOFING_DETECTION: true,
  // Minimum accuracy required (meters)
  MIN_ACCURACY_METERS: 100,
};

// LocalStorage Encryption Key (should be set via environment)
export const STORAGE_ENCRYPTION_KEY = import.meta.env.VITE_STORAGE_KEY || "muallimin-presensi-2024-default-key";
