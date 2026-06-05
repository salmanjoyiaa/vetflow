import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'VetFlow — All-in-One Veterinary Practice Management Platform',
  description:
    'VetFlow is a premium, all-in-one veterinary clinic management system designed for animal hospitals, pet stores with doctors, and multi-branch veterinary businesses.',
};

export default function HomePage() {
  return <LandingPage />;
}
