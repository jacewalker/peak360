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
  'assessment.view': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'section.edit': 'bg-gold-brand/10 text-gold-brand border-gold-brand/20',
  'report.export': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  'file.upload': 'bg-status-good/10 text-status-good border-status-good/20',
  'normative.update': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'user.manage': 'bg-danger/10 text-danger border-danger/20',
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
    <div className="min-h-screen">
      <AdminPageHeader
        title="Audit Logs"
        description="Security event log for all system actions"
        breadcrumb="Audit Logs"
        eyebrow="ADMIN · AUDIT LOGS"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-bg-3 rounded-xl border border-line p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint mb-1">User ID</label>
              <input
                type="text"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="Filter by user"
                className="px-3 py-1.5 text-[13px] bg-bg-3 text-text placeholder:text-text-faint border border-line rounded-lg w-36 focus:outline-none focus:border-gold-brand transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-1.5 text-[13px] bg-bg-3 text-text border border-line rounded-lg focus:outline-none focus:border-gold-brand transition-colors"
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint mb-1">Resource Type</label>
              <input
                type="text"
                value={filterResourceType}
                onChange={(e) => setFilterResourceType(e.target.value)}
                placeholder="e.g. assessment_section"
                className="px-3 py-1.5 text-[13px] bg-bg-3 text-text placeholder:text-text-faint border border-line rounded-lg w-44 focus:outline-none focus:border-gold-brand transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint mb-1">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-3 py-1.5 text-[13px] bg-bg-3 text-text border border-line rounded-lg focus:outline-none focus:border-gold-brand transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint mb-1">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-3 py-1.5 text-[13px] bg-bg-3 text-text border border-line rounded-lg focus:outline-none focus:border-gold-brand transition-colors"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-1.5 text-[13px] font-medium tracking-[0.02em] bg-gold-brand text-bg hover:bg-champagne rounded-lg transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-1.5 text-[13px] font-medium tracking-[0.02em] border border-line-2 text-text rounded-lg hover:border-gold-brand hover:text-gold-brand transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-3 rounded-xl border border-line overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-dim text-[13px]">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-text-dim text-[13px]">No audit log entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-bg-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Date/Time</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">User</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Action</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Resource Type</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Resource ID</th>
                    <th className="px-4 py-3 text-left font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-2/50 transition-colors">
                      <td className="px-4 py-3 text-[13px] text-text whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 text-[13px] text-text">{truncate(log.userId, 12)}</td>
                      <td className="px-4 py-3 text-[13px]">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${ACTION_BADGE_COLORS[log.action] ?? 'bg-bg-3 text-text-dim border-line'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-dim">{log.resourceType}</td>
                      <td className="px-4 py-3 text-[13px] text-text-dim font-mono">{truncate(log.resourceId, 30)}</td>
                      <td className="px-4 py-3 text-[13px] text-text-dim">{log.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-bg-2">
              <span className="text-[11px] text-text-dim">
                {pagination.total} total entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-[13px] bg-bg-3 text-text border border-line rounded-lg focus:outline-none focus:border-gold-brand transition-colors disabled:opacity-50 hover:border-gold-brand hover:text-gold-brand"
                >
                  Previous
                </button>
                <span className="text-[13px] text-text-dim">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-3 py-1.5 text-[13px] bg-bg-3 text-text border border-line rounded-lg focus:outline-none focus:border-gold-brand transition-colors disabled:opacity-50 hover:border-gold-brand hover:text-gold-brand"
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
