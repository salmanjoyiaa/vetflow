import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Portfolio — Cinematic Experience',
  description: 'Creative portfolio showcase.',
};

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 text-center mesh-gradient">
      <div className="glass-panel rounded-3xl p-10 max-w-md border border-outline-variant/40">
        <h1 className="text-2xl font-black font-[family-name:var(--font-display)]">
          <span className="gradient-text">ClinixDev</span>
        </h1>
        <p className="text-sm text-on-surface-variant mt-4 mb-6">
          The cinematic portfolio has moved. Explore the full marketing experience on our homepage.
        </p>
        <Link
          href="/"
          className="btn-sheen inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-2xl text-sm font-bold shadow-premium hover:opacity-90 transition-all"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
