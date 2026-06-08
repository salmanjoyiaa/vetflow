import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'ClinixDev — Cinematic Clinic Management Platform',
  description:
    'ClinixDev is a premium clinic management platform. Launching first for veterinary clinics, engineered to scale to dental, general, and specialty clinics.',
};

export default function HomePage() {
  return <LandingPage />;
}
