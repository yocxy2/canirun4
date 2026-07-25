'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2 group">
          <Cpu className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" />
          <span className="font-bold text-lg text-foreground">
            {isMounted ? t('app.title') : 'CanIRun.AI'}
          </span>
        </Link>
        <div className="flex items-center space-x-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
