// Exact Coordinates Database for Madrasah Mu'allimin Muhammadiyah Yogyakarta
// Updated with verified on-ground GPS coordinates

export interface SpecificBuildingLocation {
  id: string;
  name: string;
  category: "asrama" | "masjid" | "aula" | "madrasah";
  campus: "kampus_induk" | "kampus_terpadu";
  lat: number;
  lng: number;
  radiusMeters: number;
  asramaKeys?: string[];
}

export const MUALLIMIN_LOCATIONS: SpecificBuildingLocation[] = [
  // ─── KAMPUS INDUK (Jl. Letjen S. Parman / Wirobrajan) ───
  {
    id: "masjid_jami",
    name: "Masjid Jami' Mu'allimin (Kampus Induk)",
    category: "masjid",
    campus: "kampus_induk",
    lat: -7.807631420483853,
    lng: 110.35090524266894,
    radiusMeters: 180,
    asramaKeys: ["Asrama 1", "Asrama 10"]
  },
  {
    id: "asrama_1",
    name: "Asrama 1",
    category: "asrama",
    campus: "kampus_induk",
    lat: -7.806891265137622,
    lng: 110.35135026323961,
    radiusMeters: 180,
    asramaKeys: ["Asrama 1"]
  },
  {
    id: "asrama_10",
    name: "Asrama 10",
    category: "asrama",
    campus: "kampus_induk",
    lat: -7.807447620762957,
    lng: 110.35187982487349,
    radiusMeters: 180,
    asramaKeys: ["Asrama 10"]
  },
  {
    id: "aula_asrama_10",
    name: "Aula Asrama 10",
    category: "aula",
    campus: "kampus_induk",
    lat: -7.807649162283236,
    lng: 110.35180208935743,
    radiusMeters: 150,
    asramaKeys: ["Asrama 10"]
  },
  {
    id: "asrama_8a",
    name: "Asrama 8A",
    category: "asrama",
    campus: "kampus_induk",
    lat: -7.806802054031821,
    lng: 110.3487117045888,
    radiusMeters: 180,
    asramaKeys: ["Asrama 8A"]
  },
  {
    id: "asrama_8b",
    name: "Asrama 8B",
    category: "asrama",
    campus: "kampus_induk",
    lat: -7.806656716208824,
    lng: 110.34845427426143,
    radiusMeters: 180,
    asramaKeys: ["Asrama 8B"]
  },
  {
    id: "asrama_8c",
    name: "Asrama 8C",
    category: "asrama",
    campus: "kampus_induk",
    lat: -7.806725165641748,
    lng: 110.34808989677528,
    radiusMeters: 180,
    asramaKeys: ["Asrama 8C"]
  },
  {
    id: "aula_asrama_8",
    name: "Aula Asrama 8",
    category: "aula",
    campus: "kampus_induk",
    lat: -7.80670964534532,
    lng: 110.34871338210505,
    radiusMeters: 150,
    asramaKeys: ["Asrama 8A", "Asrama 8B", "Asrama 8C"]
  },
  {
    id: "madrasah_induk",
    name: "Gedung Madrasah (Kampus Induk)",
    category: "madrasah",
    campus: "kampus_induk",
    lat: -7.807535148915093,
    lng: 110.35119022929074,
    radiusMeters: 200
  },
  {
    id: "aula_induk",
    name: "Aula Madrasah (Kampus Induk)",
    category: "aula",
    campus: "kampus_induk",
    lat: -7.8071293622895865,
    lng: 110.35129819288836,
    radiusMeters: 180
  },

  // ─── KAMPUS TERPADU SEDAYU (Bantul) ───
  {
    id: "masjid_yuliana",
    name: "Masjid Hajah Yuliana (Kampus Terpadu Sedayu)",
    category: "masjid",
    campus: "kampus_terpadu",
    lat: -7.807283961429371,
    lng: 110.2664976347712,
    radiusMeters: 250,
    asramaKeys: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"]
  },
  {
    id: "asrama_sedayu_a",
    name: "Asrama Sedayu Gedung A",
    category: "asrama",
    campus: "kampus_terpadu",
    lat: -7.806161927805327,
    lng: 110.26622820707232,
    radiusMeters: 200,
    asramaKeys: ["Asrama Sedayu Gedung A"]
  },
  {
    id: "asrama_sedayu_b",
    name: "Asrama Sedayu Gedung B",
    category: "asrama",
    campus: "kampus_terpadu",
    lat: -7.806624810484002,
    lng: 110.26619109206257,
    radiusMeters: 200,
    asramaKeys: ["Asrama Sedayu Gedung B"]
  },
  {
    id: "asrama_sedayu_c",
    name: "Asrama Sedayu Gedung C",
    category: "asrama",
    campus: "kampus_terpadu",
    lat: -7.806267915005986,
    lng: 110.26585269050325,
    radiusMeters: 200,
    asramaKeys: ["Asrama Sedayu Gedung C"]
  },
  {
    id: "asrama_sedayu_d",
    name: "Asrama Sedayu Gedung D",
    category: "asrama",
    campus: "kampus_terpadu",
    lat: -7.807027128668001,
    lng: 110.26582649166751,
    radiusMeters: 200,
    asramaKeys: ["Asrama Sedayu Gedung D"]
  },
  {
    id: "madrasah_sedayu",
    name: "Gedung Madrasah (Kampus Terpadu Sedayu)",
    category: "madrasah",
    campus: "kampus_terpadu",
    lat: -7.806272241018772,
    lng: 110.26723686205816,
    radiusMeters: 250
  }
];

