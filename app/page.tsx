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
  BadgeAlert
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-primary-ivory min-h-screen flex flex-col selection:bg-primary-teal/20">
      
      {/* NAVIGATION BAR */}
      <header className="border-b border-border/40 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-teal/5 flex items-center justify-center rounded-xl">
              <Stethoscope className="w-5 h-5 text-primary-teal" />
            </div>
            <span className="font-bold text-lg text-primary-navy tracking-tight">VetFlow</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-graphite/70">
            <a href="#features" className="hover:text-primary-navy transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary-navy transition-colors">Workflow</a>
            <a href="#security" className="hover:text-primary-navy transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-primary-navy hover:text-primary-teal transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-primary-navy hover:bg-primary-teal text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary-teal/5 text-primary-teal px-3 py-1 rounded-full text-xs font-semibold">
              <BriefcaseMedical className="w-3.5 h-3.5" />
              <span>Enterprise Medical SaaS for Vet Clinics</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-navy tracking-tight leading-tight">
              Run your veterinary clinic, appointments, and billing from one elegant dashboard.
            </h1>
            <p className="text-base text-graphite/80 leading-relaxed">
              VetFlow combines premium operational efficiency with medical-grade security. 
              Built for veterinary hospitals, multi-branch clinics, and stores looking for a secure, 
              tenanted administrative workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/register" 
                className="bg-primary-teal hover:bg-primary-teal/90 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Start 30-Day Free Trial
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a 
                href="#features" 
                className="border border-border/80 hover:bg-primary-ivory/50 text-primary-navy px-6 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* DOCKUP REPRESENTATION */}
          <div className="lg:col-span-6">
            <div className="bg-primary-ivory/60 rounded-3xl p-4 border border-border/40 shadow-premium">
              <div className="bg-white rounded-2xl border border-border/30 overflow-hidden shadow-sm aspect-video flex flex-col">
                {/* Mock header */}
                <div className="h-10 bg-primary-navy text-white/90 px-4 flex items-center justify-between text-[10px] font-semibold border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                    <span className="ml-2 font-mono text-white/50">vetflow-clinic-admin.app</span>
                  </div>
                  <div className="bg-white/10 px-2 py-0.5 rounded">Downtown Branch</div>
                </div>
                {/* Mock contents */}
                <div className="flex-1 p-6 grid grid-cols-3 gap-4 bg-primary-ivory/20">
                  <div className="col-span-2 space-y-4">
                    <div className="h-8 bg-white border border-border/40 rounded-xl p-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary-navy">Total Patients Check-in Today</span>
                      <span className="text-xs font-bold text-primary-teal">18</span>
                    </div>
                    <div className="h-24 bg-white border border-border/40 rounded-xl p-3 space-y-2">
                      <span className="text-[10px] font-bold text-primary-navy block">Doctor Queue Workload</span>
                      <div className="space-y-1.5">
                        <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-teal w-3/4"></div>
                        </div>
                        <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-primary-navy">Gross Sales</span>
                    <span className="text-lg font-black text-primary-navy">$4,850</span>
                    <span className="text-[8px] text-emerald-600 font-semibold">+12% from yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PAIN POINTS & CORE VALUE */}
      <section id="features" className="py-20 bg-primary-ivory/40 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-primary-teal font-bold text-xs uppercase tracking-wider">Engineered for Accuracy</span>
            <h2 className="text-3xl font-extrabold text-primary-navy tracking-tight">
              A premium, trustworthy SaaS platform.
            </h2>
            <p className="text-sm text-graphite/70">
              VetFlow eliminates fragmented systems by integrating front-desk check-ins, clinical documentation, 
              inventory calculations, and invoicing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-border/30 shadow-premium hover:shadow-premium-hover transition-all duration-200">
              <div className="w-10 h-10 bg-primary-teal/5 flex items-center justify-center rounded-xl mb-6">
                <Calendar className="w-5 h-5 text-primary-teal" />
              </div>
              <h3 className="text-base font-bold text-primary-navy mb-2">Dual Intake Workflows</h3>
              <p className="text-xs text-graphite/80 leading-relaxed">
                Seamlessly manage both online booking requests and manual walk-in queues. Checks pets in 
                and routes them directly to available doctors.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-border/30 shadow-premium hover:shadow-premium-hover transition-all duration-200">
              <div className="w-10 h-10 bg-primary-teal/5 flex items-center justify-center rounded-xl mb-6">
                <FileText className="w-5 h-5 text-primary-teal" />
              </div>
              <h3 className="text-base font-bold text-primary-navy mb-2">Immutable Medical History</h3>
              <p className="text-xs text-graphite/80 leading-relaxed">
                Doctor workspaces compile clinical notes and finalized prescriptions. Protects medical 
                records with cryptographic history revisions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-border/30 shadow-premium hover:shadow-premium-hover transition-all duration-200">
              <div className="w-10 h-10 bg-primary-teal/5 flex items-center justify-center rounded-xl mb-6">
                <Layers className="w-5 h-5 text-primary-teal" />
              </div>
              <h3 className="text-base font-bold text-primary-navy mb-2">Branch-Specific Inventory</h3>
              <p className="text-xs text-graphite/80 leading-relaxed">
                Track products, medicines, and food balances separately per branch. Triggers notifications 
                when stock falls below minimum reorder thresholds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / WORKFLOW */}
      <section id="workflow" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-primary-teal font-bold text-xs uppercase tracking-wider font-mono">The VetFlow Loop</span>
            <h2 className="text-3xl font-extrabold text-primary-navy tracking-tight">
              Unified Clinic Management Flow
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="space-y-4">
              <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold font-mono">
                01
              </div>
              <h4 className="text-sm font-bold text-primary-navy">Check-In Intake</h4>
              <p className="text-[11px] text-graphite/70 leading-relaxed">
                Receptionists check in walk-ins or confirmed online bookings, binding the patient to a doctor queue.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold font-mono">
                02
              </div>
              <h4 className="text-sm font-bold text-primary-navy">Medical Consultation</h4>
              <p className="text-[11px] text-graphite/70 leading-relaxed">
                Practitioners enter diagnoses, write clinical notes, and choose treatment products.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold font-mono">
                03
              </div>
              <h4 className="text-sm font-bold text-primary-navy">Prescription & Bill Build</h4>
              <p className="text-[11px] text-graphite/70 leading-relaxed">
                Medical items auto-fill the billing ledger. Totals, discounts, and taxes calculate securely server-side.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold font-mono">
                04
              </div>
              <h4 className="text-sm font-bold text-primary-navy">Discharge & Checkout</h4>
              <p className="text-[11px] text-graphite/70 leading-relaxed">
                Stock levels deduct in real-time, printouts are compiled, and invoices are dispatched via email.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY AND ISOLATION */}
      <section id="security" className="py-20 bg-primary-navy text-white relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-primary-teal-light font-bold text-xs uppercase tracking-wider">Enterprise Tenant Isolation</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Absolute privacy. Absolute data protection.
            </h2>
            <p className="text-xs text-primary-ivory/70 leading-relaxed">
              We employ strict PostgreSQL Row-Level Security (RLS) filters on all business-critical tables. 
              No clinic can fetch another clinic's data under any condition. Branch-level staff can only access 
              their assigned sites.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary-teal-light" />
                <span className="text-xs text-primary-ivory/90 font-medium">PostgreSQL Row-Level Security (RLS)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary-teal-light" />
                <span className="text-xs text-primary-ivory/90 font-medium">Defense-in-depth Role-Based Access Controls</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary-teal-light" />
                <span className="text-xs text-primary-ivory/90 font-medium">Server-Calculated Billing Totals (Anti-Tampering)</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-teal/20 flex items-center justify-center rounded-xl">
                <ShieldCheck className="w-5 h-5 text-primary-teal-light" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary-ivory">Compliance Ready</h4>
                <p className="text-[11px] text-primary-ivory/50 mt-1">
                  Immutable audit log records track staff logins, settings adjustments, invoice modifications, and medical history access.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-teal/20 flex items-center justify-center rounded-xl">
                <Database className="w-5 h-5 text-primary-teal-light" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary-ivory">Clean Database Schema</h4>
                <p className="text-[11px] text-primary-ivory/50 mt-1">
                  Separated tables enforce strict database-level foreign key constraints, minimizing sync errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-3xl font-extrabold text-primary-navy tracking-tight">
            Ready to upgrade your veterinary practice?
          </h2>
          <p className="text-sm text-graphite/70 max-w-lg mx-auto">
            Get started with VetFlow and experience how professional SaaS workflows make 
            clinic coordination smoother.
          </p>
          <div>
            <Link 
              href="/register" 
              className="bg-primary-teal hover:bg-primary-teal/95 text-white px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-sm inline-flex items-center gap-2"
            >
              Start Your Free Sandbox
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary-ivory border-t border-border/40 py-12 mt-auto text-xs text-graphite/60">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary-teal" />
            <span className="font-bold text-primary-navy">VetFlow</span>
          </div>

          <div className="flex gap-8">
            <a href="#features" className="hover:underline">Features</a>
            <a href="#workflow" className="hover:underline">Workflow</a>
            <a href="#security" className="hover:underline">Security</a>
          </div>

          <div>
            © 2026 VetFlow Inc. Designed for medical performance.
          </div>
        </div>
      </footer>

    </div>
  );
}
