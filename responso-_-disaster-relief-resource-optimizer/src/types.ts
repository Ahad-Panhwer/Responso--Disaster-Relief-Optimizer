export type SupplyType = 'water' | 'food' | 'medical' | 'shelter' | 'hygiene';

export interface SupplyItemMeta {
  type: SupplyType;
  label: string;
  urduLabel?: string;
  unit: string;
  weightKgPerUnit: number;
  estimatedCostPkrPerUnit: number;
  description: string;
}

export const SUPPLY_METAS: Record<SupplyType, SupplyItemMeta> = {
  water: {
    type: 'water',
    label: 'Clean Drinking Water',
    urduLabel: 'صاف پینے کا پانی',
    unit: 'Jerry Cans (10L)',
    weightKgPerUnit: 10,
    estimatedCostPkrPerUnit: 180,
    description: 'Chlorinated, purified drinking water in sealed food-grade jerry cans',
  },
  food: {
    type: 'food',
    label: 'Emergency Food Ration Packs',
    urduLabel: 'امدادی راشن پیک',
    unit: 'Family Packs (15-Day)',
    weightKgPerUnit: 24,
    estimatedCostPkrPerUnit: 4800,
    description: 'Wheat flour (Atta 20kg), Daal (3kg), cooking ghee (2L), sugar, tea & salt',
  },
  medical: {
    type: 'medical',
    label: 'Emergency Trauma & Clinic Kits',
    urduLabel: 'طبی و فرسٹ ایڈ کٹس',
    unit: 'Medical Kits',
    weightKgPerUnit: 4.5,
    estimatedCostPkrPerUnit: 7500,
    description: 'Oral rehydration salts (ORS), anti-diarrheal meds, aqua tablets, antiseptic dressings',
  },
  shelter: {
    type: 'shelter',
    label: 'Waterproof Family Tents',
    urduLabel: 'واٹر پروف خیمے',
    unit: 'Tents (5-6 Person)',
    weightKgPerUnit: 18.0,
    estimatedCostPkrPerUnit: 16500,
    description: 'Weather-resistant dome canvas tent with ground insulation sheet and ropes',
  },
  hygiene: {
    type: 'hygiene',
    label: 'Dignity & Sanitation Packs',
    urduLabel: 'صفائی و سینیٹیشن پیک',
    unit: 'Family Packs',
    weightKgPerUnit: 3.5,
    estimatedCostPkrPerUnit: 2200,
    description: 'Soap, water purification sachets, disinfectant, towel, sanitary essentials',
  },
};

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type AccessStatus = 'CUT_OFF_ROAD' | 'BOAT_ONLY' | 'ACCESSIBLE';
export type RequestStatus = 'PENDING' | 'PARTIALLY_ALLOCATED' | 'ALLOCATED' | 'DISPATCHED' | 'FULFILLED';

