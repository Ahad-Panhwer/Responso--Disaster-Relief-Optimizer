/**
 * Responso Offline Synchronization & Queue Management Engine
 * ==========================================================
 * Manages persistent offline operations queue, network connectivity monitoring,
 * exponential retry, idempotency safeguards, and bi-directional synchronization.
 */

import { SyncQueueItem, SyncOperationType, AssistanceRequest, Delivery } from '../types';
import * as api from './api';

const QUEUE_STORAGE_KEY = 'responso_offline_sync_queue_v1';
const SIMULATED_OFFLINE_KEY = 'responso_simulated_offline';

// In-memory state and listeners
let isSyncingInProgress = false;
let isSimulatedOffline = false;

type ConnectivityListener = (isOnline: boolean) => void;
type QueueListener = (queue: SyncQueueItem[]) => void;
type ItemSyncedListener = (type: SyncOperationType, clientEntityId?: string, serverResult?: any) => void;

const connectivityListeners = new Set<ConnectivityListener>();
const queueListeners = new Set<QueueListener>();
const itemSyncedListeners = new Set<ItemSyncedListener>();

// ─── Queue Persistence ───────────────────────────────────────────────────────

export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch (err) {
    console.warn('[OfflineSync] Failed to read queue from storage:', err);
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueListeners(queue);
  } catch (err) {
    console.error('[OfflineSync] Failed to save queue to storage:', err);
  }
}

