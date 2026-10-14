/**
 * Responso — Offline Sync Queue Inspector Modal
 * Displays pending mutations, timestamp, status, and retry controls.
 */

import React from 'react';
import { SyncQueueItem } from '../types';
import { 
  RefreshCw, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  RotateCcw
} from 'lucide-react';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: SyncQueueItem[];
  isOnline: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
  onClearQueue: () => void;
  onRetryItem?: (id: string) => void;
  onDismissItem?: (id: string) => void;
  onRetryAllFailed?: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  isOnline,
  isSyncing,
  onSyncNow,
  onClearQueue,
  onRetryItem,
  onDismissItem,
  onRetryAllFailed,
}) => {
  if (!isOpen) return null;

  const failedItems = queue.filter(item => item.status === 'failed');

  const getOperationLabel = (item: SyncQueueItem) => {
    switch (item.type) {
      case 'CREATE_REQUEST':
        return {
          title: `Assistance Request: ${item.payload?.communityName || 'Community'}`,
          desc: `Urgency ${item.payload?.urgency} · ${item.payload?.affectedPopulation || 0} affected in ${item.payload?.district}`,
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'UPDATE_DELIVERY_STATUS':
        return {
          title: `Convoy State: ${item.payload?.deliveryId}`,
          desc: `Transitioned to status: ${item.payload?.status} (${item.payload?.note || 'Transit update'})`,
          badge: 'bg-blue-100 text-blue-900 border-blue-300',
        };
      case 'RECORD_STOCK_MOVEMENT':
        return {
          title: `Stock Adjustment: ${item.payload?.itemType?.toUpperCase()}`,
          desc: `Delta: ${item.payload?.quantityDelta > 0 ? `+${item.payload?.quantityDelta}` : item.payload?.quantityDelta} at ${item.payload?.warehouseId}`,
          badge: 'bg-purple-100 text-purple-900 border-purple-300',
        };
      default:
        return {
          title: item.type,
          desc: 'Queued operation',
          badge: 'bg-stone-100 text-stone-800 border-stone-300',
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="doodle-card bg-white w-full max-w-2xl max-h-[85vh] flex flex-col p-5 shadow-[4px_4px_0px_#1e232a]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-300 border border-stone-800 rounded">
              <Layers className="w-5 h-5 text-stone-900" />
            </div>
            <div>
              <h3 className="font-doodle text-xl font-bold text-stone-900">
                Offline Operation Sync Queue
              </h3>
              <p className="text-xs text-stone-600">
                {queue.length} operation{queue.length === 1 ? '' : 's'} stored in local offline queue
                {failedItems.length > 0 && ` · ${failedItems.length} failed`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-500 hover:text-stone-900 text-lg font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Failure alert banner */}
        {failedItems.length > 0 && (
          <div className="mb-3 p-3 bg-rose-50 border-2 border-rose-600 rounded-lg flex items-start justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Sync Failures Detected:</strong> {failedItems.length} operation{failedItems.length === 1 ? '' : 's'} encountered errors. You can retry individual operations or dismiss rejected mutations.
              </div>
            </div>
            {onRetryAllFailed && (
              <button
                type="button"
                onClick={onRetryAllFailed}
                className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[11px] shrink-0 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry All</span>
              </button>
            )}
          </div>
        )}

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {queue.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-stone-800">Queue is Clean & Synchronized</p>
              <p className="text-stone-500 text-[11px] mt-0.5">
                All field requests, deliveries, and stock adjustments are up to date with the server.
              </p>
            </div>
          ) : (
            queue.map((item, idx) => {
              const meta = getOperationLabel(item);
              const dateStr = new Date(item.timestamp).toLocaleTimeString();

              return (
                <div 
                  key={item.id} 
                  className={`p-3 border rounded-lg flex flex-col gap-1.5 transition-colors ${
                    item.status === 'failed' 
                      ? 'border-rose-400 bg-rose-50/40 hover:bg-rose-50/70' 
                      : 'border-stone-300 bg-stone-50 hover:bg-stone-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] text-stone-500">#{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badge}`}>
                        {item.type}
                      </span>
                      <span className="font-bold text-stone-900">{meta.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {item.status === 'syncing' ? (
                        <span className="text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded animate-pulse font-bold">
                          Syncing...
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded font-bold">
                          Failed
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                          Pending
                        </span>
                      )}
                      <span className="text-stone-400">· {dateStr}</span>
                    </div>
                  </div>

                  <p className="text-stone-600 text-[11px] pl-5">{meta.desc}</p>

                  {item.errorMessage && (
                    <div className="ml-5 p-2 bg-rose-100/80 border border-rose-300 rounded text-rose-900 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-700" />
                        <span>{item.errorMessage}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onRetryItem && (
                          <button
                            type="button"
                            onClick={() => onRetryItem(item.id)}
                            className="px-2 py-0.5 bg-rose-700 text-white font-bold rounded text-[10px] hover:bg-rose-800 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                        {onDismissItem && (
                          <button
                            type="button"
                            onClick={() => onDismissItem(item.id)}
                            className="px-2 py-0.5 bg-stone-200 text-stone-700 font-bold rounded text-[10px] hover:bg-stone-300 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="ml-5 flex items-center justify-between text-[9px] font-mono text-stone-400">
                    <div className="flex items-center gap-2">
                      <span>Idempotency Key: {item.idempotencyKey.slice(0, 24)}...</span>
                      <span>· Retries: {item.retries}</span>
                    </div>
                    {item.status === 'failed' && !item.errorMessage && onDismissItem && (
                      <button
                        type="button"
                        onClick={() => onDismissItem(item.id)}
                        className="text-stone-500 hover:text-rose-700 underline"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 pt-3 mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[11px]">Status: <strong>{isOnline ? 'Network Reachable' : 'Offline'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="px-3 py-1.5 text-stone-600 hover:text-rose-700 font-semibold border border-stone-300 rounded hover:bg-stone-50 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Queue</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing || queue.length === 0}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-900 font-bold border border-stone-800 rounded shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync All Now'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