export interface AssistanceRequest {
  id: string;
  communityName: string; // e.g. "Dadu Govt Degree College Relief Camp"
  district: string;      // e.g. "Dadu"
  tehsil: string;        // e.g. "Dadu"
  unionCouncil?: string; // e.g. "UC Yar Muhammad Kalhoro"
  zone: string;          // e.g. "Western Sindh Flood Basin"
  contactPerson: string; // e.g. "Mukhtiarkar Asif Memon"
  contactPhone: string;  // e.g. "+92 (300) 554-1298"
  coordinates: { x: number; y: number; lat: number; lng: number };
  affectedPopulation: number;
  affectedHouseholds: number;
  vulnerableCount: number; // elderly, pregnant women, infants
  urgency: UrgencyLevel;
  floodDepthMeters: number;
  accessStatus: AccessStatus;
  requiredSupplies: Record<SupplyType, number>;
  allocatedSupplies: Record<SupplyType, number>;
  status: RequestStatus;
  createdAt: string;
  notes: string;
  _syncStatus?: SyncStatus;
  _offlineCreated?: boolean;
  _lastSyncedAt?: string;
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export type SyncOperationType = 'CREATE_REQUEST' | 'UPDATE_DELIVERY_STATUS' | 'RECORD_STOCK_MOVEMENT';

export interface SyncQueueItem {
  id: string;
  type: SyncOperationType;
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  errorMessage?: string;
  idempotencyKey: string;
  clientEntityId?: string;
}

export interface Warehouse {
  id: string;
  name: string;        // e.g. "Sukkur Barrage Regional Relief Hub"
  code: string;        // e.g. "WH-SUKKUR"
  district: string;    // e.g. "Sukkur"
  locationName: string;
  coordinates: { x: number; y: number; lat: number; lng: number };
  capacityKg: number;
  availableDeliveryTrucks: number;
  contactPerson: string;
  contactPhone: string;
  inventory: Record<SupplyType, {
    available: number;
    reserved: number;
    total: number;
  }>;
}

export interface InventoryMovement {
  id: string;
  timestamp: string;
  warehouseId: string;
  warehouseName: string;
  supplyType: SupplyType;
  delta: number; // positive = restock/inbound, negative = outbound/adjustment
  balanceAfter: number;
  reason: string;
  operator: string;
  _syncStatus?: SyncStatus;
}

export interface ReliefCamp {
  id: string;
  name: string;
  district: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  capacityPeople: number;
  currentOccupancy: number;
  facilities: string[];
  contactPerson: string;
  contactPhone: string;
}

export interface AllocationFactorBreakdown {
  urgencyScore: number;       // 0 - 100
  populationScore: number;    // 0 - 100
  waitingTimeScore: number;   // 0 - 100 (longer waiting = higher priority)
  distanceScore: number;      // 0 - 100 (closer depot = higher efficiency)
  compositeScore: number;     // final weighted score
}

export interface RecommendationItem {
  requestId: string;
  communityName: string;
  district: string;
  urgency: UrgencyLevel;
  affectedPopulation: number;
  affectedHouseholds: number;
  waitingHours: number;
  distanceKm: number; // Estimated straight-line distance (km)
  selectedWarehouseId: string;
  selectedWarehouseName: string;
  factors: AllocationFactorBreakdown;
  requestedSupplies: Record<SupplyType, number>;
  recommendedSupplies: Record<SupplyType, number>;
  unmetSupplies: Record<SupplyType, number>;
  fulfillmentPercentage: number;
  shortageMessage?: string;
  assignedTruckId: string;
  estimatedTransitMinutes: number;
  estimatedTransitCostPkr: number;
  algorithmicReasoning: string;
}

export interface AllocationRun {
  id: string;
  version: number;
  timestamp: string; // PKT
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  isStale: boolean; // becomes true if requests or warehouse stock change after calculation
  staleReason?: string;
  weights: {
    urgencyWeight: number;     // e.g. 0.35
    populationWeight: number;  // e.g. 0.30
    waitingTimeWeight: number; // e.g. 0.20
    distanceWeight: number;    // e.g. 0.15
  };
  recommendations: RecommendationItem[];
  totals: {
    demand: Record<SupplyType, number>;
    allocated: Record<SupplyType, number>;
    unmet: Record<SupplyType, number>;
    totalWeightKg: number;
    trucksRequired: number;
    totalCostPkr: number;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type DeliveryStatus = 'ASSIGNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export interface Delivery {
  id: string;
  allocationRunId: string;
  requestId: string;
  destinationCommunity: string;
  destinationDistrict: string;
  warehouseId: string;
  warehouseName: string;
  vehicleCode: string;
  driverName: string;
  driverPhone: string;
  suppliesManifest: Record<SupplyType, number>;
  deliveredSupplies?: Record<SupplyType, number>; // Cannot exceed allocated suppliesManifest
  totalWeightKg: number;
  status: DeliveryStatus;
  failureReason?: string;
  distanceKm: number; // Estimated straight-line distance in km
  etaMinutes: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  verifiedBy?: string;
  timeline: Array<{
    timestamp: string;
    event: string;
    status: DeliveryStatus;
    note?: string;
  }>;
  _syncStatus?: SyncStatus;
}

export type UserRole = 
  | 'LOGISTICS_COORDINATOR'
  | 'FIELD_DISPATCHER'
  | 'INVENTORY_MANAGER'
  | 'SYSTEM_ADMIN';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatarInitials: string;
  active: boolean;
  department: string;
  lastActive: string;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  category: 'ALLOCATION' | 'INVENTORY' | 'REQUEST' | 'DISPATCH' | 'SECURITY';
  details: string;
  entityId?: string;
}
