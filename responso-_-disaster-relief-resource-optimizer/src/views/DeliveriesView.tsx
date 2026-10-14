import React, { useState } from 'react';
import { Delivery, DeliveryStatus, UserAccount } from '../types';
import { 
  DoodleTruck, 
  DoodleCheck, 
  DoodleEmptyIllustration 
} from '../components/DoodleIcons';
import { 
  Truck, 
  MapPin, 
  ArrowRight, 
  AlertCircle, 
  XCircle,
  Lock,
  RotateCcw
} from 'lucide-react';

interface DeliveriesViewProps {
  deliveries: Delivery[];
  onAdvanceStatus: (deliveryId: string, nextStatus: DeliveryStatus, note?: string, failureReason?: string) => void;
  currentUser?: UserAccount | null;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  deliveries,
  onAdvanceStatus,
  currentUser,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [failureModalDelivery, setFailureModalDelivery] = useState<Delivery | null>(null);
  const [failureReasonInput, setFailureReasonInput] = useState<string>('Road completely submerged by floodwaters at bypass');

  const isAuthorized = !currentUser || ['LOGISTICS_COORDINATOR', 'FIELD_DISPATCHER', 'SYSTEM_ADMIN'].includes(currentUser.role);

  const filteredDeliveries = deliveries.filter(d => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="text-[11px] font-bold text-stone-800 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded">Assigned</span>;
      case 'DISPATCHED':
        return <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">Dispatched</span>;
      case 'IN_TRANSIT':
        return <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">In Transit</span>;
      case 'DELIVERED':
        return <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">Delivered</span>;
      case 'FAILED':
        return <span className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">Failed / Blocked</span>;
    }
  };

  const getNextAction = (delivery: Delivery) => {
    switch (delivery.status) {
      case 'ASSIGNED':
        return {
          label: 'Dispatch Convoy',
          nextStatus: 'DISPATCHED' as DeliveryStatus,
          note: 'Vehicle departed origin staging bay',
          btnClass: 'bg-amber-400 hover:bg-amber-300 text-stone-900',
        };
      case 'DISPATCHED':
        return {
          label: 'Mark In Transit',
          nextStatus: 'IN_TRANSIT' as DeliveryStatus,
          note: 'Passed flood perimeter checkpoint',
          btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
        };
      case 'IN_TRANSIT':
        return {
          label: 'Confirm Delivered (Log Proof)',
          nextStatus: 'DELIVERED' as DeliveryStatus,
          note: 'Signed off by shelter coordinator on-site',
          btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        };
      case 'DELIVERED':
      case 'FAILED':
        return null;
    }
  };

  const handleConfirmFailure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureModalDelivery) return;
    const reason = failureReasonInput.trim() || 'Access road cut off by flood surge';
    onAdvanceStatus(
      failureModalDelivery.id,
      'FAILED',
      `Delivery reported failed: ${reason}`,
      reason
    );
    setFailureModalDelivery(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
            Relief Delivery Fleet & Dispatch Tracking
          </h2>
          <p className="text-xs text-stone-600">
            Real-time convoy status, warehouse-origin tracing, driver coordination, and delivery confirmation.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-white border border-stone-800 rounded-lg text-xs font-semibold overflow-x-auto">
          {(['ALL', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab === 'ALL' ? 'All Convoys' : tab === 'FAILED' ? 'Failed' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {!isAuthorized && (
        <div className="p-3 bg-amber-50 border-2 border-amber-600 rounded-lg flex items-center gap-2 text-xs text-amber-900 font-medium">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Read-only dispatch view: Your role (<strong>{currentUser?.role}</strong>) cannot advance convoy statuses or report failures. Logistics Coordinator, Field Dispatcher, or System Admin privileges are required.
          </span>
        </div>
      )}

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <div className="doodle-card p-8 bg-white">
          <DoodleEmptyIllustration
            message="No delivery convoys in this status"
            subMessage="Approve an allocation run to generate and dispatch new delivery shipments."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDeliveries.map((del, index) => {
            const nextAction = getNextAction(del);

            return (
              <div 
                key={`${del.id}-${index}`}
                className="doodle-card p-4 bg-white flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-50 border border-stone-800">
                        <DoodleTruck className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <span className="font-mono-nums font-bold text-xs text-stone-900">
                          {del.id}
                        </span>
                        <div className="text-[10px] text-stone-500 font-mono-nums">
                          {del.vehicleCode || 'CONVOY'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {del._syncStatus === 'pending' && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded" title="Updated offline — awaiting automatic sync">
                          Queued Sync
                        </span>
                      )}
                      {getStatusBadge(del.status)}
                    </div>
                  </div>

                  {/* Route & Destination */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500">Origin Warehouse Depot:</span>
                        <div className="font-semibold text-stone-800">{del.warehouseName}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-stone-500">Destination Relief Shelter:</span>
                        <div className="font-bold text-stone-900">{del.destinationCommunity}</div>
                        <span className="text-[10px] text-stone-500 font-mono-nums">{del.destinationDistrict}</span>
                      </div>
                    </div>
                  </div>

                  {/* Manifest Box */}
                  <div className="mt-3 p-2 bg-[#FAF7F2] border border-stone-300 rounded text-[11px] font-mono-nums">
                    <span className="font-sans font-bold text-stone-700 block mb-1 text-[10px]">
                      CARGO MANIFEST ({Math.round(del.totalWeightKg)} kg):
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-stone-800">
                      <div>💧 {del.suppliesManifest.water} Jerry Cans</div>
                      <div>🍞 {del.suppliesManifest.food} Food Packs</div>
                      <div>🩹 {del.suppliesManifest.medical} Med Kits</div>
                      <div>⛺ {del.suppliesManifest.shelter} Tents</div>
                      <div>🧼 {del.suppliesManifest.hygiene} Hygiene Kits</div>
                    </div>
                  </div>

                  {/* Failure notice */}
                  {del.status === 'FAILED' && (
                    <div className="mt-2 p-2 bg-rose-50 border border-rose-300 rounded text-rose-900 text-xs flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Convoy Blocked / Aborted:</span>
                        <p className="text-[11px] text-rose-800">{del.failureReason || 'Submerged road or access impassable.'}</p>
                        <p className="text-[10px] text-rose-700 mt-0.5">Depot stock reservations released back to available pool; request status restored.</p>
                      </div>
                    </div>
                  )}

                  {/* Driver info */}
                  <div className="flex items-center justify-between text-xs text-stone-600 mt-2">
                    <div>
                      <span>Driver: <strong>{del.driverName}</strong></span>
                      <span className="text-[10px] text-stone-400 block font-mono-nums">{del.driverPhone}</span>
                    </div>
                    <div className="text-right font-mono-nums text-[11px]">
                      <div>{del.distanceKm} km</div>
                      <div className="text-stone-500">
                        {del.status === 'DELIVERED' ? 'Arrived & Handed Over' : del.status === 'FAILED' ? 'Terminated' : `ETA: ~${del.etaMinutes}m`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDelivery(del)}
                    className="text-xs text-stone-600 hover:text-stone-900 underline"
                  >
                    View Timeline
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Failure button when convoy is in transit */}
                    {isAuthorized && del.status === 'IN_TRANSIT' && (
                      <button
                        type="button"
                        onClick={() => {
                          setFailureModalDelivery(del);
                          setFailureReasonInput('Road completely submerged by floodwaters at bypass');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-semibold text-xs flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Report Blocked</span>
                      </button>
                    )}

                    {nextAction && isAuthorized && (
                      <button
                        type="button"
                        onClick={() => onAdvanceStatus(del.id, nextAction.nextStatus, nextAction.note)}
                        className={`px-3 py-1.5 rounded font-bold text-xs doodle-button ${nextAction.btnClass} flex items-center gap-1.5`}
                      >
                        <span>{nextAction.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {del.status === 'DELIVERED' && (
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <DoodleCheck className="w-4 h-4 text-emerald-600" />
                        <span>Delivery Fulfilled</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Failure Reason Prompt Modal */}
      {failureModalDelivery && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-md p-5 relative">
            <h3 className="font-doodle text-lg font-bold text-stone-900 mb-1">
              Report Delivery Failure / Convoy Blocked
            </h3>
            <p className="text-xs text-stone-600 mb-3">
              Marking delivery <strong>{failureModalDelivery.id}</strong> as FAILED will release its reserved supplies back into <strong>{failureModalDelivery.warehouseName}</strong> and restore demand on the assistance request.
            </p>

            <form onSubmit={handleConfirmFailure} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Reason for Failure / Obstruction <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={failureReasonInput}
                  onChange={e => setFailureReasonInput(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Access bridge washed away; flood surge exceeded vehicle wading depth."
                  className="w-full p-2 text-xs border-2 border-stone-800 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setFailureModalDelivery(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded text-xs text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded transition-colors"
                >
                  Confirm Failure & Release Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Detail & Timeline Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-lg p-5 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono-nums bg-stone-100 px-2 py-0.5 rounded border border-stone-300 text-stone-600">
                  {selectedDelivery.id} · {selectedDelivery.vehicleCode}
                </span>
                <h3 className="font-doodle text-xl font-bold text-stone-900 mt-1">
                  Delivery Route & Milestone Timeline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="p-1 text-stone-400 hover:text-stone-900 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="p-3 bg-[#FAF7F2] border border-stone-300 rounded space-y-1">
                <div>From Warehouse: <strong>{selectedDelivery.warehouseName}</strong></div>
                <div>To Community: <strong>{selectedDelivery.destinationCommunity}</strong> ({selectedDelivery.destinationDistrict})</div>
                <div>Assigned Driver: <strong>{selectedDelivery.driverName}</strong> ({selectedDelivery.driverPhone})</div>
                <div>Total Manifest Weight: <strong>{Math.round(selectedDelivery.totalWeightKg)} kg</strong></div>
                {selectedDelivery.failureReason && (
                  <div className="text-rose-700 font-semibold pt-1 border-t border-stone-200">
                    Failure Obstacle: {selectedDelivery.failureReason}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-doodle text-base font-bold text-stone-900 mb-2">
                  Dispatch Milestone Trail:
                </h4>
                <div className="space-y-3 pl-3 border-l-2 border-stone-800">
                  {selectedDelivery.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-3 h-3 rounded-full bg-stone-900 border-2 border-white" />
                      <div className="text-[10px] font-mono-nums text-stone-500">
                        {event.timestamp} · {event.status}
                      </div>
                      <div className="font-semibold text-stone-900 text-xs">
                        {event.event}
                      </div>
                      {event.note && (
                        <div className="text-[11px] text-stone-600 italic mt-0.5">
                          "{event.note}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200 mt-2">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="px-4 py-1.5 border border-stone-300 rounded text-stone-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
