/**
 * 模型数据加载工具
 * Phase 1 V3.0
 */

import modelsData from '@/data/models.json';
import type { AIModel, ModelCategory, CATEGORY_LABELS } from '@/types';

/**
 * 获取所有模型
 */
export function getAllModels(): AIModel[] {
  return modelsData as AIModel[];
}

/**
 * 按类别获取模型
 */
export function getModelsByCategory(category: ModelCategory): AIModel[] {
  return getAllModels().filter(model => model.category === category);
}

/**
 * 获取对话写作类模型列表
 */
export function getChatModels(): AIModel[] {
  return getModelsByCategory('Chat');
}

/**
 * 获取编程辅助类模型列表
 */
export function getCodeModels(): AIModel[] {
  return getModelsByCategory('Code');
}

/**
 * 获取图像创作类模型列表
 */
export function getImageModels(): AIModel[] {
  return getModelsByCategory('Image');
}

/**
 * 获取视频创作类模型列表
 */
export function getVideoModels(): AIModel[] {
  return getModelsByCategory('Video');
}

/**
 * 获取多模态类模型列表
 */
export function getMultimodalModels(): AIModel[] {
  return getModelsByCategory('Multimodal');
}

/**
 * 获取语音处理类模型列表
 */
export function getAudioModels(): AIModel[] {
  return getModelsByCategory('Audio');
}

/**
 * 根据 ID 获取模型
 */
export function getModelById(id: string): AIModel | undefined {
  return getAllModels().find(model => model.id === id);
}

/**
 * 获取所有类别标签
 */
export function getCategoryLabels(): Record<ModelCategory, string> {
  return {
    'Chat': '对话&写作',
    'Code': '编程辅助',
    'Image': '图像创作',
    'Video': '视频创作',
    'Multimodal': '多模态',
    'Audio': '语音处理',
  };
}
