'use client';

import { useEffect, useRef } from 'react';
import { useNavigationLoadingOptional } from '@/components/layout/NavigationLoadingProvider';

const STATIC_ICON = '/icon';
let spinnerFrame = 0;

function drawSpinnerFavicon(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return STATIC_ICON;

  ctx.fillStyle = '#15121b';
  ctx.fillRect(0, 0, 32, 32);

  const angle = (spinnerFrame / 8) * Math.PI * 2;
  spinnerFrame = (spinnerFrame + 1) % 8;

  ctx.strokeStyle = '#d0bcff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(16, 16, 10, angle, angle + Math.PI * 1.2);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export default function FaviconLoadingIndicator() {
  const nav = useNavigationLoadingOptional();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!nav?.isNavigating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setFavicon(STATIC_ICON);
      return;
    }

    setFavicon(drawSpinnerFavicon());
    intervalRef.current = setInterval(() => {
      setFavicon(drawSpinnerFavicon());
    }, 120);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setFavicon(STATIC_ICON);
    };
  }, [nav?.isNavigating]);

  return null;
}
