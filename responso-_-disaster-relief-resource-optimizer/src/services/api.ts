/**
 * Responso Full-Stack API Integration Service
 * ============================================
 * Connects the React frontend directly to the FastAPI backend API (/api/v1).
 * Maps real database entities into frontend TypeScript interfaces.
 * Provides resilient fallback to local state if backend is unavailable.
 */

import { 
  AssistanceRequest, 
  Warehouse, 
  Delivery, 
  AllocationRun, 
  InventoryMovement, 
  UserAccount, 
  AuditLogEvent,
  SupplyType,
  UrgencyLevel,
  AccessStatus,
  RequestStatus,
  DeliveryStatus,
  RecommendationItem
} from '../types';

// API base URL: empty for relative path (proxied by Vite), or direct fallback
const API_BASE = '/api/v1';
const TOKEN_KEY = 'responso_jwt_token';

let currentAuthToken: string | null = typeof localStorage !== 'undefined' ? (localStorage.getItem(TOKEN_KEY) || null) : null;

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners: SessionExpiredListener[] = [];

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.push(listener);
  return () => {
    const idx = sessionExpiredListeners.indexOf(listener);
    if (idx !== -1) sessionExpiredListeners.splice(idx, 1);
  };
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

export function mapBackendUser(u: any): UserAccount {
  return {
    id: u.id,
    name: u.display_name,
    email: u.email,
    role: u.role,
    roleTitle: u.role_title || '',
    avatarInitials: (u.display_name || 'U')
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase(),
    active: u.is_active ?? true,
    department: u.department || '',
    lastActive: 'Online',
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (currentAuthToken) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login')) {
      setAuthToken(null);
      sessionExpiredListeners.forEach(listener => listener());
    }

    let errBody: any = null;
    try {
      errBody = await response.json();
    } catch {
      errBody = { error: { message: response.statusText } };
    }
    const message = errBody?.error?.message || errBody?.detail?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(message) as any;
    err.status = response.status;
    err.details = errBody?.error || errBody?.detail || errBody;
    throw err;
  }

  return response.json();
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/health', { 
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Authentication ──────────────────────────────────────────────────────────

