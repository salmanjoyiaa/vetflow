import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://clinixdev.com'),
  title: {
    default: 'ClinixDev — Cinematic Clinic Management Platform',
    template: '%s | ClinixDev',
  },
  description:
    'ClinixDev is a premium, multi-tenant clinic management platform. Launching first for veterinary clinics, built to support dental, general, and specialty clinics over time.',
  openGraph: {
    title: 'ClinixDev — Cinematic Clinic Management Platform',
    description:
      'Secure multi-tenant clinic platform — appointments, consult, billing, and inventory for modern care teams.',
    siteName: 'ClinixDev',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClinixDev — Cinematic Clinic Management Platform',
    description:
      'Secure multi-tenant clinic platform — appointments, consult, billing, and inventory for modern care teams.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">
        {children}
      </body>
    </html>
  );
}
