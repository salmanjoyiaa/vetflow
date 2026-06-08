'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { inputClass } from '@/lib/ui/dashboard-classes';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(inputClass, error && 'border-destructive', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

export default Select;
