'use client';

import { useTranslation } from 'react-i18next';
import type { AIModel } from '@/types';

/**
 * 深度国际化 Hook - 获取本地化的模型数据
 * 
 * **重要**: 此 Hook 必须在客户端挂载后才能正确工作，
 * 否则会导致 Hydration Mismatch 错误。
 * 
 * 双语 Fallback 逻辑：
 * - 英文：description_en || description || ''
 * - 中文：description_zh || description_en || description || ''
 * 
 * @returns 本地化的描述文本和标签
 */
export function useLocalizedModel() {
  const { i18n } = useTranslation();

  /**
   * 获取当前语言标识
   * - 支持 'zh', 'zh-CN', 'zh-TW' 等变体
   * - 默认返回 'en'
   */
  const getCurrentLang = (): 'zh' | 'en' => {
    const lang = i18n.resolvedLanguage || i18n.language || 'en';
    return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  };

  const currentLang = getCurrentLang();

  /**
   * 获取模型的本地化描述
   * 
   * 英文：description_en → description
   * 中文：description_zh → description_en → description
   */
  const getDescription = (model: AIModel): string => {
    if (currentLang === 'zh') {
      // 中文优先级：description_zh → description_en → description
      return model.description_zh || model.description_en || model.description || '';
    }
    // 英文优先级：description_en → description
    return model.description_en || model.description || '';
  };

  /**
   * 获取模型的本地化标签
   * 
   * 英文：tags_en → tags
   * 中文：tags_zh → tags_en → tags
   */
  const getTags = (model: AIModel): string[] => {
    if (currentLang === 'zh') {
      // 中文优先级：tags_zh → tags_en → tags
      if (model.tags_zh?.length) return model.tags_zh;
      if (model.tags_en?.length) return model.tags_en;
      return model.tags || [];
    }
    // 英文优先级：tags_en → tags
    return model.tags_en?.length ? model.tags_en : model.tags || [];
  };

  /**
   * 获取本地化的模型信息对象
   * 返回一个新对象，description 和 tags 字段已被本地化
   */
  const getLocalizedModel = (model: AIModel) => ({
    ...model,
    description: getDescription(model),
    tags: getTags(model),
  });

  return {
    getDescription,
    getTags,
    getLocalizedModel,
    /** 当前语言代码 ('en' | 'zh') */
    currentLanguage: currentLang,
    /** 是否为中文模式 */
    isZh: currentLang === 'zh',
    /** 是否为英文模式 */
    isEn: currentLang === 'en',
  };
}
