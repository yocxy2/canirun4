/**
 * GPU 数据加载工具
 */

import gpuModelsData from '@/data/gpu_models.json';
import type { GPUModel, GPUVendor } from '@/types';

/**
 * 验证 GPU 厂商
 */
function isValidGPUVendor(vendor: string): vendor is GPUVendor {
  return ['nvidia', 'amd', 'intel', 'apple', 'unknown'].includes(vendor);
}

/**
 * 验证 GPU 数据项
 */
function isValidGPUModel(item: unknown): item is GPUModel {
  if (!item || typeof item !== 'object') return false;

  const gpu = item as Record<string, unknown>;

  // 检查必填字段
  if (typeof gpu.id !== 'string' || !gpu.id) return false;
  if (typeof gpu.name !== 'string' || !gpu.name) return false;
  if (typeof gpu.vram !== 'number' || gpu.vram <= 0) return false;
  if (typeof gpu.performanceMultiplier !== 'number' || gpu.performanceMultiplier <= 0) return false;

  // 验证厂商
  if (typeof gpu.vendor !== 'string' || !isValidGPUVendor(gpu.vendor)) return false;

  return true;
}

/**
 * 验证并获取所有 GPU
 */
function validateGPUData(data: unknown[]): GPUModel[] {
  const validGPUs: GPUModel[] = [];
  const invalidItems: unknown[] = [];

  for (const item of data) {
    if (isValidGPUModel(item)) {
      validGPUs.push(item);
    } else {
      invalidItems.push(item);
    }
  }

  if (invalidItems.length > 0) {
    console.warn(`[GPU Data] ${invalidItems.length} invalid GPU entries found and skipped:`, invalidItems);
  }

  if (validGPUs.length === 0) {
    console.error('[GPU Data] No valid GPU models found in data file');
  }

  return validGPUs;
}

/**
 * 获取所有 GPU 型号
 */
export function getAllGPUs(): GPUModel[] {
  // 使用运行时验证代替类型断言
  return validateGPUData(gpuModelsData as unknown[]);
}

/**
 * 按厂商获取 GPU
 */
export function getGPUsByVendor(vendor: GPUModel['vendor']): GPUModel[] {
  return getAllGPUs().filter(gpu => gpu.vendor === vendor);
}

/**
 * 根据 ID 获取 GPU
 */
export function getGPUById(id: string): GPUModel | undefined {
  return getAllGPUs().find(gpu => gpu.id === id);
}

/**
 * 根据显存大小获取 GPU 列表
 */
export function getGPUsByVRAM(vram: number): GPUModel[] {
  return getAllGPUs().filter(gpu => gpu.vram === vram);
}

/**
 * 搜索 GPU
 */
export function searchGPUs(query: string): GPUModel[] {
  const q = query.toLowerCase();
  return getAllGPUs().filter(gpu =>
    gpu.name.toLowerCase().includes(q) ||
    gpu.id.toLowerCase().includes(q)
  );
}

/**
 * 获取性能排名（按性能系数降序）
 */
export function getGPUsByPerformance(): GPUModel[] {
  return [...getAllGPUs()].sort((a, b) => b.performanceMultiplier - a.performanceMultiplier);
}

/**
 * 分组获取 GPU（按厂商）
 */
export function getGroupedGPUs(): Record<GPUModel['vendor'], GPUModel[]> {
  const gpus = getAllGPUs();
  return {
    nvidia: gpus.filter(g => g.vendor === 'nvidia'),
    amd: gpus.filter(g => g.vendor === 'amd'),
    apple: gpus.filter(g => g.vendor === 'apple'),
    intel: gpus.filter(g => g.vendor === 'intel'),
    unknown: [],
  };
}
