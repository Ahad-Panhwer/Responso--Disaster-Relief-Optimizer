import { 
  AssistanceRequest, 
  Warehouse, 
  SupplyType, 
  AllocationRun, 
  RecommendationItem,
  AllocationFactorBreakdown,
  SUPPLY_METAS 
} from '../types';

export interface OptimizationWeights {
  urgencyWeight: number;     // e.g. 0.35
  populationWeight: number;  // e.g. 0.30
  waitingTimeWeight: number; // e.g. 0.20
  distanceWeight: number;    // e.g. 0.15
}

export const DEFAULT_WEIGHTS: OptimizationWeights = {
  urgencyWeight: 0.35,
  populationWeight: 0.30,
  waitingTimeWeight: 0.20,
  distanceWeight: 0.15,
};

/**
 * Calculates straight-line distance in kilometers between two geographic coordinates
 * using the Haversine formula on a spherical Earth (R = 6371 km).
 */
export function calculateStraightLineDistanceKm(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  if (!coord1 || !coord2) return 1.0;
  if (isNaN(coord1.lat) || isNaN(coord1.lng) || isNaN(coord2.lat) || isNaN(coord2.lng)) return 1.0;

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
  const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);
  const lat1Rad = coord1.lat * (Math.PI / 180);
  const lat2Rad = coord2.lat * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const distance = R * c;

  // Round to 1 decimal place, minimum 0.5 km
  return Math.max(0.5, Math.round(distance * 10) / 10);
}

export { calculateStraightLineDistanceKm as calculateDistanceKm };

/**
 * Computes hours elapsed since request creation timestamp.
 */
export function calculateWaitingHours(createdAtStr: string): number {
  try {
    // Parse timestamp (supports "YYYY-MM-DD HH:MM" or ISO)
    const cleaned = createdAtStr.replace(' PKT', '').replace(' UTC', '');
    const createdDate = new Date(cleaned);
    if (isNaN(createdDate.getTime())) {
      return 6.0; // fallback reasonable waiting time
    }
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.max(0.5, Math.min(168, Math.round(hours * 10) / 10)); // cap at 7 days
  } catch {
    return 6.0;
  }
}

/**
 * Computes priority score based on transparent criteria:
 * priority score = urgency + people affected + waiting time + distance
 */
export function computeRequestScores(
  req: AssistanceRequest,
  closestDistKm: number,
  weights: OptimizationWeights
): { factors: AllocationFactorBreakdown; waitingHours: number } {
  // 1. Urgency score (0 - 100)
  let urgencyScore = 25;
  if (req.urgency === 'CRITICAL') urgencyScore = 100;
  else if (req.urgency === 'HIGH') urgencyScore = 75;
  else if (req.urgency === 'MODERATE') urgencyScore = 50;
  else urgencyScore = 25;

  // Bonus for road cut-off or boat access
  if (req.accessStatus === 'CUT_OFF_ROAD' || req.accessStatus === 'BOAT_ONLY') {
    urgencyScore = Math.min(100, urgencyScore + 10);
  }

  // 2. People affected score (0 - 100)
  const safePopulation = Math.max(0, req.affectedPopulation || 0);
  const populationScore = Math.min(100, Math.round((safePopulation / 2500) * 100));

  // 3. Waiting time score (0 - 100): longer wait increases priority
  const waitingHours = calculateWaitingHours(req.createdAt);
  const waitingTimeScore = Math.min(100, Math.round(waitingHours * 5)); // 20 hours = 100 score

  // 4. Distance score (0 - 100): closer warehouse = higher logistics efficiency
  const safeDistKm = Math.max(0, closestDistKm || 1);
  const distanceScore = Math.max(5, Math.min(100, Math.round(100 - (safeDistKm * 0.45))));

  // Sum of weights with division-by-zero protection
  const totalWeight = (weights.urgencyWeight || 0) + 
                      (weights.populationWeight || 0) + 
                      (weights.waitingTimeWeight || 0) + 
                      (weights.distanceWeight || 0);
  const safeTotalWeight = totalWeight > 0 ? totalWeight : 1.0;

  const compositeScore = Math.round(
    ((urgencyScore * (weights.urgencyWeight || 0)) +
     (populationScore * (weights.populationWeight || 0)) +
     (waitingTimeScore * (weights.waitingTimeWeight || 0)) +
     (distanceScore * (weights.distanceWeight || 0))) / safeTotalWeight
  );

  return {
    factors: {
      urgencyScore,
      populationScore,
      waitingTimeScore,
      distanceScore,
      compositeScore,
    },
    waitingHours,
  };
}

/**
 * Runs multi-criteria disaster resource optimization algorithm.
 * Guarantees:
 * - Recommendations use current requests and available stock;
 * - Stock is never allocated twice or negative;
 * - Shortages show clear messages;
 * - Division-by-zero protected.
 */