export async function loginUser(email: string, password = 'Password123!'): Promise<{ user: UserAccount; token: string }> {
  const res = await request<{ access_token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setAuthToken(res.access_token);
  return {
    token: res.access_token,
    user: mapBackendUser(res.user),
  };
}

export async function getCurrentUser(): Promise<UserAccount> {
  const u = await request<any>('/auth/me');
  return mapBackendUser(u);
}

export async function logoutUser(): Promise<void> {
  try {
    await request<any>('/auth/logout', { method: 'POST' });
  } catch {
    // Graceful swallow of network/server error on sign out
  } finally {
    setAuthToken(null);
  }
}

export async function updateUser(
  userId: string,
  data: Partial<{
    display_name: string;
    department: string;
    role_title: string;
    role: string;
    is_active: boolean;
  }>
): Promise<UserAccount> {
  const u = await request<any>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return mapBackendUser(u);
}

// ─── Requests ────────────────────────────────────────────────────────────────

export async function fetchRequests(): Promise<AssistanceRequest[]> {
  const raw = await request<any[]>('/requests/');
  return raw.map(mapBackendRequest);
}

export async function createRequest(
  payload: {
    communityName: string;
    district: string;
    tehsil?: string;
    unionCouncil?: string;
    zone?: string;
    contactPerson: string;
    contactPhone: string;
    lat: number;
    lng: number;
    urgency: UrgencyLevel;
    affectedPopulation: number;
    affectedHouseholds: number;
    vulnerableCount: number;
    accessStatus: AccessStatus;
    floodDepthMeters: number;
    requiredSupplies: Record<SupplyType, number>;
    description?: string;
  },
  idempotencyKey?: string
): Promise<AssistanceRequest> {
  const items = (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[])
    .map(t => ({ item_type: t, quantity_requested: payload.requiredSupplies[t] || 0 }))
    .filter(i => i.quantity_requested > 0);

  const body = {
    location: {
      name: payload.communityName,
      district: payload.district,
      tehsil: payload.tehsil || '',
      union_council: payload.unionCouncil || '',
      zone: payload.zone || '',
      latitude: payload.lat,
      longitude: payload.lng,
      location_type: 'camp',
    },
    urgency: payload.urgency,
    affected_population: payload.affectedPopulation,
    affected_households: payload.affectedHouseholds,
    vulnerable_count: payload.vulnerableCount,
    access_status: payload.accessStatus,
    flood_depth_meters: payload.floodDepthMeters,
    contact_person: payload.contactPerson,
    contact_phone: payload.contactPhone,
    items,
    description: payload.description || 'Community flood relief request',
  };

  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const raw = await request<any>('/requests/', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return mapBackendRequest(raw);
}

// ─── Warehouses & Inventory ──────────────────────────────────────────────────

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const raw = await request<any[]>('/warehouses/');
  return raw.map(mapBackendWarehouse);
}

export async function createStockMovement(
  warehouseId: string,
  itemType: SupplyType,
  quantityDelta: number,
  reason: string,
  idempotencyKey?: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  await request(`/inventory/warehouses/${warehouseId}/stock-movements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      item_type: itemType,
      quantity_delta: quantityDelta,
      reason,
    }),
  });
}

// ─── Allocation Runs ─────────────────────────────────────────────────────────

export async function fetchAllocationRuns(): Promise<AllocationRun[]> {
  const raw = await request<any[]>('/allocation-runs/');
  return raw.map(mapBackendRun);
}

export async function createAllocationRun(weights?: {
  urgencyWeight: number;
  populationWeight: number;
  waitingTimeWeight: number;
  distanceWeight: number;
}): Promise<AllocationRun> {
  const body = weights ? {
    weights: {
      urgency_weight: weights.urgencyWeight,
      population_weight: weights.populationWeight,
      waiting_time_weight: weights.waitingTimeWeight,
      distance_weight: weights.distanceWeight,
    }
  } : {};

  const raw = await request<any>('/allocation-runs/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapBackendRun(raw);
}

export async function approveAllocationRun(
  runId: string,
  notes = '',
  idempotencyKey?: string
): Promise<AllocationRun> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const raw = await request<any>(`/allocation-runs/${runId}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ notes }),
  });
  return mapBackendRun(raw);
}

export async function rejectAllocationRun(runId: string, reason: string): Promise<AllocationRun> {
  const raw = await request<any>(`/allocation-runs/${runId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return mapBackendRun(raw);
}

// ─── Deliveries ──────────────────────────────────────────────────────────────

export async function fetchDeliveries(): Promise<Delivery[]> {
  const raw = await request<any[]>('/deliveries/');
  return raw.map(mapBackendDelivery);
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  note = '',
  failureReason = '',
  idempotencyKey?: string
): Promise<Delivery> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const raw = await request<any>(`/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status,
      note,
      failure_reason: failureReason,
    }),
  });
  return mapBackendDelivery(raw);
}

// ─── Dashboard, Audit & Reset ────────────────────────────────────────────────

export async function fetchDashboardSummary(): Promise<any> {
  return request<any>('/dashboard/summary');
}

export async function fetchAuditLogs(): Promise<AuditLogEvent[]> {
  const raw = await request<any[]>('/audit-events/');
  return raw.map((a: any) => ({
    id: a.id,
    timestamp: a.created_at,
    actorName: a.actor_name,
    actorRole: a.actor_role,
    action: a.action,
    category: a.category,
    details: a.details,
    entityId: a.entity_id,
  }));
}

export async function fetchUsers(): Promise<UserAccount[]> {
  const raw = await request<any[]>('/users/');
  return raw.map(mapBackendUser);
}

export async function resetDemoDatabase(): Promise<any> {
  return request<any>('/dashboard/reset-demo', { method: 'POST' });
}

// ─── Data Mappers ────────────────────────────────────────────────────────────

