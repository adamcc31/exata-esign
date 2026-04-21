import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Speed Nenkin 20% — Digital Signature Platform',
  description: 'Platform penandatanganan digital Surat Pernyataan Persetujuan Penggunaan Layanan Speed Nenkin 20% oleh PT. Sumber Rezeki Exata Indonesia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
