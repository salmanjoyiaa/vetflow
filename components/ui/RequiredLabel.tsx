import type { ReactNode } from 'react';

export default function RequiredLabel({
  children,
  required = true,
  className = '',
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      {children}
      {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
    </span>
  );
}
