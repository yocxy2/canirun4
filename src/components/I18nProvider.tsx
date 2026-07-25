'use client';

import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    
    // 在客户端挂载后，根据浏览器语言或 localStorage 设置语言
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && ['en', 'zh'].includes(savedLang)) {
      i18n.changeLanguage(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) {
        i18n.changeLanguage('zh');
      }
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
