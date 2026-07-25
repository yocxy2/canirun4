'use client';

import { I18nProvider } from '@/components/I18nProvider';
import { Header } from '@/components/Header';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </I18nProvider>
  );
}
