'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 安全的语言状态 Hook
 * 
 * 解决的问题：
 * 1. SSR 时 i18n.language 可能未初始化
 * 2. 客户端首次渲染时语言可能与 SSR 不一致
 * 3. 语言切换时需要响应式更新
 * 
 * @returns 'zh' | 'en' - 当前语言代码（已标准化）
 */
export function useCurrentLanguage(): 'zh' | 'en' {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState<'zh' | 'en'>('en'); // 默认英文，避免 SSR/CSR 不一致

  useEffect(() => {
    // 标准化语言代码
    const normalizeLanguage = (language: string | undefined): 'zh' | 'en' => {
      if (!language) return 'en';
      return language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    };

    // 初始化时获取真实语言
    if (i18n.resolvedLanguage) {
      setLang(normalizeLanguage(i18n.resolvedLanguage));
    }

    // 监听语言变化
    const handleLanguageChange = (lng: string) => {
      setLang(normalizeLanguage(lng));
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, i18n.resolvedLanguage]);

  return lang;
}

/**
 * 获取本地化的模型描述
 * 
 * Fallback 逻辑：
 * - 中文：description_zh → description_en → description
 * - 英文：description_en → description
 */
export function getLocalizedDescription(
  model: { 
    description?: string; 
    description_en?: string; 
    description_zh?: string 
  },
  lang: 'zh' | 'en'
): string {
  if (lang === 'zh') {
    return model.description_zh || model.description_en || model.description || '';
  }
  return model.description_en || model.description || '';
}

/**
 * 获取本地化的模型标签
 * 
 * Fallback 逻辑：
 * - 中文：tags_zh → tags_en → tags
 * - 英文：tags_en → tags
 */
export function getLocalizedTags(
  model: { 
    tags?: string[]; 
    tags_en?: string[]; 
    tags_zh?: string[] 
  },
  lang: 'zh' | 'en'
): string[] {
  if (lang === 'zh') {
    if (model.tags_zh?.length) return model.tags_zh;
    if (model.tags_en?.length) return model.tags_en;
    return model.tags || [];
  }
  return model.tags_en?.length ? model.tags_en : model.tags || [];
}
