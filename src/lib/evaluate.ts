/**
 * 模型评估引擎
 * Phase 1 V3.0
 * 根据用户硬件配置匹配模型并计算推理速度
 */

import { getAllModels } from './models';
import { getGPUById } from './gpu';
import type { UserHardware, AIModel, ModelEvaluation, EvaluationResult, ModelCategory, StatusFilter } from '@/types';

/**
 * 计算推理速度
 * 公式: 速度 = 模型基准速度 * 显卡性能系数
 */
export function calculateSpeed(
  model: AIModel,
  gpu: { performanceMultiplier: number } | null | undefined
): { speed: number; unit: string } {
  const baselineSpeed = model.baselineSpeed || 10;
  const unit = model.speedUnit || 't/s';
  
  if (!gpu) {
    // 如果没有选择显卡，使用保守估计
    return {
      speed: Math.round(baselineSpeed * 0.8 * 10) / 10,
      unit,
    };
  }
  
  // 计算速度
  const speed = baselineSpeed * gpu.performanceMultiplier;
  
  return {
    speed: Math.round(speed * 10) / 10,
    unit,
  };
}

/**
 * 评估单个模型
 */
export function evaluateModel(
  model: AIModel,
  hardware: UserHardware
): ModelEvaluation {
  const gpu = hardware.gpuId ? getGPUById(hardware.gpuId) : null;
  
  // 判断兼容性状态
  let status: ModelEvaluation['status'] = 'compatible';
  
  if (hardware.vram < model.minVRAM) {
    status = 'incompatible';
  } else if (hardware.vram < model.minVRAM + 2) {
    // 显存接近最低要求（差值小于 2GB）时给警告
    status = 'warning';
  }
  
  // 计算推理速度
  const speedInfo = calculateSpeed(model, gpu);
  
  return {
    model,
    status,
    userHardware: hardware,
    estimatedSpeed: speedInfo.speed,
    speedUnit: speedInfo.unit as any,
    isTopPick: false,
  };
}

/**
 * 评估所有模型
 */
export function evaluateAllModels(hardware: UserHardware): EvaluationResult {
  const models = getAllModels();
  const evaluations: ModelEvaluation[] = [];
  
  // 对每个模型进行评估
  for (const model of models) {
    const evaluation = evaluateModel(model, hardware);
    evaluations.push(evaluation);
  }
  
  // 统计
  const compatibleCount = evaluations.filter(e => e.status === 'compatible').length;
  const warningCount = evaluations.filter(e => e.status === 'warning').length;
  const incompatibleCount = evaluations.filter(e => e.status === 'incompatible').length;
  
  // 按状态和优先级排序
  evaluations.sort((a, b) => {
    // 先按状态排序
    const statusOrder = { compatible: 0, warning: 1, incompatible: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // 再按优先级排序（高到低）
    const priorityA = a.model.priority || 50;
    const priorityB = b.model.priority || 50;
    return priorityB - priorityA;
  });
  
  return {
    evaluations,
    summary: {
      total: models.length,
      compatible: compatibleCount,
      warning: warningCount,
      incompatible: incompatibleCount,
    },
  };
}

/**
 * 按类别分组评估结果
 */
export function groupByCategory(evaluations: ModelEvaluation[]): Record<ModelCategory, ModelEvaluation[]> {
  const categories: ModelCategory[] = ['Chat', 'Code', 'Image', 'Video', 'Multimodal', 'Audio'];
  const groups: Record<string, ModelEvaluation[]> = {};
  
  for (const category of categories) {
    groups[category] = [];
  }
  
  for (const evaluation of evaluations) {
    const category = evaluation.model.category;
    if (groups[category]) {
      groups[category].push(evaluation);
    }
  }
  
  return groups as Record<ModelCategory, ModelEvaluation[]>;
}

/**
 * 应用状态筛选器
 */
export function applyStatusFilters(
  evaluations: ModelEvaluation[],
  activeFilters: StatusFilter[]
): ModelEvaluation[] {
  if (activeFilters.length === 0) {
    return evaluations;
  }
  return evaluations.filter(e => activeFilters.includes(e.status));
}

/**
 * 找出 Top Pick 推荐
 * 在当前分类下，状态为 compatible 的模型中，priority 最高的那个
 */
export function findTopPick(evaluations: ModelEvaluation[]): ModelEvaluation | null {
  const compatibleModels = evaluations.filter(e => e.status === 'compatible');
  
  if (compatibleModels.length === 0) {
    return null;
  }
  
  // 按 priority 降序排序
  compatibleModels.sort((a, b) => {
    const priorityA = a.model.priority || 50;
    const priorityB = b.model.priority || 50;
    return priorityB - priorityA;
  });
  
  return compatibleModels[0];
}

/**
 * 标记 Top Pick
 */
export function markTopPick(evaluations: ModelEvaluation[]): ModelEvaluation[] {
  const topPick = findTopPick(evaluations);
  
  return evaluations.map(e => ({
    ...e,
    isTopPick: e === topPick,
  }));
}

/**
 * 筛选兼容的模型
 */
export function getCompatibleModels(evaluations: ModelEvaluation[]): ModelEvaluation[] {
  return evaluations.filter(e => e.status !== 'incompatible');
}

/**
 * 获取推荐模型（前 N 个）
 */
export function getRecommendedModels(evaluations: ModelEvaluation[], limit = 5): ModelEvaluation[] {
  return getCompatibleModels(evaluations)
    .sort((a, b) => {
      const priorityA = a.model.priority || 50;
      const priorityB = b.model.priority || 50;
      return priorityB - priorityA;
    })
    .slice(0, limit);
}
