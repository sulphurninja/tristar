export interface Ref {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface DetailLead {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string; altPhone?: string; whatsappOptIn?: boolean };
  stage: string;
  stageReason?: string;
  priority?: string;
  category?: string;
  country?: string;
  description?: string;
  tags?: string[];
  source?: { primary?: string };
  createdAt: string;
  assignedAt?: string;
  nextActionAt?: string;
  isContact?: boolean;
  isReturning?: boolean;
  assignedTo?: Ref | null;
  preSalesAgentId?: Ref | null;
  coOwners?: Ref[];
  primaryProjectId?: { _id: string; name: string; code?: string; location?: { city?: string; locality?: string } } | null;
  interestedProjects?: Array<{ _id: string; name: string; code?: string; location?: { city?: string; locality?: string } }>;
  interestedProperties?: Array<{ _id: string; title: string; location?: string; city?: string; configuration?: string; price?: number; status?: string }>;
  brokerId?: { _id: string; name: string; firmName?: string; phone?: string; rmName?: string; cpCode?: string } | null;
  employment?: { company?: string; type?: string; designation?: string; income?: number };
  otherDetails?: { ethnicity?: string; loan?: "Yes" | "No" };
  requirement?: {
    budgetMin?: number;
    budgetMax?: number;
    areaMin?: number;
    areaMax?: number;
    requirementType?: string;
    propertyType?: string;
    subType?: string;
    unitTypes?: string[];
    searchLocation?: string;
    streetAddress?: string;
    location?: string;
    subLocation?: string;
  };
  documents?: Array<{ _id: string; name: string; url: string; mimeType?: string; size?: number; uploadedAt?: string }>;
}

export interface Detail {
  lead: DetailLead;
  lastActivity?: { type: string; description?: string; occurredAt: string } | null;
  cpRemainingDays: number | null;
}

/** What every tab receives. */
export interface TabCtx {
  lead: DetailLead;
  reload: () => void;
  patch: (body: Record<string, unknown>, okMsg?: string) => Promise<boolean>;
}
