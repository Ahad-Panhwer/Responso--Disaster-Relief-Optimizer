/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AssistanceRequest, 
  Warehouse, 
  Delivery, 
  AllocationRun, 
  InventoryMovement, 
  UserAccount, 
  AuditLogEvent, 
  UserRole, 
  SupplyType, 
  DeliveryStatus, 
  SUPPLY_METAS 
} from './types';
import { 
  INITIAL_USERS, 
  INITIAL_CAMPS 
} from './data/mockData';
import { 
  runOptimizationAlgorithm, 
  DEFAULT_WEIGHTS, 
  OptimizationWeights 
} from './services/optimizer';
import { 
  loadAppState, 
  saveAppState, 
  resetAppStateToDefaults 
} from './services/storage';
import { 
  getSyncQueue, 
  enqueueSyncItem, 
  processSyncQueue, 
  isDeviceOnline, 
  setSimulatedOffline, 
  getIsSimulatedOffline, 
  subscribeConnectivity, 
  subscribeQueue, 
  subscribeItemSynced,
  clearSyncQueue,
  retrySyncItem,
  dismissSyncItem,
  retryAllFailedItems,
  recheckConnectivityNow
} from './services/offlineSync';
import { SyncQueueModal } from './components/SyncQueueModal';
import * as api from './services/api';
import { SignInView } from './views/SignInView';
import { DashboardView } from './views/DashboardView';
import { RequestsView } from './views/RequestsView';
import { InventoryView } from './views/InventoryView';
import { AllocationReviewView } from './views/AllocationReviewView';
import { DeliveriesView } from './views/DeliveriesView';
import { AdminAuditView } from './views/AdminAuditView';
import { LeafletMap } from './components/LeafletMap';
import { 
  DoodleLogo, 
  DoodleEmptyIllustration 
} from './components/DoodleIcons';
import { 
  Sparkles, 
  LogOut, 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Waves, 
  ChevronDown, 
  Map as MapIcon, 
  LayoutDashboard, 
  Activity, 
  Database, 
  ShieldCheck, 
  Boxes, 
  Truck, 
  FileText, 
  RefreshCw,
  X 
} from 'lucide-react';

type NavView = 'dashboard' | 'requests' | 'inventory' | 'allocations' | 'deliveries' | 'admin' | 'map';