export function runOptimizationAlgorithm(
  requests: AssistanceRequest[],
  warehouses: Warehouse[],
  weights: OptimizationWeights = DEFAULT_WEIGHTS,
  runVersion: number = 1
): AllocationRun {
  const suppliesList: SupplyType[] = ['water', 'food', 'medical', 'shelter', 'hygiene'];

  // Track warehouse state including inventory, weight capacity, and delivery trucks
  interface WarehouseSnapshot {
    stock: Record<SupplyType, number>;
    allocatedWeightKg: number;
    capacityKg: number;
    availableTrucks: number;
    assignedRequestIds: Set<string>;
  }

  const whStates: Record<string, WarehouseSnapshot> = {};
  warehouses.forEach(wh => {
    whStates[wh.id] = {
      stock: {
        water: Math.max(0, wh.inventory.water?.available || 0),
        food: Math.max(0, wh.inventory.food?.available || 0),
        medical: Math.max(0, wh.inventory.medical?.available || 0),
        shelter: Math.max(0, wh.inventory.shelter?.available || 0),
        hygiene: Math.max(0, wh.inventory.hygiene?.available || 0),
      },
      allocatedWeightKg: 0,
      capacityKg: (wh.capacityKg && wh.capacityKg > 0) ? wh.capacityKg : 50000,
      availableTrucks: (wh.availableDeliveryTrucks && wh.availableDeliveryTrucks > 0) ? wh.availableDeliveryTrucks : 5,
      assignedRequestIds: new Set<string>(),
    };
  });

  // Calculate scores and nearest warehouse for each pending/unfulfilled request
  const eligibleRequests = requests.filter(req => req.status !== 'FULFILLED');

  const scoredRequests = eligibleRequests.map(req => {
    let nearestWh = warehouses[0] || null;
    let minDistance = 999999;

    warehouses.forEach(wh => {
      const dist = calculateStraightLineDistanceKm(
        { lat: req.coordinates.lat, lng: req.coordinates.lng },
        { lat: wh.coordinates.lat, lng: wh.coordinates.lng }
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestWh = wh;
      }
    });

    const { factors, waitingHours } = computeRequestScores(req, minDistance, weights);
    return {
      request: req,
      nearestWh: nearestWh || warehouses[0],
      distanceKm: minDistance < 999999 ? minDistance : 10,
      factors,
      waitingHours,
    };
  });

  // Sort descending by priority score
  scoredRequests.sort((a, b) => b.factors.compositeScore - a.factors.compositeScore);

  const recommendations: RecommendationItem[] = [];

  const totals = {
    demand: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
    allocated: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
    unmet: { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 },
    totalWeightKg: 0,
    trucksRequired: 0,
    totalCostPkr: 0,
  };

  // Assign supplies sequentially to top-priority requests first
  scoredRequests.forEach((item, index) => {
    const req = item.request;
    const preferredWh = item.nearestWh;

    const recommended: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
    const unmet: Record<SupplyType, number> = { water: 0, food: 0, medical: 0, shelter: 0, hygiene: 0 };
    const shortages: string[] = [];
    const constraintNotes: string[] = [];

    let totalDemandedUnits = 0;
    let totalAllocatedUnits = 0;
    let requestWeightKg = 0;
    let requestCostPkr = 0;

    suppliesList.forEach(sup => {
      const requestedAmt = Math.max(0, req.requiredSupplies[sup] || 0);
      const alreadyAllocated = Math.max(0, req.allocatedSupplies[sup] || 0);
      const remainingNeed = Math.max(0, requestedAmt - alreadyAllocated);

      totals.demand[sup] += requestedAmt;
      totalDemandedUnits += requestedAmt;

      let alloc = 0;
      let stillNeeded = remainingNeed;

      // Ordered candidates: preferred warehouse first, then remaining warehouses
      const candidateWarehouses = [
        preferredWh,
        ...warehouses.filter(w => w.id !== preferredWh.id)
      ];

      for (const wh of candidateWarehouses) {
        if (stillNeeded <= 0) break;
        const state = whStates[wh.id];
        if (!state) continue;

        // Check truck fleet limit: request requires 1 truck from this warehouse
        const hasTruck = state.assignedRequestIds.has(req.id) || state.assignedRequestIds.size < state.availableTrucks;
        if (!hasTruck) {
          if (!constraintNotes.includes(`Truck fleet limit reached at ${wh.name}`)) {
            constraintNotes.push(`Truck fleet limit reached at ${wh.name} (${state.availableTrucks} trucks committed)`);
          }
          continue;
        }

        const availInWh = state.stock[sup] || 0;
        if (availInWh <= 0) continue;

        // Check weight capacity limit of warehouse
        const remainingKg = Math.max(0, state.capacityKg - state.allocatedWeightKg);
        const unitWeight = SUPPLY_METAS[sup].weightKgPerUnit;
        const maxByWeight = unitWeight > 0 ? Math.floor(remainingKg / unitWeight) : stillNeeded;

        if (maxByWeight <= 0 && remainingKg < unitWeight) {
          if (!constraintNotes.includes(`Weight capacity full at ${wh.name}`)) {
            constraintNotes.push(`Weight capacity full at ${wh.name} (${state.capacityKg}kg limit)`);
          }
          continue;
        }

        const take = Math.min(availInWh, stillNeeded, maxByWeight);
        if (take > 0) {
          alloc += take;
          state.stock[sup] -= take;
          state.allocatedWeightKg += take * unitWeight;
          state.assignedRequestIds.add(req.id);
          stillNeeded -= take;
        }
      }

      // Stock is never negative
      alloc = Math.max(0, alloc);
      recommended[sup] = alloc;
      const shortfall = Math.max(0, requestedAmt - alloc);
      unmet[sup] = shortfall;

      if (shortfall > 0) {
        shortages.push(`${shortfall.toLocaleString()} ${SUPPLY_METAS[sup].unit} of ${SUPPLY_METAS[sup].label}`);
      }

      totals.allocated[sup] += alloc;
      totals.unmet[sup] += shortfall;
      totalAllocatedUnits += alloc;

      const meta = SUPPLY_METAS[sup];
      requestWeightKg += alloc * meta.weightKgPerUnit;
      requestCostPkr += alloc * meta.estimatedCostPkrPerUnit;
    });

    // Guard against division by zero
    const fulfillmentPercentage = totalDemandedUnits > 0
      ? Math.round((totalAllocatedUnits / totalDemandedUnits) * 100)
      : 100;

    // Plain-words transparent rationale
    const urgencyName = req.urgency;
    const popFormatted = req.affectedPopulation?.toLocaleString() || '0';
    const waitFormatted = `${item.waitingHours}h`;
    const distFormatted = `${item.distanceKm} km`;
    
    let plainReason = `Rank #${index + 1} (Score ${item.factors.compositeScore}/100): Prioritized due to ${urgencyName} severity, ${popFormatted} affected people waiting for ${waitFormatted}. Dispatched from ${preferredWh.name} (${distFormatted} estimated straight-line distance).`;

    if (fulfillmentPercentage === 100) {
      plainReason += ` Fully fulfilled (100% demand covered).`;
    } else {
      plainReason += ` Partially fulfilled (${fulfillmentPercentage}%) due to regional stock or depot capacity constraints.`;
    }

    if (constraintNotes.length > 0) {
      plainReason += ` Note: ${constraintNotes.join('; ')}.`;
    }

    const shortageMessage = shortages.length > 0
      ? `Stock shortage: Insufficient regional stock for ${shortages.join(', ')}.`
      : undefined;

    const estimatedTransitMinutes = Math.max(
      15, 
      Math.round((item.distanceKm * 1.8) + (req.accessStatus === 'BOAT_ONLY' ? 45 : req.accessStatus === 'CUT_OFF_ROAD' ? 30 : 0))
    );
    const estimatedTransitCostPkr = Math.round(item.distanceKm * 180 + requestWeightKg * 4.5);

    recommendations.push({
      requestId: req.id,
      communityName: req.communityName,
      district: req.district,
      urgency: req.urgency,
      affectedPopulation: req.affectedPopulation,
      affectedHouseholds: req.affectedHouseholds,
      waitingHours: item.waitingHours,
      distanceKm: item.distanceKm,
      selectedWarehouseId: preferredWh.id,
      selectedWarehouseName: preferredWh.name,
      factors: item.factors,
      requestedSupplies: req.requiredSupplies,
      recommendedSupplies: recommended,
      unmetSupplies: unmet,
      fulfillmentPercentage,
      shortageMessage,
      assignedTruckId: `TRUCK-${preferredWh.code}-${index + 1}`,
      estimatedTransitMinutes,
      estimatedTransitCostPkr,
      algorithmicReasoning: plainReason,
    });

    totals.totalWeightKg += requestWeightKg;
    totals.totalCostPkr += requestCostPkr;
  });

  totals.trucksRequired = Math.max(1, Math.ceil(totals.totalWeightKg / 4500));

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} PKT`;
  const generatedId = `ALLOC-RUN-V${runVersion}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  return {
    id: generatedId,
    version: runVersion,
    timestamp,
    status: 'DRAFT',
    isStale: false,
    weights,
    recommendations,
    totals,
  };
}
