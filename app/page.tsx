'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Stethoscope, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Database, 
  Users, 
  Layers, 
  ChevronRight, 
  CheckCircle,
  FileSpreadsheet,
  Clock,
  BriefcaseMedical,
  Sparkles,
  ArrowRight,
  Shield,
  Heart,
  TrendingUp,
  MapPin,
  Lock,
  Star,
  Quote,
  Check,
  Send,
  Menu,
  X,
} from 'lucide-react';

const testimonials = [
  {
    quote: "VetFlow has completely transformed how we manage our three veterinary branches. The real-time inventory tracking and multi-branch isolation are absolute game-changers.",
    author: "Dr. Catherine Mercer",
    role: "Medical Director, VetGroup Northeast",
    avatar: "CM",
    stars: 5,
  },
  {
    quote: "The row-level security gives me total confidence that patient medical data is fully protected. Our clinic has never run so smoothly or securely.",
    author: "Dr. Alexander Fleming",
    role: "Chief Practitioner, VetCare Center",
    avatar: "AF",
    stars: 5,
  },
  {
    quote: "The receptionist walk-in intake queue is beautiful. We've reduced customer waiting times by 40% since switching to VetFlow's streamlined workflows.",
    author: "Sarah Owner",
    role: "Owner, Uptown VetCare",
    avatar: "SO",
    stars: 5,
  }
];