function mapBackendRequest(r: any): AssistanceRequest {
  const reqSupplies: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
  const allocSupplies: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };

  if (Array.isArray(r.items)) {
    for (const item of r.items) {
      const type = item.item_type as SupplyType;
      if (type in reqSupplies) {
        reqSupplies[type] = item.quantity_requested;
        allocSupplies[type] = item.quantity_allocated || 0;
      }
    }
  }

  const lat = r.location?.latitude ?? 26.5;
  const lng = r.location?.longitude ?? 68.0;

  return {
    id: r.reference_code || r.id,
    communityName: r.location?.name || 'Community Shelter',
    district: r.location?.district || 'Sindh',
    tehsil: r.location?.tehsil || '',
    unionCouncil: r.location?.union_council || '',
    zone: r.location?.zone || `${r.location?.district || 'Sindh'} Flood Basin`,
    contactPerson: r.contact_person || '',
    contactPhone: r.contact_phone || '',
    coordinates: {
      x: 50,
      y: 50,
      lat,
      lng,
    },
    affectedPopulation: r.affected_population,
    affectedHouseholds: r.affected_households,
    vulnerableCount: r.vulnerable_count,
    urgency: r.urgency as UrgencyLevel,
    floodDepthMeters: r.flood_depth_meters,
    accessStatus: r.access_status as AccessStatus,
    requiredSupplies: reqSupplies,
    allocatedSupplies: allocSupplies,
    status: r.status as RequestStatus,
    createdAt: r.created_at,
    notes: r.description || '',
  };
}

function mapBackendWarehouse(wh: any): Warehouse {
  const inventory: Record<SupplyType, { available: number; reserved: number; total: number }> = {
    water: { available: 0, reserved: 0, total: 0 },
    food: { available: 0, reserved: 0, total: 0 },
    medical: { available: 0, reserved: 0, total: 0 },
    shelter: { available: 0, reserved: 0, total: 0 },
    hygiene: { available: 0, reserved: 0, total: 0 },
  };

  if (Array.isArray(wh.inventory)) {
    for (const item of wh.inventory) {
      const type = item.item_type as SupplyType;
      if (type in inventory) {
        inventory[type] = {
          available: item.quantity_available,
          reserved: item.quantity_reserved,
          total: item.quantity_on_hand,
        };
      }
    }
  }

  const lat = wh.location?.latitude ?? 27.0;
  const lng = wh.location?.longitude ?? 68.5;

  return {
    id: wh.id,
    name: wh.name,
    code: wh.code,
    district: wh.location?.district || 'Sindh',
    locationName: wh.location?.name || '',
    coordinates: {
      x: 50,
      y: 50,
      lat,
      lng,
    },
    capacityKg: wh.capacity_kg,
    availableDeliveryTrucks: wh.available_delivery_trucks,
    contactPerson: wh.contact_person,
    contactPhone: wh.contact_phone,
    inventory,
  };
}

function mapBackendDelivery(d: any): Delivery {
  const manifest: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
  if (Array.isArray(d.items)) {
    for (const it of d.items) {
      const t = it.item_type as SupplyType;
      if (t in manifest) {
        manifest[t] = it.quantity;
      }
    }
  }

  const timeline = Array.isArray(d.timeline_events)
    ? d.timeline_events.map((t: any) => ({
        timestamp: t.created_at,
        event: t.event_text,
        status: t.status as DeliveryStatus,
        note: t.note || undefined,
      }))
    : [];

  const weights: Record<string, number> = { water: 10, food: 24, medical: 4.5, shelter: 18, hygiene: 3.5 };
  const calcWeight = Object.entries(manifest).reduce((sum, [st, qty]) => sum + (weights[st] || 0) * (qty as number), 0);

  return {
    id: d.id,
    allocationRunId: d.allocation_run_id || '',
    requestId: d.request_id,
    destinationCommunity: d.destination_community || (d.request_reference_code ? `Request ${d.request_reference_code}` : `Request ${d.request_id.substring(0, 8)}`),
    destinationDistrict: d.destination_district || 'Sindh Affected Zone',
    warehouseId: d.warehouse_id,
    warehouseName: d.warehouse_name || `Depot ${d.warehouse_code || d.warehouse_id}`,
    vehicleCode: d.vehicle_code || 'CONVOY-01',
    driverName: d.driver_name || 'Convoy Driver',
    driverPhone: d.driver_phone || '',
    suppliesManifest: manifest,
    totalWeightKg: calcWeight > 0 ? calcWeight : (d.distance_km || 1) * 10,
    status: d.status as DeliveryStatus,
    failureReason: d.failure_reason || undefined,
    distanceKm: d.distance_km || 0,
    etaMinutes: d.eta_minutes || 0,
    dispatchedAt: d.dispatched_at || undefined,
    deliveredAt: d.delivered_at || undefined,
    timeline,
  };
}

