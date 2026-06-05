import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Portfolio — Cinematic Experience',
  description: 'Creative portfolio showcase.',
};

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-on-surface flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-on-surface-variant max-w-md mb-6">
        The cinematic scroll portfolio has moved. VetFlow marketing is on the homepage.
      </p>
      <Link
        href="/"
        className="text-sm font-semibold text-primary hover:underline"
      >
        Go to VetFlow homepage
      </Link>
    </div>
  );
}