function AnimatedCounter({ 
  value, 
  duration = 1500, 
  trigger = false, 
  suffix = "", 
  decimals = 0 
}: { 
  value: number; 
  duration?: number; 
  trigger?: boolean; 
  suffix?: string; 
  decimals?: number 
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration, trigger]);

  return (
    <>
      {count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

export default function LandingPage() {

  // Typewriter effect
  const words = ["clinic workflows", "patient records", "branch inventory", "billing & taxes"];
  const [wordIndex, setWordIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (subIndex === words[wordIndex].length + 1 && !reverse) {
      const timeout = setTimeout(() => setReverse(true), 2000);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setWordIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [subIndex, reverse, wordIndex]);

  useEffect(() => {
    const timeout2 = setTimeout(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

  // Testimonial slider with auto-advance
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [testimonialPaused, setTestimonialPaused] = useState(false);

  useEffect(() => {
    if (testimonialPaused) return;
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonialPaused]);

  // Interactive Price Plan selector
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Animated stat counters
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-surface min-h-screen flex flex-col selection:bg-primary/20 font-sans antialiased mesh-gradient relative">
      {/* Animated aurora background orbs */}
      <div className="aurora-bg" />
      <div className="floating-orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="floating-orb-2" style={{ top: '40%', right: '10%' }} />
      <div className="floating-orb-3" style={{ bottom: '15%', left: '30%' }} />
      
      {/* NAVIGATION BAR */}
      <header className="border-b border-outline-variant/25 glass-panel/75 backdrop-blur-md sticky top-0 z-50 transition-all duration-300" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-primary/10 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-white">
              <Stethoscope className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <span className="font-extrabold text-lg text-on-surface tracking-tight">
              Vet<span className="text-primary">Flow</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-on-surface-variant/70">
            <a href="#features" className="hover:text-on-surface transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Features</a>
            <a href="#workflow" className="hover:text-on-surface transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Workflow</a>
            <a href="#pricing" className="hover:text-on-surface transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Pricing</a>
            <a href="#security" className="hover:text-on-surface transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Security</a>
          </nav>


          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="hidden sm:block text-xs font-bold text-on-surface hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="hidden sm:block bg-primary-navy hover:bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-premium hover:shadow-premium-hover hover:scale-[1.02]"
            >
              Get Started
            </Link>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-panel">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-lg text-on-surface">
                  Vet<span className="text-primary">Flow</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors py-2 border-b border-outline-variant/20">Features</a>
                <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors py-2 border-b border-outline-variant/20">Workflow</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors py-2 border-b border-outline-variant/20">Pricing</a>
                <a href="#security" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors py-2 border-b border-outline-variant/20">Security</a>
              </nav>
              <div className="space-y-3 pt-2">
                <Link href="/login" className="block text-center text-sm font-bold text-on-surface border border-outline-variant py-3 rounded-xl hover:bg-surface-container-high transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="block text-center text-sm font-bold bg-primary text-on-primary py-3 rounded-xl hover:bg-primary/90 transition-colors">
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HERO SECTION */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-transparent dot-pattern">
        {/* Animated Background shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-gold/5 blur-3xl animate-pulse-glow" />
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="lg:col-span-6 space-y-6 text-left animate-fadeInUp">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Veterinary Enterprise SaaS v2.4</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight leading-tight">
              Streamline your entire <br />
              <span className="min-w-[280px] inline-block">
                {words[wordIndex].substring(0, subIndex)}
                <span className={`${blink ? 'opacity-100' : 'opacity-0'} text-primary transition-opacity`}>|</span>
              </span>
            </h1>
            <p className="text-sm text-on-surface-variant/80 leading-relaxed max-w-lg">
              VetFlow combines high-performance branch synchronization with robust PostgreSQL tenant isolation. 
              Manage walk-ins, schedule appointments, handle billing, and track medications from one unified screen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/register" 
                className="bg-primary hover:bg-primary/95 text-white px-6 py-3.5 rounded-xl font-bold text-xs transition-all shadow-premium hover:shadow-premium-hover flex items-center justify-center gap-2 group hover:scale-[1.02]"
              >
                Start 30-Day Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features" 
                className="border border-outline-variant/80 glass-panel/40 hover:glass-panel/80 text-on-surface px-6 py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center"
              >
                Explore Features
              </a>
            </div>

            {/* TRUST BADGES */}
            <div className="pt-8 border-t border-outline-variant/30">
              <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest block mb-3">Compliance & Infrastructure</span>
              <div className="flex flex-wrap gap-4 items-center opacity-60">
                <span className="text-[10px] font-bold text-on-surface glass-panel/60 border border-outline-variant/30 px-2 py-1 rounded">HIPAA-ready</span>
                <span className="text-[10px] font-bold text-on-surface glass-panel/60 border border-outline-variant/30 px-2 py-1 rounded">99.9% Uptime SLA</span>
                <span className="text-[10px] font-bold text-on-surface glass-panel/60 border border-outline-variant/30 px-2 py-1 rounded">AES-256 Encrypted</span>
                <span className="text-[10px] font-bold text-on-surface glass-panel/60 border border-outline-variant/30 px-2 py-1 rounded">SOC2 Compliant</span>
              </div>
            </div>
          </div>

          {/* DOCKUP WINDOW */}
          <div className="lg:col-span-6 animate-floatSlow">
            <div className="glass-panel/60 backdrop-blur-md rounded-3xl p-4 border border-white/60 shadow-premium hover:shadow-premium-hover transition-all duration-300">
              <div className="glass-panel rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm aspect-video flex flex-col relative group">
                
                {/* Mock header */}
                <div className="h-10 bg-primary-navy text-white/90 px-4 flex items-center justify-between text-[10px] font-semibold border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                    <span className="ml-2 font-mono text-white/50 text-[9px]">vetflow-clinic-admin.app</span>
                  </div>
                  <div className="bg-primary/20 text-primary-light text-[9px] px-2 py-0.5 rounded font-bold">
                    Downtown Branch
                  </div>
                </div>

                {/* Mock contents */}
                <div className="flex-1 p-5 grid grid-cols-3 gap-4 bg-surface/20">
                  <div className="col-span-2 space-y-4">
                    <div className="glass-panel border border-outline-variant/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase block">Active Walk-ins</span>
                        <span className="text-sm font-black text-on-surface">12 Waiting / 3 Consulting</span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="glass-panel border border-outline-variant/40 rounded-xl p-3 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase">Doctor Load Balancing</span>
                        <span className="text-[9px] text-primary font-bold">94% Efficiency</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] text-on-surface-variant/70">
                          <span>Dr. A. Fleming</span>
                          <span className="font-bold">4 Patients</span>
                        </div>
                        <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-4/5 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-on-surface-variant/70">
                          <span>Dr. G. House</span>
                          <span className="font-bold">2 Patients</span>
                        </div>
                        <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gold w-2/5 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel border border-outline-variant/40 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase block">Intraday Sales</span>
                    <span className="text-xl font-black text-on-surface mt-1">$4,850</span>
                    <div className="flex items-center gap-1 text-[8px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full w-max">
                      <TrendingUp className="w-2.5 h-2.5" />
                      <span>+12.4%</span>
                    </div>
                    <span className="text-[7px] text-on-surface-variant/40 mt-auto block border-t border-outline-variant/20 pt-1.5">VAT Calculated Server-side</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* STATS MATRIX */}
      <section ref={statsRef} className="py-12 bg-primary-navy text-white border-y border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-primary-light block">
              <AnimatedCounter value={500} trigger={statsVisible} suffix="+" />
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Active Vet Clinics</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-primary-light block">
              <AnimatedCounter value={1.2} trigger={statsVisible} decimals={1} suffix="M+" />
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Patients Treated</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-primary-light block">
              <AnimatedCounter value={50} trigger={statsVisible} suffix="k+" />
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Prescriptions Issued</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-primary-light block">
              <AnimatedCounter value={99.98} trigger={statsVisible} decimals={2} suffix="%" />
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">API Availability</span>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-transparent border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-primary font-extrabold text-xs uppercase tracking-wider">Engineered for veterinary operations</span>
            <h2 className="text-3xl font-black text-on-surface tracking-tight">
              A complete, feature-rich administration platform
            </h2>
            <p className="text-sm text-on-surface-variant/70">
              VetFlow combines front-desk queues, clinical medical histories, prescription safety, and anti-tamper invoicing into a single system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-xl mb-4 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Dual Scheduler Intake</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Check patients in manually as walk-ins or approve bookings requested online. Syncs appointments immediately to the active doctor queues.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center rounded-xl mb-4 text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Clinical Consultation EMR</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Practitioners enter chief complaints, histories, diagnosis codes, and treatment plans in a clean, high-performance editor.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center rounded-xl mb-4 text-amber-600">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Multi-Branch Inventory</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Maintain separate stock balances, reorder points, and expiration dates per branch. Automate product deduction upon checkout.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-rose-500/10 flex items-center justify-center rounded-xl mb-4 text-rose-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Anti-Tamper Invoicing</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Invoices calculate subtotals, VAT tax percentages, discounts, and final amounts server-side to guarantee accounting accuracy.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-violet-500/10 flex items-center justify-center rounded-xl mb-4 text-violet-600">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Multi-Site Synchronization</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Switch between branches instantly via active cookie sessions. Keeps data isolated but allows global administration.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-premium hover-lift hover-glow">
              <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center rounded-xl mb-4 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">Advanced Analytics</h3>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Real-time dashboard telemetry tracks average consultation duration, walk-in waiting periods, branch MRR, and vaccine volumes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE / WORKFLOW */}
      <section id="workflow" className="py-20 glass-panel">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-primary font-extrabold text-xs uppercase tracking-wider">Intelligent Loop</span>
            <h2 className="text-3xl font-black text-on-surface tracking-tight">
              The VetFlow Patient Lifecycle
            </h2>
            <p className="text-sm text-on-surface-variant/70">
              See how patient coordinates flow efficiently across clinic stations.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="bg-surface/50 rounded-2xl p-6 border border-outline-variant/30 relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black mb-4">
                01
              </div>
              <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-2">Front Desk Intake</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                Reception checks in patients, automatically linking their profile. Patients are added to the branch walk-in queue.
              </p>
            </div>

            <div className="bg-surface/50 rounded-2xl p-6 border border-outline-variant/30 relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black mb-4">
                02
              </div>
              <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-2">Medical Exam</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                Doctors inspect patient vitals, type diagnoses, and select medication items directly inside the clinical workspace.
              </p>
            </div>

            <div className="bg-surface/50 rounded-2xl p-6 border border-outline-variant/30 relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black mb-4">
                03
              </div>
              <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-2">Automated Billing</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                General services and prescription units compile automatically into the bill ledger, eliminating clerical manual calculations.
              </p>
            </div>

            <div className="bg-surface/50 rounded-2xl p-6 border border-outline-variant/30 relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black mb-4">
                04
              </div>
              <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-2">Checkout & Audit</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                The receptionist records payment (cash/card), inventory quantities decrement instantly, and a PDF receipt is dispatched.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-20 bg-surface/40 border-y border-outline-variant/20 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-primary font-extrabold text-xs uppercase tracking-wider">Social Proof</span>
            <h2 className="text-3xl font-black text-on-surface mt-1 tracking-tight">Approved by Veterinary Clinicians</h2>
          </div>

          <div 
            className="glass-panel rounded-3xl p-8 border border-outline-variant/30 shadow-premium text-center relative overflow-hidden"
            onMouseEnter={() => setTestimonialPaused(true)}
            onMouseLeave={() => setTestimonialPaused(false)}
          >
            <Quote className="w-10 h-10 text-primary/10 mx-auto mb-6" />
            <p className="text-sm font-semibold text-on-surface leading-relaxed max-w-2xl mx-auto">
              "{testimonials[currentTestimonial].quote}"
            </p>
            <div className="mt-6 flex items-center justify-center gap-1 text-gold">
              {[...Array(testimonials[currentTestimonial].stars)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs text-on-surface block">
                {testimonials[currentTestimonial].author}
              </span>
              <span className="text-[10px] text-on-surface-variant/50 block">
                {testimonials[currentTestimonial].role}
              </span>
            </div>

            {/* Slider dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentTestimonial ? 'bg-primary w-4' : 'bg-graphite/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 glass-panel">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-primary font-extrabold text-xs uppercase tracking-wider">Transparent pricing</span>
            <h2 className="text-3xl font-black text-on-surface tracking-tight">
              Flexible tiers designed for vet clinics
            </h2>
            <p className="text-sm text-on-surface-variant/70">
              No hidden fees. Free sandbox trial for 30 days. No credit card required to start.
            </p>

            {/* Billing cycle switch */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingPeriod === 'monthly' ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>Monthly</span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="w-10 h-6 bg-primary-navy rounded-full p-1 transition-colors relative"
              >
                <div className={`w-4 h-4 glass-panel rounded-full transition-transform ${billingPeriod === 'annual' ? 'translate-x-4' : ''}`} />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1 ${billingPeriod === 'annual' ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>
                Annually
                <span className="text-[8px] bg-gold/25 text-amber-800 font-extrabold px-1.5 py-0.5 rounded uppercase">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {/* Starter Plan */}
            <div className="bg-surface/20 p-8 rounded-3xl border border-outline-variant/40 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest block mb-2">Starter Tier</span>
                <span className="text-2xl font-black text-on-surface">$49</span>
                <span className="text-xs text-on-surface-variant/50">/month</span>
                <div className="h-px bg-border/40 my-6" />
                <ul className="space-y-3 text-[11px] text-on-surface-variant/80">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Single clinic branch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Up to 3 staff members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Intake Walk-in scheduler</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Standard Billing ledger</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 border border-outline-variant glass-panel text-on-surface font-bold text-xs py-3 rounded-xl text-center hover:bg-surface transition-colors block"
              >
                Start Starter Trial
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="glass-panel p-8 rounded-3xl border-2 border-primary-teal relative flex flex-col justify-between shadow-premium animate-border-glow">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-shimmer">
                Most Popular
              </span>
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">Growth Tier</span>
                <span className="text-3xl font-black text-on-surface">
                  ${billingPeriod === 'monthly' ? '149' : '119'}
                </span>
                <span className="text-xs text-on-surface-variant/50">/month</span>
                <div className="h-px bg-border/40 my-6" />
                <ul className="space-y-3 text-[11px] text-on-surface-variant/80">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-on-surface">Up to 3 active branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Up to 15 staff members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Electronic Medical Records (EMR)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Inventory tracking per site</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Client communication alerts</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 bg-primary text-white font-bold text-xs py-3.5 rounded-xl text-center hover:bg-primary/95 transition-all block shadow-premium"
              >
                Start Growth Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-surface/20 p-8 rounded-3xl border border-outline-variant/40 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest block mb-2">Enterprise Tier</span>
                <span className="text-2xl font-black text-on-surface">
                  ${billingPeriod === 'monthly' ? '299' : '239'}
                </span>
                <span className="text-xs text-on-surface-variant/50">/month</span>
                <div className="h-px bg-border/40 my-6" />
                <ul className="space-y-3 text-[11px] text-on-surface-variant/80">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-on-surface">Unlimited branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Unlimited staff members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Custom domain integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>API direct database access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Dedicated account architect</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 border border-outline-variant glass-panel text-on-surface font-bold text-xs py-3 rounded-xl text-center hover:bg-surface transition-colors block"
              >
                Start Enterprise Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY AND CODE EXCERPT */}
      <section id="security" className="py-20 bg-primary-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-teal/10 via-transparent to-transparent opacity-60" />
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          
          <div className="space-y-6">
            <span className="text-primary-light font-bold text-xs uppercase tracking-wider block">Enterprise Tenant Isolation</span>
            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
              Absolute privacy. Absolute data protection.
            </h2>
            <p className="text-xs text-primary-ivory/70 leading-relaxed">
              We employ strict PostgreSQL Row-Level Security (RLS) filters on all business-critical tables. 
              No clinic can fetch another clinic's data under any condition. Branch-level staff can only access 
              their assigned sites.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-primary-light" />
                <span className="text-xs text-primary-ivory/95 font-semibold">PostgreSQL Row-Level Security (RLS) active</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-primary-light" />
                <span className="text-xs text-primary-ivory/95 font-semibold">Defense-in-depth Role-Based Access Controls</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-primary-light" />
                <span className="text-xs text-primary-ivory/95 font-semibold">Server-Calculated Billing Totals (Anti-Tampering)</span>
              </div>
            </div>
          </div>

          {/* Code snippet showing RLS policy example */}
          <div className="glass-panel/5 border border-white/10 rounded-2xl overflow-hidden shadow-premium">
            <div className="h-8 glass-panel/5 px-4 flex items-center justify-between text-[10px] text-white/50 border-b border-white/10 font-mono">
              <span>postgres_rls_policy.sql</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <pre className="p-5 font-mono text-[9px] sm:text-[10px] leading-relaxed text-emerald-400 overflow-x-auto">
              <code>
{`-- Enforce strict tenant isolating context on clinic data
CREATE POLICY patient_isolation_policy ON public.patients
  FOR ALL
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Enforce branch staff lock
CREATE POLICY branch_staff_isolation ON public.visits
  FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM public.branch_members
      WHERE user_id = auth.uid()
    )
  );`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-transparent relative">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10 animate-fadeInUp">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">
            Ready to upgrade your veterinary practice?
          </h2>
          <p className="text-sm text-on-surface-variant/70 max-w-lg mx-auto leading-relaxed">
            Switch from fragmented worksheets to a secure database platform designed specifically for veterinary teams.
          </p>
          <div className="pt-2">
            <Link 
              href="/register" 
              className="bg-primary hover:bg-primary/95 text-white px-8 py-4 rounded-xl font-bold text-xs transition-all shadow-premium hover:shadow-premium-hover inline-flex items-center gap-2 group hover:scale-[1.02]"
            >
              Start Your Free Sandbox
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="glass-panel border-t border-outline-variant/30 py-16 text-xs text-on-surface-variant/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <span className="font-extrabold text-sm text-on-surface">VetFlow</span>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
              Elegant veterinary business SaaS, engineered for maximum operational performance, branch-level security, and audit compliance.
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-on-surface">Product</h5>
            <ul className="space-y-2 text-[10px]">
              <li><a href="#features" className="hover:text-primary transition-colors">Features Overview</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing Plans</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Data Isolation</a></li>
              <li><Link href="/register" className="hover:text-primary transition-colors">Request Sandbox</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-on-surface">Resources</h5>
            <ul className="space-y-2 text-[10px]">
              <li><a href="#" className="hover:text-primary transition-colors">Veterinary EMR Standards</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">HIPAA Compliance Guide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation & API</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">System status</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-on-surface">Newsletter</h5>
            <p className="text-[10px] text-on-surface-variant/70">Subscribe to our monthly guide on veterinary management.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="doctor@clinic.com"
                className="bg-surface border border-outline-variant/60 rounded-lg px-3 py-2 text-[10px] w-full focus:outline-none focus:border-primary-teal"
              />
              <button 
                type="button"
                className="bg-primary-navy text-white p-2 rounded-lg hover:bg-primary transition-all flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px]">
          <div>
            © 2026 VetFlow Inc. Designed for medical billing & telemetry.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">SLA Agreement</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

