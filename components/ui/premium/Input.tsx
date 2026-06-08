'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { inputClass } from '@/lib/ui/dashboard-classes';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(inputClass, error && 'border-destructive focus:border-destructive focus:ring-destructive', className)}
        {...props}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export default Input;
