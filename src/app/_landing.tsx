'use client';

import { useEffect, useState } from 'react';

const LOGO_SRC = '/landing/peak360-logo.png';

function Eyebrow({ children, num }: { children: React.ReactNode; num?: string }) {
  return (
    <div className="eyebrow">
      {num && <span className="eyebrow-num">{num}</span>}
      <span className="eyebrow-line" />
      <span>{children}</span>
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={'nav ' + (scrolled ? 'nav-scrolled' : '')}>
      <div className="nav-inner">
        <a href="#top" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Peak360" />
        </a>
        <ul className="nav-links">
          <li><a href="#why">Why</a></li>
          <li><a href="#test">What We Test</a></li>
          <li><a href="#process">Process</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#stories">Stories</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-cta">
          <a href="/login" className="link-mono">Client Login</a>
          <a href="#book" className="btn btn-gold">Book Assessment</a>
        </div>
      </div>
    </nav>
  );
}

function HealthAgeTeaser() {
  const [chrono, setChrono] = useState(48);
  const [lifestyle, setLifestyle] = useState(35);
  const bio = Math.round(chrono + (50 - lifestyle) * 0.16);
  const vo2 = Math.round(28 + (lifestyle / 100) * 22);
  const apoB = (lifestyle > 60 ? 0.7 : lifestyle > 30 ? 1.0 : 1.4).toFixed(2);
  const grip = Math.round(28 + (lifestyle / 100) * 30);

  return (
    <div className="teaser">
      <span className="teaser-corner tl" />
      <span className="teaser-corner tr" />
      <span className="teaser-corner bl" />
      <span className="teaser-corner br" />
      <div className="teaser-head">
        <span>Live Sample · Health Age Estimate</span>
        <span className="teaser-pulse">Tracking</span>
      </div>

      <div className="teaser-ages">
        <div className="age-block">
          <span className="age-label">Chronological</span>
          <span className="age-value">{chrono}</span>
        </div>
        <div className="age-arrow">→</div>
        <div className="age-block" style={{ textAlign: 'right' }}>
          <span className="age-label">Biological</span>
          <span className="age-value gold">{bio}</span>
        </div>
      </div>

      <div className="teaser-slider">
        <div className="teaser-slider-label">
          <span>Your Age — {chrono}</span>
          <span>20 – 75</span>
        </div>
        <input
          type="range"
          min={20}
          max={75}
          value={chrono}
          onChange={(e) => setChrono(+e.target.value)}
          className="slider"
        />
      </div>

      <div className="teaser-slider">
        <div className="teaser-slider-label">
          <span>Lifestyle Index</span>
          <span>{lifestyle < 35 ? 'Sedentary' : lifestyle < 65 ? 'Moderate' : 'Athlete'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={lifestyle}
          onChange={(e) => setLifestyle(+e.target.value)}
          className="slider"
        />
      </div>

      <div className="teaser-readout">
        <div className="readout-item">
          <span className="readout-label">VO₂ Max</span>
          <span className={'readout-value ' + (vo2 > 42 ? 'good' : vo2 > 32 ? 'warn' : 'bad')}>{vo2} ml/kg</span>
        </div>
        <div className="readout-item">
          <span className="readout-label">ApoB</span>
          <span className={'readout-value ' + (+apoB < 0.9 ? 'good' : +apoB < 1.2 ? 'warn' : 'bad')}>{apoB} g/L</span>
        </div>
        <div className="readout-item">
          <span className="readout-label">Grip</span>
          <span className={'readout-value ' + (grip > 45 ? 'good' : grip > 32 ? 'warn' : 'bad')}>{grip} kg</span>
        </div>
      </div>

      <div className="teaser-foot">
        <span className="teaser-disclaimer">Indicative · Real test, real numbers</span>
        <a href="#book" className="link-mono" style={{ color: 'var(--gold)' }}>
          Get Your Real Number →
        </a>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="hero hero-split" id="top">
      <div className="hero-inner">
        <div className="hero-copy">
          <Eyebrow num="01 ·">Geelong · Longevity Testing</Eyebrow>
          <h1 className="hero-title">
            <span className="hero-title-faint">Find your</span>
            <br />
            <span className="hero-title-gold">peak.</span>
          </h1>
          <p className="hero-lede">
            Most Australians don&apos;t know their real biological age. We test the 60+ biomarkers that actually
            predict longevity — on-site in Geelong, results in days, not months.
          </p>
          <div className="hero-ctas">
            <a href="#book" className="btn btn-gold btn-lg">Book Assessment</a>
            <a href="#test" className="btn btn-ghost btn-lg">See What We Test</a>
          </div>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="hero-meta-num">60+</span>
              <span className="hero-meta-label">Biomarkers</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-num">VO₂ Max</span>
              <span className="hero-meta-label">On-Site</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-num">3–5 days</span>
              <span className="hero-meta-label">Results</span>
            </div>
          </div>
        </div>
        <HealthAgeTeaser />
      </div>
    </header>
  );
}

function Why() {
  const items: [string, string, string][] = [
    ['Local Access', 'Geelong-based. World-class testing without the trip to Melbourne or Sydney.', '01'],
    ['Evidence-Based', 'Research-grade protocols, drawn from the leading longevity researchers worldwide.', '02'],
    ['Australian Pricing', '33–85% less than equivalent US clinics. Premium service, fair price.', '03'],
    ['In-House Testing', 'All testing on-site. No referrals, no waiting rooms, no runaround.', '04'],
  ];
  return (
    <section className="section section-2" id="why">
      <div className="container">
        <div className="section-head center">
          <Eyebrow num="02 ·">Why Peak360</Eyebrow>
          <h2 className="section-title">
            Four reasons. <span className="section-title-faint">One destination.</span>
          </h2>
        </div>
        <div className="why-grid">
          {items.map(([t, d, n]) => (
            <div key={t} className="why-card">
              <span className="why-num">{n}</span>
              <h3 className="why-title">{t}</h3>
              <p className="why-desc">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWeTest() {
  const items: [string, string, string][] = [
    ['Advanced Blood Biomarkers', '60+ markers including ApoB, Lp(a), hs-CRP, Fasting Insulin, full hormones, vitamins.', '60+ markers'],
    ['Evolt 360 Body Composition', 'Body fat, visceral fat, lean muscle, metabolic age. No DEXA referral required.', 'On-site'],
    ['VO₂ Max Testing', 'The single best longevity predictor. Lab-grade gas exchange analysis on-site.', 'Lab-grade'],
    ['Strength & Flexibility', 'Grip strength, leg press 5-RM, core, mobility — all proven mortality predictors.', 'Quarterly'],
    ['Cardiovascular Imaging', 'CT Calcium Score and Carotid IMT ultrasound for hidden heart disease.', 'Tier II+'],
    ['Genomic & Epigenetic', 'APOE genetics, biological age testing, gut microbiome, whole genome sequencing.', 'Tier III+'],
  ];
  return (
    <section className="section" id="test">
      <div className="container">
        <div className="section-head">
          <Eyebrow num="03 ·">What We Test</Eyebrow>
          <h2 className="section-title">
            Research-grade protocols. <span className="section-title-faint">Brought home to Geelong.</span>
          </h2>
        </div>
        <div className="test-layout">
          <div className="test-portrait">
            <span className="portrait-tag">Editorial portrait — member, mid-test</span>
          </div>
          <div className="test-list">
            {items.map(([t, d, m], i) => (
              <div key={t} className="test-item">
                <span className="test-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="test-title">{t}</h3>
                  <p className="test-desc">{d}</p>
                </div>
                <span className="test-meta">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps: [string, string, string][] = [
    ['Discovery Call', '30 minutes. Your goals, history, what to test. Complimentary.', 'Free'],
    ['Baseline Assessment', 'Morning visit. Bloods, Evolt 360 scan, VO₂ max, strength.', '≈ 90 min'],
    ['Results Deep-Dive', 'Your numbers, your health age, your personalised protocol.', '3–5 days'],
    ['Quarterly Review', 'Re-test what matters. Adjust protocol. Track trajectory.', 'Ongoing'],
  ];
  return (
    <section className="section section-2" id="process">
      <div className="container">
        <div className="section-head">
          <Eyebrow num="04 ·">Process</Eyebrow>
          <h2 className="section-title">
            Four steps. <span className="section-title-faint">One trajectory.</span>
          </h2>
        </div>
        <ol className="process-list">
          {steps.map(([t, d, m], i) => (
            <li key={t} className="process-step">
              <span className="process-num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="process-title">{t}</h3>
              <p className="process-desc">{d}</p>
              <span className="process-time">{m}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type Tier = {
  tag: string;
  name: string;
  price: string;
  unit?: string;
  popular?: boolean;
  featured?: boolean;
  items: string[];
};

function Pricing() {
  const tiers: Tier[] = [
    {
      tag: 'Tier I',
      name: 'Essential',
      price: '$1,295',
      items: [
        '30 Core Blood Biomarkers',
        'Evolt 360 Body Scan',
        'VO₂ Max Testing',
        'Strength & Flexibility',
        '60-min Results Consultation',
        'Personalised Action Plan',
      ],
    },
    {
      tag: 'Tier II',
      name: 'Complete',
      price: '$2,995',
      popular: true,
      items: [
        '60+ Advanced Biomarkers',
        'Everything in Tier I',
        'CT Calcium Score',
        'Carotid IMT Ultrasound',
        '90-min Deep-Dive Consult',
      ],
    },
    {
      tag: 'Tier III',
      name: 'Elite Annual',
      price: '$8,995',
      unit: '/ year',
      items: [
        'Quarterly 60+ Biomarker Testing',
        'Quarterly Evolt 360 Scans',
        'Annual VO₂ Max Re-testing',
        'APOE Genetics',
        'Biological Age Testing',
        'Gut Microbiome',
        'Quarterly Consultations',
      ],
    },
    {
      tag: 'Tier IV',
      name: 'Platinum',
      price: '$19,995',
      unit: '/ year',
      featured: true,
      items: [
        'Everything in Tier III',
        'Monthly Biomarker Monitoring',
        'Monthly Consultations',
        'Whole Genome Sequencing',
        'Galleri Cancer Screening',
        'Personal Training (2× / week)',
      ],
    },
  ];
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head center">
          <Eyebrow num="05 ·">Investment</Eyebrow>
          <h2 className="section-title">Pricing &amp; Packages</h2>
          <p className="section-sub">
            33–85% less than equivalent US longevity clinics. No hidden fees, no upsells.
          </p>
        </div>
        <div className="tier-grid">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={
                'tier ' +
                (t.popular ? 'tier-popular ' : '') +
                (t.featured ? 'tier-featured ' : '')
              }
            >
              {t.popular && <div className="tier-flag">Most Popular</div>}
              <div className="tier-tag">{t.tag}</div>
              <h3 className="tier-name">{t.name}</h3>
              <div className="tier-price">
                <span className="tier-amount">{t.price}</span>
                {t.unit && <span className="tier-unit">{t.unit}</span>}
              </div>
              <ul className="tier-list">
                {t.items.map((it) => (
                  <li key={it}>
                    <span className="tier-check" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <a href="#book" className="tier-cta">
                Begin {t.name} →
              </a>
            </article>
          ))}
        </div>
        <aside className="early-adopter">
          <div className="ea-mark">
            <span className="ea-num">20</span>
          </div>
          <div>
            <div className="ea-eyebrow">Limited — First 20 Founders Only</div>
            <h3 className="ea-title">The Founders&apos; Circle</h3>
            <p className="ea-desc">
              10% off any tier · complimentary 30-min consultation · bespoke longevity guidebook.
            </p>
          </div>
          <a href="#book" className="link-mono" style={{ color: 'var(--gold)' }}>
            Claim Place →
          </a>
        </aside>
      </div>
    </section>
  );
}

function Testimonials() {
  const items: [string, string, string][] = [
    [
      "I came in thinking I was healthy. The bloodwork said otherwise. Six months in I'm a different person — and I have the numbers to prove it.",
      'Marcus R.',
      'Member · Tier III · Geelong',
    ],
    [
      "The depth of testing is what I'd expect in Manhattan, not Geelong. The team treats you like a person, not a panel.",
      'Annabelle K.',
      'Member · Tier II · Barwon Heads',
    ],
    [
      'My biological age came back four years younger than my chronological. That conversation alone was worth the price.',
      'David L.',
      'Member · Tier IV · Newtown',
    ],
  ];
  return (
    <section className="section section-3" id="stories">
      <div className="container">
        <div className="section-head">
          <Eyebrow num="06 ·">Member Stories</Eyebrow>
          <h2 className="section-title">
            Numbers change. <span className="section-title-faint">So do lives.</span>
          </h2>
        </div>
        <div className="testimonial-grid">
          {items.map(([q, n, m]) => (
            <article key={n} className="testimonial">
              <span className="t-mark">&ldquo;</span>
              <p className="t-quote">{q}</p>
              <div className="t-byline">
                <div className="t-portrait" />
                <div>
                  <div className="t-name">{n}</div>
                  <div className="t-meta">{m}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  const items: [string, string][] = [
    ['Do I need a GP referral?', "No. All Peak360 testing is conducted in-house. We work alongside your GP if you have one, but we don't require a referral to begin."],
    ['How long does the baseline assessment take?', 'Plan for 90 minutes on-site. Bloods are drawn first thing, followed by your Evolt 360 body composition scan, VO₂ max test, and strength screen.'],
    ['When do I receive my results?', 'Bloodwork takes 3–5 business days. Body composition, VO₂ max and strength are available immediately. We schedule your deep-dive consultation once everything has returned.'],
    ["What's the difference between Tier I and Tier II?", 'Tier I covers 30 core biomarkers. Tier II expands to 60+ advanced markers and adds cardiovascular imaging — CT Calcium Score and Carotid IMT ultrasound — for a complete heart-health picture.'],
    ['Is home blood collection available?', 'Yes. We partner with iMedical for at-home phlebotomy across greater Geelong and Melbourne. There is no surcharge.'],
    ['How is biological age calculated?', "We use validated epigenetic methylation analysis (DNAm PhenoAge) for our Tier III and Tier IV members. It's the gold standard."],
  ];
  return (
    <section className="section" id="faq">
      <div className="container">
        <div className="section-head">
          <Eyebrow num="07 ·">FAQ</Eyebrow>
          <h2 className="section-title">
            Questions, <span className="section-title-faint">answered.</span>
          </h2>
        </div>
        <div className="faq-list">
          {items.map(([q, a], i) => (
            <div key={q} className={'faq-item ' + (open === i ? 'open' : '')}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="faq-num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="faq-q-text">{q}</h3>
                <span className="faq-toggle">{open === i ? '−' : '+'}</span>
              </button>
              <div className="faq-a">
                <span className="faq-a-spacer" />
                <p className="faq-a-text">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="section final" id="book">
      <div className="container final-inner">
        <Eyebrow num="08 ·">Begin</Eyebrow>
        <h2 className="final-title">
          Ready to discover your <span className="gold-text">Peak?</span>
        </h2>
        <p className="final-sub">
          Your future self will thank you. Discover what your body is truly capable of — with the data,
          the team, and the protocol to back it up.
        </p>
        <div className="final-ctas">
          <a href="#schedule" className="btn btn-gold btn-lg">Schedule Your Baseline Assessment</a>
          <a href="#call" className="btn btn-ghost btn-lg">Book a Discovery Call</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="Peak360" />
            <p>World-class longevity testing in Geelong. Operated by Strong Bodies Geelong.</p>
          </div>
          <div className="footer-col">
            <h4>Programme</h4>
            <ul>
              <li><a href="#test">What We Test</a></li>
              <li><a href="#process">Process</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#stories">Member Stories</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Studio</h4>
            <ul>
              <li><a href="#">Geelong, VIC</a></li>
              <li><a href="#">(03) 5200 0000</a></li>
              <li><a href="#">hello@peak360.com.au</a></li>
              <li><a href="#">By appointment</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">Facebook</a></li>
              <li><a href="#">Newsletter</a></li>
              <li><a href="#">Press</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bot">
          <span>© {new Date().getFullYear()} Peak360 · Strong Bodies Geelong</span>
          <div className="footer-tag">
            <span>Know more.</span>
            <span className="dot" />
            <span>Live longer.</span>
            <span className="dot" />
            <span>Optimise everything.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="v2-root">
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <Why />
        <WhatWeTest />
        <Process />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
