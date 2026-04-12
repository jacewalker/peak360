import Link from 'next/link';
import Image from 'next/image';
import { montserrat, openSans } from '@/lib/fonts';

export const metadata = {
  title: 'Peak360 Longevity Program | Discover Your True Health Age',
  description: 'World-class longevity testing in Geelong. 60+ blood biomarkers, VO2 Max testing, body composition scans, and strength assessments. Optimize your healthspan with precision data.',
};

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={`${montserrat.variable} ${openSans.variable}`}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-navy-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Peak360 Logo" width={40} height={28} />
            <span className="font-heading text-lg font-bold text-white tracking-tight">
              PEAK<span className="text-gold">360</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-body text-white/60">
            <a href="#problem" className="hover:text-white transition-colors">Why Peak360</a>
            <a href="#testing" className="hover:text-white transition-colors">What We Test</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <Link
            href="/portal"
            className="text-sm font-heading font-semibold text-gold border border-gold/30 px-4 py-2 rounded-lg hover:bg-gold/10 transition-colors"
          >
            Coach Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-navy-950 via-[#0f2440] to-navy text-white pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.08),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-6 text-center py-20">
          <p className="font-body text-gold text-sm tracking-[0.3em] uppercase mb-6">World-Class Longevity Testing in Geelong</p>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            Discover Your True{' '}
            <span className="bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">Health Age</span>
          </h1>
          <p className="font-body text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto mb-4">
            Are you aging faster than you should?
          </p>
          <p className="font-body text-base text-white/50 max-w-xl mx-auto mb-10">
            Most Australians don&apos;t know their real health age. Standard GP blood tests check only 10-15 basic markers. We test 60+ biomarkers that actually predict longevity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="#pricing"
              className="font-heading font-bold text-navy bg-gold px-8 py-4 rounded-lg text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5"
            >
              Book Your Assessment
            </a>
            <a
              href="#testing"
              className="font-heading font-semibold text-white border border-white/20 px-8 py-4 rounded-lg text-lg hover:bg-white/5 transition-all"
            >
              See What We Test
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              ['60+', 'Blood Biomarkers'],
              ['VO\u2082 Max', 'On-Site Testing'],
              ['Evolt 360', 'Body Scan'],
            ].map(([stat, label]) => (
              <div key={label} className="text-center">
                <p className="font-heading text-2xl sm:text-3xl font-bold text-gold">{stat}</p>
                <p className="font-body text-xs text-white/50 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem / Philosophy */}
      <section id="problem" className="bg-white py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="font-body text-gold text-sm tracking-[0.2em] uppercase mb-4">The Peak360 Philosophy</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-6">
              We don&apos;t train people to be younger.<br />
              We train people to be <span className="text-gold">harder to age.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { title: 'Measure First', desc: 'Know exactly where you stand with precise data from 60+ biomarkers and clinical-grade testing.' },
              { title: 'Act Early', desc: 'Prevent decline before it becomes a problem. Detect insulin resistance, cardiovascular risk, and inflammation years early.' },
              { title: 'Maintain What Matters', desc: 'Preserve strength, mobility, and independence. Track real progress with quarterly reassessments.' },
            ].map((item) => (
              <div key={item.title} className="text-center p-8 rounded-2xl border border-gray-100 hover:border-gold/30 hover:shadow-lg transition-all">
                <h3 className="font-heading text-xl font-bold text-navy mb-3">{item.title}</h3>
                <p className="font-body text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-navy rounded-2xl p-8 sm:p-12 text-center">
            <h3 className="font-heading text-2xl font-bold text-gold mb-4">The Problem With Standard Testing</h3>
            <p className="font-body text-white/70 max-w-2xl mx-auto mb-8">
              Standard GP blood tests often miss critical markers. They won&apos;t catch:
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              {[
                'Early insulin resistance',
                'Hidden cardiovascular risks',
                'Fatty liver disease',
                'Hormone imbalances',
                'Chronic inflammation',
                'Nutrient deficiencies',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-white/60 font-body text-sm">
                  <span className="text-red-400 mt-0.5">&#x2717;</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What We Test */}
      <section id="testing" className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-body text-gold text-sm tracking-[0.2em] uppercase mb-4">Comprehensive Testing Protocol</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-4">What We Test</h2>
            <p className="font-body text-gray-600 max-w-2xl mx-auto">
              We go beyond standard blood tests to examine key longevity biomarkers that reveal your true biological age and health status.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Blood Biomarkers */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-navy p-5">
                <h3 className="font-heading text-lg font-bold text-white">Advanced Blood Biomarkers (60+)</h3>
              </div>
              <div className="p-6 space-y-3 font-body text-sm text-gray-700">
                {[
                  ['Fasting Insulin', 'Predicts diabetes 10 years early'],
                  ['ApoB', 'Better predictor than LDL cholesterol'],
                  ['Lp(a)', 'Genetic cardiovascular risk factor'],
                  ['hs-CRP', 'Inflammation marker'],
                  ['Advanced Lipid Panel', 'HbA1c, liver function'],
                  ['Hormones', 'Testosterone, thyroid, cortisol'],
                  ['Vitamins & Minerals', 'D, B12, folate, magnesium, iron'],
                ].map(([marker, desc]) => (
                  <div key={marker} className="flex items-start gap-3">
                    <CheckIcon />
                    <span><strong className="text-navy">{marker}</strong> &mdash; {desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VO2 Max */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gold to-yellow-500 p-5">
                <h3 className="font-heading text-lg font-bold text-navy">VO&#x2082; Max Testing (On-Site)</h3>
              </div>
              <div className="p-6 space-y-3 font-body text-sm text-gray-700">
                <p className="font-semibold text-navy">The #1 predictor of longevity</p>
                {[
                  'Cardiovascular fitness age assessment',
                  'Each 1 MET improvement = 12-15% lower mortality risk',
                  'Precise heart rate zones for optimal training',
                  'Resting metabolic rate (RMR) measurement',
                  'Early detection of cardiovascular decline',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckIcon />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="mt-4 bg-navy/5 rounded-lg p-4 text-xs text-navy/70">
                  Research shows improving VO&#x2082; Max by just 1 MET can reduce all-cause mortality by <strong className="text-gold">15%</strong>.
                </div>
              </div>
            </div>

            {/* Body Composition */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-navy p-5">
                <h3 className="font-heading text-lg font-bold text-white">Evolt 360 Body Composition</h3>
              </div>
              <div className="p-6 space-y-3 font-body text-sm text-gray-700">
                {[
                  '40+ body composition measurements in 60 seconds',
                  'Body fat percentage & visceral fat',
                  'Lean muscle mass & metabolic age',
                  'Segment-by-segment analysis',
                  'No DEXA referral needed',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckIcon />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strength */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-navy p-5">
                <h3 className="font-heading text-lg font-bold text-white">Strength & Flexibility</h3>
              </div>
              <div className="p-6 space-y-3 font-body text-sm text-gray-700">
                {[
                  'Grip strength (proven mortality predictor)',
                  'Leg press 5-RM testing',
                  'Core strength & flexibility assessment',
                  'Balance and stability with force plates',
                  'Left-right asymmetry detection',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckIcon />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Advanced */}
          <div className="bg-white rounded-2xl border border-gold/30 p-8 text-center">
            <h3 className="font-heading text-lg font-bold text-navy mb-4">Optional Advanced Testing</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 font-body text-sm text-gray-600">
              {[
                'APOE Genetics (Alzheimer\'s risk)',
                'Biological Age Testing',
                'Gut Microbiome Analysis',
                'Galleri Cancer Screening (50+ types)',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-left">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-body text-gold text-sm tracking-[0.2em] uppercase mb-4">Your Journey</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy">How It Works</h2>
          </div>
          <div className="space-y-0">
            {[
              { week: 'Week 1', title: 'Consultation & Blood Work', desc: 'Initial consultation, medical history review, and blood work requisition.' },
              { week: 'Week 2', title: 'Biomarker Analysis', desc: 'Comprehensive blood panel analysis covering 60+ longevity biomarkers.' },
              { week: 'Week 3', title: 'Physical Assessments', desc: 'Evolt 360 body scan, VO\u2082 Max testing, and strength & flexibility assessment.' },
              { week: 'Week 4', title: 'Results & Action Plan', desc: 'Deep-dive results consultation and personalized longevity plan delivery.' },
              { week: 'Ongoing', title: 'Quarterly Tracking', desc: 'Reassessments every 3 months to track progress and optimize your plan.' },
            ].map((step, i) => (
              <div key={step.week} className="flex gap-6 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
                    i === 4 ? 'bg-gold text-navy' : 'bg-navy text-white'
                  }`}>
                    {i < 4 ? i + 1 : '\u221E'}
                  </div>
                  {i < 4 && <div className="w-px h-12 bg-gray-200" />}
                </div>
                <div className="pb-8">
                  <p className="font-body text-xs text-gold font-semibold uppercase tracking-wider">{step.week}</p>
                  <h3 className="font-heading text-lg font-bold text-navy">{step.title}</h3>
                  <p className="font-body text-gray-600 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-body text-gold text-sm tracking-[0.2em] uppercase mb-4">Investment In Your Longevity</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-4">Pricing & Packages</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Tier 1 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
              <h3 className="font-heading text-sm font-bold text-navy/50 uppercase tracking-wider">Tier 1</h3>
              <p className="font-heading text-xl font-bold text-navy">Essential</p>
              <p className="font-heading text-3xl font-extrabold text-gold mt-2 mb-6">$1,295</p>
              <div className="space-y-2.5 font-body text-sm text-gray-600 flex-1">
                {['30 Core Blood Biomarkers', 'Evolt 360 Body Scan', 'VO\u2082 Max Testing', 'Strength & Flexibility Assessment', '60-Minute Results Consultation', 'Personalized Action Plan'].map((item) => (
                  <div key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></div>
                ))}
              </div>
            </div>

            {/* Tier 2 - Popular */}
            <div className="bg-white rounded-2xl border-2 border-gold shadow-lg shadow-gold/10 p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy font-heading text-xs font-bold px-4 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="font-heading text-sm font-bold text-navy/50 uppercase tracking-wider">Tier 2</h3>
              <p className="font-heading text-xl font-bold text-navy">Complete</p>
              <p className="font-heading text-3xl font-extrabold text-gold mt-2 mb-6">$2,995</p>
              <div className="space-y-2.5 font-body text-sm text-gray-600 flex-1">
                {['60+ Advanced Blood Biomarkers', 'Everything in Tier 1, PLUS:', 'CT Calcium Score (heart health)', 'Carotid IMT Ultrasound (arteries)', '90-Minute Deep-Dive Consultation'].map((item) => (
                  <div key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></div>
                ))}
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
              <h3 className="font-heading text-sm font-bold text-navy/50 uppercase tracking-wider">Tier 3</h3>
              <p className="font-heading text-xl font-bold text-navy">Elite Annual</p>
              <p className="font-heading text-3xl font-extrabold text-gold mt-2 mb-1">$8,995</p>
              <p className="font-body text-xs text-gray-400 mb-6">per year</p>
              <div className="space-y-2.5 font-body text-sm text-gray-600 flex-1">
                {['Quarterly 60+ Biomarker Testing', 'Quarterly Evolt 360 Body Scans', 'Annual VO\u2082 Max Retesting', 'APOE Genetics Testing', 'Biological Age Testing', 'Gut Microbiome Analysis', 'Quarterly 60-Min Consultations'].map((item) => (
                  <div key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></div>
                ))}
              </div>
            </div>

            {/* Tier 4 */}
            <div className="bg-navy rounded-2xl p-6 flex flex-col text-white">
              <h3 className="font-heading text-sm font-bold text-white/50 uppercase tracking-wider">Tier 4</h3>
              <p className="font-heading text-xl font-bold">Platinum</p>
              <p className="font-heading text-3xl font-extrabold text-gold mt-2 mb-1">$19,995</p>
              <p className="font-body text-xs text-white/40 mb-6">per year</p>
              <div className="space-y-2.5 font-body text-sm text-white/70 flex-1">
                {['Everything in Tier 3, PLUS:', 'Monthly Biomarker Monitoring', 'Monthly Consultations', 'Whole Genome Sequencing', 'Galleri Cancer Screening', 'Personal Training (2x/week)'].map((item) => (
                  <div key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></div>
                ))}
              </div>
            </div>
          </div>

          {/* Early Adopter */}
          <div className="bg-gradient-to-r from-gold/10 to-yellow-50 border border-gold/30 rounded-2xl p-8 text-center max-w-2xl mx-auto">
            <h3 className="font-heading text-xl font-bold text-navy mb-2">Limited Early Adopter Offer</h3>
            <p className="font-body text-sm text-gray-600 mb-4">First 20 clients receive:</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 font-body text-sm text-navy">
              <div className="flex items-center gap-2"><CheckIcon /><span>10% discount on all tiers</span></div>
              <div className="flex items-center gap-2"><CheckIcon /><span>FREE 30-min consultation</span></div>
              <div className="flex items-center gap-2"><CheckIcon /><span>Bonus longevity guidebook</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy text-center mb-12">Why Choose Peak360?</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {[
              { title: 'Local Access', desc: 'No travel to Melbourne or Sydney required. World-class testing right here in Geelong.' },
              { title: 'Australian Pricing', desc: '33-85% cheaper than US longevity clinics. Premium care at a fair price.' },
              { title: 'Evidence-Based', desc: 'Protocols from Mayo Clinic and leading longevity researchers worldwide.' },
              { title: 'In-House Testing', desc: 'All testing completed on-site. No referrals, no waiting rooms, no runaround.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <CheckIcon />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-navy">{item.title}</h3>
                  <p className="font-body text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-b from-navy via-[#0f2440] to-navy-950 text-white py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Ready to Discover Your True{' '}
            <span className="text-gold">Health Age?</span>
          </h2>
          <p className="font-body text-lg text-white/60 mb-3">Your future self will thank you.</p>
          <p className="font-body text-white/50 max-w-xl mx-auto mb-10">
            Join Peak360 and discover what your body is truly capable of. Our data-driven approach takes the guesswork out of longevity.
          </p>
          <a
            href="#pricing"
            className="inline-block font-heading font-bold text-navy bg-gold px-10 py-4 rounded-lg text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5"
          >
            Schedule Your Baseline Assessment
          </a>
          <div className="mt-16 border-t border-white/10 pt-8">
            <p className="font-heading font-bold text-lg mb-2">Strong Bodies Geelong</p>
            <p className="font-body text-sm text-white/40 mb-6">Geelong, VIC</p>
            <p className="font-heading text-xs tracking-[0.3em] uppercase text-gold/60">
              Know More. Live Longer. Optimize Everything.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
