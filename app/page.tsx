import type { Metadata } from 'next';
import CinematicHome from '@/components/landing/CinematicHome';

const title = 'ClinixDev — The Cinematic Clinic Operating System';
const description =
  'ClinixDev is a secure, multi-tenant clinic platform. Launching first for veterinary clinics with appointments, consultations, prescriptions, labs, documents, inventory, and tax-aware branded invoicing — engineered to scale to dental, general, and specialty clinics.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'clinic management software',
    'veterinary clinic software',
    'vet practice management',
    'multi-tenant clinic platform',
    'HIPAA-ready clinic software',
    'clinic invoicing and inventory',
    'ClinixDev',
  ],
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'ClinixDev',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <CinematicHome />;
}
