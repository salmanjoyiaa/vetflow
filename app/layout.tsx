import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VetFlow — All-in-One Veterinary Practice Management Platform",
    template: "%s | VetFlow",
  },
  description:
    "VetFlow is a premium, all-in-one veterinary clinic management system designed for animal hospitals, pet stores with doctors, and multi-branch veterinary businesses.",
  keywords: [
    "veterinary software",
    "clinic management",
    "animal hospital SaaS",
    "vet practice software",
    "pet record management",
    "walk-in scheduler",
    "veterinary billing",
    "veterinary prescription generator",
  ],
  openGraph: {
    title: "VetFlow — Premium Veterinary Practice Management",
    description:
      "Streamline walk-in patient workflows, appointments, electronic medical records, prescriptions, billing, and multi-branch clinic operations.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
