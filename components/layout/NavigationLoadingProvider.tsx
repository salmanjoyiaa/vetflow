'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  startNavigation: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      setIsNavigating(false);
      prevPath.current = pathname;
    }
  }, [pathname]);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return ctx;
}

export function useNavigationLoadingOptional() {
  return useContext(NavigationLoadingContext);
}
