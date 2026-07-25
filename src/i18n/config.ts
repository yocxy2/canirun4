import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';

// SSR 时使用默认语言 'en'，避免 Hydration 不匹配
// 客户端会在 I18nProvider 中动态设置语言
const getDefaultLanguage = (): string => {
  // 服务端固定返回 'en'
  if (typeof window === 'undefined') return 'en';
  
  // 客户端初始化时仍返回 'en'，由 I18nProvider 统一处理
  // 这样可以确保 SSR 和初始渲染一致
  return 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getDefaultLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React 已经处理了 XSS
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
