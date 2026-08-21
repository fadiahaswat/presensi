import { SantriData } from "../data/santriData";

export type SantriRequestType = "edit" | "transfer_kelas" | "delete";
export type SantriRequestStatus = "pending" | "approved" | "rejected";

export interface SantriChangeRequest {
  id: string;
  santriId: string;
  santriNama: string;
  santriKelasAsal: string;
  santriNis: string;
  
  type: SantriRequestType;
  status: SantriRequestStatus;
  
  requestedBy: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  
  requestedAt: string; // ISO String
  reason: string;
  
  // Data for 'edit' or 'transfer_kelas'
  proposedData?: Partial<SantriData>;
  
  // Reviewer info
  reviewedBy?: {
    id: string;
    name: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
}