// Campus area centroids with broad geofence (500m)
export interface CampusLocation {
  name: string;
  campus: "sparman" | "sedayu";
  lat: number;
  lng: number;
  radiusMeters: number;
  asramas: string[];
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    name: "Kampus 1 Wirobrajan (Jl. Letjen S. Parman)",
    campus: "sparman",
    lat: -7.8071,
    lng: 110.3508,
    radiusMeters: 500,
    asramas: ["Asrama 1", "Asrama 8A", "Asrama 8B", "Asrama 8C", "Asrama 10"]
  },
  {
    name: "Kampus 2 Terpadu Sedayu (Bantul)",
    campus: "sedayu",
    lat: -7.8066,
    lng: 110.2662,
    radiusMeters: 500,
    asramas: ["Asrama Sedayu Gedung A", "Asrama Sedayu Gedung B", "Asrama Sedayu Gedung C", "Asrama Sedayu Gedung D"]
  }
];

// Haversine formula to calculate distance between two coordinates in meters
export function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface GeofenceResult {
  isInRange: boolean;
  closestCampus: CampusLocation;
  matchedBuilding?: string;
  distanceMeters: number;
  accuracyMeters?: number;
  targetAsrama: string;
  userLat?: number;
  userLng?: number;
  error?: string;
  simulated?: boolean;
}

