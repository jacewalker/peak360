'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Assessment } from '@/types/assessment';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { getPeak360Rating } from '@/lib/normative/ratings';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

const TrendsTab = dynamic(() => import('./TrendsTab'), { ssr: false });

export interface MarkerTimeline {
  value: number;
  tier: RatingTier | null;
  unit: string;
}

export interface AssessmentTimeline {
  assessmentId: string;
  assessmentDate: string;
  markers: Record<string, MarkerTimeline>;
}

export interface ClientNote {
  id: string;
  clientName: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// Rating-tier marker pill colours — preserved verbatim per Phase 9 UI-SPEC §Color
// "Rating tier palette preserved verbatim".
const TIER_PILL: Record<RatingTier, string> = {
  elite: 'bg-emerald-500/10 text-emerald-300',
  great: 'bg-blue-500/10 text-blue-300',
  normal: 'bg-gray-500/10 text-text-dim',
  cautious: 'bg-amber-500/10 text-amber-300',
  poor: 'bg-red-500/10 text-red-300',
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawName = params.name as string;
  let clientName: string;
  try {
    clientName = decodeURIComponent(rawName);
  } catch {
    // Malformed %-sequence — fall back to raw segment rather than crashing
    clientName = rawName;
  }
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [timelines, setTimelines] = useState<AssessmentTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assessments' | 'trends' | 'notes'>('assessments');
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const handleStartAssessment = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName }),
      });
      const { data } = await res.json();
      // Seed Section 1 so the route's client name renders pre-filled and the
      // auto-save can't blank it back out on arrival.
      await fetch(`/api/assessments/${data.id}/sections/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { clientName } }),
      });
      router.push(`/portal/assessment/${data.id}/section/1`);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/assessments');
        const json = await res.json();
        const all: Assessment[] = json.data || [];
        const clientAssessments = all
          .filter((a) => a.clientName === clientName)
          .sort((a, b) => (a.assessmentDate || a.createdAt).localeCompare(b.assessmentDate || b.createdAt));

        setAssessments(clientAssessments);

        const sectionsNeeded = [...new Set(REPORT_MARKERS.map((m) => m.section))];
        const timelineResults: AssessmentTimeline[] = await Promise.all(
          clientAssessments.map(async (a) => {
            const sectionData: Record<number, Record<string, unknown>> = {};

            const sectionsToFetch = [1, ...sectionsNeeded];
            const results = await Promise.all(
              sectionsToFetch.map((s) =>
                fetch(`/api/assessments/${a.id}/sections/${s}`)
                  .then((r) => r.json())
                  .then((j) => ({ section: s, data: j.data || {} }))
                  .catch(() => ({ section: s, data: {} }))
              )
            );
            results.forEach((r) => { sectionData[r.section] = r.data; });

            const age = (sectionData[1]?.clientAge as number) || null;
            const gender = (sectionData[1]?.clientGender as string) || null;

            const markers: Record<string, MarkerTimeline> = {};
            for (const m of REPORT_MARKERS) {
              const blob = sectionData[m.section];
              if (!blob) continue;
              const raw = blob[m.dataKey];
              const value = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw !== '' ? Number(raw) : null);
              if (value == null || isNaN(value)) continue;

              const rating = m.hasNorms
                ? getPeak360Rating(m.testKey, value, age ?? undefined, gender ?? undefined)
                : null;
              markers[m.testKey] = {
                value,
                tier: rating?.tier ?? null,
                unit: rating?.unit || m.fallbackUnit || '',
              };
            }

            return {
              assessmentId: a.id,
              assessmentDate: a.assessmentDate || a.createdAt.split('T')[0],
              markers,
            };
          })
        );

        setTimelines(timelineResults);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientName]);

  // Lazy-load notes the first time the Notes tab is opened.
  useEffect(() => {
    if (tab !== 'notes' || notesLoaded) return;
    async function loadNotes() {
      setNotesLoading(true);
      try {
        const res = await fetch(`/api/client-notes?client=${encodeURIComponent(clientName)}`);
        const json = await res.json();
        setNotes(json.data || []);
      } catch {
        setNotes([]);
      } finally {
        setNotesLoading(false);
        setNotesLoaded(true);
      }
    }
    loadNotes();
  }, [tab, notesLoaded, clientName]);

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body || notesSaving) return;
    setNotesSaving(true);
    try {
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: clientName, body }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => [json.data as ClientNote, ...prev]);
        setNoteBody('');
      }
    } finally {
      setNotesSaving(false);
    }
  };

  const clientEmail = assessments[0]?.clientEmail || '';
  const clientGender = assessments[0]?.clientGender || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/portal/clients" className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[13px] mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to clients
          </Link>
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            CLIENT · {clientName.toUpperCase()}
          </MonoEyebrow>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-bg-2 border border-line flex items-center justify-center text-[20px] font-medium text-text">
                {(clientName || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">{clientName}</h1>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                  {clientEmail && <>{clientEmail.toUpperCase()} · </>}
                  {clientGender && <>{clientGender.toUpperCase()} · </>}
                  {assessments.length} ASSESSMENT{assessments.length !== 1 ? 'S' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleStartAssessment}
              disabled={creating}
              aria-label={`Start assessment for ${clientName}`}
              className="bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em] px-6 py-3 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Starting…' : 'Start assessment'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-line bg-bg-2 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-6">
          <button
            onClick={() => setTab('assessments')}
            className={`py-3 text-[13px] font-medium tracking-[0.02em] border-b-2 transition-colors ${
              tab === 'assessments'
                ? 'border-gold-brand text-text'
                : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            Assessments
          </button>
          <button
            onClick={() => setTab('trends')}
            className={`py-3 text-[13px] font-medium tracking-[0.02em] border-b-2 transition-colors ${
              tab === 'trends'
                ? 'border-gold-brand text-text'
                : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            Trends &amp; Analytics
          </button>
          <button
            onClick={() => setTab('notes')}
            className={`py-3 text-[13px] font-medium tracking-[0.02em] border-b-2 transition-colors ${
              tab === 'notes'
                ? 'border-gold-brand text-text'
                : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            Notes
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'assessments' && (
          assessments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[13px] text-text-dim">No assessments found for this client.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((a, idx) => {
                const timeline = timelines[idx];
                const tierCounts: Record<string, number> = {};
                if (timeline) {
                  Object.values(timeline.markers).forEach((m) => {
                    if (m.tier) tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
                  });
                }
                return (
                  <Link
                    key={a.id}
                    href={`/portal/assessment/${a.id}/section/${a.currentSection}`}
                    className="block bg-bg-3 rounded-xl border border-line p-6 hover:border-gold-brand/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-text">
                          {a.assessmentDate || a.createdAt.split('T')[0]}
                        </span>
                        <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ${
                          a.status === 'completed'
                            ? 'bg-status-good/10 text-status-good'
                            : 'bg-gold-brand/10 text-gold-brand'
                        }`}>
                          {a.status === 'completed' ? 'COMPLETED' : `SECTION ${a.currentSection}/11`}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-text-faint group-hover:text-gold-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                    {Object.keys(tierCounts).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) =>
                          tierCounts[tier] ? (
                            <span key={tier} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TIER_PILL[tier]}`}>
                              {tierCounts[tier]} {TIER_LABELS[tier]}
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )
        )}

        {tab === 'trends' && (
          timelines.length < 2 ? (
            <div className="bg-bg-3 rounded-xl border border-line p-12 text-center">
              <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Not enough data for trends.</h3>
              <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">
                Trends will appear once this client has two or more assessments with recorded metrics.
              </p>
            </div>
          ) : (
            <TrendsTab timelines={timelines} clientName={clientName} />
          )
        )}

        {tab === 'notes' && (
          <div className="space-y-6">
            {/* Add note */}
            <div className="bg-bg-3 rounded-xl border border-line p-6">
              <MonoEyebrow as="div" className="mb-3">ADD A NOTE</MonoEyebrow>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={4}
                placeholder="Write a note about this client…"
                className="w-full bg-bg-2 border border-line rounded-lg px-3 py-2.5 text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand/50 transition-colors resize-y"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddNote}
                  disabled={!noteBody.trim() || notesSaving}
                  className="bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em] px-5 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {notesSaving ? 'Adding…' : 'Add note'}
                </button>
              </div>
            </div>

            {/* History */}
            {notesLoading ? (
              <div className="text-center py-12">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Loading notes…</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[13px] text-text-dim">No notes yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-bg-3 rounded-xl border border-line p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[13px] font-medium text-text">{note.authorName}</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
                        {new Date(note.createdAt).toLocaleString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] text-text-dim leading-[1.55] whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
