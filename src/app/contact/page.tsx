'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="v2-root">
      <div className="grain" aria-hidden="true" />
      <main className="contact-page">
        <div className="container contact-inner">
          <a href="/" className="link-mono contact-back">← Back to Peak360</a>
          <div className="eyebrow">
            <span className="eyebrow-num">08 ·</span>
            <span className="eyebrow-line" />
            <span>Begin</span>
          </div>
          <h1 className="contact-title">
            Schedule your <span className="gold-text">baseline assessment.</span>
          </h1>
          <p className="contact-sub">
            Tell us a little about yourself and we&apos;ll be in touch to book your baseline assessment.
            Your enquiry goes straight to the Peak360 team at Strong Bodies Geelong.
          </p>

          {status === 'sent' ? (
            <div className="contact-success">
              <h2>Thank you — your enquiry is on its way.</h2>
              <p>We&apos;ll be in touch shortly to schedule your baseline assessment.</p>
              <a href="/" className="btn btn-ghost btn-lg">Return Home</a>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <label className="contact-field">
                <span>Name</span>
                <input type="text" value={form.name} onChange={set('name')} required autoComplete="name" />
              </label>
              <label className="contact-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
              </label>
              <label className="contact-field">
                <span>Phone (optional)</span>
                <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </label>
              <label className="contact-field">
                <span>What are your goals?</span>
                <textarea value={form.message} onChange={set('message')} rows={5} required />
              </label>
              {status === 'error' && <p className="contact-error">{error}</p>}
              <button type="submit" className="btn btn-gold btn-lg" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
