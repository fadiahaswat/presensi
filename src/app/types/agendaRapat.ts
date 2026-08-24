// Data Model for Dynamic Logbook Meeting Agendas & Events
export interface AgendaRapatRecord {
  id: string; // e.g. "agenda_1724490000000"
  title: string; // e.g. "Rapat Koordinasi Mingguan Asrama"
  category: "rapat" | "pengajian" | "briefing" | "pembinaan" | "lainnya";
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm", e.g. "09:00"
  endTime: string; // "HH:mm", e.g. "11:30"
  locationName: string; // e.g. "Aula Madrasah (Kampus Induk)", "Masjid Hajah Yuliana (Kampus Terpadu)"
  locationLat?: number;
  locationLng?: number;
  locationRadius?: number; // meters, default 180
  invitedMusyrifIds: string[]; // List of Musyrif IDs who are invited
  targetScope: "all" | "asrama" | "custom";
  targetAsramaList?: string[]; // If targetScope is 'asrama'
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface AgendaVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
  desc: string;
}

// Predefined official campus venues with high-accuracy GPS coordinates (Synchronized with geoUtils memory)
export const PREDEFINED_AGENDA_VENUES: AgendaVenue[] = [
  {
    id: "aula_induk",
    name: "Aula Madrasah (Kampus Induk)",
    lat: -7.8071293622895865,
    lng: 110.35129819288836,
    radius: 180,
    desc: "Aula Utama Madrasah Kampus Induk"
  },
  {
    id: "masjid_jami",
    name: "Masjid Jami' Mu'allimin (Kampus Induk)",
    lat: -7.807631420483853,
    lng: 110.35090524266894,
    radius: 180,
    desc: "Masjid Jami' Kampus Induk"
  },
  {
    id: "madrasah_induk",
    name: "Gedung Madrasah (Kampus Induk)",
    lat: -7.807535148915093,
    lng: 110.35119022929074,
    radius: 200,
    desc: "Kompleks Madrasah Kampus Induk"
  },
  {
    id: "aula_asrama_10",
    name: "Aula Asrama 10 (Kampus Induk)",
    lat: -7.807649162283236,
    lng: 110.35180208935743,
    radius: 150,
    desc: "Aula Pembinaan Asrama 10"
  },
  {
    id: "aula_asrama_8",
    name: "Aula Asrama 8 (Kampus Induk)",
    lat: -7.80670964534532,
    lng: 110.34871338210505,
    radius: 150,
    desc: "Aula Pembinaan Asrama 8"
  },
  {
    id: "masjid_yuliana",
    name: "Masjid Hajah Yuliana (Kampus Terpadu)",
    lat: -7.807283961429371,
    lng: 110.2664976347712,
    radius: 250,
    desc: "Masjid Utama Kampus Terpadu Sedayu"
  },
  {
    id: "madrasah_sedayu",
    name: "Gedung Madrasah (Kampus Terpadu)",
    lat: -7.806272241018772,
    lng: 110.26723686205816,
    radius: 250,
    desc: "Gedung KBM Kampus Terpadu Sedayu"
  },
  {
    id: "asrama_terpadu",
    name: "Asrama Kampus Terpadu (Gedung A–D)",
    lat: -7.806500,
    lng: 110.266200,
    radius: 250,
    desc: "Kompleks Asrama Gedung A, B, C, D Kampus Terpadu"
  }
];

export const AGENDA_CATEGORIES: { id: AgendaRapatRecord["category"]; label: string; color: string }[] = [
  { id: "rapat", label: "Rapat Koordinasi", color: "blue" },
  { id: "pengajian", label: "Pengajian & Kajian", color: "emerald" },
  { id: "briefing", label: "Briefing / Apel", color: "purple" },
  { id: "pembinaan", label: "Pembinaan Musyrif", color: "amber" },
  { id: "lainnya", label: "Agenda Lainnya", color: "slate" }
];
