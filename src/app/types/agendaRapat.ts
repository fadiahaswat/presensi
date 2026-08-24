// Data Model for Dynamic Logbook Meeting Agendas & Events
export interface AgendaRapatRecord {
  id: string; // e.g. "agenda_1724490000000"
  title: string; // e.g. "Rapat Koordinasi Mingguan Asrama"
  category: "rapat" | "pengajian" | "briefing" | "pembinaan" | "lainnya";
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm", e.g. "09:00"
  endTime: string; // "HH:mm", e.g. "11:30"
  locationName: string; // e.g. "Masjid Kampus 1", "Aula Gedung Utama", "Kampus 2 Sedayu"
  locationLat?: number;
  locationLng?: number;
  locationRadius?: number; // meters, default 150
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

// Predefined official campus venues with high-accuracy GPS coordinates
export const PREDEFINED_AGENDA_VENUES: AgendaVenue[] = [
  {
    id: "masjid_kampus1",
    name: "Masjid Kampus 1 Muallimin (Wirobrajan)",
    lat: -7.801194,
    lng: 110.353889,
    radius: 150,
    desc: "Masjid Utama Kampus 1 Wirobrajan"
  },
  {
    id: "aula_kampus1",
    name: "Aula / Ruang Rapat Utama Kampus 1",
    lat: -7.801194,
    lng: 110.353889,
    radius: 150,
    desc: "Gedung Utama Lt. 2 Kampus 1 Wirobrajan"
  },
  {
    id: "kampus2_sedayu",
    name: "Kampus 2 Muallimin (Sedayu)",
    lat: -7.818450,
    lng: 110.270920,
    radius: 300,
    desc: "Kompleks Asrama & Masjid Kampus 2 Sedayu"
  },
  {
    id: "asrama_setempat",
    name: "Gedung Asrama Masing-Masing",
    lat: -7.801194,
    lng: 110.353889,
    radius: 350,
    desc: "Lingkup Area Asrama & Kamar Pembinaan"
  }
];

export const AGENDA_CATEGORIES: { id: AgendaRapatRecord["category"]; label: string; color: string }[] = [
  { id: "rapat", label: "Rapat Koordinasi", color: "blue" },
  { id: "pengajian", label: "Pengajian & Kajian", color: "emerald" },
  { id: "briefing", label: "Briefing / Apel", color: "purple" },
  { id: "pembinaan", label: "Pembinaan Musyrif", color: "amber" },
  { id: "lainnya", label: "Agenda Lainnya", color: "slate" }
];
