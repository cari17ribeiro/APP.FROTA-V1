// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import NavMenu from './components/NavMenu';
import { Inter } from 'next/font/google';
import ClientProvider from './ClientProvider';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata = {
  title: 'Painel do Administrador',
  description: 'Controle de viagens e premiação de motoristas',
  manifest: '/manifest.json',
  themeColor: '#1E90FF',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full light">
      <body className={`h-full !bg-blue-100 text-gray-900 ${inter.className}`}>
        <ClientProvider>
          <NavMenu />
          <main style={{ padding: '1rem' }}>
            {children}
          </main>
        </ClientProvider>
      </body>
    </html>
  );
}
