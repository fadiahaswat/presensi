// Role-Based Access Control Utilities
import { ADMIN_DB_EMAILS, PAMONG_ASRAMA_ASSIGNMENTS, PAMONG_NAME_FALLBACK } from "../config/envConfig";
import type { AuthUser } from "../App";

// Type for Role
export type Role = "pamong" | "koordinator_musyrif" | "koordinator_gedung" | "musyrif" | "kaur_kis" | "wadir4";

// Check if user is database admin
export function isDbAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  const email = user.email?.trim().toLowerCase();
  return ADMIN_DB_EMAILS.includes(email);
}

// Check if user has full access (koordinator musyrif, kaur_kis, or wadir4)
export function hasFullAccess(user: AuthUser): boolean {
  return user.role === "koordinator_musyrif" || user.role === "kaur_kis" || user.role === "wadir4";
}

// Check if user is field musyrif (not pamong, koordinator, kaur, or wadir4)
export function isFieldMusyrif(user: { id?: string; role?: Role | string; name?: string }): boolean {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  const id = (user.id || "").toLowerCase();
  const name = (user.name || "").toLowerCase();

  if (
    role === "pamong" ||
    role === "koordinator_musyrif" ||
    role === "kaur_kis" ||
    role === "wadir4" ||
    role === "wadir" ||
    role === "kaur" ||
    role === "admin"
  ) {
    return false;
  }

  if (
    id === "wadir4" ||
    id === "wadir" ||
    id === "kaurkis" ||
    id === "kaur_kis" ||
    id === "k1" ||
    id === "admin"
  ) {
    return false;
  }

  if (
    name.includes("ahmad salim") ||
    name.includes("muhammad shaleh") ||
    name.includes("andi aqillah")
  ) {
    return false;
  }

  return true;
}

// Check if user can manage/record Kegiatan Asrama (koordinator_gedung, pamong, koordinator_musyrif, kaur_kis, wadir4)
export function canManageKegiatanAsrama(user: AuthUser | { role?: Role | string } | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === "koordinator_gedung" ||
    user.role === "pamong" ||
    user.role === "koordinator_musyrif" ||
    user.role === "kaur_kis" ||
    user.role === "wadir4"
  );
}

// Get assigned asramas for pamong - uses ID first, falls back to name matching
export function getPamongAssignedAsramas(user: AuthUser): string[] {
  // Full access gets all asramas
  if (hasFullAccess(user)) return []; // Will be replaced with all asramas by caller

  // Only pamong role can have assigned asramas
  if (user.role !== "pamong") return [];

  // First, try ID-based assignment (primary method)
  const idAssignment = PAMONG_ASRAMA_ASSIGNMENTS[user.id];
  if (idAssignment && idAssignment.length > 0) {
    return idAssignment;
  }

  // Fallback: Try name-based matching for existing users during transition
  const nameLower = user.name?.toLowerCase() || "";
  const emailLower = user.email?.toLowerCase() || "";
  const asramaLower = user.asrama?.toLowerCase() || "";

  // Check Sedayu (asrama-based, name-based, or email-based)
  if (asramaLower.includes("sedayu")) {
    return PAMONG_NAME_FALLBACK.sedayu?.asramas || [];
  }
  for (const name of PAMONG_NAME_FALLBACK.sedayu?.names || []) {
    if (nameLower.includes(name)) return PAMONG_NAME_FALLBACK.sedayu.asramas;
  }
  for (const email of PAMONG_NAME_FALLBACK.sedayu?.emails || []) {
    if (emailLower.includes(email)) return PAMONG_NAME_FALLBACK.sedayu.asramas;
  }

  // Check Anang
  for (const name of PAMONG_NAME_FALLBACK.anang?.names || []) {
    if (nameLower.includes(name)) return PAMONG_NAME_FALLBACK.anang.asramas;
  }
  for (const email of PAMONG_NAME_FALLBACK.anang?.emails || []) {
    if (emailLower.includes(email)) return PAMONG_NAME_FALLBACK.anang.asramas;
  }

  // Check Abdan
  for (const name of PAMONG_NAME_FALLBACK.abdan?.names || []) {
    if (nameLower.includes(name)) return PAMONG_NAME_FALLBACK.abdan.asramas;
  }
  for (const email of PAMONG_NAME_FALLBACK.abdan?.emails || []) {
    if (emailLower.includes(email)) return PAMONG_NAME_FALLBACK.abdan.asramas;
  }

  // Default: return user's own asrama
  return user.asrama ? [user.asrama] : [];
}

// Get specific pamong type flags (for backward compatibility)
export function getPamongType(user: AuthUser): {
  isSedayuPamong: boolean;
  isPamongAnang: boolean;
  isPamongAbdan: boolean;
} {
  if (user.role !== "pamong") {
    return { isSedayuPamong: false, isPamongAnang: false, isPamongAbdan: false };
  }

  const nameLower = user.name?.toLowerCase() || "";
  const emailLower = user.email?.toLowerCase() || "";
  const asramaLower = user.asrama?.toLowerCase() || "";

  const isSedayuPamong = asramaLower.includes("sedayu") ||
    PAMONG_NAME_FALLBACK.sedayu?.names?.some((n) => nameLower.includes(n)) ||
    PAMONG_NAME_FALLBACK.sedayu?.emails?.some((e) => emailLower.includes(e)) ||
    false;
  const isPamongAnang = PAMONG_NAME_FALLBACK.anang?.names?.some((n) => nameLower.includes(n)) ||
    PAMONG_NAME_FALLBACK.anang?.emails?.some((e) => emailLower.includes(e)) ||
    false;
  const isPamongAbdan = PAMONG_NAME_FALLBACK.abdan?.names?.some((n) => nameLower.includes(n)) ||
    PAMONG_NAME_FALLBACK.abdan?.emails?.some((e) => emailLower.includes(e)) ||
    false;

  return { isSedayuPamong, isPamongAnang, isPamongAbdan };
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Secure email matching with validation
export function secureEmailMatch(userEmail: string, allowedEmails: string[]): boolean {
  if (!isValidEmail(userEmail)) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  return allowedEmails.map((e) => e.trim().toLowerCase()).includes(cleanEmail);
}
