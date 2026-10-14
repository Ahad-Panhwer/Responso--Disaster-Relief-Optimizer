import { 
  AssistanceRequest, 
  Warehouse, 
  InventoryMovement, 
  Delivery, 
  AllocationRun, 
  AuditLogEvent, 
  UserAccount 
} from '../types';
import { 
  INITIAL_REQUESTS, 
  INITIAL_WAREHOUSES, 
  INITIAL_MOVEMENTS, 
  INITIAL_DELIVERIES, 
  INITIAL_USERS, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';
import { runOptimizationAlgorithm, DEFAULT_WEIGHTS } from './optimizer';

const STORAGE_KEY = 'responso_sindh_relief_v3';
const LEGACY_STORAGE_KEY = 'responso_sindh_relief_v2';

export interface AppStateData {
  requests: AssistanceRequest[];
  warehouses: Warehouse[];
  movements: InventoryMovement[];
  deliveries: Delivery[];
  runs: AllocationRun[];
  selectedRunId: string;
  auditLogs: AuditLogEvent[];
  users: UserAccount[];
  lastSavedAt: string;
}

export function getDefaultAppState(): AppStateData {
  const initialRun = runOptimizationAlgorithm(INITIAL_REQUESTS, INITIAL_WAREHOUSES, DEFAULT_WEIGHTS, 4);
  return {
    requests: INITIAL_REQUESTS,
    warehouses: INITIAL_WAREHOUSES,
    movements: INITIAL_MOVEMENTS,
    deliveries: INITIAL_DELIVERIES,
    runs: [initialRun],
    selectedRunId: initialRun.id,
    auditLogs: INITIAL_AUDIT_LOGS,
    users: INITIAL_USERS,
    lastSavedAt: new Date().toISOString(),
  };
}

export function loadAppState(): AppStateData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy v2 key for seamless migration
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }

    if (!raw) {
      const def = getDefaultAppState();
      saveAppState(def);
      return def;
    }

    const parsed = JSON.parse(raw) as AppStateData;
    if (!parsed.requests || !parsed.warehouses || !parsed.runs) {
      const def = getDefaultAppState();
      saveAppState(def);
      return def;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load state from localStorage, using default Sindh dataset:', err);
    return getDefaultAppState();
  }
}

export function saveAppState(data: AppStateData): void {
  try {
    const toSave: AppStateData = {
      ...data,
      lastSavedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err: any) {
    // Quota Exceeded fallback: prune older audit logs & stale runs to free space
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      try {
        console.warn('[Storage] QuotaExceededError: Pruning history to preserve active operations...');
        const pruned: AppStateData = {
          ...data,
          auditLogs: data.auditLogs.slice(0, 30),
          runs: data.runs.filter(r => r.status === 'APPROVED' || !r.isStale).slice(0, 5),
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      } catch (retryErr) {
        console.error('[Storage] Critical: Unable to persist state even after pruning:', retryErr);
      }
    } else {
      console.error('Failed to save state to localStorage:', err);
    }
  }
}

export function resetAppStateToDefaults(): AppStateData {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {}
  const def = getDefaultAppState();
  saveAppState(def);
  return def;
}
