'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type AuditAction =
  | 'assessment.view'
  | 'section.edit'
  | 'report.export'
  | 'file.upload'
  | 'normative.update'
  | 'user.manage';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_OPTIONS: AuditAction[] = [
  'assessment.view',
  'section.edit',
  'report.export',
  'file.upload',
  'normative.update',
  'user.manage',
];

const ACTION_BADGE_COLORS: Record<string, string> = {
  'assessment.view': 'bg-blue-50 text-blue-700 border-blue-200',
  'section.edit': 'bg-amber-50 text-amber-700 border-amber-200',
  'report.export': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'file.upload': 'bg-green-50 text-green-700 border-green-200',
  'normative.update': 'bg-purple-50 text-purple-700 border-purple-200',
  'user.manage': 'bg-red-50 text-red-700 border-red-200',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const [filterAction, setFilterAction] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (filterAction) params.set('action', filterAction);
    if (filterUserId) params.set('userId', filterUserId);
    if (filterResourceType) params.set('resourceType', filterResourceType);
    if (filterDateFrom) params.set('dateFrom', filterDateFrom);
    if (filterDateTo) params.set('dateTo', filterDateTo);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setPagination(json.data.pagination);
      }
    } catch {
      // Network error — leave current state
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterUserId, filterResourceType, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [fetchLogs, currentPage]);

  function handleApplyFilters() {
    setCurrentPage(1);
    fetchLogs(1);
  }

  function handleClearFilters() {
    setFilterAction('');
    setFilterUserId('');
    setFilterResourceType('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function truncate(str: string, max: number) {
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <AdminPageHeader
        title="Audit Logs"
        description="Security event log for all system actions"
        breadcrumb="Audit Logs"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted mb-1">User ID</label>
              <input
                type="text"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="Filter by user"
                className="px-3 py-1.5 text-sm border border-border rounded-lg w-36"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg"
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted mb-1">Resource Type</label>
              <input
                type="text"
                value={filterResourceType}
                onChange={(e) => setFilterResourceType(e.target.value)}
                placeholder="e.g. assessment_section"
                className="px-3 py-1.5 text-sm border border-border rounded-lg w-44"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted mb-1">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-muted mb-1">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-1.5 text-sm font-medium bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-1.5 text-sm font-medium border border-border text-muted rounded-lg hover:bg-surface-alt transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">No audit log entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">Resource Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">Resource ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-navy whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-navy">{truncate(log.userId, 12)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${ACTION_BADGE_COLORS[log.action] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{log.resourceType}</td>
                      <td className="px-4 py-3 text-sm text-muted font-mono">{truncate(log.resourceId, 30)}</td>
                      <td className="px-4 py-3 text-sm text-muted">{log.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface">
              <span className="text-xs text-muted">
                {pagination.total} total entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
