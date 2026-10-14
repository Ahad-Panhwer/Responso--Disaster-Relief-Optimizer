import React, { useState } from 'react';
import { UserAccount, AuditLogEvent, UserRole } from '../types';
import { 
  ShieldCheck, 
  Users, 
  History, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Lock 
} from 'lucide-react';
import { DoodleEmptyIllustration } from '../components/DoodleIcons';

import { RotateCcw } from 'lucide-react';

interface AdminAuditViewProps {
  users: UserAccount[];
  auditLogs: AuditLogEvent[];
  onToggleUserStatus: (userId: string) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onResetDemoData?: () => void;
  initialTab?: 'users' | 'audit';
  currentUser?: UserAccount | null;
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({
  users,
  auditLogs,
  onToggleUserStatus,
  onUpdateUserRole,
  onResetDemoData,
  initialTab = 'audit',
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>(initialTab);
  const [auditCategory, setAuditCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  const filteredLogs = auditLogs.filter(log => {
    const matchesCategory = auditCategory === 'ALL' || log.category === auditCategory;
    const matchesSearch = 
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'LOGISTICS_COORDINATOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Logistics Coordinator</span>;
      case 'FIELD_DISPATCHER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">Field Dispatcher</span>;
      case 'INVENTORY_MANAGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Inventory Manager</span>;
      case 'SYSTEM_ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">System Admin / Auditor</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="font-doodle text-2xl font-bold text-stone-900 leading-tight">
            Security, Permissions & Audit Trail
          </h2>
          <p className="text-xs text-stone-600">
            Immutable operation event history, role-based access control, and compliance logs.
          </p>
        </div>

        {/* Tab Toggle & Reset Button */}
        <div className="flex flex-wrap items-center gap-2">
          {onResetDemoData && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 border-2 border-stone-800 text-xs font-bold text-red-800 doodle-button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset demo data</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-white border border-stone-800 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                activeTab === 'audit'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History Log</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                activeTab === 'users'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts & Roles</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="doodle-card bg-white w-full max-w-md p-5 relative border-2 border-stone-800 shadow-[4px_4px_0px_#1e232a]">
            <h3 className="font-doodle text-xl font-bold text-stone-900 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-600" />
              <span>Reset Demo Data to Defaults?</span>
            </h3>
            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              This will erase current localStorage state and restore the original baseline Sindh disaster relief dataset (12 requests, 3 warehouse depots, baseline delivery convoys, and initial audit logs).
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 border border-stone-300 rounded text-stone-700 text-xs font-semibold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetDemoData?.();
                }}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded text-xs doodle-button"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' ? (
        /* Audit Logs View */
        <div className="space-y-4">
          <div className="doodle-card p-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search audit events, actors, or details..."
                className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-semibold">Category:</span>
              <select
                value={auditCategory}
                onChange={e => setAuditCategory(e.target.value)}
                className="border border-stone-300 rounded px-2 py-1 bg-white text-stone-800 font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="ALLOCATION">Allocation</option>
                <option value="INVENTORY">Inventory</option>
                <option value="REQUEST">Request</option>
                <option value="DISPATCH">Dispatch</option>
                <option value="SECURITY">Security</option>
              </select>
            </div>
          </div>

          <div className="doodle-card overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] border-b-2 border-stone-800 text-stone-800 font-bold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor & Role</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredLogs.map((log, index) => (
                    <tr key={`${log.id}-${index}`} className="hover:bg-stone-50">
                      <td className="p-3 font-mono-nums text-stone-600 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-stone-900 text-xs">{log.actorName}</div>
                        <div className="text-[10px] text-stone-500">{log.actorRole.replace('_', ' ')}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono-nums font-bold text-xs bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded text-stone-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wide">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-3 text-stone-800 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Users & Roles Management View */
        <div className="space-y-4">
          <div className="doodle-card overflow-hidden bg-white">
            <div className="p-4 bg-[#FAF7F2] border-b-2 border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-doodle text-lg font-bold text-stone-900">
                  Team Members & Operational Roles
                </h3>
                <span className="text-xs text-stone-500">
                  Manage permissions, active/suspended state, and operational divisions.
                </span>
              </div>
            </div>

            {!isAdmin && (
              <div className="p-3 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Viewing team roles as <strong>{currentUser?.role || 'Guest'}</strong>. Changing roles and modifying account statuses is restricted to System Administrators.
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-50 border-b border-stone-300 text-stone-700 font-bold">
                  <tr>
                    <th className="p-3">User & Email</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {users.map((user, index) => (
                    <tr key={`${user.id}-${index}`} className="hover:bg-stone-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs">
                            {user.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 text-xs">{user.name}</div>
                            <div className="text-[11px] text-stone-500 font-mono-nums">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {isAdmin ? (
                          <select
                            value={user.role}
                            onChange={e => onUpdateUserRole(user.id, e.target.value as UserRole)}
                            className="border border-stone-300 rounded px-2 py-1 bg-white text-xs font-semibold text-stone-800"
                          >
                            <option value="LOGISTICS_COORDINATOR">Logistics Coordinator</option>
                            <option value="FIELD_DISPATCHER">Field Dispatcher</option>
                            <option value="INVENTORY_MANAGER">Inventory Manager</option>
                            <option value="SYSTEM_ADMIN">System Admin</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {getRoleBadge(user.role)}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-stone-700 font-medium">
                        {user.department}
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          user.active 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {user.active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => onToggleUserStatus(user.id)}
                            className={`px-3 py-1 text-xs font-semibold rounded border ${
                              user.active
                                ? 'border-red-400 text-red-700 hover:bg-red-50'
                                : 'border-emerald-400 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {user.active ? 'Suspend Account' : 'Activate Account'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> Admin Only
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Reference Card */}
          <div className="doodle-card p-4 bg-[#FAF7F2]">
            <h4 className="font-doodle text-base font-bold text-stone-900 mb-2">
              Role Authority Matrix:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white border border-stone-300 rounded">
                <strong className="text-stone-900 block mb-1">Logistics Coordinator:</strong>
                <p className="text-stone-600 text-[11px]">Can run optimization algorithms, tune weights, approve allocation runs, and authorize vehicle departures.</p>
              </div>
              <div className="p-3 bg-white border border-stone-300 rounded">
                <strong className="text-stone-900 block mb-1">Field Dispatcher:</strong>
                <p className="text-stone-600 text-[11px]">Can register emergency assistance requests, update road access conditions, and inspect shelter statuses.</p>
              </div>
              <div className="p-3 bg-white border border-stone-300 rounded">
                <strong className="text-stone-900 block mb-1">Inventory Manager:</strong>
                <p className="text-stone-600 text-[11px]">Can adjust warehouse stock with audit justifications, monitor supplies, and manage bay staging.</p>
              </div>
              <div className="p-3 bg-white border border-stone-300 rounded">
                <strong className="text-stone-900 block mb-1">System Admin:</strong>
                <p className="text-stone-600 text-[11px]">Full platform access, audit trail inspection, user account lifecycle, and security management.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
