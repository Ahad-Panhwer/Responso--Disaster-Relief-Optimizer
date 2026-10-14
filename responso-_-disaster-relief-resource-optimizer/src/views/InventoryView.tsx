import React, { useState } from 'react';
import { 
  Warehouse, 
  SupplyType, 
  InventoryMovement, 
  SUPPLY_METAS 
} from '../types';
import { 
  DoodleWarehouse, 
  DoodleWater, 
  DoodleFood, 
  DoodleMedical, 
  DoodleTent, 
  DoodleHygiene, 
  DoodleTruck, 
  DoodleEmptyIllustration 
} from '../components/DoodleIcons';
import { 
  Plus, 
  Minus, 
  History, 
  AlertCircle, 
  Truck, 
  Scale, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';

interface InventoryViewProps {
  warehouses: Warehouse[];
  movements: InventoryMovement[];
  onStockAdjustment: (adjustment: {
    warehouseId: string;
    supplyType: SupplyType;
    delta: number;
    reason: string;
    operator: string;
  }) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  warehouses,
  movements,
  onStockAdjustment,
}) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || 'WH-01');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Stock Adjustment Form State
  const [adjustSupply, setAdjustSupply] = useState<SupplyType>('water');
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(500);
  const [adjustReason, setAdjustReason] = useState<string>('Inbound emergency shipment arrival');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0];

  const handleOpenAdjustModal = (supply?: SupplyType) => {
    if (supply) setAdjustSupply(supply);
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      setAdjustError('A mandatory operational reason is required for inventory audit compliance.');
      return;
    }
    if (adjustQuantity <= 0) {
      setAdjustError('Quantity must be greater than zero.');
      return;
    }

    const currentAvailable = selectedWarehouse.inventory[adjustSupply].available;
    const delta = adjustType === 'ADD' ? adjustQuantity : -adjustQuantity;

    if (adjustType === 'DEDUCT' && adjustQuantity > currentAvailable) {
      setAdjustError(`Cannot deduct ${adjustQuantity} units. Only ${currentAvailable} currently available.`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onStockAdjustment({
        warehouseId: selectedWarehouse.id,
        supplyType: adjustSupply,
        delta,
        reason: adjustReason.trim(),
        operator: 'Imran Qureshi (Warehouse Lead)',
      });
      setIsSubmitting(false);
      setIsAdjustModalOpen(false);
      setAdjustQuantity(500);
      setAdjustReason('');
    }, 250);
  };

  const supplies: SupplyType[] = ['water', 'food', 'medical', 'shelter', 'hygiene'];

  const getSupplyIcon = (type: SupplyType) => {
    switch (type) {
      case 'water': return <DoodleWater className="w-6 h-6" />;
      case 'food': return <DoodleFood className="w-6 h-6" />;
      case 'medical': return <DoodleMedical className="w-6 h-6" />;
      case 'shelter': return <DoodleTent className="w-6 h-6" />;
      case 'hygiene': return <DoodleHygiene className="w-6 h-6" />;
    }
  };

  // Filter movements for selected warehouse
  const warehouseMovements = movements.filter(m => m.warehouseId === selectedWarehouse.id);

  return (
    <div className="space-y-6">
      {/* Header with Warehouse Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
            Relief Inventory & Fleet Capacity
          </h2>
          <p className="text-xs text-stone-600">
            Monitor regional stockpiles, reserved allocations, and audit adjustments across staging depots.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdjustModal()}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs doodle-button flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Adjust Stock / Log Movement</span>
        </button>
      </div>

      {/* Warehouse Selector Tabs (Doodle style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {warehouses.map(wh => {
          const isSelected = wh.id === selectedWarehouseId;
          const totalWater = wh.inventory.water.available;
          const totalFood = wh.inventory.food.available;

          return (
            <button
              key={wh.id}
              type="button"
              onClick={() => setSelectedWarehouseId(wh.id)}
              className={`p-4 text-left transition-all rounded-lg doodle-card ${
                isSelected
                  ? 'bg-amber-50/70 border-stone-900 shadow-[3px_3px_0px_#1e232a]'
                  : 'bg-white hover:bg-stone-50 border-stone-300 shadow-[1px_1px_0px_#1e232a]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono-nums text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                    {wh.code}
                  </span>
                  <h4 className="font-doodle text-base font-bold text-stone-900 leading-snug">
                    {wh.name}
                  </h4>
                </div>
                <div className={`p-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-stone-100'} border border-stone-800`}>
                  <DoodleWarehouse className="w-5 h-5 text-stone-800" />
                </div>
              </div>

              <div className="text-[11px] text-stone-600 mt-1 line-clamp-1">
                📍 {wh.locationName}
              </div>

              <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-mono-nums">
                <span className="text-stone-700">🚚 {wh.availableDeliveryTrucks} Trucks Ready</span>
                <span className="font-bold text-stone-900">{totalWater.toLocaleString()}L Water</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Warehouse Detailed Inventory Board */}
      <div className="doodle-card p-5 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-stone-800 pb-3 gap-2">
          <div>
            <span className="text-[10px] font-mono-nums bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-bold">
              OPERATIONAL LOGISTICS POINT
            </span>
            <h3 className="font-doodle text-xl font-bold text-stone-900 mt-1">
              {selectedWarehouse.name} Inventory Breakdown
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-nums">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-stone-600" />
              <span>Capacity: <strong className="text-stone-900">{selectedWarehouse.capacityKg.toLocaleString()} kg</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Fleet: <strong className="text-blue-900">{selectedWarehouse.availableDeliveryTrucks} Ready</strong></span>
            </div>
          </div>
        </div>

        {/* Supplies Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {supplies.map(sup => {
            const item = selectedWarehouse.inventory[sup];
            const meta = SUPPLY_METAS[sup];
            const total = item.available + item.reserved;
            const reservedPct = total > 0 ? Math.round((item.reserved / total) * 100) : 0;

            return (
              <div 
                key={sup} 
                className="doodle-card-sm p-3.5 bg-[#FAF7F2] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-stone-700">{meta.label}</span>
                    <div className="p-1 rounded bg-white border border-stone-800">
                      {getSupplyIcon(sup)}
                    </div>
                  </div>

                  <div className="font-mono-nums text-xl font-bold text-stone-900">
                    {item.available.toLocaleString()}
                    <span className="text-[10px] font-normal text-stone-500 ml-1">
                      available
                    </span>
                  </div>

                  <div className="text-[11px] font-mono-nums text-stone-600 mt-1 flex justify-between">
                    <span>Reserved:</span>
                    <span className="font-bold text-amber-800">{item.reserved.toLocaleString()}</span>
                  </div>

                  {/* Reserved ratio progress bar */}
                  <div className="w-full h-1.5 bg-stone-200 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-amber-500" 
                      style={{ width: `${reservedPct}%` }}
                      title={`${reservedPct}% reserved for pending allocations`}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-300 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const delta = sup === 'water' ? 1000 : sup === 'food' ? 500 : 25;
                      onStockAdjustment({
                        warehouseId: selectedWarehouse.id,
                        supplyType: sup,
                        delta,
                        reason: `Quick replenishment convoy arrival (+${delta} ${SUPPLY_METAS[sup].unit})`,
                        operator: 'Sarah Mwangi',
                      });
                    }}
                    className="flex-1 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-700 text-emerald-900 rounded font-bold"
                    title="Simulate quick replenishment to demonstrate algorithm change"
                  >
                    + Quick Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAdjustModal(sup)}
                    className="px-2 py-1 text-[10px] bg-white border border-stone-800 rounded font-semibold text-stone-800 hover:bg-stone-100"
                  >
                    Custom...
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Movement History / Audit Ledger */}
      <div className="doodle-card p-5 bg-white">
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-stone-800" />
            <h4 className="font-doodle text-lg font-bold text-stone-900">
              Movement History & Stock Ledger ({selectedWarehouse.code})
            </h4>
          </div>
          <span className="text-xs text-stone-500">
            {warehouseMovements.length} audit entries
          </span>
        </div>

        {warehouseMovements.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-4">
            No logged stock adjustments for this depot yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF7F2] border-b border-stone-300 text-stone-700 font-bold">
                <tr>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Supply Item</th>
                  <th className="p-2.5 text-right">Adjustment Delta</th>
                  <th className="p-2.5 text-right">Balance After</th>
                  <th className="p-2.5">Reason / Justification</th>
                  <th className="p-2.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-mono-nums">
                {warehouseMovements.map((mov, index) => {
                  const isPositive = mov.delta > 0;
                  return (
                    <tr key={`${mov.id}-${index}`} className="hover:bg-stone-50">
                      <td className="p-2.5 text-stone-600 font-medium">
                        {mov.timestamp}
                      </td>
                      <td className="p-2.5 font-sans font-semibold text-stone-900">
                        {SUPPLY_METAS[mov.supplyType].label}
                      </td>
                      <td className={`p-2.5 text-right font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isPositive ? `+${mov.delta.toLocaleString()}` : mov.delta.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-stone-800">
                        {mov.balanceAfter.toLocaleString()}
                      </td>
                      <td className="p-2.5 font-sans text-stone-700 max-w-xs truncate">
                        {mov.reason}
                      </td>
                      <td className="p-2.5 font-sans text-stone-600 text-[11px]">
                        {mov.operator}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-md p-5 relative">
            <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
              <h3 className="font-doodle text-xl font-bold text-stone-900">
                Log Stock Adjustment
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 font-bold"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="mb-4 p-2.5 bg-red-50 border-2 border-red-700 rounded text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Target Depot</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedWarehouse.name} (${selectedWarehouse.code})`}
                  className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-stone-100 text-stone-700 font-semibold cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">Supply Category</label>
                  <select
                    value={adjustSupply}
                    onChange={e => setAdjustSupply(e.target.value as SupplyType)}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-medium"
                  >
                    {supplies.map(s => (
                      <option key={s} value={s}>{SUPPLY_METAS[s].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Operation Type</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setAdjustType('ADD')}
                      className={`py-1.5 border rounded font-bold text-center ${
                        adjustType === 'ADD'
                          ? 'border-stone-900 bg-emerald-100 text-emerald-950'
                          : 'border-stone-300 text-stone-600'
                      }`}
                    >
                      + Restock
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('DEDUCT')}
                      className={`py-1.5 border rounded font-bold text-center ${
                        adjustType === 'DEDUCT'
                          ? 'border-stone-900 bg-red-100 text-red-950'
                          : 'border-stone-300 text-stone-600'
                      }`}
                    >
                      - Deduct
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Quantity ({SUPPLY_METAS[adjustSupply].unit}) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQuantity}
                  onChange={e => setAdjustQuantity(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] font-mono-nums font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Audit Justification Reason <span className="text-red-600">*</span>
                </label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 mb-2 font-medium"
                >
                  <option value="Inbound emergency shipment arrival">Inbound emergency shipment arrival</option>
                  <option value="Airlift relief delivery consignment">Airlift relief delivery consignment</option>
                  <option value="Damaged by floodwater contamination">Damaged by floodwater contamination</option>
                  <option value="Expired or spoiled rations write-off">Expired or spoiled rations write-off</option>
                  <option value="Manual stocktake reconciliation audit">Manual stocktake reconciliation audit</option>
                </select>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Or enter custom reason..."
                  className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-stone-400 rounded text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white font-bold rounded doodle-button"
                >
                  {isSubmitting ? 'Recording Adjustment...' : 'Confirm & Save Audit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
