import React, { useState } from 'react';
import { AssistanceRequest, Warehouse, Delivery, SupplyType, SUPPLY_METAS } from '../types';
import { DoodleBox, DoodleWater, DoodleMedical, DoodleTruck, DoodleWarehouse, DoodleWave } from './DoodleIcons';
import { MapPin, Navigation, Info, List, Map as MapIcon, ShieldAlert } from 'lucide-react';

interface InteractiveMapProps {
  requests: AssistanceRequest[];
  warehouses: Warehouse[];
  deliveries: Delivery[];
  onRequestSelect?: (req: AssistanceRequest) => void;
  onWarehouseSelect?: (wh: Warehouse) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  requests,
  warehouses,
  deliveries,
  onRequestSelect,
  onWarehouseSelect,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'request' | 'warehouse';
    data: AssistanceRequest | Warehouse;
  } | null>(null);

  // Active in-transit deliveries
  const activeDeliveries = deliveries.filter(d => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED');

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return { bg: 'bg-red-500', border: 'border-red-900', text: 'text-red-700', label: 'Critical' };
      case 'HIGH': return { bg: 'bg-amber-500', border: 'border-amber-900', text: 'text-amber-700', label: 'High' };
      case 'MODERATE': return { bg: 'bg-sky-500', border: 'border-sky-900', text: 'text-sky-700', label: 'Moderate' };
      default: return { bg: 'bg-stone-500', border: 'border-stone-900', text: 'text-stone-700', label: 'Low' };
    }
  };

  return (
    <div className="doodle-card overflow-hidden bg-white">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-2 border-stone-800 bg-[#FDFBF7]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-100 border border-stone-800 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-stone-800" />
          </div>
          <div>
            <h3 className="font-doodle text-lg font-bold leading-none text-stone-900">
              River Valley Disaster Logistics Map
            </h3>
            <span className="text-xs text-stone-500">
              Live Basin Topography · 3 Depots · {requests.length} Relief Shelters · {activeDeliveries.length} Transits
            </span>
          </div>
        </div>

        {/* View Mode Toggle (Accessible list/table alternative) */}
        <div className="flex items-center gap-1 p-0.5 bg-stone-100 border border-stone-800 rounded-md">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-400'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-400'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List Table</span>
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="relative w-full h-[460px] bg-[#FAF6EE] overflow-hidden select-none">
          {/* SVG Map Canvas */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* Pattern for flood submerged zone */}
              <pattern id="floodHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.4" />
              </pattern>
            </defs>

            {/* Topographic background grid lines */}
            <path d="M 0,20 Q 30,25 60,15 T 100,22" stroke="#E2D9C8" strokeWidth="0.6" fill="none" />
            <path d="M 0,40 Q 40,48 70,35 T 100,45" stroke="#E2D9C8" strokeWidth="0.6" fill="none" />
            <path d="M 0,65 Q 25,60 55,70 T 100,68" stroke="#E2D9C8" strokeWidth="0.6" fill="none" />
            <path d="M 0,85 Q 45,80 75,90 T 100,88" stroke="#E2D9C8" strokeWidth="0.6" fill="none" />

            {/* Riverbed Flooding Corridor (Doodle curve) */}
            <path
              d="M -5,48 C 20,45 30,62 50,56 C 70,50 80,72 105,75 L 105,95 L -5,95 Z"
              fill="url(#floodHatch)"
            />
            <path
              d="M -5,48 C 20,45 30,62 50,56 C 70,50 80,72 105,75"
              stroke="#60A5FA"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M -5,55 C 20,52 30,68 50,62 C 70,56 80,78 105,82"
              stroke="#93C5FD"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />

            {/* Active Delivery Transit Route Connectors */}
            {activeDeliveries.map(del => {
              const wh = warehouses.find(w => w.id === del.warehouseId);
              const req = requests.find(r => r.id === del.requestId);
              if (!wh || !req) return null;

              return (
                <g key={`route-${del.id}`}>
                  {/* Road line */}
                  <line
                    x1={wh.coordinates.x}
                    y1={wh.coordinates.y}
                    x2={req.coordinates.x}
                    y2={req.coordinates.y}
                    stroke="#1E232A"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                    className="animate-dash"
                  />
                  {/* Moving truck icon indicator */}
                  <circle
                    cx={(wh.coordinates.x + req.coordinates.x) / 2}
                    cy={(wh.coordinates.y + req.coordinates.y) / 2}
                    r="2.2"
                    fill="#2563EB"
                    stroke="#1E232A"
                    strokeWidth="0.8"
                  />
                </g>
              );
            })}
          </svg>

          {/* Flooding Depth Annotations (Doodle labels) */}
          <div className="absolute top-2 left-3 pointer-events-none flex items-center gap-1.5 px-2 py-1 bg-blue-50/90 border border-blue-300 rounded text-[11px] font-medium text-blue-900">
            <DoodleWave className="w-3.5 h-3.5" />
            <span>River Valley Flood Basin (Crest +1.8m)</span>
          </div>

          <div className="absolute bottom-2 right-3 pointer-events-none flex items-center gap-3 px-2 py-1 bg-white/90 border border-stone-300 rounded text-[10px] text-stone-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border border-stone-800" /> Depot
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full border border-stone-800" /> Critical Shelter
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full border border-stone-800" /> High Shelter
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full border border-stone-800" /> In-Transit
            </span>
          </div>

          {/* Warehouse Markers */}
          {warehouses.map(wh => (
            <button
              key={wh.id}
              type="button"
              onClick={() => {
                setSelectedEntity({ type: 'warehouse', data: wh });
                onWarehouseSelect?.(wh);
              }}
              style={{ left: `${wh.coordinates.x}%`, top: `${wh.coordinates.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-full"
              title={`${wh.name} (${wh.code})`}
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 border-2 border-stone-900 shadow-[2px_2px_0px_#1e232a] group-hover:scale-110 transition-transform">
                <DoodleWarehouse className="w-5 h-5 text-emerald-800" />
              </div>
              <span className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-stone-900 text-white text-[10px] font-semibold rounded shadow opacity-90 pointer-events-none">
                {wh.code}
              </span>
            </button>
          ))}

          {/* Assistance Request Shelter Markers */}
          {requests.map((req, idx) => {
            const urgency = getUrgencyColor(req.urgency);
            const isCritical = req.urgency === 'CRITICAL';

            return (
              <button
                key={`${req.id}-${idx}`}
                type="button"
                onClick={() => {
                  setSelectedEntity({ type: 'request', data: req });
                  onRequestSelect?.(req);
                }}
                style={{ left: `${req.coordinates.x}%`, top: `${req.coordinates.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-full"
                title={`${req.communityName} · Urgency: ${req.urgency}`}
              >
                <div
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full ${urgency.bg} border-2 border-stone-900 shadow-[2px_2px_0px_#1e232a] group-hover:scale-110 transition-transform ${
                    isCritical ? 'ring-2 ring-red-300' : ''
                  }`}
                >
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-white border border-stone-800 text-stone-900 text-[10px] font-medium rounded shadow-sm opacity-95 pointer-events-none max-w-[130px] truncate">
                  {req.communityName.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* Selected Entity Card Popover */}
          {selectedEntity && (
            <div className="absolute top-3 right-3 w-80 max-w-[calc(100%-24px)] bg-white border-2 border-stone-800 rounded-lg p-3 shadow-[4px_4px_0px_#1e232a] z-20 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-2 mb-2">
                <div>
                  <span className="font-mono-nums text-[10px] text-stone-500 uppercase tracking-wider">
                    {selectedEntity.type === 'warehouse' ? 'Relief Supply Depot' : 'Evacuation Shelter'}
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm leading-snug">
                    {'communityName' in selectedEntity.data ? selectedEntity.data.communityName : selectedEntity.data.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 text-stone-400 hover:text-stone-800 rounded"
                >
                  ✕
                </button>
              </div>

              {selectedEntity.type === 'request' ? (
                // Request details
                (() => {
                  const req = selectedEntity.data as AssistanceRequest;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600">Urgency:</span>
                        <span className={`font-bold ${req.urgency === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'}`}>
                          {req.urgency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600">Population:</span>
                        <span className="font-mono-nums font-semibold text-stone-900">
                          {req.affectedPopulation.toLocaleString()} ({req.vulnerableCount} vulnerable)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600">Access Mode:</span>
                        <span className="font-medium text-stone-800">
                          {req.accessStatus === 'CUT_OFF_ROAD' ? '⚠️ Road Submerged' : req.accessStatus === 'BOAT_ONLY' ? '🚤 Boat Only' : '✅ Road Accessible'}
                        </span>
                      </div>
                      <div className="bg-stone-50 p-2 rounded border border-stone-200">
                        <span className="font-semibold text-stone-700 block mb-1">Requested Supplies:</span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono-nums">
                          <div>💧 Water: {req.requiredSupplies.water}L</div>
                          <div>🍞 Food: {req.requiredSupplies.food} MRE</div>
                          <div>🩹 Medical: {req.requiredSupplies.medical} kits</div>
                          <div>⛺ Tents: {req.requiredSupplies.shelter} units</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500 italic">{req.notes}</p>
                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onRequestSelect?.(req)}
                          className="w-full py-1.5 bg-stone-900 text-white font-bold rounded doodle-button text-[11px] flex items-center justify-center gap-1.5"
                        >
                          <span>Open Full Request & Modify</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Warehouse details
                (() => {
                  const wh = selectedEntity.data as Warehouse;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600">Location:</span>
                        <span className="font-medium text-stone-800">{wh.locationName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600">Available Trucks:</span>
                        <span className="font-mono-nums font-semibold text-emerald-700">{wh.availableDeliveryTrucks} ready</span>
                      </div>
                      <div className="bg-emerald-50/70 p-2 rounded border border-emerald-200">
                        <span className="font-semibold text-emerald-900 block mb-1">Available Stock:</span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono-nums text-emerald-950">
                          <div>💧 Water: {wh.inventory.water.available.toLocaleString()}L</div>
                          <div>🍞 Food: {wh.inventory.food.available.toLocaleString()}</div>
                          <div>🩹 Medical: {wh.inventory.medical.available}</div>
                          <div>⛺ Tents: {wh.inventory.shelter.available}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-stone-200">
                        <button
                          type="button"
                          onClick={() => onWarehouseSelect?.(wh)}
                          className="w-full py-1.5 bg-emerald-800 text-white font-bold rounded doodle-button text-[11px] flex items-center justify-center gap-1.5"
                        >
                          <span>Manage Depot Stock in Inventory</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      ) : (
        /* Accessible List / Table Alternative */
        <div className="p-4 space-y-4">
          <div>
            <h4 className="font-doodle text-base font-bold text-stone-900 mb-2">
              Assistance Requests by Community ({requests.length})
            </h4>
            <div className="overflow-x-auto border border-stone-300 rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] border-b border-stone-300 text-stone-700 font-semibold">
                  <tr>
                    <th className="p-2.5">Community / Shelter</th>
                    <th className="p-2.5">Urgency</th>
                    <th className="p-2.5">Affected Pop.</th>
                    <th className="p-2.5">Access Status</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Water / Food Req.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {requests.map((req, idx) => {
                    const urgency = getUrgencyColor(req.urgency);
                    return (
                      <tr key={`${req.id}-${idx}`} className="hover:bg-stone-50">
                        <td className="p-2.5 font-medium text-stone-900">
                          {req.communityName}
                          <div className="text-[10px] text-stone-500">{req.zone}</div>
                        </td>
                        <td className="p-2.5">
                          <span className={`font-semibold ${urgency.text}`}>
                            {req.urgency}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono-nums">
                          {req.affectedPopulation.toLocaleString()}
                          <span className="text-stone-400 text-[10px] ml-1">({req.vulnerableCount} vuln)</span>
                        </td>
                        <td className="p-2.5">
                          {req.accessStatus === 'CUT_OFF_ROAD' ? 'Cut-off Road' : req.accessStatus === 'BOAT_ONLY' ? 'Boat Only' : 'Accessible'}
                        </td>
                        <td className="p-2.5">
                          <span className="text-[11px] font-medium text-stone-700">
                            {req.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono-nums">
                          {req.requiredSupplies.water}L / {req.requiredSupplies.food}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-doodle text-base font-bold text-stone-900 mb-2">
              Relief Depots & Inventory Points ({warehouses.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {warehouses.map(wh => (
                <div key={wh.id} className="p-3 border border-stone-300 rounded bg-[#FAF7F2]">
                  <div className="font-semibold text-stone-900 text-xs">{wh.name}</div>
                  <div className="text-[10px] text-stone-500 mb-2">{wh.locationName}</div>
                  <div className="text-[11px] font-mono-nums space-y-0.5">
                    <div>Trucks Ready: {wh.availableDeliveryTrucks}</div>
                    <div>Water Available: {wh.inventory.water.available.toLocaleString()}L</div>
                    <div>Food Rations: {wh.inventory.food.available.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
