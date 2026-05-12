'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

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
          // Normalise both sides to YYYY-MM-DD before comparison so a full ISO
          // timestamp on createdAt cannot lexicographically beat a same-day
          // date-only stored value.
          const candidate = a.assessmentDate || a.createdAt.split('T')[0];
          if (candidate > existing.lastAssessment) {
            existing.lastAssessment = candidate;
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
      {/* Hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            PEOPLE · CLIENTS
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Clients
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
            {clients.length} TOTAL · {clients.reduce((sum, c) => sum + c.assessmentCount, 0)} ASSESSMENTS
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Loading…</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-bg-3 rounded-xl border border-line p-12 text-center">
            <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">No clients yet.</h3>
            <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Invite a client by email to begin.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats — mono counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-bg-3 rounded-xl border border-line p-5">
                <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Total clients</p>
                <p className="font-mono text-[40px] font-medium text-text leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{clients.length}</p>
              </div>
              <div className="bg-bg-3 rounded-xl border border-line p-5">
                <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Total assessments</p>
                <p className="font-mono text-[40px] font-medium text-gold-brand leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {clients.reduce((sum, c) => sum + c.assessmentCount, 0)}
                </p>
              </div>
            </div>

            {/* Select / Bulk actions toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-dim">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-4 h-4 rounded border-line accent-gold-brand"
                  onChange={toggleSelectAll}
                  aria-label="Select all clients"
                />
                Select all
              </label>
              {selectedNames.size > 0 && (
                <>
                  <div className="w-px h-5 bg-line" />
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    aria-label={`Delete ${selectedNames.size} selected clients`}
                    className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg bg-danger text-bg hover:opacity-90 transition-colors"
                  >
                    Delete {selectedNames.size} selected
                  </button>
                </>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-9 pr-4 rounded-lg border border-line bg-bg-3 text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
              />
            </div>

            {/* Client grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-text-dim">No clients match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((c) => (
                  <Link
                    key={c.name}
                    href={`/portal/clients/${encodeURIComponent(c.name)}`}
                    className="block bg-bg-3 rounded-xl border border-line p-6 hover:border-gold-brand/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div onClick={(e) => e.preventDefault()} className="shrink-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-line accent-gold-brand"
                          checked={selectedNames.has(c.name)}
                          onChange={() => toggleSelectOne(c.name)}
                          aria-label={`Select ${c.name}`}
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-bg-2 flex items-center justify-center text-text font-medium text-[13px] shrink-0">
                        {(c.name || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[20px] font-medium text-text tracking-[-0.015em] truncate">{c.name}</h3>
                        {c.email && (
                          <p className="text-[13px] text-text-dim truncate mt-0.5">{c.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Assessments</p>
                        <p className="font-mono text-[40px] font-medium text-gold-brand leading-none mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {c.assessmentCount}
                        </p>
                      </div>
                      <p className="text-[13px] text-text-dim">Last: {c.lastAssessment}</p>
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
