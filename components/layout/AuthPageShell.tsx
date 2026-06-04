import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center">
            <div className="w-12 h-12 bg-primary/15 flex items-center justify-center rounded-2xl mb-3">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-on-surface font-[family-name:var(--font-display)]">
              VetFlow
            </span>
          </Link>
          <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        <h2 className="text-xl font-semibold text-on-surface text-center mb-6">{title}</h2>
        {children}
        {footer && <div className="mt-6 text-center text-xs text-on-surface-variant">{footer}</div>}
      </div>
    </main>
  );
}