function mapBackendRun(r: any): AllocationRun {
  let weights = {
    urgencyWeight: 0.55,
    populationWeight: 0.30,
    waitingTimeWeight: 0.15,
    distanceWeight: 0.0,
  };
  try {
    const parsed = JSON.parse(r.weights_json || '{}');
    if (parsed.urgency_weight !== undefined) {
      weights = {
        urgencyWeight: parsed.urgency_weight,
        populationWeight: parsed.population_weight,
        waitingTimeWeight: parsed.waiting_time_weight,
        distanceWeight: parsed.distance_weight || 0.0,
      };
    }
  } catch {}

  let totals = {
    demand: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 } as Record<SupplyType, number>,
    allocated: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 } as Record<SupplyType, number>,
    unmet: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 } as Record<SupplyType, number>,
    totalWeightKg: 0,
    trucksRequired: 0,
    totalCostPkr: 0,
  };
  try {
    const parsedT = JSON.parse(r.totals_json || '{}');
    if (parsedT.demand) totals.demand = parsedT.demand;
    if (parsedT.allocated) totals.allocated = parsedT.allocated;
    if (parsedT.unmet) totals.unmet = parsedT.unmet;
  } catch {}

  const recommendations: RecommendationItem[] = (r.lines || []).map((l: any, idx: number) => {
    let factors = {
      urgencyScore: 80,
      populationScore: 70,
      waitingTimeScore: 50,
      distanceScore: 60,
      compositeScore: l.priority_score,
    };
    try {
      const parsedF = JSON.parse(l.factors_json || '{}');
      if (parsedF.urgency_score !== undefined) {
        factors = {
          urgencyScore: parsedF.urgency_score,
          populationScore: parsedF.population_score,
          waitingTimeScore: parsedF.waiting_time_score,
          distanceScore: 0,
          compositeScore: parsedF.composite_score,
        };
      }
    } catch {}

    const reqSupp: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
    const recSupp: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
    const unmetSupp: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };

    const t = l.item_type as SupplyType;
    if (t in recSupp) {
      recSupp[t] = l.quantity_recommended;
      reqSupp[t] = l.quantity_recommended;
    }

    return {
      requestId: l.request_id,
      communityName: `Request Location`,
      district: 'Sindh District',
      urgency: 'HIGH' as UrgencyLevel,
      affectedPopulation: 1000,
      affectedHouseholds: 200,
      waitingHours: 6.0,
      distanceKm: l.distance_km,
      selectedWarehouseId: l.warehouse_id,
      selectedWarehouseName: `Warehouse (${l.warehouse_id})`,
      factors,
      requestedSupplies: reqSupp,
      recommendedSupplies: recSupp,
      unmetSupplies: unmetSupp,
      fulfillmentPercentage: 100,
      assignedTruckId: `TRK-${String(idx + 1).padStart(2, '0')}`,
      estimatedTransitMinutes: Math.round(l.distance_km * 1.5),
      estimatedTransitCostPkr: Math.round(l.distance_km * 120),
      algorithmicReasoning: l.explanation,
    };
  });

  return {
    id: r.id,
    version: parseInt(r.algorithm_version?.replace(/\D/g, '') || '1', 10),
    timestamp: r.created_at,
    status: r.status,
    isStale: r.is_stale,
    staleReason: r.stale_reason,
    weights,
    recommendations,
    totals,
    reviewedBy: r.reviewed_by_name || undefined,
    reviewedAt: r.reviewed_at || undefined,
    reviewNotes: r.review_notes || undefined,
  };
}
