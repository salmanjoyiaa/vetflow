'use client';

import { useState, useTransition } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { logoutAction } from '@/lib/services/auth-actions';

interface LogoutButtonProps {
  className?: string;
  title?: string;
}

export default function LogoutButton({ className, title = 'Sign out' }: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  const signOut = () => {
    if (pending || clicked) return;
    setClicked(true);
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending || clicked}
      className={className}
      title={title}
      aria-label={title}
    >
      {pending || clicked ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
    </button>
  );
}
