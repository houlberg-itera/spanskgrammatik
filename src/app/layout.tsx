import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DuckLingo - Sprogindlæring med AI',
  description: 'DuckLingo - AI-baseret sprogindlæring tilpasset danske studerende',
  icons: {
    icon: [
      { url: '/duck.png', sizes: '32x32', type: 'image/png' },
      { url: '/duck.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: '/duck.png',
  },
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