import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kiosk',
  description: 'Order from the kiosk menu',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
