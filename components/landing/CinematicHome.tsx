'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Lenis from 'lenis';
import { motion, useScroll, useTransform } from 'framer-motion';
import ParticleField from '@/components/landing/ParticleField';
import {
  Stethoscope,
  Calendar,
  FileText,
  ShieldCheck,
  Layers,
  Users,
  ArrowRight,
  LogIn,
  Sparkles,
  HeartPulse,
  Building2,
  FlaskConical,
  Receipt,
  Boxes,
  Lock,
  KeyRound,
  ScrollText,
  Database,
  Star,
  Check,
  Plus,
  Minus,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Reveal-on-scroll helper                                            */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
      <Sparkles className="w-3 h-3" />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Data                                                               */
/* ------------------------------------------------------------------ */
const clinicTypes = [
  { icon: Stethoscope, label: 'Veterinary', status: 'Available now', active: true },
  { icon: HeartPulse, label: 'Dental', status: 'On the roadmap', active: false },
  { icon: Building2, label: 'General', status: 'On the roadmap', active: false },
  { icon: Sparkles, label: 'Specialty', status: 'On the roadmap', active: false },
];

const workflow = [
  { icon: Calendar, title: 'Book or walk in', text: 'Public booking and receptionist intake feed one unified queue.' },
  { icon: Stethoscope, title: 'Consult', text: 'Doctors chart vitals, diagnoses, prescriptions, labs, and documents.' },
  { icon: FlaskConical, title: 'Labs & records', text: 'Order tests and attach medical documents securely to the patient.' },
  { icon: Receipt, title: 'Invoice & pay', text: 'Tax-aware invoices, branded PDFs, and an automatic thank-you email.' },
];

const roles = [
  { icon: KeyRound, title: 'Super admin', text: 'Provision clinics, gate features, and review compliance audit logs.' },
  { icon: Building2, title: 'Clinic admin', text: 'Configure tax, branding, branches, staff, and inventory.' },
  { icon: Users, title: 'Receptionist', text: 'Owners, patients, appointments, walk-ins, and checkout.' },
  { icon: Stethoscope, title: 'Doctor', text: 'Consultation room with prescriptions, labs, and documents.' },
];

const features = [
  { icon: Calendar, title: 'Appointments & walk-ins', text: 'A single live queue from public bookings and front-desk intake.' },
  { icon: HeartPulse, title: 'Patient records', text: 'Generic patient model with metadata — built to scale past pets.' },
  { icon: FileText, title: 'Branded PDFs', text: 'Invoices and prescriptions with your logo, color, and footer.' },
  { icon: Boxes, title: 'Inventory & dispensing', text: 'Stock movements deducted automatically at checkout.' },
  { icon: FlaskConical, title: 'Labs & documents', text: 'Order tests and store medical files behind storage RLS.' },
  { icon: ScrollText, title: 'Compliance audit logs', text: 'HIPAA-ready trail for sensitive and superadmin actions.' },
];

const pricing = [
  { name: 'Trial', price: '$0', period: '30 days', features: ['1 branch', 'Core clinical flow', 'Email support'], highlight: false },
  { name: 'Pro', price: '$79', period: 'per month', features: ['Multi-branch', 'Branded PDFs*', 'Reports & inventory', 'Priority support'], highlight: true },
  { name: 'Enterprise', price: 'Custom', period: 'contact us', features: ['Everything in Pro', 'AI assistant', 'Dedicated onboarding', 'Custom SLAs'], highlight: false },
];

const reviews = [
  { quote: 'ClinixDev unified our three branches into one calm, secure workflow. Checkout and PDFs just work.', author: 'Dr. Catherine Mercer', role: 'Medical Director' },
  { quote: 'Row-level security and audited document access give us real confidence with medical data.', author: 'Dr. Alexander Fleming', role: 'Chief Practitioner' },
  { quote: 'The walk-in queue cut our waiting times dramatically. The team adopted it in a day.', author: 'Sarah Owner', role: 'Clinic Owner' },
];

const security = [
  { icon: Lock, title: 'Row-level security', text: 'Every tenant table is isolated by organization and branch.' },
  { icon: Database, title: 'Protected storage', text: 'Documents live behind storage.objects policies and signed URLs.' },
  { icon: ScrollText, title: 'Audit everything', text: 'Sensitive actions and downloads are recorded for compliance.' },
  { icon: ShieldCheck, title: 'HIPAA-ready', text: 'Architecture designed for future US human-clinic compliance.' },
];

const faqs = [
  { q: 'Which clinics can use ClinixDev today?', a: 'The MVP is purpose-built for veterinary clinics. The platform uses a generic patient model so dental, general, and specialty clinics can follow.' },
  { q: 'How do clinics get onboarded?', a: 'Clinics are provisioned by our team to guarantee secure, isolated multi-tenant setup. Request access and we will create your workspace and admin account.' },
  { q: 'Is my clinic data isolated from others?', a: 'Yes. Postgres row-level security scopes all data by organization and branch, and storage access is protected by object-level policies.' },
  { q: 'Can I brand invoices and prescriptions?', a: 'Yes — configure your logo, address, accent color, and footer. Branded PDFs are enabled per clinic by the platform.' },
  { q: 'Do you support tax/VAT?', a: 'Clinic admins configure tax name, percentage, and whether it applies to products and services from the dashboard.' },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function CinematicHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Lenis smooth scroll
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="relative bg-surface text-on-surface overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <nav className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between glass-panel mt-3 rounded-2xl border border-outline-variant/40">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/15 flex items-center justify-center rounded-xl">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="font-black tracking-tight text-lg">ClinixDev</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-on-surface-variant/80">
            <a href="#workflow" className="hover:text-primary transition-colors">Workflow</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#security" className="hover:text-primary transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container/40 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
            <Link
              href="/request-access"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-all shadow-premium"
            >
              Request access
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-28 pb-20 mesh-gradient">
        <div className="absolute inset-0">
          <ParticleField className="w-full h-full opacity-70" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          <Reveal>
            <SectionLabel>Clinic operating system</SectionLabel>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05]">
              Run your clinic with
              <span className="block bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                cinematic clarity
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-base md:text-lg text-on-surface-variant/75 max-w-2xl mx-auto leading-relaxed">
              ClinixDev is a secure, multi-tenant clinic platform — launching first for veterinary
              clinics and engineered to scale to dental, general, and specialty care.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/request-access"
                className="inline-flex items-center gap-2 bg-primary text-white px-7 py-3.5 rounded-2xl font-bold shadow-premium hover:opacity-90 transition-all"
              >
                Request access
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold border border-outline-variant/60 hover:bg-surface-container/40 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-10 flex items-center justify-center gap-6 text-xs font-semibold text-on-surface-variant/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> HIPAA-ready</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-primary" /> RLS isolation</span>
              <span className="inline-flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-primary" /> Audited access</span>
            </div>
          </Reveal>
        </motion.div>
      </section>

      {/* VET MVP POSITIONING */}
      <section className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div>
              <SectionLabel>Vet-first MVP</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">
                Purpose-built for veterinary clinics
              </h2>
              <p className="mt-4 text-on-surface-variant/75 leading-relaxed">
                Owners and pets, appointments, doctor consultations, prescriptions, lab tests,
                medical documents, inventory, and tax-aware invoicing — the full vet workflow, end
                to end. Everything sits on a generic patient model, so the same foundation grows
                with you.
              </p>
              <ul className="mt-6 space-y-3">
                {['Owner & patient management', 'Consultation room with prescriptions', 'Labs, documents & inventory', 'Branded, tax-aware invoices'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="w-5 h-5 bg-primary/15 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: HeartPulse, k: 'Patients', v: 'Unified records' },
                { icon: Receipt, k: 'Billing', v: 'Tax & VAT ready' },
                { icon: FlaskConical, k: 'Labs', v: 'Order & track' },
                { icon: FileText, k: 'Documents', v: 'Secure uploads' },
              ].map((c) => (
                <div key={c.k} className="glass-panel border border-outline-variant/40 rounded-2xl p-5 shadow-premium">
                  <c.icon className="w-6 h-6 text-primary" />
                  <p className="mt-3 font-black">{c.k}</p>
                  <p className="text-xs text-on-surface-variant/60">{c.v}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FUTURE CLINIC TYPES */}
      <section className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto text-center">
          <Reveal>
            <SectionLabel>One platform, every clinic</SectionLabel>
            <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Built to scale beyond vet</h2>
            <p className="mt-4 text-on-surface-variant/70 max-w-2xl mx-auto">
              The generic patient model and clinic-type taxonomy let ClinixDev expand without a rewrite.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clinicTypes.map((c, i) => (
              <Reveal key={c.label} delay={i * 0.06}>
                <div className={`rounded-2xl p-6 border text-left h-full ${c.active ? 'glass-panel border-primary/40 shadow-premium' : 'border-outline-variant/40 bg-surface/40'}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.active ? 'bg-primary/15' : 'bg-surface-container/40'}`}>
                    <c.icon className={`w-5 h-5 ${c.active ? 'text-primary' : 'text-on-surface-variant/50'}`} />
                  </div>
                  <p className="mt-4 font-black">{c.label}</p>
                  <p className={`text-xs mt-1 font-semibold ${c.active ? 'text-primary' : 'text-on-surface-variant/50'}`}>{c.status}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>The workflow</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">From booking to thank-you</h2>
            </div>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-4 gap-5">
            {workflow.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="relative glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium">
                  <span className="absolute -top-3 -left-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center shadow-premium">
                    {i + 1}
                  </span>
                  <s.icon className="w-6 h-6 text-primary mt-2" />
                  <p className="mt-4 font-black">{s.title}</p>
                  <p className="text-sm text-on-surface-variant/65 mt-1">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ROLE DASHBOARDS */}
      <section className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Role dashboards</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">A tailored view for every seat</h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.07}>
                <div className="glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                    <r.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="mt-4 font-black">{r.title}</p>
                  <p className="text-sm text-on-surface-variant/65 mt-1">{r.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Everything a clinic runs on</h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="group glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium hover:border-primary/40 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="mt-4 font-black">{f.title}</p>
                  <p className="text-sm text-on-surface-variant/65 mt-1">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Simple plans that scale</h2>
              <p className="mt-3 text-xs text-on-surface-variant/55">*Branded PDFs are enabled per clinic by the platform.</p>
            </div>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
            {pricing.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className={`rounded-3xl p-7 h-full border flex flex-col ${p.highlight ? 'bg-surface-container text-white border-primary/50 shadow-premium scale-[1.02]' : 'glass-panel border-outline-variant/40'}`}>
                  {p.highlight && (
                    <span className="self-start text-[10px] font-black uppercase tracking-widest bg-primary text-white px-2.5 py-1 rounded-full mb-3">Most popular</span>
                  )}
                  <p className={`font-black text-lg ${p.highlight ? 'text-white' : ''}`}>{p.name}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-black">{p.price}</span>
                    <span className={`text-xs mb-1.5 ${p.highlight ? 'text-white/60' : 'text-on-surface-variant/55'}`}>/ {p.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-white/85' : 'text-on-surface-variant/75'}`}>
                        <Check className={`w-4 h-4 ${p.highlight ? 'text-primary-light' : 'text-primary'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/request-access"
                    className={`mt-7 inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${p.highlight ? 'bg-primary text-white hover:opacity-90' : 'border border-outline-variant/60 hover:bg-surface-container/40'}`}
                  >
                    Request access
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Loved by clinics</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Trusted by care teams</h2>
            </div>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <Reveal key={r.author} delay={i * 0.08}>
                <div className="glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium flex flex-col">
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-on-surface-variant/80 leading-relaxed flex-1">“{r.quote}”</p>
                  <div className="mt-5 pt-4 border-t border-outline-variant/30">
                    <p className="font-black text-sm">{r.author}</p>
                    <p className="text-xs text-on-surface-variant/55">{r.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Security & compliance</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Designed for medical data</h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {security.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.07}>
                <div className="glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="mt-4 font-black">{s.title}</p>
                  <p className="text-sm text-on-surface-variant/65 mt-1">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Questions, answered</h2>
            </div>
          </Reveal>
          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="glass-panel border border-outline-variant/40 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="font-bold text-sm">{f.q}</span>
                    {openFaq === i ? <Minus className="w-4 h-4 text-primary flex-shrink-0" /> : <Plus className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-on-surface-variant/70 leading-relaxed">{f.a}</p>
                  </motion.div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-28 px-5 md:px-8 mesh-gradient overflow-hidden">
        <div className="absolute inset-0">
          <ParticleField className="w-full h-full opacity-50" />
        </div>
        <Reveal className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            Bring cinematic order to your clinic
          </h2>
          <p className="mt-5 text-on-surface-variant/75 max-w-xl mx-auto">
            Request access and our team will provision a secure, branded workspace tailored to your clinic.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/request-access"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-premium hover:opacity-90 transition-all"
            >
              Request access
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold border border-outline-variant/60 hover:bg-surface-container/40 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-outline-variant/40 py-10 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/15 flex items-center justify-center rounded-xl">
              <Stethoscope className="w-4 h-4 text-primary" />
            </div>
            <span className="font-black tracking-tight">ClinixDev</span>
          </div>
          <p className="text-xs text-on-surface-variant/50">© 2026 ClinixDev Inc. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs font-semibold text-on-surface-variant/70">
            <Link href="/login" className="hover:text-primary transition-colors">Sign in</Link>
            <Link href="/request-access" className="hover:text-primary transition-colors">Request access</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