export default function App() {
  // Load persistent state from localStorage (STEP 4)
  const [initialData] = useState(() => loadAppState());

  const [requests, setRequests] = useState<AssistanceRequest[]>(initialData.requests);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialData.warehouses);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialData.movements);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialData.deliveries);
  const [runs, setRuns] = useState<AllocationRun[]>(initialData.runs);
  const [selectedRunId, setSelectedRunId] = useState<string>(
    initialData.selectedRunId || (initialData.runs[0]?.id ?? '')
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>(initialData.auditLogs);
  const [users, setUsers] = useState<UserAccount[]>(initialData.users);

  // User session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('responso_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Navigation state
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [adminTab, setAdminTab] = useState<'users' | 'audit'>('audit');
  const [selectedRequestIdForDetail, setSelectedRequestIdForDetail] = useState<string | null>(null);

  // Dropdown states for grouped top nav (STEP 7 B)
  const [activeDropdown, setActiveDropdown] = useState<'operations' | 'resources' | 'reports' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ id: number; title: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Collapsible Dev tools in footer only (STEP 7 A)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [simulateServerError, setSimulateServerError] = useState(false);
  const [simulatePermissionDenied, setSimulatePermissionDenied] = useState(false);

  // Live Backend & Offline Synchronization State
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => isDeviceOnline());
  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState<boolean>(() => getIsSimulatedOffline());
  const [syncQueue, setSyncQueue] = useState(() => getSyncQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState<boolean>(false);

  // Sync with FastAPI backend & setup offline sync listeners on mount
  useEffect(() => {
    let isMounted = true;

    let previousOnlineState: boolean | null = null;

    async function syncBackend() {
      try {
        const isLive = await api.checkBackendHealth();
        if (!isMounted) return;
        setIsBackendConnected(isLive && !getIsSimulatedOffline());
        setIsOnline(isLive && !getIsSimulatedOffline());

        if (isLive && !getIsSimulatedOffline()) {
          const token = api.getAuthToken();
          if (token) {
            try {
              const liveUser = await api.getCurrentUser();
              if (isMounted) {
                setCurrentUser(liveUser);
                try {
                  localStorage.setItem('responso_current_user', JSON.stringify(liveUser));
                } catch {}
              }
            } catch (err: any) {
              if (err.status === 401) {
                api.setAuthToken(null);
                try {
                  localStorage.removeItem('responso_current_user');
                } catch {}
                if (isMounted) {
                  setCurrentUser(null);
                  setSessionExpired(true);
                }
                return;
              }
            }
          }

          // Drain any queued offline items
          processSyncQueue().catch(() => {});

          const [liveReqs, liveWhs, liveRuns, liveDels, liveAudit, liveUsers] = await Promise.all([
            api.fetchRequests().catch(() => []),
            api.fetchWarehouses().catch(() => []),
            api.fetchAllocationRuns().catch(() => []),
            api.fetchDeliveries().catch(() => []),
            api.fetchAuditLogs().catch(() => []),
            api.fetchUsers().catch(() => []),
          ]);

          if (isMounted) {
            if (liveReqs.length > 0) setRequests(liveReqs);
            if (liveWhs.length > 0) setWarehouses(liveWhs);
            if (liveRuns.length > 0) {
              setRuns(liveRuns);
              setSelectedRunId(liveRuns[0].id);
            }
            if (liveDels.length > 0) setDeliveries(liveDels);
            if (liveAudit.length > 0) setAuditLogs(liveAudit);
            if (liveUsers.length > 0) setUsers(liveUsers);
          }
        }
      } catch (err) {
        console.warn('Backend sync fallback to local storage:', err);
      }
    }

    // Subscribe to session expiration events
    const unsubSessionExpired = api.onSessionExpired(() => {
      if (!isMounted) return;
      setCurrentUser(null);
      setSessionExpired(true);
      try {
        localStorage.removeItem('responso_current_user');
      } catch {}
      setToastMessage({
        id: Date.now(),
        title: 'Your session has expired. Please authenticate to resume.',
        type: 'warning',
      });
    });

    // 1. Subscribe to network connectivity
    const unsubConn = subscribeConnectivity(online => {
      if (!isMounted) return;
      setIsOnline(online);
      setIsBackendConnected(online);

      // Transition from offline to online: automatically drain and refresh
      if (online && previousOnlineState === false) {
        syncBackend();
        setToastMessage({
          id: Date.now(),
          title: 'Network connectivity restored. Operations data synchronized.',
          type: 'success',
        });
      }
      previousOnlineState = online;
    });

    // 2. Subscribe to sync queue changes
    const unsubQueue = subscribeQueue(q => {
      if (!isMounted) return;
      setSyncQueue(q);
    });

    // 3. Subscribe to successfully synced operations
    const unsubItemSynced = subscribeItemSynced((type, clientEntityId, serverResult) => {
      if (!isMounted) return;
      if (type === 'CREATE_REQUEST' && clientEntityId && serverResult) {
        setRequests(prev => prev.map(r => r.id === clientEntityId ? { ...serverResult, _syncStatus: 'synced' } : r));
      } else if (type === 'UPDATE_DELIVERY_STATUS' && serverResult) {
        setDeliveries(prev => prev.map(d => d.id === serverResult.id ? { ...serverResult, _syncStatus: 'synced' } : d));
      }
    });

    syncBackend();

    return () => { 
      isMounted = false; 
      unsubConn();
      unsubQueue();
      unsubItemSynced();
    };
  }, []);

  // Save state whenever data changes (STEP 4)
  useEffect(() => {
    saveAppState({
      requests,
      warehouses,
      movements,
      deliveries,
      runs,
      selectedRunId,
      auditLogs,
      users,
      lastSavedAt: new Date().toISOString(),
    });
  }, [requests, warehouses, movements, deliveries, runs, selectedRunId, auditLogs, users]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showToast = (title: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToastMessage({ id, title, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.id === id ? null : prev));
    }, 4500);
  };

  const currentRun = (selectedRunId ? runs.find(r => r.id === selectedRunId) : null) || runs[0] || null;

  // Add audit log helper
  const addAuditLog = (
    action: string, 
    category: 'ALLOCATION' | 'INVENTORY' | 'REQUEST' | 'DISPATCH' | 'SECURITY',
    details: string,
    entityId?: string
  ) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} PKT`;
    const newLog: AuditLogEvent = {
      id: `AUD-PK-${Date.now().toString().slice(-4)}`,
      timestamp,
      actorName: currentUser?.name || 'Operations Dispatcher',
      actorRole: currentUser?.role || 'LOGISTICS_COORDINATOR',
      action,
      category,
      details,
      entityId,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Run Optimization Algorithm
  const handleRunOptimization = async (customWeights?: OptimizationWeights) => {
    if (isBackendConnected) {
      try {
        const backendRun = await api.createAllocationRun(customWeights);
        setRuns(prev => [backendRun, ...prev.filter(r => r.id !== backendRun.id)]);
        setSelectedRunId(backendRun.id);
        setCurrentView('allocations');
        showToast(`Optimization Run #${backendRun.version} generated & stored in database!`, 'success');
        addAuditLog('RUN_OPTIMIZATION', 'ALLOCATION', `Executed Optimization Run #${backendRun.version} via backend engine`, backendRun.id);
        return;
      } catch (e: any) {
        console.warn('Backend allocation failed, falling back to local heuristic:', e);
      }
    }
    const maxVersion = runs.reduce((max, r) => Math.max(max, r.version), 0);
    const nextVersion = Math.max(maxVersion + 1, runs.length + 1);
    const newRun = runOptimizationAlgorithm(
      requests,
      warehouses,
      customWeights || DEFAULT_WEIGHTS,
      nextVersion
    );
    setRuns(prev => [newRun, ...prev.filter(r => r.id !== newRun.id)]);
    setSelectedRunId(newRun.id);
    setCurrentView('allocations');
    showToast(`Optimization Run #${newRun.version} generated successfully!`, 'success');
    addAuditLog('RUN_OPTIMIZATION', 'ALLOCATION', `Executed Optimization Run #${newRun.version} with ${newRun.recommendations.length} recommended allocations`, newRun.id);
  };

  // STEP 3: Approve Allocation Run Handler
  const handleApproveRun = async (runId: string) => {
    const runToApprove = runs.find(r => r.id === runId);
    if (!runToApprove) return;

    if (runToApprove.status === 'APPROVED') {
      showToast('This allocation run has already been approved.', 'info');
      return;
    }

    if (isBackendConnected) {
      try {
        const approved = await api.approveAllocationRun(runId, 'PDMA Command Approval');
        const [liveWhs, liveDels, liveReqs] = await Promise.all([
          api.fetchWarehouses(),
          api.fetchDeliveries(),
          api.fetchRequests(),
        ]);
        setWarehouses(liveWhs);
        setDeliveries(liveDels);
        setRequests(liveReqs);
        setRuns(prev => prev.map(r => r.id === runId ? approved : (r.status === 'DRAFT' ? { ...r, isStale: true, staleReason: 'Committed depot stockpiles.' } : r)));
        showToast(`Approved Run #${approved.version}! Convoys dispatched and stock updated in database.`, 'success');
        addAuditLog('APPROVE_ALLOCATION_RUN', 'ALLOCATION', `Approved Run #${approved.version}: Deducted inventory and assigned convoys in database.`, runId);
        return;
      } catch (e: any) {
        const msg = e?.details?.message || e.message || 'Approval rejected by database constraints.';
        showToast(`Approval failed: ${msg}`, 'warning');
        return;
      }
    }

    // 1. Re-read current warehouse stock first. If any item is now short, block approval!
    const requiredPerWarehouse: Record<string, Record<SupplyType, number>> = {};
    runToApprove.recommendations.forEach(rec => {
      const whId = rec.selectedWarehouseId;
      if (!requiredPerWarehouse[whId]) {
        requiredPerWarehouse[whId] = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
      }
      (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
        requiredPerWarehouse[whId][sup] += (rec.recommendedSupplies[sup] || 0);
      });
    });

    for (const wh of warehouses) {
      const needed = requiredPerWarehouse[wh.id];
      if (needed) {
        for (const sup of ['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]) {
          const avail = wh.inventory[sup]?.available || 0;
          if (needed[sup] > avail) {
            showToast(
              `Approval blocked: ${wh.name} has only ${avail.toLocaleString()} ${SUPPLY_METAS[sup].unit} available, but this run requires ${needed[sup].toLocaleString()}. Please re-run optimizer.`, 
              'warning'
            );
            return;
          }
        }
      }
    }

    // 2. Deduct approved quantities from warehouse inventory (available goes down, reserved goes up)
    const newMovements: InventoryMovement[] = [];
    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} PKT`;

    const updatedWarehouses = warehouses.map(wh => {
      const needed = requiredPerWarehouse[wh.id];
      if (!needed) return wh;

      const updatedInventory = { ...wh.inventory };
      (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
        const qtyToAllocate = needed[sup] || 0;
        if (qtyToAllocate > 0) {
          const currentAvail = updatedInventory[sup].available;
          const currentRes = updatedInventory[sup].reserved;
          const newAvail = Math.max(0, currentAvail - qtyToAllocate);
          const newRes = currentRes + qtyToAllocate;

          updatedInventory[sup] = {
            ...updatedInventory[sup],
            available: newAvail,
            reserved: newRes,
          };

          newMovements.push({
            id: `MOV-PK-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900)}`,
            timestamp: timestampStr,
            warehouseId: wh.id,
            warehouseName: wh.name,
            supplyType: sup,
            delta: -qtyToAllocate,
            balanceAfter: newAvail,
            reason: `Committed for Optimization Run #${runToApprove.version} dispatches`,
            operator: currentUser?.name || 'Logistics Commissioner',
          });
        }
      });

      return {
        ...wh,
        inventory: updatedInventory,
      };
    });

    setWarehouses(updatedWarehouses);
    setMovements(prev => [...newMovements, ...prev]);

    // 3. Generate deliveries with status ASSIGNED and fictional Pakistani driver names (STEP 3 & 5)
    const pakistaniDrivers = [
      { name: 'Imran Qureshi', phone: '+92 (300) 882-9901' },
      { name: 'Zainab Baloch', phone: '+92 (301) 992-3412' },
      { name: 'Ghulam Mustafa Soomro', phone: '+92 (302) 774-5511' },
      { name: 'Sajjad Ali Chandio', phone: '+92 (303) 551-9922' },
      { name: 'Ustad Rasheed Ahmed', phone: '+92 (300) 441-2301' },
      { name: 'Muhammad Aslam Khan', phone: '+92 (302) 881-2399' },
    ];

    const newDeliveries: Delivery[] = runToApprove.recommendations.map((rec, idx) => {
      const driver = pakistaniDrivers[idx % pakistaniDrivers.length];
      
      // Calculate cargo mass strictly using SUPPLY_METAS weightKgPerUnit for all supply types
      let totalCargoKg = 0;
      (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
        totalCargoKg += (rec.recommendedSupplies[sup] || 0) * SUPPLY_METAS[sup].weightKgPerUnit;
      });

      return {
        id: `DEL-PK-${Date.now().toString().slice(-3)}${idx}`,
        allocationRunId: runToApprove.id,
        requestId: rec.requestId,
        destinationCommunity: rec.communityName,
        destinationDistrict: rec.district,
        warehouseId: rec.selectedWarehouseId,
        warehouseName: rec.selectedWarehouseName,
        vehicleCode: `CONVOY-${rec.selectedWarehouseId.replace('WH-', '')}-${idx + 1}`,
        driverName: driver.name,
        driverPhone: driver.phone,
        suppliesManifest: rec.recommendedSupplies,
        deliveredSupplies: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
        totalWeightKg: Math.round(totalCargoKg),
        status: 'ASSIGNED',
        distanceKm: rec.distanceKm,
        etaMinutes: rec.estimatedTransitMinutes,
        timeline: [
          { 
            timestamp: new Date().toLocaleTimeString().slice(0, 5) + ' PKT', 
            event: `Optimization Run #${runToApprove.version} approved by PDMA Command`, 
            status: 'ASSIGNED' 
          }
        ]
      };
    });

    setDeliveries(prev => [...newDeliveries, ...prev]);

    // 4. Update requests to ALLOCATED or PARTIALLY_ALLOCATED
    setRequests(prev => prev.map(req => {
      const rec = runToApprove.recommendations.find(re => re.requestId === req.id);
      if (!rec) return req;
      return {
        ...req,
        allocatedSupplies: { ...rec.recommendedSupplies },
        status: rec.fulfillmentPercentage === 100 ? 'ALLOCATED' : 'PARTIALLY_ALLOCATED',
      };
    }));

    // 5. Update run status to APPROVED, mark ALL OTHER draft runs as stale (STEP 3)
    setRuns(prev => prev.map(r => {
      if (r.id === runId) {
        return {
          ...r,
          status: 'APPROVED',
          isStale: false,
          reviewedBy: currentUser?.name,
          reviewedAt: new Date().toLocaleTimeString() + ' PKT',
        };
      }
      if (r.status === 'DRAFT') {
        return {
          ...r,
          isStale: true,
          staleReason: `Run #${runToApprove.version} was approved and committed depot stockpiles.`,
        };
      }
      return r;
    }));

    showToast(`Approved Run #${runToApprove.version}! ${newDeliveries.length} relief convoys assigned and inventory deducted.`, 'success');
    addAuditLog('APPROVE_ALLOCATION_RUN', 'ALLOCATION', `Approved Run #${runToApprove.version}: Deducted inventory and assigned ${newDeliveries.length} transport convoys.`, runToApprove.id);
  };

  // STEP 3: Reject Allocation Run Handler (toast shows run.version)
  const handleRejectRun = (runId: string, reason: string) => {
    if (isBackendConnected) {
      api.rejectAllocationRun(runId, reason).catch(e => console.warn(e));
    }
    const run = runs.find(r => r.id === runId);
    const versionNum = run ? run.version : runId;
    setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'REJECTED', reviewNotes: reason } : r));
    showToast(`Run #${versionNum} rejected. Reason recorded in audit log.`, 'warning');
    addAuditLog('REJECT_ALLOCATION', 'ALLOCATION', `Rejected run #${versionNum}: "${reason}"`, runId);
  };

  // STEP 3: Advance Delivery Status in strict order ASSIGNED → DISPATCHED → IN_TRANSIT → DELIVERED or FAILED
  const handleAdvanceDelivery = (deliveryId: string, nextStatus: DeliveryStatus, note?: string, failureReason?: string) => {
    const targetDelivery = deliveries.find(d => d.id === deliveryId);
    if (!targetDelivery) return;

    // Check authorization: Logistics Coordinator, Field Dispatcher, System Admin
    const isAuthorized = ['LOGISTICS_COORDINATOR', 'FIELD_DISPATCHER', 'SYSTEM_ADMIN'].includes(currentUser?.role || '');
    if (!isAuthorized) {
      showToast(`Access Denied: Delivery updates require Logistics Coordinator, Dispatcher, or Admin role.`, 'warning');
      return;
    }

    // Validate sequential transitions
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      'ASSIGNED': ['DISPATCHED'],
      'DISPATCHED': ['IN_TRANSIT'],
      'IN_TRANSIT': ['DELIVERED', 'FAILED'],
      'DELIVERED': [],
      'FAILED': [],
    };

    const allowed = validTransitions[targetDelivery.status] || [];
    if (!allowed.includes(nextStatus)) {
      showToast(
        `Invalid transition: Cannot move from ${targetDelivery.status} to ${nextStatus}. Allowed: ${allowed.join(', ') || 'terminal state'}.`, 
        'warning'
      );
      return;
    }

    const nowStr = new Date().toLocaleTimeString().slice(0, 5) + ' PKT';

    setDeliveries(prev => prev.map(del => {
      if (del.id !== deliveryId) return del;
      const newTimeline = [
        ...del.timeline,
        {
          timestamp: nowStr,
          event: nextStatus === 'DISPATCHED' ? 'Departed origin warehouse logistics staging bay' :
                 nextStatus === 'IN_TRANSIT' ? 'En-route across flood inundated corridor' :
                 nextStatus === 'DELIVERED' ? 'Relief cargo received and verified on-site by shelter incharge' :
                 `Convoy blocked / delivery failed: ${failureReason || note || 'Route impassable'}`,
          status: nextStatus,
          note: failureReason || note,
        }
      ];

      return {
        ...del,
        status: nextStatus,
        failureReason: nextStatus === 'FAILED' ? (failureReason || note || 'Delivery failed en route') : del.failureReason,
        timeline: newTimeline,
        dispatchedAt: nextStatus === 'DISPATCHED' ? nowStr : del.dispatchedAt,
        deliveredAt: nextStatus === 'DELIVERED' ? nowStr : del.deliveredAt,
        deliveredSupplies: nextStatus === 'DELIVERED' ? { ...del.suppliesManifest } : del.deliveredSupplies,
      };
    }));

    // If marked DELIVERED: deduct on-hand stock and clear warehouse reserved stock for that warehouse only
    if (nextStatus === 'DELIVERED') {
      const deliveredManifest = targetDelivery.suppliesManifest;

      // Update warehouse: reserved stock is now delivered
      setWarehouses(prev => prev.map(wh => {
        if (wh.id !== targetDelivery.warehouseId) return wh;
        const updatedInv = { ...wh.inventory };
        (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
          const qty = deliveredManifest[sup] || 0;
          updatedInv[sup] = {
            ...updatedInv[sup],
            reserved: Math.max(0, updatedInv[sup].reserved - qty),
            total: Math.max(0, updatedInv[sup].total - qty),
          };
        });
        return { ...wh, inventory: updatedInv };
      }));

      // Update destination assistance request: FULFILLED if all items allocated >= requested, else DISPATCHED/PARTIALLY_ALLOCATED
      setRequests(prev => prev.map(req => {
        if (req.id !== targetDelivery.requestId) return req;
        const allFulfilled = (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).every(sup => {
          return (req.allocatedSupplies[sup] || 0) >= (req.requiredSupplies[sup] || 0);
        });
        return {
          ...req,
          status: allFulfilled ? 'FULFILLED' : 'PARTIALLY_ALLOCATED',
        };
      }));
    } else if (nextStatus === 'FAILED') {
      // Failed delivery: release reservations back to available stock at target warehouse
      const manifest = targetDelivery.suppliesManifest;
      setWarehouses(prev => prev.map(wh => {
        if (wh.id !== targetDelivery.warehouseId) return wh;
        const updatedInv = { ...wh.inventory };
        (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
          const qty = manifest[sup] || 0;
          updatedInv[sup] = {
            ...updatedInv[sup],
            reserved: Math.max(0, updatedInv[sup].reserved - qty),
            available: updatedInv[sup].available + qty,
          };
        });
        return { ...wh, inventory: updatedInv };
      }));

      // Restore demand on destination request
      setRequests(prev => prev.map(req => {
        if (req.id !== targetDelivery.requestId) return req;
        const updatedAlloc = { ...req.allocatedSupplies };
        let hasAnyAlloc = false;
        (['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).forEach(sup => {
          const qty = manifest[sup] || 0;
          updatedAlloc[sup] = Math.max(0, (updatedAlloc[sup] || 0) - qty);
          if (updatedAlloc[sup] > 0) hasAnyAlloc = true;
        });
        return {
          ...req,
          allocatedSupplies: updatedAlloc,
          status: hasAnyAlloc ? 'PARTIALLY_ALLOCATED' : 'PENDING',
        };
      }));
    }

    // Backend sync or offline queueing with idempotency
    const isEffectiveOnline = isOnline && isBackendConnected && !getIsSimulatedOffline();
    if (isEffectiveOnline) {
      api.updateDeliveryStatus(deliveryId, nextStatus, note || '', failureReason || '').catch(err => {
        console.warn('Backend updateDeliveryStatus failed, queueing offline:', err);
        enqueueSyncItem('UPDATE_DELIVERY_STATUS', { deliveryId, status: nextStatus, note: note || '', failureReason: failureReason || '' }, deliveryId);
        setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, _syncStatus: 'pending' } : d));
      });
    } else {
      enqueueSyncItem('UPDATE_DELIVERY_STATUS', { deliveryId, status: nextStatus, note: note || '', failureReason: failureReason || '' }, deliveryId);
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, _syncStatus: 'pending' } : d));
    }

    showToast(`Delivery ${deliveryId} updated to ${nextStatus}${!isEffectiveOnline ? ' (Queued offline)' : ''}`, 'success');
    addAuditLog('ADVANCE_DELIVERY', 'DISPATCH', `Updated ${deliveryId} status to ${nextStatus} (${note || failureReason || 'Convoy transit update'})`, deliveryId);
  };

  // Create Request Handler
  const handleCreateRequest = async (newReq: AssistanceRequest) => {
    const isEffectiveOnline = isOnline && isBackendConnected && !getIsSimulatedOffline();
    const payload = {
      communityName: newReq.communityName,
      district: newReq.district,
      tehsil: newReq.tehsil,
      unionCouncil: newReq.unionCouncil,
      zone: newReq.zone,
      contactPerson: newReq.contactPerson,
      contactPhone: newReq.contactPhone,
      lat: newReq.coordinates.lat,
      lng: newReq.coordinates.lng,
      urgency: newReq.urgency,
      affectedPopulation: newReq.affectedPopulation,
      affectedHouseholds: newReq.affectedHouseholds,
      vulnerableCount: newReq.vulnerableCount,
      accessStatus: newReq.accessStatus,
      floodDepthMeters: newReq.floodDepthMeters,
      requiredSupplies: newReq.requiredSupplies,
      description: newReq.notes,
    };

    if (isEffectiveOnline) {
      try {
        const created = await api.createRequest(payload);
        setRequests(prev => [{ ...created, _syncStatus: 'synced' }, ...prev.filter(r => r.id !== created.id && r.id !== newReq.id)]);
        setRuns(prev => prev.map(r => ({ ...r, isStale: true, staleReason: `New request registered for ${newReq.communityName}` })));
        showToast(`Registered & synchronized request for ${newReq.communityName}!`, 'success');
        addAuditLog('CREATE_REQUEST', 'REQUEST', `Registered assistance request for ${newReq.communityName} (${created.id})`, created.id);
        return;
      } catch (err) {
        console.warn('Backend createRequest failed, queueing offline:', err);
      }
    }

    // Offline / Fallback path
    const offlineReq: AssistanceRequest = {
      ...newReq,
      id: newReq.id.startsWith('REQ-') ? newReq.id : `REQ-OFFLINE-${Date.now().toString().slice(-4)}`,
      _syncStatus: 'pending',
      _offlineCreated: true,
    };

    enqueueSyncItem('CREATE_REQUEST', payload, offlineReq.id);
    setRequests(prev => [offlineReq, ...prev]);
    setRuns(prev => prev.map(r => ({ ...r, isStale: true, staleReason: `New request registered for ${offlineReq.communityName}` })));
    showToast(`Request saved locally for ${offlineReq.communityName}! (Queued for sync)`, 'info');
    addAuditLog('CREATE_REQUEST_OFFLINE', 'REQUEST', `Registered offline request for ${offlineReq.communityName} (${offlineReq.id})`, offlineReq.id);
  };

  // STEP 3: Stock Adjustment Handler (Blocks negative inventory)
  const handleStockAdjustment = (adj: {
    warehouseId: string;
    supplyType: SupplyType;
    delta: number;
    reason: string;
    operator: string;
  }) => {
    const targetWh = warehouses.find(w => w.id === adj.warehouseId);
    if (!targetWh) return;

    const currentAvail = targetWh.inventory[adj.supplyType]?.available || 0;
    if (currentAvail + adj.delta < 0) {
      showToast(
        `Stock adjustment blocked: ${targetWh.name} has only ${currentAvail} available. Inventory cannot be negative.`, 
        'warning'
      );
      return;
    }

    let newBal = 0;
    setWarehouses(prev => prev.map(wh => {
      if (wh.id !== adj.warehouseId) return wh;
      const current = wh.inventory[adj.supplyType];
      const updatedAvail = current.available + adj.delta;
      newBal = updatedAvail;
      return {
        ...wh,
        inventory: {
          ...wh.inventory,
          [adj.supplyType]: {
            ...current,
            available: updatedAvail,
            total: current.total + adj.delta,
          }
        }
      };
    }));

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} PKT`;
    const newMovement: InventoryMovement = {
      id: `MOV-PK-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      warehouseId: adj.warehouseId,
      warehouseName: targetWh.name,
      supplyType: adj.supplyType,
      delta: adj.delta,
      balanceAfter: newBal,
      reason: adj.reason,
      operator: adj.operator,
      _syncStatus: 'pending',
    };
    setMovements(prev => [newMovement, ...prev]);

    // Backend sync or offline queueing
    const isEffectiveOnline = isOnline && isBackendConnected && !getIsSimulatedOffline();
    if (isEffectiveOnline) {
      api.createStockMovement(adj.warehouseId, adj.supplyType, adj.delta, adj.reason).catch(err => {
        console.warn('Backend stock movement failed, queueing offline:', err);
        enqueueSyncItem('RECORD_STOCK_MOVEMENT', {
          warehouseId: adj.warehouseId,
          itemType: adj.supplyType,
          quantityDelta: adj.delta,
          reason: adj.reason,
        });
      });
    } else {
      enqueueSyncItem('RECORD_STOCK_MOVEMENT', {
        warehouseId: adj.warehouseId,
        itemType: adj.supplyType,
        quantityDelta: adj.delta,
        reason: adj.reason,
      });
    }

    setRuns(prev => prev.map(r => ({ ...r, isStale: true, staleReason: `Depot stock adjusted at ${targetWh.code}` })));
    showToast(`Adjusted ${SUPPLY_METAS[adj.supplyType].label}: ${adj.delta > 0 ? `+${adj.delta}` : adj.delta} units`, 'info');
    addAuditLog('STOCK_ADJUSTMENT', 'INVENTORY', `Adjusted ${targetWh.code}: ${adj.delta > 0 ? `+${adj.delta}` : adj.delta} ${adj.supplyType} (${adj.reason})`, adj.warehouseId);
  };

  // Offline Sync Controls
  const handleManualSync = async () => {
    if (getIsSimulatedOffline()) {
      showToast('Cannot sync: Simulated Offline Mode is active. Toggle it off in footer Dev Tools first.', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await processSyncQueue();
      if (res.processed > 0) {
        showToast(`Synchronized ${res.processed} queued operation(s) with central server!`, 'success');
        // Refresh live data
        const [liveReqs, liveWhs, liveDels] = await Promise.all([
          api.fetchRequests().catch(() => []),
          api.fetchWarehouses().catch(() => []),
          api.fetchDeliveries().catch(() => []),
        ]);
        if (liveReqs.length > 0) setRequests(liveReqs);
        if (liveWhs.length > 0) setWarehouses(liveWhs);
        if (liveDels.length > 0) setDeliveries(liveDels);
      } else if (res.failed > 0) {
        showToast(`Sync warning: ${res.failed} operation(s) rejected by server validation.`, 'warning');
      } else {
        showToast('All operations are already up to date with the server.', 'info');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSimulateOffline = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOfflineState(next);
    setSimulatedOffline(next);
    if (!next) {
      showToast('Offline Simulation disabled. Reconnecting to central server...', 'info');
      setTimeout(() => handleManualSync(), 600);
    } else {
      showToast('Offline Simulation enabled. Operations will now be stored in local offline queue.', 'warning');
    }
  };

  // Reset Demo Data (STEP 4)
  const handleResetDemoData = async () => {
    if (isBackendConnected) {
      try {
        await api.resetDemoDatabase();
        const [liveReqs, liveWhs, liveRuns, liveDels, liveAudit, liveUsers] = await Promise.all([
          api.fetchRequests(),
          api.fetchWarehouses(),
          api.fetchAllocationRuns(),
          api.fetchDeliveries(),
          api.fetchAuditLogs(),
          api.fetchUsers(),
        ]);
        setRequests(liveReqs);
        setWarehouses(liveWhs);
        setDeliveries(liveDels);
        setRuns(liveRuns);
        if (liveRuns.length > 0) setSelectedRunId(liveRuns[0].id);
        setAuditLogs(liveAudit);
        setUsers(liveUsers);
        showToast('Reset complete: Database and client restored to initial Sindh scenario.', 'success');
        return;
      } catch (e: any) {
        console.warn('Backend reset fallback:', e);
      }
    }
    const fresh = resetAppStateToDefaults();
    setRequests(fresh.requests);
    setWarehouses(fresh.warehouses);
    setMovements(fresh.movements);
    setDeliveries(fresh.deliveries);
    setRuns(fresh.runs);
    setSelectedRunId(fresh.selectedRunId);
    setAuditLogs(fresh.auditLogs);
    setUsers(fresh.users);
    showToast('Reset complete: Baseline Sindh disaster dataset restored.', 'success');
  };

  // STEP 5: Quick Flood Surge Simulator with real Sindh location
  const handleSimulateFloodSurge = () => {
    const timestampStr = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const surgeId = `REQ-PK-SURGE-${timestampStr}`;
    const surgeIndex = requests.filter(r => r.id.includes('SURGE')).length + 1;

    const surgeReq: AssistanceRequest = {
      id: surgeId,
      communityName: `Johi Tehsil Flood Inundation Settlement ${surgeIndex > 1 ? `(#${surgeIndex})` : ''}`.trim(),
      district: 'Dadu',
      tehsil: 'Johi',
      unionCouncil: 'UC Chhandan',
      zone: 'District Dadu · Western Kirthar Flash Flood Basin',
      contactPerson: 'Mukhtiarkar Ghulam Mustafa Soomro',
      contactPhone: `+92 (300) 774-${randomSuffix}`,
      coordinates: { x: 34, y: 46, lat: 26.6912, lng: 67.6144 },
      affectedPopulation: 2150,
      affectedHouseholds: 360,
      vulnerableCount: 620,
      urgency: 'CRITICAL',
      floodDepthMeters: 2.2,
      accessStatus: 'BOAT_ONLY',
      requiredSupplies: {
        water: 6500,
        food: 3800,
        medical: 150,
        shelter: 110,
        hygiene: 750,
      },
      allocatedSupplies: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
      status: 'PENDING',
      createdAt: '2026-10-13 ' + new Date().toLocaleTimeString().slice(0, 5) + ' PKT',
      notes: 'EMERGENCY SURGE: Flash runoff from Kirthar range breached Johi western ring bund. Immediate high-clearance convoy required.',
    };

    const updatedRequests = [surgeReq, ...requests.filter(r => r.id !== surgeReq.id)];
    setRequests(updatedRequests);

    const maxVersion = runs.reduce((max, r) => Math.max(max, r.version), 0);
    const nextVersion = Math.max(maxVersion + 1, runs.length + 1);

    const updatedRun = runOptimizationAlgorithm(updatedRequests, warehouses, DEFAULT_WEIGHTS, nextVersion);
    setRuns(prev => [updatedRun, ...prev.filter(r => r.id !== updatedRun.id)]);
    setSelectedRunId(updatedRun.id);
    setCurrentView('allocations');
    showToast('🚨 Flood Surge Simulated in Johi! Optimizer re-calculated priorities instantly.', 'warning');
    addAuditLog('FLOOD_SURGE_EVENT', 'REQUEST', `Flash runoff detected in Johi (Dadu); registered surge settlement (2,150 pop) and recomputed allocations.`, surgeReq.id);
  };

  // User management
  const handleToggleUserStatus = async (userId: string) => {
    if (currentUser?.role !== 'SYSTEM_ADMIN') {
      showToast('Admin privilege required to alter user status.', 'warning');
      return;
    }
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextActive = !target.active;
    if (isBackendConnected) {
      try {
        await api.updateUser(userId, { is_active: nextActive });
      } catch (err: any) {
        showToast(err.message || 'Failed to update user status on server.', 'warning');
        return;
      }
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: nextActive } : u));
    showToast(`User account status updated: ${nextActive ? 'Active' : 'Suspended'}`, 'info');
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (currentUser?.role !== 'SYSTEM_ADMIN') {
      showToast('Admin privilege required to change roles.', 'warning');
      return;
    }
    if (isBackendConnected) {
      try {
        await api.updateUser(userId, { role: newRole });
      } catch (err: any) {
        showToast(err.message || 'Failed to update user role on server.', 'warning');
        return;
      }
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast(`Updated role to ${newRole.replace('_', ' ')}`, 'info');
  };

  const handleSignOut = async () => {
    try {
      await api.logoutUser();
    } catch {}
    api.setAuthToken(null);
    try {
      localStorage.removeItem('responso_current_user');
    } catch {}
    setCurrentUser(null);
    setSessionExpired(false);
    showToast('Signed out of ReliefRoute operations console.', 'info');
  };

  if (!currentUser) {
    return (
      <SignInView 
        onSignIn={user => {
          setCurrentUser(user);
          setSessionExpired(false);
          try {
            localStorage.setItem('responso_current_user', JSON.stringify(user));
          } catch {}
        }} 
        sessionExpired={sessionExpired} 
      />
    );
  }

  // Active status counts for small badge dots
  const inTransitCount = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
  const isRunStale = currentRun?.isStale;

  // Determine active group for navigation
  const isOperationsActive = ['requests', 'allocations', 'deliveries'].includes(currentView);
  const isResourcesActive = ['inventory', 'map'].includes(currentView);
  const isReportsActive = currentView === 'admin';

  return (
    <div className="min-h-screen doodle-paper flex flex-col text-stone-900 selection:bg-amber-200">
      {/* Top Navigation Bar: Zone 1 (Wordmark), Zone 2 (Grouped Navigation - max 4 items), Zone 3 (Profile & Contextual Action) */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b-2 border-stone-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Zone 1: Wordmark */}
          <div 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 cursor-pointer shrink-0 select-none"
          >
            <div className="p-1 rounded bg-amber-300 border-2 border-stone-800 shadow-[2px_2px_0px_#1e232a]">
              <DoodleLogo className="w-6 h-6 text-stone-900" />
            </div>
            <div>
              <span className="font-doodle text-xl font-bold tracking-tight text-stone-900 block leading-none">
                RESPONSO
              </span>
              <span className="text-[10px] text-stone-600 font-semibold block leading-tight">
                Disaster Relief Optimizer
              </span>
            </div>
          </div>

          {/* Zone 2: Grouped Top Navigation (STEP 7 B: max 4 items, dropdowns on click) */}
          <nav ref={dropdownRef} className="hidden md:flex items-center gap-6 text-xs font-semibold">
            {/* 1. Overview */}
            <button
              type="button"
              onClick={() => {
                setCurrentView('dashboard');
                setActiveDropdown(null);
              }}
              className={`py-1.5 px-2 rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'text-stone-900 font-bold bg-amber-100 border border-stone-800 shadow-[1px_1px_0px_#1e232a]'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              Overview
            </button>

            {/* 2. Operations Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'operations' ? null : 'operations')}
                className={`py-1.5 px-2 rounded-md flex items-center gap-1.5 transition-colors ${
                  isOperationsActive
                    ? 'text-stone-900 font-bold bg-amber-100 border border-stone-800 shadow-[1px_1px_0px_#1e232a]'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <span>Operations</span>
                <ChevronDown className="w-3 h-3 text-stone-600" />
                {(isRunStale || inTransitCount > 0) && (
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" title="Action pending in operations" />
                )}
              </button>

              {activeDropdown === 'operations' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border-2 border-stone-800 rounded-lg shadow-[3px_3px_0px_#1e232a] py-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('requests');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50 ${currentView === 'requests' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-stone-600" />
                      <span>Requests Registry</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('allocations');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50 ${currentView === 'allocations' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Resource Optimizer</span>
                    </div>
                    {isRunStale && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-100 text-red-800 border border-red-300 rounded">
                        Stale
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('deliveries');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50 ${currentView === 'deliveries' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Convoy Tracking</span>
                    </div>
                    {inTransitCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded">
                        {inTransitCount} transit
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Resources Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
                className={`py-1.5 px-2 rounded-md flex items-center gap-1.5 transition-colors ${
                  isResourcesActive
                    ? 'text-stone-900 font-bold bg-amber-100 border border-stone-800 shadow-[1px_1px_0px_#1e232a]'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <span>Resources</span>
                <ChevronDown className="w-3 h-3 text-stone-600" />
              </button>

              {activeDropdown === 'resources' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border-2 border-stone-800 rounded-lg shadow-[3px_3px_0px_#1e232a] py-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('inventory');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-50 ${currentView === 'inventory' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <Boxes className="w-3.5 h-3.5 text-stone-600" />
                    <span>Depot Stockpile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('map');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-50 ${currentView === 'map' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <MapIcon className="w-3.5 h-3.5 text-stone-600" />
                    <span>Warehouses & Relief Map</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Reports Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'reports' ? null : 'reports')}
                className={`py-1.5 px-2 rounded-md flex items-center gap-1.5 transition-colors ${
                  isReportsActive
                    ? 'text-stone-900 font-bold bg-amber-100 border border-stone-800 shadow-[1px_1px_0px_#1e232a]'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <span>Reports</span>
                <ChevronDown className="w-3 h-3 text-stone-600" />
              </button>

              {activeDropdown === 'reports' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border-2 border-stone-800 rounded-lg shadow-[3px_3px_0px_#1e232a] py-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminTab('audit');
                      setCurrentView('admin');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-50 ${currentView === 'admin' && adminTab === 'audit' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                    <span>Audit Log & Security</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminTab('users');
                      setCurrentView('admin');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-50 ${currentView === 'admin' && adminTab === 'users' ? 'font-bold bg-amber-50 text-stone-900' : 'text-stone-700'}`}
                  >
                    <Activity className="w-3.5 h-3.5 text-stone-600" />
                    <span>Team Roles & Permissions</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Operator Profile Badge, Backend Status & Sign out */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Backend & Offline Sync Indicator */}
            {isSyncing ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-400 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                <span>Syncing ({syncQueue.length})...</span>
              </div>
            ) : (!isOnline || isSimulatedOffline) ? (
              <button
                type="button"
                onClick={() => setIsQueueModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400 shadow-xs cursor-pointer transition-colors"
                title="Working offline — Click to inspect and manage queued operations"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Offline {syncQueue.length > 0 ? `(${syncQueue.length} queued)` : ''}</span>
              </button>
            ) : syncQueue.some(i => i.status === 'failed') ? (
              <button
                type="button"
                onClick={() => setIsQueueModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-400 shadow-xs cursor-pointer"
                title="Sync Error — Click to inspect"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Sync Error ({syncQueue.filter(i => i.status === 'failed').length}) · Inspect</span>
              </button>
            ) : (
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-400 transition-colors"
                title="FastAPI REST Backend Connected (Port 8000) — All Changes Synced"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online (Synced)</span>
              </div>
            )}



            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded hover:bg-stone-100 transition-colors"
              title="Sign Out / Switch Operator"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {(!isOnline || isSimulatedOffline) && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> All assistance requests, convoy dispatches, and inventory adjustments are stored locally and will automatically synchronize when connectivity returns.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const live = await recheckConnectivityNow();
                if (live) {
                  setToastMessage({
                    id: Date.now(),
                    title: 'Connection verified! Operations data synchronized.',
                    type: 'success',
                  });
                } else {
                  setToastMessage({
                    id: Date.now(),
                    title: 'Checking network link... Reconnecting to server.',
                    type: 'warning',
                  });
                }
              }}
              className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-800 rounded font-bold text-[11px] text-stone-900 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Test Wi-Fi / backend connection immediately"
            >
              <RefreshCw className="w-3 h-3 text-amber-600" />
              <span>Verify Connection</span>
            </button>
            {syncQueue.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(true)}
                  className="font-mono-nums font-bold bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded border border-amber-400 text-amber-900 text-[11px] transition-colors cursor-pointer"
                  title="Click to inspect queued operations"
                >
                  {syncQueue.length} pending operation{syncQueue.length > 1 ? 's' : ''} (inspect)
                </button>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-14 md:bottom-4 right-4 z-50">
          <div className="doodle-card px-4 py-3 bg-white flex items-center gap-2.5 shadow-[4px_4px_0px_#1e232a]">
            {toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span className="text-xs font-bold text-stone-900">{toastMessage.title}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-stone-400 hover:text-stone-800 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Edge-case simulated states */}
        {simulateLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-stone-200 border-2 border-stone-300 rounded-lg"></div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-28 bg-stone-200 rounded-lg"></div>
              <div className="h-28 bg-stone-200 rounded-lg"></div>
              <div className="h-28 bg-stone-200 rounded-lg"></div>
              <div className="h-28 bg-stone-200 rounded-lg"></div>
            </div>
            <div className="h-96 bg-stone-200 rounded-lg"></div>
            <div className="text-center py-4">
              <span className="font-doodle text-stone-600 font-bold">Simulating Dispatch Telemetry Loading...</span>
            </div>
          </div>
        ) : simulateServerError ? (
          <div className="doodle-card p-10 bg-white text-center max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-stone-800 text-red-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-doodle text-2xl font-bold text-stone-900">
              500 · Operations Server Error
            </h3>
            <p className="text-xs text-stone-600 mt-2">
              The disaster coordination service was unable to reach the upstream optimization cluster.
            </p>
            <button
              type="button"
              onClick={() => setSimulateServerError(false)}
              className="mt-4 px-4 py-2 bg-stone-900 text-white font-bold rounded doodle-button text-xs"
            >
              Retry Connection
            </button>
          </div>
        ) : simulatePermissionDenied ? (
          <div className="doodle-card p-10 bg-white text-center max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-stone-800 text-purple-700 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 text-purple-700" />
            </div>
            <h3 className="font-doodle text-2xl font-bold text-stone-900">
              403 · Access Restricted by Security Policy
            </h3>
            <p className="text-xs text-stone-600 mt-2">
              Your operational role (<strong className="font-mono-nums">{currentUser.role}</strong>) does not have authorization to perform fleet-wide dispatch authorizations.
            </p>
            <button
              type="button"
              onClick={() => setSimulatePermissionDenied(false)}
              className="mt-4 px-4 py-2 bg-stone-900 text-white font-bold rounded doodle-button text-xs"
            >
              Return to Authorized Workspace
            </button>
          </div>
        ) : simulateEmpty ? (
          <div className="doodle-card p-12 bg-white text-center">
            <DoodleEmptyIllustration
              message="No disaster events or active requests recorded"
              subMessage="All affected shelters are fulfilled or no crisis currently active in this operational sector."
            />
            <button
              type="button"
              onClick={() => setSimulateEmpty(false)}
              className="mt-3 px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded doodle-button"
            >
              Restore Simulated Flood Data
            </button>
          </div>
        ) : (
          (() => {
            switch (currentView) {
              case 'dashboard':
                return (
                  <DashboardView
                    requests={requests}
                    warehouses={warehouses}
                    deliveries={deliveries}
                    latestRun={currentRun}
                    auditLogs={auditLogs}
                    onRunAllocation={() => handleRunOptimization()}
                    onNavigate={view => setCurrentView(view)}
                    onRequestSelect={req => {
                      setSelectedRequestIdForDetail(req.id);
                      setCurrentView('requests');
                    }}
                  />
                );

              case 'requests':
                return (
                  <RequestsView
                    requests={requests}
                    onCreateRequest={handleCreateRequest}
                    onUpdateRequest={updated => {
                      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
                      showToast(`Updated ${updated.communityName}`, 'info');
                    }}
                    selectedRequestId={selectedRequestIdForDetail}
                  />
                );

              case 'inventory':
                return (
                  <InventoryView
                    warehouses={warehouses}
                    movements={movements}
                    onStockAdjustment={handleStockAdjustment}
                  />
                );

              case 'allocations':
                return (
                  <AllocationReviewView
                    currentRun={currentRun}
                    warehouses={warehouses}
                    requests={requests}
                    onRecalculateRun={handleRunOptimization}
                    onApproveRun={handleApproveRun}
                    onRejectRun={handleRejectRun}
                    allRuns={runs}
                    onSelectRunVersion={r => setSelectedRunId(r.id)}
                  />
                );

              case 'deliveries':
                return (
                  <DeliveriesView
                    deliveries={deliveries}
                    onAdvanceStatus={handleAdvanceDelivery}
                    currentUser={currentUser}
                  />
                );

              case 'map':
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-stone-800 pb-3">
                      <div>
                        <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
                          Geographic Operations & Relief Map
                        </h2>
                        <p className="text-xs text-stone-600">
                          Full-screen Leaflet & OpenStreetMap GIS interface showing regional staging bases, displaced camps, and convoy routes.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunOptimization()}
                          className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold text-xs doodle-button flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run Optimizer</span>
                        </button>
                      </div>
                    </div>
                    <LeafletMap
                      requests={requests}
                      warehouses={warehouses}
                      deliveries={deliveries}
                      camps={INITIAL_CAMPS}
                      onRequestSelect={req => {
                        setSelectedRequestIdForDetail(req.id);
                        setCurrentView('requests');
                      }}
                      onWarehouseSelect={() => setCurrentView('inventory')}
                      heightClass="h-[620px]"
                    />
                  </div>
                );

              case 'admin':
                return (
                  <AdminAuditView
                    users={users}
                    auditLogs={auditLogs}
                    onToggleUserStatus={handleToggleUserStatus}
                    onUpdateUserRole={handleUpdateUserRole}
                    onResetDemoData={handleResetDemoData}
                    initialTab={adminTab}
                    currentUser={currentUser}
                  />
                );

              default:
                return null;
            }
          })()
        )}
      </main>

      {/* Footer with Dev Tools Collapsible Panel and Simulation Label */}
      <footer className="border-t-2 border-stone-800 bg-[#FAF7F2] py-4 px-6 text-xs text-stone-600 mt-12 pb-20 md:pb-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-doodle font-bold text-stone-900 text-sm">RESPONSO</span>
            <span>· CL-03 Disaster Relief Resource Optimizer</span>
            <span className="text-[10px] font-bold bg-amber-200 border border-stone-800 px-1.5 py-0.5 rounded text-stone-800 ml-1">
              Simulated demonstration data
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-500 font-mono-nums">
              13 Oct 2026 · PKT · kg / litres / km / PKR
            </span>

            {/* Dev Tools Trigger (STEP 7 A) */}
            <button
              type="button"
              onClick={() => setIsDevToolsOpen(!isDevToolsOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-400 text-[11px] font-bold text-stone-700"
              title="Dev tools & operational state simulation"
            >
              <Bug className="w-3.5 h-3.5 text-amber-700" />
              <span>Dev tools</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isDevToolsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Dev Tools Drawer (STEP 7 A) */}
        {isDevToolsOpen && (
          <div className="max-w-7xl mx-auto mt-3 p-3 bg-white border-2 border-stone-800 rounded-lg shadow-[3px_3px_0px_#1e232a] text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-amber-700" />
                Operational Edge-Case Simulator:
              </span>
              <button
                type="button"
                onClick={() => setIsDevToolsOpen(false)}
                className="text-stone-400 hover:text-stone-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSimulateLoading(!simulateLoading)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  simulateLoading ? 'bg-amber-400 font-bold border-stone-800' : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {simulateLoading ? 'Loading: ON' : 'Toggle Skeleton Loading'}
              </button>

              <button
                type="button"
                onClick={() => setSimulateEmpty(!simulateEmpty)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  simulateEmpty ? 'bg-amber-400 font-bold border-stone-800' : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {simulateEmpty ? 'Empty State: ON' : 'Toggle Empty State'}
              </button>

              <button
                type="button"
                onClick={() => setSimulateServerError(!simulateServerError)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  simulateServerError ? 'bg-red-500 text-white font-bold border-red-800' : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {simulateServerError ? '500 Server Error: ON' : 'Simulate 500 Error'}
              </button>

              <button
                type="button"
                onClick={() => setSimulatePermissionDenied(!simulatePermissionDenied)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  simulatePermissionDenied ? 'bg-purple-600 text-white font-bold border-purple-800' : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {simulatePermissionDenied ? '403 Denied: ON' : 'Simulate 403 Forbidden'}
              </button>

              <button
                type="button"
                onClick={handleToggleSimulateOffline}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  isSimulatedOffline ? 'bg-amber-600 text-white font-bold border-amber-800' : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
                title="Toggle offline network mode to test local queue and offline-first workflows"
              >
                {isSimulatedOffline ? '📶 Offline Mode: ACTIVE' : '📶 Simulate Offline Network'}
              </button>

              {syncQueue.length > 0 && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold border border-stone-800 disabled:opacity-50"
                  title="Flush pending offline operations to backend"
                >
                  ⚡ Flush Sync Queue ({syncQueue.length})
                </button>
              )}

              <button
                type="button"
                onClick={handleSimulateFloodSurge}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded border border-stone-800 flex items-center gap-1 ml-auto"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Simulate Flood Surge in Johi</span>
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* Mobile Bottom Dock (Updated with Lucide icons according to STEP 7 B) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-stone-800 px-2 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.06)] text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded ${currentView === 'dashboard' ? 'text-stone-900 font-extrabold' : 'text-stone-500'}`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('requests')}
          className={`flex flex-col items-center py-1 px-2 rounded ${currentView === 'requests' ? 'text-stone-900 font-extrabold' : 'text-stone-500'}`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Requests</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('allocations')}
          className={`flex flex-col items-center py-1 px-2.5 rounded bg-amber-100 border border-stone-800 ${currentView === 'allocations' ? 'text-stone-950 font-extrabold' : 'text-stone-800'}`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>Optimizer</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('inventory')}
          className={`flex flex-col items-center py-1 px-2 rounded ${currentView === 'inventory' ? 'text-stone-900 font-extrabold' : 'text-stone-500'}`}
        >
          <Boxes className="w-4 h-4 mb-0.5" />
          <span>Depot</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('map')}
          className={`flex flex-col items-center py-1 px-2 rounded ${currentView === 'map' ? 'text-stone-900 font-extrabold' : 'text-stone-500'}`}
        >
          <MapIcon className="w-4 h-4 mb-0.5" />
          <span>Map</span>
        </button>
      </nav>

      {/* Offline Sync Queue Inspector Modal */}
      <SyncQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={syncQueue}
        isOnline={isOnline && !isSimulatedOffline}
        isSyncing={isSyncing}
        onSyncNow={handleManualSync}
        onClearQueue={() => {
          clearSyncQueue();
          setSyncQueue([]);
          showToast('Sync queue cleared.', 'info');
        }}
        onRetryItem={id => retrySyncItem(id)}
        onDismissItem={id => dismissSyncItem(id)}
        onRetryAllFailed={() => retryAllFailedItems()}
      />
    </div>
  );
}
