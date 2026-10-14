import React from 'react';
import { 
  AssistanceRequest, 
  Warehouse, 
  Delivery, 
  AllocationRun, 
  AuditLogEvent 
} from '../types';
import { 
  DoodleBox, 
  DoodleWater, 
  DoodleTruck, 
  DoodleCheck 
} from '../components/DoodleIcons';
import { LeafletMap } from '../components/LeafletMap';
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Layers, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

interface DashboardViewProps {
  requests: AssistanceRequest[];
  warehouses: Warehouse[];
  deliveries: Delivery[];
  latestRun: AllocationRun | null;
  auditLogs: AuditLogEvent[];
  onRunAllocation: () => void;
  onNavigate: (view: 'requests' | 'inventory' | 'allocations' | 'deliveries' | 'admin' | 'map') => void;
  onRequestSelect?: (req: AssistanceRequest) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  warehouses,
  deliveries,
  latestRun,
  auditLogs,
  onRunAllocation,
  onNavigate,
  onRequestSelect,
}) => {
  // Aggregate KPIs
  const openRequests = requests.filter(r => r.status !== 'FULFILLED');
  const criticalRequests = requests.filter(r => r.urgency === 'CRITICAL');
  const totalAffectedPopulation = requests.reduce((acc, r) => acc + (r.affectedPopulation || 0), 0);

  // Total available stock across all warehouses
  const totalWaterAvailable = warehouses.reduce((acc, w) => acc + (w.inventory.water?.available || 0), 0);
  const totalFoodAvailable = warehouses.reduce((acc, w) => acc + (w.inventory.food?.available || 0), 0);
  const totalMedicalAvailable = warehouses.reduce((acc, w) => acc + (w.inventory.medical?.available || 0), 0);

  // Deliveries in transit or active
  const inTransitCount = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
  const dispatchedCount = deliveries.filter(d => d.status === 'DISPATCHED').length;
  const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length;

  // Unmet demand estimate from latest run or requests
  const totalDemandedWater = requests.reduce((acc, r) => acc + (r.requiredSupplies.water || 0), 0);
  const totalAllocatedWater = requests.reduce((acc, r) => acc + (r.allocatedSupplies?.water || 0), 0);
  const unmetWater = Math.max(0, totalDemandedWater - totalAllocatedWater);

  // Items needing attention now
  const hasCritical = criticalRequests.length > 0;
  const hasShortage = unmetWater > 0;
  const hasStaleRun = latestRun?.isStale;
  const needsAttention = hasCritical || hasShortage || hasStaleRun;

  return (
    <div className="space-y-6">
      {/* 1. Header with Page Title, Description & Contextual Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-stone-800 pb-3">
        <div>
          <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
            Emergency Operations Overview
          </h2>
          <p className="text-xs text-stone-600">
            Real-time disaster logistics monitoring, depot inventory levels, and convoy movement.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunAllocation}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold text-xs doodle-button flex items-center gap-2 whitespace-nowrap shadow-[2px_2px_0px_#1e232a]"
        >
          <Sparkles className="w-4 h-4 text-stone-900" />
          <span>Run Resource Optimizer</span>
        </button>
      </div>

      {/* 2. Primary KPI Grid (Opens with KPIs first as requested) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Assistance Requests */}
        <div 
          onClick={() => onNavigate('requests')}
          className="doodle-card p-4 bg-white cursor-pointer hover:border-amber-500 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600">Assistance Requests</span>
            <div className="w-7 h-7 rounded bg-red-50 border border-stone-800 flex items-center justify-center">
              <DoodleBox className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono-nums text-2xl font-bold text-stone-900">
            {openRequests.length} <span className="text-xs font-normal text-stone-500">Active</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-600 border border-stone-900"></span>
            <span>{criticalRequests.length} Critical Severity</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {totalAffectedPopulation.toLocaleString()} people affected
          </div>
        </div>

        {/* KPI 2: Available Stock Highlights */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="doodle-card p-4 bg-white cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600">Regional Stockpile</span>
            <div className="w-7 h-7 rounded bg-emerald-50 border border-stone-800 flex items-center justify-center">
              <DoodleWater className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono-nums text-2xl font-bold text-stone-900">
            {totalWaterAvailable.toLocaleString()}L
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-800 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 border border-stone-900"></span>
            <span>{totalFoodAvailable.toLocaleString()} Meals · {totalMedicalAvailable} Kits</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            Across {warehouses.length} regional staging hubs
          </div>
        </div>

        {/* KPI 3: Unmet Demand Shortfall */}
        <div 
          onClick={() => onNavigate('allocations')}
          className="doodle-card p-4 bg-white cursor-pointer hover:border-amber-500 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600">Unmet Demand Gap</span>
            <div className="w-7 h-7 rounded bg-amber-50 border border-stone-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <div className="font-mono-nums text-2xl font-bold text-amber-900">
            {unmetWater.toLocaleString()}L <span className="text-xs font-normal text-stone-500">Shortfall</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-700 font-medium">
            <span>Water fulfillment: {Math.round((totalAllocatedWater / (totalDemandedWater || 1)) * 100)}%</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {latestRun ? `Run #${latestRun.version} calculated` : 'Pending optimization run'}
          </div>
        </div>

        {/* KPI 4: Active Transits & Deliveries */}
        <div 
          onClick={() => onNavigate('deliveries')}
          className="doodle-card p-4 bg-white cursor-pointer hover:border-blue-500 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600">Convoys in Motion</span>
            <div className="w-7 h-7 rounded bg-blue-50 border border-stone-800 flex items-center justify-center">
              <DoodleTruck className="w-5 h-5 text-blue-700" />
            </div>
          </div>
          <div className="font-mono-nums text-2xl font-bold text-stone-900">
            {inTransitCount} <span className="text-xs font-normal text-stone-500">In Transit</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-700 font-semibold">
            <span>{dispatchedCount} Dispatched · {deliveredCount} Delivered</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            High-clearance fleet active
          </div>
        </div>
      </div>

      {/* 3. Slim Single-Row Step Bar for Core Flow */}
      <div className="doodle-card p-2.5 bg-[#FAF7F2] flex items-center justify-between text-xs overflow-x-auto gap-2">
        <span className="font-bold text-[11px] text-stone-700 uppercase tracking-wider shrink-0 px-1">
          Operational Flow:
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            type="button" 
            onClick={() => onNavigate('requests')}
            className="px-2.5 py-1 rounded bg-white border border-stone-300 hover:border-stone-800 font-semibold text-stone-800 flex items-center gap-1"
          >
            <span>1. Register Needs ({requests.length})</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button 
            type="button" 
            onClick={() => onNavigate('inventory')}
            className="px-2.5 py-1 rounded bg-white border border-stone-300 hover:border-stone-800 font-semibold text-stone-800 flex items-center gap-1"
          >
            <span>2. Depot Stock</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button 
            type="button" 
            onClick={onRunAllocation}
            className="px-2.5 py-1 rounded bg-amber-200 border border-stone-800 hover:bg-amber-300 font-bold text-stone-900 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>3. Optimize</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button 
            type="button" 
            onClick={() => onNavigate('allocations')}
            className="px-2.5 py-1 rounded bg-white border border-stone-300 hover:border-stone-800 font-semibold text-stone-800 flex items-center gap-1"
          >
            <span>4. Review & Approve</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button 
            type="button" 
            onClick={() => onNavigate('deliveries')}
            className="px-2.5 py-1 rounded bg-white border border-stone-300 hover:border-stone-800 font-semibold text-stone-800 flex items-center gap-1"
          >
            <span>5. Track Convoys ({inTransitCount})</span>
          </button>
        </div>
      </div>

      {/* 4. "Needs attention now" box directly above the map */}
      {needsAttention && (
        <div className="p-3 bg-amber-50 border-2 border-stone-800 rounded-lg doodle-card-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <strong className="text-stone-900 block font-bold">Needs attention now:</strong>
              <div className="text-stone-700 flex flex-wrap items-center gap-3 mt-0.5">
                {hasCritical && (
                  <span className="text-red-700 font-semibold">
                    • {criticalRequests.length} critical flood request{criticalRequests.length > 1 ? 's' : ''} awaiting aid
                  </span>
                )}
                {hasShortage && (
                  <span className="text-amber-800 font-semibold">
                    • {unmetWater.toLocaleString()}L water demand exceeds current allocation
                  </span>
                )}
                {hasStaleRun && (
                  <span className="text-amber-900 font-semibold">
                    • Allocation Run #{latestRun.version} is stale (inventory/demands modified)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasStaleRun && (
              <button
                type="button"
                onClick={onRunAllocation}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold rounded border border-stone-800"
              >
                Re-Run Optimizer
              </button>
            )}
            {hasCritical && (
              <button
                type="button"
                onClick={() => onNavigate('requests')}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-800 font-semibold rounded border border-stone-400"
              >
                View Requests
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Main Geographic Operations Map + Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real Leaflet OpenStreetMap Map */}
        <div className="lg:col-span-2">
          <LeafletMap
            requests={requests}
            warehouses={warehouses}
            deliveries={deliveries}
            onRequestSelect={onRequestSelect}
            onWarehouseSelect={() => onNavigate('inventory')}
          />
        </div>

        {/* Right 1 Col: Quick Action & Recent Activity */}
        <div className="space-y-4">
          {/* Optimization Engine Status Card */}
          <div className="doodle-card p-4 bg-[#FDFBF7]">
            <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-800" />
                <h4 className="font-doodle text-base font-bold text-stone-900">
                  Optimization Engine
                </h4>
              </div>
              <span className="text-[10px] font-mono-nums bg-stone-100 border border-stone-800 px-1.5 py-0.5 rounded font-bold">
                v2026.10 PK
              </span>
            </div>

            {latestRun ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Active Run Version:</span>
                  <span className="font-mono-nums font-bold text-stone-900">#{latestRun.version}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Approval Status:</span>
                  <span className={`font-semibold ${
                    latestRun.status === 'APPROVED' ? 'text-emerald-700' :
                    latestRun.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {latestRun.status === 'APPROVED' ? 'Approved & Dispatched' : 'Awaiting Coordinator Approval'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600">Water Fulfillment:</span>
                  <span className="font-mono-nums font-bold text-emerald-800">
                    {Math.round(
                      (latestRun.totals.allocated.water / (latestRun.totals.demand.water || 1)) * 100
                    )}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('allocations')}
                  className="w-full py-2 bg-stone-900 text-white text-xs font-semibold rounded doodle-button flex items-center justify-center gap-1.5"
                >
                  <span>Review Allocation Recommendation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-stone-600">
                <p>No allocation run generated yet.</p>
                <button
                  type="button"
                  onClick={onRunAllocation}
                  className="mt-2 px-3 py-1.5 bg-amber-400 text-stone-900 font-bold rounded doodle-button text-xs"
                >
                  Generate Initial Optimization
                </button>
              </div>
            )}
          </div>

          {/* Operational Activity Stream */}
          <div className="doodle-card p-4 bg-white">
            <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-800" />
                <h4 className="font-doodle text-base font-bold text-stone-900">
                  Recent Dispatch Activity
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="text-[11px] text-stone-600 hover:text-stone-900 underline"
              >
                Audit Log
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {auditLogs.slice(0, 4).map(log => (
                <div key={log.id} className="pb-2 border-b border-stone-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mb-0.5">
                    <span className="font-mono-nums">{log.timestamp.split(' ')[1] || log.timestamp}</span>
                    <span className="font-semibold text-stone-600">{log.actorName?.replace(/Dr\.?\s*Tariq\s*(Mansoor|Masroor)?/gi, 'Relief Operations Director')}</span>
                  </div>
                  <p className="text-stone-800 line-clamp-2 text-[11px]">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
