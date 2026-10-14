import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AssistanceRequest, Warehouse, Delivery, ReliefCamp, SUPPLY_METAS } from '../types';
import { calculateStraightLineDistanceKm } from '../services/optimizer';
import { INITIAL_CAMPS } from '../data/mockData';
import { 
  Navigation, 
  Map as MapIcon, 
  List, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Tent, 
  Truck, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface LeafletMapProps {
  requests: AssistanceRequest[];
  warehouses: Warehouse[];
  deliveries: Delivery[];
  camps?: ReliefCamp[];
  onRequestSelect?: (req: AssistanceRequest) => void;
  onWarehouseSelect?: (wh: Warehouse) => void;
  heightClass?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  requests,
  warehouses,
  deliveries,
  camps = INITIAL_CAMPS,
  onRequestSelect,
  onWarehouseSelect,
  heightClass = 'h-[500px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [tileError, setTileError] = useState(false);
  const [selectedEntityInfo, setSelectedEntityInfo] = useState<{
    type: 'request' | 'warehouse' | 'camp';
    data: AssistanceRequest | Warehouse | ReliefCamp;
  } | null>(null);
  const [showLocationListBelow, setShowLocationListBelow] = useState(true);

  // Active convoys
  const activeDeliveries = deliveries.filter(d => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED');

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // Center on Sindh Province, Pakistan: Lat ~26.40, Lng ~68.35
      const map = L.map(mapContainerRef.current, {
        center: [26.40, 68.35],
        zoom: 7,
        minZoom: 6,
        maxZoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors · Sindh PDMA Relief GIS',
      });

      tiles.on('tileerror', () => {
        setTileError(true);
        setViewMode('list');
      });

      tiles.addTo(map);
      mapInstanceRef.current = map;

      // 1. Warehouse Depots (Green / Emerald)
      warehouses.forEach(wh => {
        const depotIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="background-color: #065F46; border: 2.5px solid #1E232A; color: white; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 2.5px 2.5px 0px #1E232A; font-size: 15px; cursor: pointer;">
              🏢
            </div>
            <div style="background: #1E232A; color: white; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 4px; white-space: nowrap; margin-top: 2px; text-align: center; box-shadow: 1px 1px 0px rgba(0,0,0,0.4);">
              ${wh.code}
            </div>
          `,
          iconSize: [34, 48],
          iconAnchor: [17, 24],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([wh.coordinates.lat, wh.coordinates.lng], { icon: depotIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntityInfo({ type: 'warehouse', data: wh });
          onWarehouseSelect?.(wh);
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 200px;">
            <div style="font-weight: bold; font-size: 13px; color: #065F46; margin-bottom: 2px;">🏢 ${wh.name}</div>
            <div style="color: #666; font-size: 11px; margin-bottom: 6px;">District: ${wh.district} · ${wh.locationName}</div>
            <div style="border-top: 1px solid #ddd; padding-top: 4px;">
              <div><strong>Fleet:</strong> ${wh.availableDeliveryTrucks} relief transport trucks ready</div>
              <div><strong>Water Available:</strong> ${wh.inventory.water.available.toLocaleString()}L</div>
              <div><strong>Food Packs:</strong> ${wh.inventory.food.available.toLocaleString()}</div>
              <div><strong>Contact:</strong> ${wh.contactPerson} (${wh.contactPhone})</div>
            </div>
          </div>
        `);
      });

      // 2. Relief Camps (Purple / Indigo)
      camps.forEach(camp => {
        const campIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="background-color: #6D28D9; border: 2.5px solid #1E232A; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0px #1E232A; font-size: 14px; cursor: pointer;">
              ⛺
            </div>
            <div style="background: #4C1D95; color: white; padding: 1px 4px; font-size: 9px; font-weight: bold; border-radius: 4px; white-space: nowrap; margin-top: 2px; text-align: center; box-shadow: 1px 1px 0px rgba(0,0,0,0.3); max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
              ${camp.name.split(' ')[0]}
            </div>
          `,
          iconSize: [32, 44],
          iconAnchor: [16, 22],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([camp.coordinates.lat, camp.coordinates.lng], { icon: campIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntityInfo({ type: 'camp', data: camp });
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 210px;">
            <div style="font-weight: bold; font-size: 13px; color: #6D28D9; margin-bottom: 2px;">⛺ ${camp.name}</div>
            <div style="color: #666; font-size: 11px; margin-bottom: 6px;">District: ${camp.district} · ${camp.locationName}</div>
            <div style="border-top: 1px solid #ddd; padding-top: 4px;">
              <div><strong>Occupancy:</strong> ${camp.currentOccupancy.toLocaleString()} / ${camp.capacityPeople.toLocaleString()} capacity</div>
              <div><strong>Facilities:</strong> ${camp.facilities.join(', ')}</div>
              <div><strong>Incharge:</strong> ${camp.contactPerson} (${camp.contactPhone})</div>
            </div>
          </div>
        `);
      });

      // 3. Assistance Requests (Red = Critical, Amber = High, Blue = Moderate)
      requests.forEach(req => {
        const isCritical = req.urgency === 'CRITICAL';
        const isHigh = req.urgency === 'HIGH';
        const bgColor = isCritical ? '#DC2626' : isHigh ? '#D97706' : '#0284C7';
        const symbol = isCritical ? '⚠️' : isHigh ? '🚨' : '📍';

        const requestIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="background-color: ${bgColor}; border: 2.5px solid #1E232A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0px #1E232A; font-size: 13px; cursor: pointer;">
              ${symbol}
            </div>
            <div style="background: white; border: 1.5px solid #1E232A; color: #1E232A; padding: 1px 4px; font-size: 9px; font-weight: bold; border-radius: 4px; white-space: nowrap; margin-top: 2px; text-align: center; box-shadow: 1px 1px 0px rgba(0,0,0,0.3); max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
              ${req.communityName.split(' ')[0]}
            </div>
          `,
          iconSize: [30, 44],
          iconAnchor: [15, 20],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([req.coordinates.lat, req.coordinates.lng], { icon: requestIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntityInfo({ type: 'request', data: req });
          onRequestSelect?.(req);
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 220px;">
            <div style="font-weight: bold; font-size: 13px; color: ${bgColor}; margin-bottom: 2px;">${req.communityName}</div>
            <div style="color: #666; font-size: 11px; margin-bottom: 6px;">District: ${req.district} (${req.tehsil}) · ${req.zone}</div>
            <div style="border-top: 1px solid #ddd; padding-top: 4px;">
              <div><strong>Urgency:</strong> <span style="color: ${bgColor}; font-weight: bold;">${req.urgency}</span></div>
              <div><strong>Population:</strong> ${req.affectedPopulation.toLocaleString()} (${req.affectedHouseholds} households)</div>
              <div><strong>Flood Depth:</strong> ${req.floodDepthMeters}m · Access: ${req.accessStatus}</div>
              <div><strong>Status:</strong> ${req.status}</div>
              <div style="margin-top: 4px; font-size: 10px; color: #444;">
                Water: ${req.requiredSupplies.water}L · Food: ${req.requiredSupplies.food} · Med: ${req.requiredSupplies.medical}
              </div>
            </div>
          </div>
        `);
      });

      // 4. Straight Lines for Deliveries Labeled "estimated straight-line distance"
      activeDeliveries.forEach(del => {
        const wh = warehouses.find(w => w.id === del.warehouseId);
        const req = requests.find(r => r.id === del.requestId);
        if (wh && req) {
          const latlngs: [number, number][] = [
            [wh.coordinates.lat, wh.coordinates.lng],
            [req.coordinates.lat, req.coordinates.lng],
          ];

          const line = L.polyline(latlngs, {
            color: '#1E232A',
            weight: 2.5,
            dashArray: '6, 6',
            opacity: 0.85,
          }).addTo(map);

          line.bindTooltip(`
            <div style="font-size: 11px; font-family: inherit;">
              <strong>🚚 ${del.vehicleCode} (${del.status})</strong><br/>
              From: ${wh.name}<br/>
              To: ${del.destinationCommunity}<br/>
              Estimated straight-line distance: <strong>${del.distanceKm} km</strong><br/>
              ETA: ~${del.etaMinutes} mins
            </div>
          `, { direction: 'center', permanent: false });
        }
      });

      // Fit bounds
      const allCoords = [
        ...warehouses.map(w => [w.coordinates.lat, w.coordinates.lng] as [number, number]),
        ...camps.map(c => [c.coordinates.lat, c.coordinates.lng] as [number, number]),
        ...requests.map(r => [r.coordinates.lat, r.coordinates.lng] as [number, number]),
      ];
      if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
      }

    } catch (err) {
      console.warn('Leaflet map error:', err);
      setTileError(true);
      setViewMode('list');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, requests, warehouses, deliveries, camps]);

  return (
    <div className="doodle-card overflow-hidden bg-white">
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-2 border-stone-800 bg-[#FDFBF7]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-100 border border-stone-800 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-stone-800" />
          </div>
          <div>
            <h3 className="font-doodle text-lg font-bold leading-none text-stone-900">
              Flood Relief Geographic Operations Map
            </h3>
            <span className="text-[11px] text-stone-500">
              Real OpenStreetMap Coordinates · {warehouses.length} Regional Hubs · {camps.length} Relief Camps · {requests.length} Requests
            </span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-stone-100 border border-stone-800 rounded-md text-xs">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors font-semibold ${
                viewMode === 'map'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors font-semibold ${
                viewMode === 'list'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List / Table Fallback</span>
            </button>
          </div>
        </div>
      </div>

      {/* Network / Tile Error Notification Banner */}
      {tileError && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>OpenStreetMap tiles could not be loaded (offline / network error). Showing text list fallback of all relief locations below.</span>
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="relative w-full">
          <div ref={mapContainerRef} className={`w-full ${heightClass} z-10 bg-[#FAF7F2]`} />

          {/* Interactive Legend Box */}
          <div className="absolute bottom-3 left-3 z-20 bg-white/95 border-2 border-stone-800 rounded-lg p-2.5 shadow-[3px_3px_0px_#1e232a] text-[11px] space-y-1.5 max-w-[240px]">
            <span className="font-doodle font-bold text-stone-900 block text-xs border-b border-stone-200 pb-1">
              Geographic Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-800 border border-stone-800 inline-flex items-center justify-center text-[9px] text-white">🏢</span>
              <span>Regional Warehouse Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-700 border border-stone-800 inline-flex items-center justify-center text-[9px] text-white">⛺</span>
              <span>Designated Relief Camp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-stone-800 inline-flex items-center justify-center text-[9px] text-white">⚠️</span>
              <span>Critical Urgency Request</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-stone-800 inline-flex items-center justify-center text-[9px] text-white">🚨</span>
              <span>High Urgency Request</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-stone-800 inline-block"></span>
              <span>Estimated straight-line distance</span>
            </div>
          </div>
        </div>
      )}

      {/* TEXT LIST / TABLE VIEW (Either selected as view mode or fallback) */}
      {(viewMode === 'list' || showLocationListBelow) && (
        <div className="border-t-2 border-stone-800 bg-white">
          <div 
            onClick={() => viewMode === 'map' && setShowLocationListBelow(!showLocationListBelow)}
            className={`p-3 bg-[#FAF7F2] flex items-center justify-between ${viewMode === 'map' ? 'cursor-pointer hover:bg-stone-100' : ''}`}
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-stone-800" />
              <h4 className="font-doodle text-sm font-bold text-stone-900">
                All Relief Locations & Operational Coordinates ({warehouses.length} Hubs · {camps.length} Camps · {requests.length} Requests)
              </h4>
            </div>
            {viewMode === 'map' && (
              <span className="text-xs text-stone-500 flex items-center gap-1">
                {showLocationListBelow ? 'Collapse list' : 'Expand list'}
                {showLocationListBelow ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            )}
          </div>

          {(viewMode === 'list' || showLocationListBelow) && (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-50 border-b border-stone-300 text-stone-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">District & Location</th>
                    <th className="p-2.5">Coordinates (Lat, Lng)</th>
                    <th className="p-2.5">Capacity / Demands</th>
                    <th className="p-2.5">Status / Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {/* Warehouses */}
                  {warehouses.map(wh => (
                    <tr key={wh.id} className="hover:bg-emerald-50/50">
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          🏢 Warehouse Hub
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-stone-900">{wh.name}</td>
                      <td className="p-2.5 text-stone-600">{wh.district} · {wh.locationName}</td>
                      <td className="p-2.5 font-mono-nums text-[11px] text-stone-500">
                        {wh.coordinates.lat.toFixed(4)}, {wh.coordinates.lng.toFixed(4)}
                      </td>
                      <td className="p-2.5 font-mono-nums text-[11px]">
                        💧 {wh.inventory.water.available.toLocaleString()}L · 🍞 {wh.inventory.food.available.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-emerald-800 font-semibold">
                        {wh.availableDeliveryTrucks} trucks ready
                      </td>
                    </tr>
                  ))}

                  {/* Relief Camps */}
                  {camps.map(camp => (
                    <tr key={camp.id} className="hover:bg-purple-50/50">
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          ⛺ Relief Camp
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-stone-900">{camp.name}</td>
                      <td className="p-2.5 text-stone-600">{camp.district} · {camp.locationName}</td>
                      <td className="p-2.5 font-mono-nums text-[11px] text-stone-500">
                        {camp.coordinates.lat.toFixed(4)}, {camp.coordinates.lng.toFixed(4)}
                      </td>
                      <td className="p-2.5 font-mono-nums text-[11px]">
                        Occupancy: {camp.currentOccupancy} / {camp.capacityPeople}
                      </td>
                      <td className="p-2.5 text-purple-800 font-semibold">
                        {camp.facilities.slice(0, 2).join(', ')}
                      </td>
                    </tr>
                  ))}

                  {/* Assistance Requests */}
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-amber-50/50">
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          req.urgency === 'CRITICAL' ? 'bg-red-100 text-red-900 border-red-300' :
                          req.urgency === 'HIGH' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-sky-100 text-sky-900 border-sky-300'
                        }`}>
                          📍 Request
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-stone-900">{req.communityName}</td>
                      <td className="p-2.5 text-stone-600">{req.tehsil}, {req.district}</td>
                      <td className="p-2.5 font-mono-nums text-[11px] text-stone-500">
                        {req.coordinates.lat.toFixed(4)}, {req.coordinates.lng.toFixed(4)}
                      </td>
                      <td className="p-2.5 font-mono-nums text-[11px]">
                        {req.affectedPopulation.toLocaleString()} pop ({req.affectedHouseholds} hh) · {req.requiredSupplies.water}L water
                      </td>
                      <td className="p-2.5 font-bold">
                        <span className={req.urgency === 'CRITICAL' ? 'text-red-700' : req.urgency === 'HIGH' ? 'text-amber-700' : 'text-sky-700'}>
                          {req.urgency}
                        </span>
                        <span className="text-[10px] text-stone-500 font-normal ml-1">({req.status})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
