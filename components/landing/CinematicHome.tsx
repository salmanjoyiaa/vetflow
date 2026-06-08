'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import ParticleField from '@/components/landing/ParticleField';
import DashboardMockup from '@/components/landing/DashboardMockup';
import StickyShowcase from '@/components/landing/StickyShowcase';
import StatCounter from '@/components/landing/StatCounter';
import {
  Stethoscope,
  Calendar,
  FileText,
  ShieldCheck,
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
  Menu,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
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

const NAV_LINKS = [
  { href: '#workflow', label: 'Workflow' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#security', label: 'Security' },
];

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
  { icon: Calendar, title: 'Appointments & walk-ins', text: 'A single live queue from public bookings and front-desk intake.', span: 'sm:col-span-2' },
  { icon: HeartPulse, title: 'Patient records', text: 'Generic patient model with metadata — built to scale past pets.', span: '' },
  { icon: FileText, title: 'Branded PDFs', text: 'Invoices and prescriptions with your logo, color, and footer.', span: '' },
  { icon: Boxes, title: 'Inventory & dispensing', text: 'Stock movements deducted automatically at checkout.', span: 'sm:col-span-2' },
  { icon: FlaskConical, title: 'Labs & documents', text: 'Order tests and store medical files behind storage RLS.', span: '' },
  { icon: ScrollText, title: 'Compliance audit logs', text: 'HIPAA-ready trail for sensitive and superadmin actions.', span: '' },
];

const pricing = [
  { name: 'Trial', price: '$0', period: '30 days', features: ['1 branch', 'Core clinical flow', 'Email support'], highlight: false },
  { name: 'Pro', price: '$79', period: 'per month', features: ['Multi-branch', 'Branded PDFs*', 'Reports & inventory', 'Priority support'], highlight: true },
  { name: 'Enterprise', price: 'Custom', period: 'contact us', features: ['Everything in Pro', 'AI assistant', 'Dedicated onboarding', 'Custom SLAs'], highlight: false },
];

const reviews = [
  { quote: 'Early access gave us one calm workflow across intake, consult, and checkout — without juggling spreadsheets.', author: 'Veterinary clinic partner', role: 'Early access · 3-branch group' },
  { quote: 'Row-level security and audited document access were non-negotiable for us. ClinixDev delivered from day one.', author: 'Practice administrator', role: 'Early access · urban clinic' },
  { quote: 'The walk-in queue was intuitive enough that front desk adopted it within a single shift.', author: 'Clinic operations lead', role: 'Early access · suburban clinic' },
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

const TRUST_BADGES = ['HIPAA-ready', 'RLS isolation', 'Audited access', 'Multi-tenant', 'Branded PDFs', 'Tax-aware billing'];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function CinematicHome() {
  const reduceMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const { scrollYProgress: pageProgress } = useScroll({ target: mainRef, offset: ['start start', 'end end'] });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0]);
  const mockupY = useTransform(heroProgress, [0, 1], [0, 60]);

  useEffect(() => {
    if (reduceMotion) return;
    document.documentElement.classList.add('lenis');
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
      document.documentElement.classList.remove('lenis');
    };
  }, [reduceMotion]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main ref={mainRef} className="relative bg-surface text-on-surface overflow-x-hidden">
      {/* Scroll progress */}
      <motion.div className="scroll-progress-bar" style={{ scaleX: pageProgress, transformOrigin: 'left' }} />

      {/* Aurora + orbs */}
      <div className="aurora-bg" aria-hidden="true" />
      <div className="floating-orb-1 top-20 left-10" aria-hidden="true" />
      <div className="floating-orb-2 top-40 right-20" aria-hidden="true" />
      <div className="floating-orb-3 bottom-40 left-1/3" aria-hidden="true" />

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <nav
          className={`max-w-7xl mx-auto px-5 md:px-8 py-3 md:py-4 flex items-center justify-between glass-panel mt-3 rounded-2xl border border-outline-variant/40 transition-all duration-300 ${
            navScrolled ? 'nav-scrolled mt-2 py-2.5' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/15 flex items-center justify-center rounded-xl">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="font-black tracking-tight text-lg font-[family-name:var(--font-display)]">ClinixDev</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-on-surface-variant/80">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container/40 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
            <Link
              href="/request-access"
              className="btn-sheen inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 transition-all shadow-premium"
            >
              Request access
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <button
            type="button"
            className="md:hidden p-2 rounded-xl hover:bg-surface-container/40"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <motion.div
              className="mobile-menu-backdrop"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="mobile-menu-panel p-6 flex flex-col gap-6"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-lg">ClinixDev</span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-semibold text-on-surface-variant hover:text-primary"
                >
                  {l.label}
                </a>
              ))}
              <Link href="/login" className="text-sm font-bold py-2.5 rounded-xl border border-outline-variant/60 text-center">
                Sign in
              </Link>
              <Link href="/request-access" className="text-sm font-bold py-2.5 rounded-xl bg-primary text-on-primary text-center">
                Request access
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-[var(--landing-nav-height)] pb-16 mesh-gradient overflow-hidden">
        <div className="absolute inset-0">
          <ParticleField className="w-full h-full opacity-50" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div style={{ y: heroY, opacity: heroOpacity }}>
              <Reveal>
                <SectionLabel>Clinic operating system</SectionLabel>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] font-[family-name:var(--font-display)]">
                  Run your clinic with
                  <span className="block gradient-text">cinematic clarity</span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 text-base md:text-lg text-on-surface-variant/75 max-w-xl leading-relaxed">
                  ClinixDev is a secure, multi-tenant clinic platform — launching first for veterinary
                  clinics and engineered to scale to dental, general, and specialty care.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-9 flex flex-col sm:flex-row items-start gap-3">
                  <Link
                    href="/request-access"
                    className="btn-sheen inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-3.5 rounded-2xl font-bold shadow-premium hover:opacity-90 transition-all"
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
                <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-on-surface-variant/60">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> HIPAA-ready</span>
                  <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-primary" /> RLS isolation</span>
                  <span className="inline-flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-primary" /> Audited access</span>
                </div>
              </Reveal>
            </motion.div>

            <motion.div style={{ y: mockupY }} className="relative">
              <div className="absolute -inset-6 bg-primary/10 rounded-3xl blur-3xl pointer-events-none animate-pulse-glow" />
              <Reveal delay={0.2}>
                <DashboardMockup variant="overview" enableTilt className="animate-floatSlow" />
              </Reveal>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="cinematic-scroll-hint text-on-surface-variant">Scroll</span>
          <div className="cinematic-scroll-line" />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative py-16 border-y border-outline-variant/30 bg-surface-container/20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <StatCounter value={4} label="Role dashboards" />
            <StatCounter value={100} suffix="%" label="Audited actions" />
            <StatCounter value={100} suffix="%" label="RLS on every table" />
            <StatCounter value={30} suffix="-day trial" label="Free access" />
          </div>
          <div className="overflow-hidden">
            <div className="marquee-track gap-8">
              {[...TRUST_BADGES, ...TRUST_BADGES].map((badge, i) => (
                <span
                  key={`${badge}-${i}`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest whitespace-nowrap px-4"
                >
                  <Check className="w-3.5 h-3.5 text-primary/60" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VET MVP — BENTO */}
      <section className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <SectionLabel>Vet-first MVP</SectionLabel>
            <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
              Purpose-built for veterinary clinics
            </h2>
            <p className="mt-4 text-on-surface-variant/75 max-w-2xl leading-relaxed">
              Owners and pets, appointments, doctor consultations, prescriptions, lab tests,
              medical documents, inventory, and tax-aware invoicing — the full vet workflow, end to end.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            <Reveal className="sm:col-span-2 lg:row-span-2">
              <div className="bento-tile glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium flex flex-col justify-between">
                <div>
                  <HeartPulse className="w-8 h-8 text-primary" />
                  <p className="mt-4 text-xl font-black">Complete patient lifecycle</p>
                  <p className="mt-2 text-sm text-on-surface-variant/65 leading-relaxed">
                    From first appointment to final invoice — every touchpoint in one secure platform.
                  </p>
                </div>
                <ul className="mt-6 space-y-2">
                  {['Owner & patient management', 'Consultation room with prescriptions', 'Labs, documents & inventory'].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm font-semibold">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            {[
              { icon: Receipt, k: 'Billing', v: 'Tax & VAT ready' },
              { icon: FlaskConical, k: 'Labs', v: 'Order & track' },
              { icon: FileText, k: 'Documents', v: 'Secure uploads' },
            ].map((c, i) => (
              <Reveal key={c.k} delay={i * 0.06}>
                <div className="bento-tile glass-panel border border-outline-variant/40 rounded-2xl p-5 h-full shadow-premium">
                  <c.icon className="w-6 h-6 text-primary" />
                  <p className="mt-3 font-black">{c.k}</p>
                  <p className="text-xs text-on-surface-variant/60">{c.v}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CLINIC TYPES */}
      <section className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto text-center">
          <Reveal>
            <SectionLabel>One platform, every clinic</SectionLabel>
            <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
              Built to scale beyond vet
            </h2>
            <p className="mt-4 text-on-surface-variant/70 max-w-2xl mx-auto">
              The generic patient model and clinic-type taxonomy let ClinixDev expand without a rewrite.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clinicTypes.map((c, i) => (
              <Reveal key={c.label} delay={i * 0.06}>
                <div
                  className={`bento-tile rounded-2xl p-6 border text-left h-full ${
                    c.active
                      ? 'glass-panel border-primary/40 shadow-premium animate-border-glow'
                      : 'border-outline-variant/40 bg-surface/40'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.active ? 'bg-primary/15' : 'bg-surface-container/40'}`}>
                    <c.icon className={`w-5 h-5 ${c.active ? 'text-primary' : 'text-on-surface-variant/50'}`} />
                  </div>
                  <p className="mt-4 font-black">{c.label}</p>
                  <p className={`text-xs mt-1 font-semibold ${c.active ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                    {c.status}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STICKY SHOWCASE */}
      <StickyShowcase />

      {/* WORKFLOW STEPPER */}
      <section id="workflow" className="relative pt-12 lg:pt-16 pb-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>The workflow</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                From booking to thank-you
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 relative">
            <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-outline-variant/40 -translate-x-1/2" />
            <div className="grid md:grid-cols-2 gap-8">
              {workflow.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                  <div className={`flex gap-4 ${i % 2 === 1 ? 'md:flex-row-reverse md:text-right' : ''}`}>
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-premium">
                        <s.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="bento-tile glass-panel border border-outline-variant/40 rounded-2xl p-5 flex-1 shadow-premium">
                      <p className="font-black">{s.title}</p>
                      <p className="text-sm text-on-surface-variant/65 mt-1">{s.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROLE DASHBOARDS */}
      <section className="relative py-24 px-5 md:px-8 bg-surface-container/20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Role dashboards</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                A tailored view for every seat
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.07}>
                <div className="bento-tile hover-lift glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium">
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

      {/* FEATURES BENTO */}
      <section id="features" className="relative py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                Everything a clinic runs on
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06} className={f.span}>
                <div className="group bento-tile hover-lift glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium hover-glow">
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
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                Simple plans that scale
              </h2>
              <p className="mt-3 text-xs text-on-surface-variant/55">*Branded PDFs are enabled per clinic by the platform.</p>
            </div>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
            {pricing.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div
                  className={`rounded-3xl p-7 h-full border flex flex-col transition-all ${
                    p.highlight
                      ? 'bg-surface-container-high border-primary/50 shadow-premium scale-[1.02] animate-border-glow'
                      : 'glass-panel border-outline-variant/40 bento-tile'
                  }`}
                >
                  {p.highlight && (
                    <span className="self-start text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary px-2.5 py-1 rounded-full mb-3">
                      Most popular
                    </span>
                  )}
                  <p className="font-black text-lg">{p.name}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-black">{p.price}</span>
                    <span className="text-xs mb-1.5 text-on-surface-variant/55">/ {p.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant/75">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/request-access"
                    className={`btn-sheen mt-7 inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                      p.highlight
                        ? 'bg-primary text-on-primary hover:opacity-90'
                        : 'border border-outline-variant/60 hover:bg-surface-container/40'
                    }`}
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
              <SectionLabel>Early access partners</SectionLabel>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                Built with real clinics
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <Reveal key={r.author} delay={i * 0.08}>
                <div className="bento-tile hover-lift glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium flex flex-col">
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-on-surface-variant/80 leading-relaxed flex-1">&ldquo;{r.quote}&rdquo;</p>
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
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                Designed for medical data
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {security.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.07}>
                <div className="bento-tile hover-lift glass-panel border border-outline-variant/40 rounded-2xl p-6 h-full shadow-premium">
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
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight font-[family-name:var(--font-display)]">
                Questions, answered
              </h2>
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
                    {openFaq === i ? (
                      <Minus className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
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
          <ParticleField className="w-full h-full opacity-40" />
        </div>
        <Reveal className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight font-[family-name:var(--font-display)]">
            Bring cinematic order to your clinic
          </h2>
          <p className="mt-5 text-on-surface-variant/75 max-w-xl mx-auto">
            Request access and our team will provision a secure, branded workspace tailored to your clinic.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/request-access"
              className="btn-sheen inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold shadow-premium hover:opacity-90 transition-all"
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
            <span className="font-black tracking-tight font-[family-name:var(--font-display)]">ClinixDev</span>
          </div>
          <p className="text-xs text-on-surface-variant/50">&copy; 2026 ClinixDev Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-on-surface-variant/70">
            <Link href="/login" className="hover:text-primary transition-colors">Sign in</Link>
            <Link href="/request-access" className="hover:text-primary transition-colors">Request access</Link>
            <Link href="/request-access" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/request-access" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