export function checkAsramaGeofence(
  userLat: number,
  userLng: number,
  asramaName: string = "Asrama 1",
  accuracy?: number
): GeofenceResult {
  const safeName = (asramaName || "Asrama 1").trim().toLowerCase();

  // 1. Try to find the exact building matching asramaName
  const exactBuilding = MUALLIMIN_LOCATIONS.find(b => 
    b.name.toLowerCase() === safeName ||
    (b.asramaKeys && b.asramaKeys.some(k => k.toLowerCase() === safeName || safeName.includes(k.toLowerCase())))
  );

  // 2. Also find which broad campus belongs to this asrama
  const matchedCampus = CAMPUS_LOCATIONS.find(c => 
    c.asramas.some(a => a.toLowerCase() === safeName || safeName.includes(a.toLowerCase()))
  ) || (safeName.includes("sedayu") ? CAMPUS_LOCATIONS[1] : CAMPUS_LOCATIONS[0]);

  // Dynamic indoor GPS tolerance buffer (up to 120m if accuracy reading is degraded indoors due to concrete/roof)
  const accuracyBuffer = typeof accuracy === "number" && accuracy > 0 ? Math.min(accuracy, 120) : 0;

  let distance: number;
  let isInRange: boolean;
  let matchedAreaName: string | undefined;

  const campusDist = getDistanceFromLatLonInMeters(userLat, userLng, matchedCampus.lat, matchedCampus.lng);

  if (exactBuilding) {
    distance = getDistanceFromLatLonInMeters(userLat, userLng, exactBuilding.lat, exactBuilding.lng);
    const buildingRadius = exactBuilding.radiusMeters + accuracyBuffer;
    const campusRadius = matchedCampus.radiusMeters + accuracyBuffer;

    // In range if within specific building radius OR within broad campus area
    const inBuilding = distance <= buildingRadius;
    const inCampus = campusDist <= campusRadius;
    isInRange = inBuilding || inCampus;
    matchedAreaName = inBuilding ? exactBuilding.name : inCampus ? matchedCampus.name : undefined;

    // If verified via campus zone, show the campus-level distance for clearer UX
    if (inCampus && !inBuilding) {
      distance = campusDist;
    }
  } else {
    distance = campusDist;
    const campusRadius = matchedCampus.radiusMeters + accuracyBuffer;
    isInRange = distance <= campusRadius;
    matchedAreaName = isInRange ? matchedCampus.name : undefined;
  }

  return {
    isInRange,
    closestCampus: matchedCampus,
    matchedBuilding: matchedAreaName,
    distanceMeters: distance,
    accuracyMeters: accuracy ? Math.round(accuracy) : undefined,
    targetAsrama: asramaName || "Asrama 1",
    userLat,
    userLng
  };
}

export function checkAsramaGeofenceBrowser(asramaName: string = "Asrama 1"): Promise<GeofenceResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        isInRange: false,
        closestCampus: CAMPUS_LOCATIONS[0],
        distanceMeters: 99999,
        targetAsrama: asramaName || "Asrama 1",
        error: "Perangkat / browser tidak mendukung Geolocation."
      });
      return;
    }

    const safeAsrama = (asramaName || "Asrama 1").toLowerCase();
    const fallbackCampus = CAMPUS_LOCATIONS.find(c => 
      c.asramas.some(a => a.toLowerCase() === safeAsrama || safeAsrama.includes(a.toLowerCase()))
    ) || (safeAsrama.includes("sedayu") ? CAMPUS_LOCATIONS[1] : CAMPUS_LOCATIONS[0]);

    // Primary attempt: High accuracy with 15s timeout and 10s maximumAge
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const res = checkAsramaGeofence(
          pos.coords.latitude,
          pos.coords.longitude,
          asramaName,
          pos.coords.accuracy
        );
        resolve(res);
      },
      (err) => {
        // If high accuracy times out indoors, fallback to network/WiFi location
        if (err.code === 3 /* TIMEOUT */) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const res = checkAsramaGeofence(
                fallbackPos.coords.latitude,
                fallbackPos.coords.longitude,
                asramaName,
                fallbackPos.coords.accuracy
              );
              resolve(res);
            },
            () => {
              resolve({
                isInRange: false,
                closestCampus: fallbackCampus,
                distanceMeters: 99999,
                targetAsrama: asramaName || "Asrama 1",
                error: "Sinyal GPS lemah di dalam ruangan. Silakan coba refresh GPS atau mendekat ke jendela / luar kamar."
              });
            },
            { timeout: 10000, enableHighAccuracy: false, maximumAge: 30000 }
          );
          return;
        }

        let errMsg = "Gagal mendeteksi koordinat GPS.";
        if (err.code === 1) {
          errMsg = "Izin GPS ditolak oleh browser. Pastikan izin lokasi (Precise) aktif di browser.";
        } else if (err.code === 2) {
          errMsg = "Sinyal GPS tidak tersedia. Pastikan fitur lokasi HP aktif.";
        }

        resolve({
          isInRange: false,
          closestCampus: fallbackCampus,
          distanceMeters: 99999,
          targetAsrama: asramaName || "Asrama 1",
          error: errMsg
        });
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 10000 }
    );
  });
}
