import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface AuthPageShellProps {
  title?: string;
  titleAccent?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  sidebar?: React.ReactNode;
  headerIcon?: React.ReactNode;
  hideBrand?: boolean;
}

function TitleBlock({
  badge,
  title,
  titleAccent,
}: Pick<AuthPageShellProps, 'badge' | 'title' | 'titleAccent'>) {
  if (!badge && !title && !titleAccent) return null;

  return (
    <div className="mb-6">
      {badge && (
        <p className="text-[10px] font-black text-primary uppercase tracking-wider text-center mb-1.5">
          {badge}
        </p>
      )}
      {(title || titleAccent) && (
        <h2 className="text-xl md:text-2xl font-black text-on-surface text-center font-[family-name:var(--font-display)] tracking-tight leading-tight">
          {title && <span>{title}{titleAccent ? ' ' : ''}</span>}
          {titleAccent && (
            <span className={title ? 'gradient-text' : 'block gradient-text'}>{titleAccent}</span>
          )}
        </h2>
      )}
    </div>
  );
}

function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <Link href="/" className="flex flex-col items-center group">
        <div className="w-12 h-12 bg-primary/15 border border-primary/20 flex items-center justify-center rounded-2xl mb-3 transition-colors group-hover:bg-primary/20">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-black tracking-tight text-on-surface font-[family-name:var(--font-display)]">
          ClinixDev
        </span>
      </Link>
      {subtitle && (
        <p className="text-xs text-on-surface-variant/80 mt-1.5 text-center max-w-xs leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function AuthPageShell({
  title,
  titleAccent,
  subtitle,
  description,
  badge,
  children,
  footer,
  wide,
  sidebar,
  headerIcon,
  hideBrand,
}: AuthPageShellProps) {
  const maxWidth = wide || sidebar ? 'max-w-2xl' : 'max-w-md';

  const body = (
    <>
      {!sidebar && !hideBrand && <BrandHeader subtitle={subtitle} />}
      {headerIcon && <div className="flex justify-center mb-5">{headerIcon}</div>}
      <TitleBlock badge={badge} title={title} titleAccent={titleAccent} />
      {description && (
        <p className="text-xs text-on-surface-variant/80 text-center mb-6 max-w-sm mx-auto leading-relaxed -mt-2">
          {description}
        </p>
      )}
      {children}
      {footer && (
        <div className="mt-6 pt-6 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant/70">
          {footer}
        </div>
      )}
    </>
  );

  if (sidebar) {
    return (
      <main className="min-h-screen mesh-gradient flex items-center justify-center p-4 md:py-12">
        <div
          className={`w-full ${maxWidth} glass-panel border border-outline-variant/40 overflow-hidden flex flex-col md:flex-row`}
        >
          {sidebar}
          <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center">{body}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4 md:py-8">
      <div className={`w-full ${maxWidth} glass-panel border border-outline-variant/40 p-8 md:p-10`}>
        {body}
      </div>
    </main>
  );
}