export function enqueueSyncItem(
  type: SyncOperationType,
  payload: any,
  clientEntityId?: string
): SyncQueueItem {
  const queue = getSyncQueue();
  const id = `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const idempotencyKey = `IDEMP-${id}-${Math.random().toString(36).substring(2, 9)}`;

  const newItem: SyncQueueItem = {
    id,
    type,
    payload,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
    idempotencyKey,
    clientEntityId,
  };

  const updatedQueue = [...queue, newItem];
  saveSyncQueue(updatedQueue);
  requestBackgroundSync();
  return newItem;
}

export function removeSyncItem(id: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveSyncQueue(filtered);
}

export function updateSyncItem(id: string, updates: Partial<SyncQueueItem>): void {
  const queue = getSyncQueue();
  const updated = queue.map(item => (item.id === id ? { ...item, ...updates } : item));
  saveSyncQueue(updated);
}

export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

export function retrySyncItem(id: string): void {
  updateSyncItem(id, { status: 'pending', errorMessage: undefined });
  processSyncQueue().catch(() => {});
}

export function dismissSyncItem(id: string): void {
  removeSyncItem(id);
}

export function retryAllFailedItems(): void {
  const queue = getSyncQueue();
  const updated = queue.map(item =>
    item.status === 'failed' ? { ...item, status: 'pending' as const, errorMessage: undefined } : item
  );
  saveSyncQueue(updated);
  processSyncQueue().catch(() => {});
}

// ─── Connectivity Monitoring ─────────────────────────────────────────────────

let currentConnectivityState = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isCheckingConnectivity = false;

export function isDeviceOnline(): boolean {
  if (isSimulatedOffline) return false;
  return currentConnectivityState;
}

export function setSimulatedOffline(offline: boolean): void {
  isSimulatedOffline = offline;
  if (offline) {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, 'true');
    currentConnectivityState = false;
    notifyConnectivityListeners(false);
  } else {
    localStorage.removeItem(SIMULATED_OFFLINE_KEY);
    // Immediately test and restore connection
    checkConnectivity();
  }
}

export function getIsSimulatedOffline(): boolean {
  return isSimulatedOffline;
}

export async function verifyServerReachability(): Promise<boolean> {
  if (isSimulatedOffline) return false;
  try {
    const isLive = await api.checkBackendHealth();
    return isLive;
  } catch {
    return false;
  }
}

export async function checkConnectivity(): Promise<boolean> {
  if (isCheckingConnectivity) return currentConnectivityState;
  isCheckingConnectivity = true;

  try {
    if (isSimulatedOffline) {
      if (currentConnectivityState !== false) {
        currentConnectivityState = false;
        notifyConnectivityListeners(false);
      }
      return false;
    }

    const deviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!deviceOnline) {
      if (currentConnectivityState !== false) {
        currentConnectivityState = false;
        notifyConnectivityListeners(false);
      }
      return false;
    }

    // Device reports online; verify backend server reachability
    const serverReachable = await verifyServerReachability();
    if (serverReachable) {
      const wasOffline = !currentConnectivityState;
      currentConnectivityState = true;
      notifyConnectivityListeners(true);
      if (wasOffline) {
        processSyncQueue().catch(() => {});
      }
      return true;
    } else {
      if (currentConnectivityState !== false) {
        currentConnectivityState = false;
        notifyConnectivityListeners(false);
      }
      return false;
    }
  } finally {
    isCheckingConnectivity = false;
  }
}

export async function recheckConnectivityNow(): Promise<boolean> {
  return await checkConnectivity();
}

// ─── Listeners & Subscriptions ───────────────────────────────────────────────

export function subscribeConnectivity(listener: ConnectivityListener): () => void {
  connectivityListeners.add(listener);
  listener(currentConnectivityState);
  return () => {
    connectivityListeners.delete(listener);
  };
}

export function subscribeQueue(listener: QueueListener): () => void {
  queueListeners.add(listener);
  listener(getSyncQueue());
  return () => {
    queueListeners.delete(listener);
  };
}

export function subscribeItemSynced(listener: ItemSyncedListener): () => void {
  itemSyncedListeners.add(listener);
  return () => {
    itemSyncedListeners.delete(listener);
  };
}

function notifyConnectivityListeners(online: boolean) {
  connectivityListeners.forEach(l => {
    try { l(online); } catch (e) { console.error(e); }
  });
}

function notifyQueueListeners(queue: SyncQueueItem[]) {
  queueListeners.forEach(l => {
    try { l(queue); } catch (e) { console.error(e); }
  });
}

function notifyItemSynced(type: SyncOperationType, clientEntityId?: string, result?: any) {
  itemSyncedListeners.forEach(l => {
    try { l(type, clientEntityId, result); } catch (e) { console.error(e); }
  });
}

// Global browser listeners with auto-reconnection burst & periodic heartbeat
function triggerReconnectionBurst() {
  const intervals = [100, 600, 1500, 3000, 6000, 10000];
  intervals.forEach(delay => {
    setTimeout(async () => {
      if (!currentConnectivityState && (typeof navigator !== 'undefined' ? navigator.onLine : true)) {
        await checkConnectivity();
      }
    }, delay);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerReconnectionBurst();
    checkConnectivity();
  });

  window.addEventListener('offline', () => {
    currentConnectivityState = false;
    notifyConnectivityListeners(false);
  });

  window.addEventListener('focus', () => {
    checkConnectivity();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkConnectivity();
    }
  });

  // Continuous background heartbeat loop: runs every 4 seconds
  setInterval(() => {
    checkConnectivity();
  }, 4000);

  // Initial check on file load
  setTimeout(() => {
    checkConnectivity();
  }, 200);
}

// ─── Queue Draining & Synchronization ───────────────────────────────────────

export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (isSyncingInProgress) {
    return { processed: 0, failed: 0, remaining: getSyncQueue().length };
  }

  if (!isDeviceOnline()) {
    return { processed: 0, failed: 0, remaining: getSyncQueue().length };
  }

  isSyncingInProgress = true;
  let processedCount = 0;
  let failedCount = 0;

  try {
    const queue = getSyncQueue();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'syncing');

    for (const item of pendingItems) {
      // Re-verify connectivity between iterations
      if (!isDeviceOnline()) break;

      updateSyncItem(item.id, { status: 'syncing' });

      try {
        let serverResult: any = null;

        switch (item.type) {
          case 'CREATE_REQUEST': {
            serverResult = await api.createRequest(item.payload, item.idempotencyKey);
            break;
          }
          case 'UPDATE_DELIVERY_STATUS': {
            serverResult = await api.updateDeliveryStatus(
              item.payload.deliveryId,
              item.payload.status,
              item.payload.note,
              item.payload.failureReason,
              item.idempotencyKey
            );
            break;
          }
          case 'RECORD_STOCK_MOVEMENT': {
            await api.createStockMovement(
              item.payload.warehouseId,
              item.payload.itemType,
              item.payload.quantityDelta,
              item.payload.reason,
              item.idempotencyKey
            );
            serverResult = { success: true };
            break;
          }
        }

        // Successfully synchronized! Remove from queue and notify listeners
        removeSyncItem(item.id);
        notifyItemSynced(item.type, item.clientEntityId, serverResult);
        processedCount++;

      } catch (err: any) {
        console.warn(`[OfflineSync] Error syncing item ${item.id} (${item.type}):`, err);

        // Check if error is network disconnect vs validation error
        const isNetworkError = !err.status || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');

        if (isNetworkError) {
          // Put back to pending and halt queue processing until connectivity returns
          updateSyncItem(item.id, {
            status: 'pending',
            retries: item.retries + 1,
            errorMessage: 'Network connection lost during sync.',
          });
          notifyConnectivityListeners(false);
          break;
        } else {
          // Server rejected operation (e.g. 400/409/422). Keep in queue as 'failed' for user visibility
          failedCount++;
          updateSyncItem(item.id, {
            status: 'failed',
            retries: item.retries + 1,
            errorMessage: err.details?.message || err.message || 'Operation rejected by server validation.',
          });
        }
      }
    }
  } finally {
    isSyncingInProgress = false;
  }

  const remaining = getSyncQueue().length;
  return { processed: processedCount, failed: failedCount, remaining };
}

// ─── Background Sync Registration ──────────────────────────────────────────

export function requestBackgroundSync(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg: any) => {
      if (reg.sync) {
        return reg.sync.register('responso-offline-sync');
      }
    }).catch((err) => {
      console.warn('[OfflineSync] Background sync registration skipped:', err);
    });
  }
}

// Listen for service worker background sync trigger
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_BACKGROUND_SYNC') {
      processSyncQueue();
    }
  });
}
