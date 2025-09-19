import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '🐥 Ducklingo - Lær spansk grammatik 🇪🇸',
  description: 'En dansk app til at lære spansk grammatik med AI-baserede øvelser. Ducklingo gør spansk læring sjovt og effektivt!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className={inter.className}>{children}</body>
    </html>
  );
}