import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapBackendUser,
  setAuthToken,
  getAuthToken,
  logoutUser,
} from '../src/services/api';
import {
  enqueueSyncItem,
  getSyncQueue,
  saveSyncQueue,
  retrySyncItem,
  dismissSyncItem,
  retryAllFailedItems,
} from '../src/services/offlineSync';
import { runOptimizationAlgorithm } from '../src/services/optimizer';
import { Warehouse, AssistanceRequest } from '../src/types';

test('Frontend Auth: mapBackendUser maps backend API user to frontend user format', () => {
  const rawBackendUser = {
    id: 'USR-TEST-01',
    email: 'tariq.mansoor@responso.pk',
    display_name: 'Relief Operations Director',
    role: 'LOGISTICS_COORDINATOR',
    role_title: 'Provincial Relief Commissioner (PDMA Sindh)',
    department: 'Disaster Emergency Coordination Directorate',
    is_active: true,
  };

  const user = mapBackendUser(rawBackendUser);
  assert.equal(user.id, 'USR-TEST-01');
  assert.equal(user.email, 'tariq.mansoor@responso.pk');
  assert.equal(user.name, 'Relief Operations Director');
  assert.equal(user.role, 'LOGISTICS_COORDINATOR');
  assert.equal(user.roleTitle, 'Provincial Relief Commissioner (PDMA Sindh)');
  assert.equal(user.department, 'Disaster Emergency Coordination Directorate');
  assert.equal(user.avatarInitials, 'RO');
  assert.equal(user.active, true);
});

test('Frontend Auth: session token lifecycle and logoutUser clears session', async () => {
  setAuthToken('test-jwt-token-xyz');
  assert.equal(getAuthToken(), 'test-jwt-token-xyz');
  assert.equal(localStorage.getItem('responso_jwt_token'), 'test-jwt-token-xyz');

  await logoutUser();
  assert.equal(getAuthToken(), null);
  assert.equal(localStorage.getItem('responso_jwt_token'), null);
});

test('Offline Sync: enqueueSyncItem generates unique idempotency keys and initializes pending state', () => {
  localStorage.clear();

  const item1 = enqueueSyncItem('CREATE_REQUEST', { description: 'First req' }, 'client-req-1');
  assert.ok(item1.id.startsWith('SYNC-'));
  assert.ok(item1.idempotencyKey.startsWith('IDEMP-'));
  assert.equal(item1.status, 'pending');
  assert.equal(item1.retries, 0);

  const item2 = enqueueSyncItem('UPDATE_DELIVERY_STATUS', { status: 'DELIVERED' }, 'del-1');
  assert.notEqual(item1.idempotencyKey, item2.idempotencyKey);

  const queue = getSyncQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].id, item1.id);
  assert.equal(queue[1].id, item2.id);
});

test('Offline Sync: retry, dismiss, and bulk retry error recovery', () => {
  localStorage.clear();

  const item1 = enqueueSyncItem('CREATE_REQUEST', { test: 1 });
  const item2 = enqueueSyncItem('CREATE_REQUEST', { test: 2 });

  // Simulate sync failures
  const q = getSyncQueue();
  q[0].status = 'failed';
  q[0].retries = 3;
  q[0].errorMessage = 'Connection refused by gateway';

  q[1].status = 'failed';
  q[1].retries = 2;
  q[1].errorMessage = 'HTTP 500 Internal Server Error';
  saveSyncQueue(q);

  // Test single retry
  retrySyncItem(item1.id);
  const qAfterRetry = getSyncQueue();
  assert.equal(qAfterRetry[0].status, 'pending');
  assert.equal(qAfterRetry[0].errorMessage, undefined);

  // Test dismiss
  dismissSyncItem(item1.id);
  const qAfterDismiss = getSyncQueue();
  assert.equal(qAfterDismiss.length, 1);
  assert.equal(qAfterDismiss[0].id, item2.id);

  // Test retryAllFailedItems
  retryAllFailedItems();
  const qAfterAllRetry = getSyncQueue();
  assert.equal(qAfterAllRetry[0].status, 'pending');
  assert.equal(qAfterAllRetry[0].errorMessage, undefined);
});

test('Optimizer: enforces warehouse weight capacity and truck limits', () => {
  const warehouses: Warehouse[] = [
    {
      id: 'WH-SMALL',
      name: 'Small Transit Depot',
      code: 'DEPOT-S',
      district: 'Sehwan',
      locationName: 'Sehwan Bypass',
      coordinates: { x: 50, y: 50, lat: 26.4, lng: 67.8 },
      capacityKg: 500, // only 500 kg capacity!
      availableDeliveryTrucks: 1, // only 1 truck available!
      contactPerson: 'Ali',
      contactPhone: '03001234567',
      inventory: {
        water: { available: 1000, reserved: 0, total: 1000 },
        food: { available: 0, reserved: 0, total: 0 },
        medical: { available: 0, reserved: 0, total: 0 },
        shelter: { available: 0, reserved: 0, total: 0 },
        hygiene: { available: 0, reserved: 0, total: 0 },
      },
    },
  ];

  const requests: AssistanceRequest[] = [
    {
      id: 'REQ-1',
      communityName: 'Village One',
      district: 'Dadu',
      tehsil: 'Dadu',
      zone: 'Zone A',
      contactPerson: 'Leader 1',
      contactPhone: '03001111111',
      urgency: 'CRITICAL',
      affectedPopulation: 2000,
      affectedHouseholds: 80,
      vulnerableCount: 30,
      accessStatus: 'ACCESSIBLE',
      floodDepthMeters: 0.5,
      requiredSupplies: { water: 20, food: 0, medical: 0, shelter: 0, hygiene: 0 },
      allocatedSupplies: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
      status: 'PENDING',
      coordinates: { x: 52, y: 52, lat: 26.42, lng: 67.82 },
      createdAt: '2026-10-14 00:00',
      notes: '',
    },
    {
      id: 'REQ-2',
      communityName: 'Village Two',
      district: 'Dadu',
      tehsil: 'Dadu',
      zone: 'Zone B',
      contactPerson: 'Leader 2',
      contactPhone: '03002222222',
      urgency: 'HIGH',
      affectedPopulation: 1000,
      affectedHouseholds: 60,
      vulnerableCount: 20,
      accessStatus: 'ACCESSIBLE',
      floodDepthMeters: 0.5,
      requiredSupplies: { water: 20, food: 0, medical: 0, shelter: 0, hygiene: 0 },
      allocatedSupplies: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
      status: 'PENDING',
      coordinates: { x: 55, y: 55, lat: 26.45, lng: 67.85 },
      createdAt: '2026-10-14 01:00',
      notes: '',
    },
  ];

  const result = runOptimizationAlgorithm(requests, warehouses);
  // Warehouse only has 1 truck. It should allocate to REQ-1 (higher priority).
  // REQ-2 cannot be served by WH-SMALL because WH-SMALL already committed its 1 truck!
  assert.ok(result.recommendations.length >= 1);
  const req1Items = result.recommendations.filter(r => r.requestId === 'REQ-1' && r.recommendedSupplies.water > 0);
  const req2Items = result.recommendations.filter(r => r.requestId === 'REQ-2' && r.recommendedSupplies.water > 0);

  assert.equal(req1Items.length, 1);
  assert.equal(req2Items.length, 0); // Excluded by truck constraint!
});
