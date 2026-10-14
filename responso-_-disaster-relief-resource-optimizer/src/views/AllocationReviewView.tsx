import React, { useState } from 'react';
import { 
  AllocationRun, 
  Warehouse, 
  AssistanceRequest, 
  SupplyType, 
  SUPPLY_METAS 
} from '../types';
import { OptimizationWeights } from '../services/optimizer';
import { 
  DoodleBox, 
  DoodleWater, 
  DoodleTruck, 
  DoodleCheck, 
  DoodleEmptyIllustration 
} from '../components/DoodleIcons';
import { 
  Sparkles, 
  AlertTriangle, 
  Sliders, 
  CheckCircle, 
  XCircle, 
  Layers, 
  Info, 
  RefreshCw, 
  ChevronRight, 
  Scale, 
  Truck 
} from 'lucide-react';

interface AllocationReviewViewProps {
  currentRun: AllocationRun | null;
  warehouses: Warehouse[];
  requests: AssistanceRequest[];
  onRecalculateRun: (weights?: OptimizationWeights) => void;
  onApproveRun: (runId: string) => void;
  onRejectRun: (runId: string, reason: string) => void;
  allRuns: AllocationRun[];
  onSelectRunVersion: (run: AllocationRun) => void;
}

export const AllocationReviewView: React.FC<AllocationReviewViewProps> = ({
  currentRun,
  warehouses,
  requests,
  onRecalculateRun,
  onApproveRun,
  onRejectRun,
  allRuns,
  onSelectRunVersion,
}) => {
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [urgencyWeight, setUrgencyWeight] = useState(currentRun?.weights.urgencyWeight ?? 0.35);
  const [populationWeight, setPopulationWeight] = useState(currentRun?.weights.populationWeight ?? 0.30);
  const [waitingTimeWeight, setWaitingTimeWeight] = useState(currentRun?.weights.waitingTimeWeight ?? 0.20);
  const [distanceWeight, setDistanceWeight] = useState(currentRun?.weights.distanceWeight ?? 0.15);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Insufficient regional truck convoy capacity for Zone 1 access.');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!currentRun) {
    return (
      <div className="doodle-card p-10 bg-white text-center">
        <DoodleEmptyIllustration
          message="No Optimization Run Generated Yet"
          subMessage="Trigger the allocation algorithm to compute optimal relief supply distribution based on stock, urgency, and distance."
        />
        <button
          type="button"
          onClick={() => onRecalculateRun()}
          className="mt-4 px-5 py-2.5 bg-amber-400 text-stone-900 font-bold rounded doodle-button text-xs inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-stone-900" />
          <span>Generate Initial Allocation Run</span>
        </button>
      </div>
    );
  }

  const handleApplyWeights = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onRecalculateRun({
        urgencyWeight,
        populationWeight,
        waitingTimeWeight,
        distanceWeight,
      });
      setIsProcessing(false);
    }, 200);
  };

  const handleResetDefaultWeights = () => {
    setUrgencyWeight(0.35);
    setPopulationWeight(0.30);
    setWaitingTimeWeight(0.20);
    setDistanceWeight(0.15);
  };

  const handleConfirmApproval = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onApproveRun(currentRun.id);
      setIsProcessing(false);
    }, 300);
  };

  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      onRejectRun(currentRun.id, rejectReason.trim());
      setIsProcessing(false);
      setIsRejectModalOpen(false);
    }, 250);
  };

  const availableTrucksTotal = warehouses.reduce((acc, w) => acc + w.availableDeliveryTrucks, 0);

  return (
    <div className="space-y-6">
      {/* Header and Version History */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
              Allocation Optimization Review
            </h2>
            <span className="font-mono-nums text-xs font-bold bg-amber-100 border border-stone-800 px-2 py-0.5 rounded text-amber-900">
              Run #{currentRun.version}
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Generated {currentRun.timestamp} · Multi-criteria decision matching stock to demand.
          </p>
        </div>

        {/* Version Switcher if multiple runs exist */}
        {allRuns.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-stone-500 font-semibold">Switch Run:</span>
            <div className="flex gap-1">
              {allRuns.map((run, idx) => (
                <button
                  key={`${run.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectRunVersion(run)}
                  className={`px-2 py-1 rounded text-xs font-mono-nums font-bold border ${
                    run.id === currentRun.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  #{run.version}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STALE RUN WARNING BANNER (Critical requirement from UX spec) */}
      {currentRun.isStale && (
        <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-lg doodle-card-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-amber-950">
                ⚠️ Stale Optimization Run Warning
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Warehouse inventory levels or assistance requests were registered/modified after this run was calculated ({currentRun.timestamp}).
                Re-running the optimization is strongly recommended prior to approval.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRecalculateRun()}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-xs doodle-button whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Run Optimizer Now</span>
          </button>
        </div>
      )}

      {/* Transparent Algorithm Formula & Weight Tuning Card */}
      <div className="doodle-card p-4 bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-stone-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-stone-800" />
            <div>
              <h3 className="font-doodle text-lg font-bold text-stone-900 leading-snug">
                Transparent Prioritization Criteria & Weights
              </h3>
              <span className="text-[11px] text-stone-500">
                Formula: Score = (Urgency × {Math.round(currentRun.weights.urgencyWeight * 100)}%) + (Population × {Math.round(currentRun.weights.populationWeight * 100)}%) + (Waiting Time × {Math.round(currentRun.weights.waitingTimeWeight * 100)}%) + (Proximity × {Math.round(currentRun.weights.distanceWeight * 100)}%)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWeightTuner(!showWeightTuner)}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-800 rounded font-semibold text-xs text-stone-800 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showWeightTuner ? 'Hide Weight Tuning' : 'Tune Weights & Re-evaluate'}</span>
          </button>
        </div>

        {/* Interactive Weight Slider Knobs */}
        {showWeightTuner && (
          <div className="mt-4 p-4 bg-[#FAF7F2] border border-stone-300 rounded-lg space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800">
                Demonstrate Dynamic Recommendations (Adjust Weight Multipliers):
              </span>
              <button
                type="button"
                onClick={handleResetDefaultWeights}
                className="text-[11px] text-stone-500 underline hover:text-stone-800"
              >
                Reset to Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Urgency Weight:</span>
                  <span className="font-mono-nums">{Math.round(urgencyWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.70"
                  step="0.05"
                  value={urgencyWeight}
                  onChange={e => setUrgencyWeight(Number(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-[10px] text-stone-500">Favors flood depth & cut-off access</span>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Population Weight:</span>
                  <span className="font-mono-nums">{Math.round(populationWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={populationWeight}
                  onChange={e => setPopulationWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-[10px] text-stone-500">Favors large evacuation numbers</span>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Waiting Time Weight:</span>
                  <span className="font-mono-nums">{Math.round(waitingTimeWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={waitingTimeWeight}
                  onChange={e => setWaitingTimeWeight(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <span className="text-[10px] text-stone-500">Favors requests waiting longest</span>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Proximity Weight:</span>
                  <span className="font-mono-nums">{Math.round(distanceWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={distanceWeight}
                  onChange={e => setDistanceWeight(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <span className="text-[10px] text-stone-500">Minimizes transit distance</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={handleApplyWeights}
                disabled={isProcessing}
                className="px-4 py-2 bg-stone-900 text-white font-bold rounded doodle-button flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isProcessing ? 'Optimizing...' : 'Recalculate Allocation Recommendations'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Capacity & Fleet Utilization Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="doodle-card-sm p-3 bg-white">
          <span className="text-[10px] font-bold text-stone-500 uppercase">Allocated Cargo Mass</span>
          <div className="font-mono-nums text-lg font-bold text-stone-900 mt-0.5">
            {Math.round(currentRun.totals.totalWeightKg / 1000)} metric tons
          </div>
        </div>

        <div className="doodle-card-sm p-3 bg-white">
          <span className="text-[10px] font-bold text-stone-500 uppercase">Required Trucks</span>
          <div className="font-mono-nums text-lg font-bold text-stone-900 mt-0.5">
            {currentRun.totals.trucksRequired} / {availableTrucksTotal} <span className="text-xs text-stone-500">available</span>
          </div>
        </div>

        <div className="doodle-card-sm p-3 bg-white">
          <span className="text-[10px] font-bold text-stone-500 uppercase">Water Fulfillment</span>
          <div className="font-mono-nums text-lg font-bold text-emerald-800 mt-0.5">
            {currentRun.totals.allocated.water.toLocaleString()}L / {currentRun.totals.demand.water.toLocaleString()}L
          </div>
        </div>

        <div className="doodle-card-sm p-3 bg-white">
          <span className="text-[10px] font-bold text-stone-500 uppercase">Approval Status</span>
          <div className="text-sm font-bold mt-0.5">
            <span className={`px-2 py-0.5 rounded text-xs ${
              currentRun.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900' :
              currentRun.status === 'REJECTED' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'
            }`}>
              {currentRun.status}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Recommendations Matrix Table */}
      <div className="doodle-card overflow-hidden bg-white">
        <div className="p-3 bg-[#FAF7F2] border-b-2 border-stone-800 flex items-center justify-between">
          <h3 className="font-doodle text-lg font-bold text-stone-900">
            Recommended Allocations by Ranked Priority ({currentRun.recommendations.length} Communities)
          </h3>
          <span className="text-xs text-stone-500 font-mono-nums">
            Sorted descending by composite priority score
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 border-b border-stone-300 text-stone-700 font-bold">
              <tr>
                <th className="p-3">Rank & Community</th>
                <th className="p-3">Score Factors</th>
                <th className="p-3">Source Depot & Transit</th>
                <th className="p-3">Supplies Allocated vs Demanded</th>
                <th className="p-3">Fulfillment</th>
                <th className="p-3">Algorithmic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {currentRun.recommendations.map((rec, idx) => {
                return (
                  <tr key={`${rec.requestId}-${idx}`} className="hover:bg-amber-50/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-mono-nums font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{rec.communityName}</div>
                          <div className="text-[10px] text-stone-500 font-mono-nums">
                            {rec.affectedPopulation.toLocaleString()} pop · {rec.urgency}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono-nums">
                      <div className="font-bold text-sm text-stone-900">
                        {rec.factors.compositeScore}<span className="text-stone-400 text-xs">/100</span>
                      </div>
                      <div className="text-[10px] text-stone-500 space-x-1">
                        <span>Urg:{rec.factors.urgencyScore}</span>
                        <span>· Pop:{rec.factors.populationScore}</span>
                        <span>· Wait:{rec.factors.waitingTimeScore}</span>
                        <span>· Dist:{rec.factors.distanceScore}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-stone-800 text-xs">{rec.selectedWarehouseName}</div>
                      <div className="text-[10px] text-stone-500 font-mono-nums">
                        {rec.distanceKm} km · ~{rec.estimatedTransitMinutes} mins ETA
                      </div>
                    </td>

                    <td className="p-3 font-mono-nums text-xs">
                      <div className="text-stone-900">
                        💧 Water: <strong className="text-emerald-800">{rec.recommendedSupplies.water.toLocaleString()}</strong> / {rec.requestedSupplies.water.toLocaleString()}L
                      </div>
                      <div className="text-stone-700">
                        🍞 Meals: <strong className="text-emerald-800">{rec.recommendedSupplies.food.toLocaleString()}</strong> / {rec.requestedSupplies.food.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        🩹 Med: {rec.recommendedSupplies.medical} · ⛺ Tents: {rec.recommendedSupplies.shelter}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <span className="font-mono-nums font-bold text-xs text-stone-900">
                          {rec.fulfillmentPercentage}%
                        </span>
                        <div className="w-20 h-2 bg-stone-100 border border-stone-300 rounded overflow-hidden">
                          <div 
                            className={`h-full ${
                              rec.fulfillmentPercentage === 100 ? 'bg-emerald-500' :
                              rec.fulfillmentPercentage >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${rec.fulfillmentPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-[11px] text-stone-600 max-w-sm">
                      <p className="line-clamp-2">{rec.algorithmicReasoning}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval / Rejection Action Footer */}
      <div className="doodle-card p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-bold text-xs text-stone-800 block">
            Coordinator Review Action:
          </span>
          <span className="text-[11px] text-stone-500">
            Approving this run will lock inventory reservations and create live delivery convoys.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={currentRun.status === 'REJECTED' || isProcessing}
            onClick={() => setIsRejectModalOpen(true)}
            className="px-4 py-2 border-2 border-stone-800 rounded font-bold text-xs text-stone-800 hover:bg-stone-100 doodle-button"
          >
            Reject / Request Revision
          </button>

          <button
            type="button"
            disabled={currentRun.status === 'APPROVED' || isProcessing}
            onClick={handleConfirmApproval}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs doodle-button flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-100" />
            <span>{currentRun.status === 'APPROVED' ? 'Already approved' : 'Approve & Dispatch Deliveries'}</span>
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-md p-5 relative">
            <h3 className="font-doodle text-xl font-bold text-stone-900 mb-2">
              Reject Allocation Run #{currentRun.version}
            </h3>
            <p className="text-xs text-stone-600 mb-4">
              Please document the operational reason for audit logs before recalculating with adjusted criteria.
            </p>

            <form onSubmit={handleConfirmRejection} className="space-y-3 text-xs">
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g. road conditions, truck breakdown)..."
                className="w-full p-2 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900"
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-700 text-white font-bold rounded doodle-button"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
