import React, { useState } from 'react';
import { 
  AssistanceRequest, 
  UrgencyLevel, 
  AccessStatus, 
  RequestStatus, 
  SupplyType, 
  SUPPLY_METAS 
} from '../types';
import { 
  DoodleBox, 
  DoodleWater, 
  DoodleMedical, 
  DoodleTent, 
  DoodleCheck, 
  DoodleEmptyIllustration 
} from '../components/DoodleIcons';
import { 
  Search, 
  Plus, 
  Filter, 
  AlertCircle, 
  MapPin, 
  Users, 
  Phone, 
  FileText, 
  X, 
  Check, 
  Clock 
} from 'lucide-react';

interface RequestsViewProps {
  requests: AssistanceRequest[];
  onCreateRequest: (request: AssistanceRequest) => void;
  onUpdateRequest: (request: AssistanceRequest) => void;
  selectedRequestId?: string | null;
}

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  onCreateRequest,
  onUpdateRequest,
  selectedRequestId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeRequestDetail, setActiveRequestDetail] = useState<AssistanceRequest | null>(
    requests.find(r => r.id === selectedRequestId) || null
  );

  const SINDH_DISTRICT_TEHSILS: Record<string, { tehsils: string[]; baseCoords: { lat: number; lng: number } }> = {
    'Dadu': { tehsils: ['Johi', 'Dadu', 'Mehar', 'Khairpur Nathan Shah'], baseCoords: { lat: 26.7329, lng: 67.7769 } },
    'Larkana': { tehsils: ['Larkana', 'Ratodero', 'Bakrani', 'Dokri'], baseCoords: { lat: 27.5590, lng: 68.2120 } },
    'Khairpur': { tehsils: ['Kot Diji', 'Gambat', 'Khairpur', 'Sobhodero', 'Kingri'], baseCoords: { lat: 27.3402, lng: 68.7051 } },
    'Badin': { tehsils: ['Badin', 'Matli', 'Golarchi', 'Talhar', 'Tando Bago'], baseCoords: { lat: 24.6560, lng: 68.8378 } },
    'Jamshoro': { tehsils: ['Kotri', 'Sehwan', 'Manjhand', 'Thano Bula Khan'], baseCoords: { lat: 25.3670, lng: 68.3120 } },
    'Sukkur': { tehsils: ['Sukkur City', 'Rohri', 'Pano Akil', 'Salehpat'], baseCoords: { lat: 27.7052, lng: 68.8574 } },
    'Umerkot': { tehsils: ['Umerkot', 'Dhoronaro', 'Pithoro', 'Samaro'], baseCoords: { lat: 25.3582, lng: 69.7374 } },
    'Tharparkar': { tehsils: ['Mithi', 'Islamkot', 'Diplo', 'Chachro', 'Nagarparkar'], baseCoords: { lat: 24.7397, lng: 69.7998 } },
  };

  // Form state for creating a new request
  const [formName, setFormName] = useState('');
  const [formDistrict, setFormDistrict] = useState('Dadu');
  const [formTehsil, setFormTehsil] = useState('Johi');
  const [formHouseholds, setFormHouseholds] = useState<number>(180);
  const [formZone, setFormZone] = useState('District Dadu · Western Sindh Inundation Corridor');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPop, setFormPop] = useState<number>(1080);
  const [formVuln, setFormVuln] = useState<number>(240);
  const [formUrgency, setFormUrgency] = useState<UrgencyLevel>('HIGH');
  const [formDepth, setFormDepth] = useState<number>(1.2);
  const [formAccess, setFormAccess] = useState<AccessStatus>('ACCESSIBLE');
  const [formWater, setFormWater] = useState<number>(3500);
  const [formFood, setFormFood] = useState<number>(2200);
  const [formMedical, setFormMedical] = useState<number>(60);
  const [formShelter, setFormShelter] = useState<number>(45);
  const [formHygiene, setFormHygiene] = useState<number>(320);
  const [formNotes, setFormNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.communityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.zone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUrgency = urgencyFilter === 'ALL' || req.urgency === urgencyFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesUrgency && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleValidateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formName.trim()) errors.name = 'Community / Shelter name is required.';
    if (!formContact.trim()) errors.contact = 'Contact person name is required.';
    if (!formPhone.trim()) errors.phone = 'Emergency telephone or radio call sign is required.';
    if (formPop <= 0) errors.pop = 'Affected population must be greater than zero.';
    if (formHouseholds <= 0) errors.households = 'Affected households must be greater than zero.';
    if (formVuln > formPop) errors.vuln = 'Vulnerable count cannot exceed total population.';
    if (formWater < 0 || formFood < 0) errors.supplies = 'Supplies cannot be negative.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const districtMeta = SINDH_DISTRICT_TEHSILS[formDistrict] || SINDH_DISTRICT_TEHSILS['Dadu'];
      const lat = districtMeta.baseCoords.lat + (Math.random() - 0.5) * 0.06;
      const lng = districtMeta.baseCoords.lng + (Math.random() - 0.5) * 0.06;

      const newReq: AssistanceRequest = {
        id: `REQ-PK-${Math.floor(230 + Math.random() * 700)}`,
        communityName: formName.trim(),
        district: formDistrict,
        tehsil: formTehsil,
        zone: formZone,
        contactPerson: formContact.trim(),
        contactPhone: formPhone.trim(),
        coordinates: {
          x: Math.floor(30 + Math.random() * 40),
          y: Math.floor(30 + Math.random() * 40),
          lat: Math.round(lat * 10000) / 10000,
          lng: Math.round(lng * 10000) / 10000,
        },
        affectedPopulation: Number(formPop),
        affectedHouseholds: Number(formHouseholds),
        vulnerableCount: Number(formVuln),
        urgency: formUrgency,
        floodDepthMeters: Number(formDepth),
        accessStatus: formAccess,
        requiredSupplies: {
          water: Number(formWater),
          food: Number(formFood),
          medical: Number(formMedical),
          shelter: Number(formShelter),
          hygiene: Number(formHygiene),
        },
        allocatedSupplies: {
          water: 0,
          food: 0,
          medical: 0,
          shelter: 0,
          hygiene: 0,
        },
        status: 'PENDING',
        createdAt: '2026-10-13 ' + new Date().toTimeString().slice(0, 5) + ' PKT',
        notes: formNotes.trim() || 'Urgent disaster relief requested by local administration.',
      };

      onCreateRequest(newReq);
      setIsSubmitting(false);
      setIsCreateModalOpen(false);

      // Reset form
      setFormName('');
      setFormContact('');
      setFormPhone('');
      setFormNotes('');
    }, 300);
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">HIGH</span>;
      case 'MODERATE':
        return <span className="text-[11px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded">MODERATE</span>;
      default:
        return <span className="text-[11px] font-medium text-stone-700 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded">LOW</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action & filter bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
            Assistance Requests Registry
          </h2>
          <p className="text-xs text-stone-600">
            Field-submitted shelter needs, flood depth records, and urgent supply demands.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs doodle-button flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Register New Assistance Request</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="doodle-card p-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by community, shelter name, contact or ID..."
            className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </div>

        {/* Urgency Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-semibold">Urgency:</span>
          <select
            value={urgencyFilter}
            onChange={e => setUrgencyFilter(e.target.value)}
            aria-label="Filter by urgency"
            className="border border-stone-300 rounded px-2 py-1 bg-white text-stone-800 font-medium"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MODERATE">Moderate</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by allocation status"
            className="border border-stone-300 rounded px-2 py-1 bg-white text-stone-800 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_ALLOCATED">Partially Allocated</option>
            <option value="ALLOCATED">Fully Allocated</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="FULFILLED">Fulfilled</option>
          </select>
        </div>
      </div>

      {/* Requests Table / Card List */}
      {filteredRequests.length === 0 ? (
        <div className="doodle-card bg-white p-6">
          <DoodleEmptyIllustration
            message="No matching relief requests found"
            subMessage="Try adjusting your search terms or register a new emergency request."
          />
        </div>
      ) : (
        <div className="doodle-card overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF7F2] border-b-2 border-stone-800 text-stone-800 font-bold">
                <tr>
                  <th className="p-3">Request ID & Community</th>
                  <th className="p-3">Urgency & Access</th>
                  <th className="p-3">Affected Population</th>
                  <th className="p-3">Water / Meals Required</th>
                  <th className="p-3">Allocation Progress</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredRequests.map((req, index) => {
                  const totalDemandUnits = req.requiredSupplies.water + req.requiredSupplies.food;
                  const totalAllocUnits = req.allocatedSupplies.water + req.allocatedSupplies.food;
                  const fulfillmentPercent = totalDemandUnits > 0 ? Math.round((totalAllocUnits / totalDemandUnits) * 100) : 0;

                  return (
                    <tr 
                      key={`${req.id}-${index}`} 
                      className={`hover:bg-amber-50/40 transition-colors ${
                        activeRequestDetail?.id === req.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-1.5 font-mono-nums font-bold text-stone-900">
                          <span>{req.id}</span>
                          {req._syncStatus === 'pending' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Created offline — awaiting automatic sync">
                              Queued Sync
                            </span>
                          )}
                        </div>
                        <div className="text-stone-800 font-bold text-xs">{req.communityName}</div>
                        <div className="text-[10px] text-stone-500">{req.zone}</div>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          {getUrgencyBadge(req.urgency)}
                          <span className="text-[10px] text-stone-600 font-medium">
                            {req.accessStatus === 'CUT_OFF_ROAD' ? '⚠️ Road Submerged' : req.accessStatus === 'BOAT_ONLY' ? '🚤 Boat Only' : '✅ Road Clear'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 font-mono-nums">
                        <div className="font-bold text-stone-900 text-xs">
                          {req.affectedPopulation.toLocaleString()} people
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {req.vulnerableCount} vulnerable (infants/seniors)
                        </div>
                      </td>

                      <td className="p-3 font-mono-nums text-xs">
                        <div className="text-stone-900">
                          💧 {req.requiredSupplies.water.toLocaleString()}L Water
                        </div>
                        <div className="text-stone-700">
                          🍞 {req.requiredSupplies.food.toLocaleString()} Meals
                        </div>
                        <div className="text-[10px] text-stone-500">
                          🩹 {req.requiredSupplies.medical} Kits · ⛺ {req.requiredSupplies.shelter} Tents
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono-nums">
                            <span className="font-semibold text-stone-700">{req.status}</span>
                            <span className="font-bold">{fulfillmentPercent}%</span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 border border-stone-300 rounded overflow-hidden">
                            <div
                              className={`h-full ${
                                fulfillmentPercent === 100 ? 'bg-emerald-500' :
                                fulfillmentPercent > 0 ? 'bg-amber-500' : 'bg-stone-300'
                              }`}
                              style={{ width: `${fulfillmentPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveRequestDetail(req)}
                          className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-900 font-semibold border border-stone-800 rounded shadow-sm text-xs"
                        >
                          Inspect Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Inspection Modal / Drawer */}
      {activeRequestDetail && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 relative">
            <div className="flex items-start justify-between border-b-2 border-stone-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono-nums bg-stone-100 px-2 py-0.5 rounded border border-stone-300 text-stone-600">
                  {activeRequestDetail.id}
                </span>
                <h3 className="font-doodle text-xl font-bold text-stone-900 mt-1">
                  {activeRequestDetail.communityName}
                </h3>
                <span className="text-xs text-stone-500">{activeRequestDetail.zone}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveRequestDetail(null)}
                className="p-1 text-stone-500 hover:text-stone-900 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Severity & Contact Banner */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF7F2] border border-stone-300 rounded-lg">
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px]">URGENCY LEVEL:</span>
                  <div className="mt-0.5">{getUrgencyBadge(activeRequestDetail.urgency)}</div>
                  <div className="text-[11px] text-stone-600 mt-1">
                    Flood Depth: <span className="font-mono-nums font-bold text-stone-900">{activeRequestDetail.floodDepthMeters}m</span>
                  </div>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px]">FIELD CONTACT:</span>
                  <div className="font-bold text-stone-900">{activeRequestDetail.contactPerson}</div>
                  <div className="font-mono-nums text-[11px] text-stone-600">{activeRequestDetail.contactPhone}</div>
                </div>
              </div>

              {/* Supply Requirements vs Allocated Table */}
              <div>
                <h4 className="font-doodle text-base font-bold text-stone-900 mb-2">
                  Supplies Breakdown & Unmet Shortfall
                </h4>
                <div className="border border-stone-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2">Supply Item</th>
                        <th className="p-2 text-right">Requested</th>
                        <th className="p-2 text-right">Allocated</th>
                        <th className="p-2 text-right">Unmet Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-mono-nums">
                      {(['water', 'food', 'medical', 'shelter', 'hygiene'] as SupplyType[]).map(sup => {
                        const reqVal = activeRequestDetail.requiredSupplies[sup];
                        const allocVal = activeRequestDetail.allocatedSupplies[sup];
                        const unmetVal = Math.max(0, reqVal - allocVal);

                        return (
                          <tr key={sup} className="hover:bg-stone-50/50">
                            <td className="p-2 font-medium text-stone-800">
                              {SUPPLY_METAS[sup].label}
                            </td>
                            <td className="p-2 text-right">{reqVal.toLocaleString()}</td>
                            <td className="p-2 text-right font-bold text-emerald-800">{allocVal.toLocaleString()}</td>
                            <td className={`p-2 text-right font-bold ${unmetVal > 0 ? 'text-red-700' : 'text-stone-400'}`}>
                              {unmetVal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Field Notes */}
              <div className="p-3 bg-stone-50 rounded border border-stone-200">
                <span className="font-semibold text-stone-700 block mb-1">Field Assessment Notes:</span>
                <p className="text-stone-700 italic text-[11px]">"{activeRequestDetail.notes}"</p>
              </div>

              {/* Quick Adjustment to demonstrate dynamic need changes */}
              <div className="p-3 bg-amber-50/60 border border-amber-300 rounded-lg">
                <span className="font-bold text-stone-900 block mb-1.5 text-[11px]">
                  ⚡ Rapid Field Situation Update (Simulate Changing Need):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...activeRequestDetail,
                        urgency: 'CRITICAL' as UrgencyLevel,
                        floodDepthMeters: +(activeRequestDetail.floodDepthMeters + 0.4).toFixed(2),
                        accessStatus: 'CUT_OFF_ROAD' as AccessStatus,
                      };
                      setActiveRequestDetail(updated);
                      onUpdateRequest(updated);
                    }}
                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 border border-red-400 rounded font-bold text-[10px]"
                  >
                    Escalate to CRITICAL (+0.4m depth, Cut-off)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...activeRequestDetail,
                        urgency: 'HIGH' as UrgencyLevel,
                      };
                      setActiveRequestDetail(updated);
                      onUpdateRequest(updated);
                    }}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 rounded font-bold text-[10px]"
                  >
                    Set HIGH Severity
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...activeRequestDetail,
                        urgency: 'MODERATE' as UrgencyLevel,
                        accessStatus: 'ACCESSIBLE' as AccessStatus,
                      };
                      setActiveRequestDetail(updated);
                      onUpdateRequest(updated);
                    }}
                    className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-400 rounded font-bold text-[10px]"
                  >
                    Downgrade to MODERATE (Road Clear)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    const r = activeRequestDetail;
                    const smsString = `RESPONSO:REQ|${r.id}|${r.district.toUpperCase()}|${r.communityName.slice(0, 15)}|POP:${r.affectedPopulation}|URG:${r.urgency}|WTR:${r.requiredSupplies.water}|FOD:${r.requiredSupplies.food}|MED:${r.requiredSupplies.medical}|SHL:${r.requiredSupplies.shelter}|CONT:${r.contactPhone}`;
                    navigator.clipboard.writeText(smsString).then(() => {
                      alert('Copied Emergency Dispatch String to clipboard for Satellite / HF Radio / SMS transmission:\n\n' + smsString);
                    });
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Copy compact emergency dispatch string for transmission over satellite phone or HF radio in cellular dead zones"
                >
                  <span>📻 Copy Radio/SMS String</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRequestDetail(null)}
                  className="px-4 py-2 bg-stone-900 text-white font-bold rounded text-xs doodle-button cursor-pointer"
                >
                  Done & Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Assistance Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 relative">
            <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-100 border border-stone-800">
                  <DoodleBox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-doodle text-xl font-bold text-stone-900 leading-tight">
                    Register New Assistance Request
                  </h3>
                  <span className="text-xs text-stone-500">Record community location, urgency, and required items</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-900 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {Object.keys(formErrors).length > 0 && (
              <div className="mb-4 p-2.5 bg-red-50 border-2 border-red-700 rounded-md text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-bold">Please correct the highlighted form errors:</span>
                  <ul className="list-disc list-inside mt-0.5">
                    {Object.values(formErrors).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handleValidateAndSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Community / Shelter Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Johi Govt High School Relief Base"
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Geographic Sector / Zone <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formZone}
                    onChange={e => setFormZone(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    <option value="District Dadu · Western Sindh Inundation Corridor">District Dadu · Western Sindh Inundation Corridor</option>
                    <option value="District Larkana · Rice Canal Protection Bund">District Larkana · Rice Canal Protection Bund</option>
                    <option value="District Khairpur · Date Palm Canal Lowlands">District Khairpur · Date Palm Canal Lowlands</option>
                    <option value="District Badin · Left Bank Outfall Drain Delta">District Badin · Left Bank Outfall Drain Delta</option>
                    <option value="District Jamshoro · Indus Right Bank">District Jamshoro · Indus Right Bank</option>
                    <option value="District Umerkot · Thar Border Flood Basin">District Umerkot · Thar Border Flood Basin</option>
                    <option value="District Tharparkar · South Desert Depression">District Tharparkar · South Desert Depression</option>
                  </select>
                </div>
              </div>

              {/* Sindh District & Tehsil Dropdowns (STEP 1 requirement) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2.5 bg-amber-50/50 rounded border border-amber-300">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Sindh District <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formDistrict}
                    onChange={e => {
                      const newDist = e.target.value;
                      setFormDistrict(newDist);
                      const tehsils = SINDH_DISTRICT_TEHSILS[newDist]?.tehsils || [];
                      if (tehsils.length > 0) setFormTehsil(tehsils[0]);
                    }}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    {Object.keys(SINDH_DISTRICT_TEHSILS).map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Tehsil / Taluka <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formTehsil}
                    onChange={e => setFormTehsil(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    {(SINDH_DISTRICT_TEHSILS[formDistrict]?.tehsils || []).map(tehsil => (
                      <option key={tehsil} value={tehsil}>{tehsil}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Contact Person Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={e => setFormContact(e.target.value)}
                    placeholder="e.g. Mukhtiarkar Asif Memon"
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Contact Phone / Radio <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+92 (300) 554-1298"
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900 font-mono-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-stone-50 rounded border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Affected Pop. <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPop}
                    onChange={e => setFormPop(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-mono-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Households <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formHouseholds}
                    onChange={e => setFormHouseholds(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-mono-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Vulnerable
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formVuln}
                    onChange={e => setFormVuln(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-mono-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={formUrgency}
                    onChange={e => setFormUrgency(e.target.value as UrgencyLevel)}
                    className="w-full px-2 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-bold"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Flood Depth (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formDepth}
                    onChange={e => setFormDepth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-white text-stone-900 font-mono-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Access Road Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAccess('ACCESSIBLE')}
                    className={`p-2 border rounded text-center transition-colors ${
                      formAccess === 'ACCESSIBLE'
                        ? 'border-stone-900 bg-emerald-50 font-bold text-stone-900'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    Accessible Road
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAccess('CUT_OFF_ROAD')}
                    className={`p-2 border rounded text-center transition-colors ${
                      formAccess === 'CUT_OFF_ROAD'
                        ? 'border-stone-900 bg-red-50 font-bold text-stone-900'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    Road Submerged
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAccess('BOAT_ONLY')}
                    className={`p-2 border rounded text-center transition-colors ${
                      formAccess === 'BOAT_ONLY'
                        ? 'border-stone-900 bg-sky-50 font-bold text-stone-900'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    Boat / Amphibious Only
                  </button>
                </div>
              </div>

              {/* Requested Supplies Quantities */}
              <div>
                <span className="block font-bold text-stone-800 mb-1.5">
                  Requested Supplies Quantities:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-600 block">Water (L)</label>
                    <input
                      type="number"
                      min="0"
                      value={formWater}
                      onChange={e => setFormWater(Number(e.target.value))}
                      className="w-full p-1.5 border border-stone-300 rounded font-mono-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-600 block">Food (Meals)</label>
                    <input
                      type="number"
                      min="0"
                      value={formFood}
                      onChange={e => setFormFood(Number(e.target.value))}
                      className="w-full p-1.5 border border-stone-300 rounded font-mono-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-600 block">Medical Kits</label>
                    <input
                      type="number"
                      min="0"
                      value={formMedical}
                      onChange={e => setFormMedical(Number(e.target.value))}
                      className="w-full p-1.5 border border-stone-300 rounded font-mono-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-600 block">Tents</label>
                    <input
                      type="number"
                      min="0"
                      value={formShelter}
                      onChange={e => setFormShelter(Number(e.target.value))}
                      className="w-full p-1.5 border border-stone-300 rounded font-mono-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-600 block">Hygiene Packs</label>
                    <input
                      type="number"
                      min="0"
                      value={formHygiene}
                      onChange={e => setFormHygiene(Number(e.target.value))}
                      className="w-full p-1.5 border border-stone-300 rounded font-mono-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Field Assessment Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notes on vulnerable citizens, hazards, power status..."
                  className="w-full px-2.5 py-1.5 border border-stone-400 rounded bg-[#FAF7F2] text-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-stone-400 rounded text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-stone-900 text-white font-bold rounded doodle-button flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Registering Request...' : 'Submit Request to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
