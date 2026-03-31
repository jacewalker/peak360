'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

interface Client {
  name: string;
  email: string;
  gender: string | null;
  dob: string | null;
  assessmentCount: number;
  lastAssessment: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rawAssessments, setRawAssessments] = useState<Array<{ id: string; clientName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/assessments');
      const res = await r.json();
      const data = res.data || [];
      setRawAssessments(data);
      const byClient = new Map<string, Client>();
      for (const a of data) {
        const name = a.clientName || 'Unnamed Client';
        const existing = byClient.get(name);
        if (existing) {
          existing.assessmentCount++;
          if (a.assessmentDate > existing.lastAssessment || a.createdAt > existing.lastAssessment) {
            existing.lastAssessment = a.assessmentDate || a.createdAt.split('T')[0];
          }
          if (!existing.email && a.clientEmail) existing.email = a.clientEmail;
          if (!existing.gender && a.clientGender) existing.gender = a.clientGender;
          if (!existing.dob && a.clientDob) existing.dob = a.clientDob;
        } else {
          byClient.set(name, {
            name,
            email: a.clientEmail || '',
            gender: a.clientGender || null,
            dob: a.clientDob || null,
            assessmentCount: 1,
            lastAssessment: a.assessmentDate || a.createdAt.split('T')[0],
          });
        }
      }
      setClients(Array.from(byClient.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear selection when search changes
  useEffect(() => {
    setSelectedNames(new Set());
  }, [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clients, search]);

  // Indeterminate state for select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected = selectedNames.size === filtered.length && filtered.length > 0;
      const someSelected = selectedNames.size > 0 && selectedNames.size < filtered.length;
      selectAllRef.current.indeterminate = someSelected;
      selectAllRef.current.checked = allSelected;
    }
  }, [selectedNames, filtered]);

  const toggleSelectAll = () => {
    if (selectedNames.size === filtered.length) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(filtered.map((c) => c.name)));
    }
  };

  const toggleSelectOne = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    // Map selected client names to their assessment IDs
    const ids = rawAssessments
      .filter((a) => selectedNames.has(a.clientName || 'Unnamed Client'))
      .map((a) => a.id);

    try {
      await fetch('/api/assessments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setSelectedNames(new Set());
      setShowDeleteModal(false);
      await fetchData();
    } catch {
      // error handled by modal
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header banner */}
      <div className="bg-gradient-to-b from-navy-dark to-navy py-10 sm:py-14 text-white">
        <div className="max-w-4xl mx-auto pl-14 pr-4 sm:px-6 lg:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Clients</h2>
          <p className="text-white/60 mt-2 text-base">
            All clients from your assessments
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="text-center text-muted py-12">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-lg text-foreground mb-1">No clients yet</p>
            <p className="text-sm text-muted">
              Clients will appear here once you create assessments.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-navy">{clients.length}</p>
                <p className="text-xs text-muted font-medium mt-0.5">Total Clients</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-gold">
                  {clients.reduce((sum, c) => sum + c.assessmentCount, 0)}
                </p>
                <p className="text-xs text-muted font-medium mt-0.5">Total Assessments</p>
              </div>
            </div>

            {/* Select / Bulk actions toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-navy accent-navy"
                  onChange={toggleSelectAll}
                />
                Select all
              </label>
              {selectedNames.size > 0 && (
                <>
                  <div className="w-px h-5 bg-border" />
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete {selectedNames.size} selected
                  </button>
                </>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all"
              />
            </div>

            {/* Client list */}
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted">No clients match &quot;{search}&quot;</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <Link
                    key={c.name}
                    href={`/clients/${encodeURIComponent(c.name)}`}
                    className="block bg-white rounded-xl border border-border p-4 sm:p-5 hover:shadow-md hover:border-gold/30 transition-all"
                  >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div onClick={(e) => e.preventDefault()} className="shrink-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-navy accent-navy"
                        checked={selectedNames.has(c.name)}
                        onChange={() => toggleSelectOne(c.name)}
                      />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy font-bold text-sm shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-navy truncate">{c.name}</div>
                      <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
                        {c.email && (
                          <>
                            <span className="truncate">{c.email}</span>
                            <span className="text-border">&bull;</span>
                          </>
                        )}
                        <span>
                          {c.assessmentCount} assessment{c.assessmentCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-border">&bull;</span>
                        <span>Last: {c.lastAssessment}</span>
                      </div>
                    </div>
                  </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemCount={selectedNames.size}
        itemLabel="client"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
