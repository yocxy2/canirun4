/**
 * 浏览器硬件嗅探探针
 * 通过 WebGL 和 Navigator API 获取硬件信息
 */

import type { HardwareDetectionResult } from '@/types';

// 扩展 Navigator 接口以包含 deviceMemory
interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * 已知的虚拟渲染器关键词
 */
const VIRTUAL_RENDERER_KEYWORDS = [
  'angle',
  'swiftshader',
  'llvmpipe',
  'software',
  'microsoft basic render',
  'gdi',
  'vmware',
  'virtualbox',
  'parallels',
];

/**
 * 检测是否为虚拟渲染器
 */
export function isVirtualRenderer(gpuString: string): boolean {
  const gpu = gpuString.toLowerCase();
  return VIRTUAL_RENDERER_KEYWORDS.some(keyword => gpu.includes(keyword));
}

/**
 * GPU 厂商识别
 */
function identifyGPUVendor(gpuString: string): HardwareDetectionResult['gpuVendor'] {
  const gpu = gpuString.toLowerCase();
  
  if (gpu.includes('nvidia') || gpu.includes('geforce') || gpu.includes('rtx') || gpu.includes('gtx')) {
    return 'nvidia';
  }
  if (gpu.includes('amd') || gpu.includes('radeon') || gpu.includes('rx ')) {
    return 'amd';
  }
  if (gpu.includes('intel')) {
    return 'intel';
  }
  if (gpu.includes('apple') || gpu.includes('m1') || gpu.includes('m2') || gpu.includes('m3') || gpu.includes('m4')) {
    return 'apple';
  }
  
  return 'unknown';
}

/**
 * 根据显卡型号推测显存大小
 * 这是一个粗略的推测，用户仍需确认
 */
export function estimateVRAM(gpuString: string): number {
  const gpu = gpuString.toLowerCase();
  
  // NVIDIA RTX 40 系列
  if (gpu.includes('rtx 4090')) return 24;
  if (gpu.includes('rtx 4080')) return 16;
  if (gpu.includes('rtx 4070 ti')) return 12;
  if (gpu.includes('rtx 4070') && !gpu.includes('ti')) return 12;
  if (gpu.includes('rtx 4060 ti')) return 8;
  if (gpu.includes('rtx 4060') && !gpu.includes('ti')) return 8;
  
  // NVIDIA RTX 30 系列
  if (gpu.includes('rtx 3090 ti')) return 24;
  if (gpu.includes('rtx 3090')) return 24;
  if (gpu.includes('rtx 3080 ti')) return 12;
  if (gpu.includes('rtx 3080')) return 10;
  if (gpu.includes('rtx 3070 ti')) return 8;
  if (gpu.includes('rtx 3070')) return 8;
  if (gpu.includes('rtx 3060 ti')) return 8;
  if (gpu.includes('rtx 3060')) return 12;
  
  // NVIDIA RTX 20 系列
  if (gpu.includes('rtx 2080 ti')) return 11;
  if (gpu.includes('rtx 2080 super')) return 8;
  if (gpu.includes('rtx 2080')) return 8;
  if (gpu.includes('rtx 2070 super')) return 8;
  if (gpu.includes('rtx 2070')) return 8;
  if (gpu.includes('rtx 2060 super')) return 8;
  if (gpu.includes('rtx 2060')) return 6;
  
  // NVIDIA GTX 10 系列
  if (gpu.includes('gtx 1080 ti')) return 11;
  if (gpu.includes('gtx 1080')) return 8;
  if (gpu.includes('gtx 1070 ti')) return 8;
  if (gpu.includes('gtx 1070')) return 8;
  if (gpu.includes('gtx 1060')) return 6;
  
  // Apple Silicon
  if (gpu.includes('m4 max')) return 48;
  if (gpu.includes('m4 pro')) return 24;
  if (gpu.includes('m4') && !gpu.includes('pro') && !gpu.includes('max')) return 16;
  if (gpu.includes('m3 max')) return 48;
  if (gpu.includes('m3 pro')) return 18;
  if (gpu.includes('m3') && !gpu.includes('pro') && !gpu.includes('max')) return 10;
  if (gpu.includes('m2 max')) return 32;
  if (gpu.includes('m2 pro')) return 16;
  if (gpu.includes('m2') && !gpu.includes('pro') && !gpu.includes('max')) return 8;
  if (gpu.includes('m1 max')) return 32;
  if (gpu.includes('m1 pro')) return 16;
  if (gpu.includes('m1 ultra')) return 48;
  if (gpu.includes('m1') && !gpu.includes('pro') && !gpu.includes('max') && !gpu.includes('ultra')) return 8;
  
  // AMD Radeon
  if (gpu.includes('rx 7900 xtx')) return 24;
  if (gpu.includes('rx 7900 xt')) return 20;
  if (gpu.includes('rx 7800 xt')) return 16;
  if (gpu.includes('rx 7700 xt')) return 12;
  if (gpu.includes('rx 6900 xt')) return 16;
  if (gpu.includes('rx 6800 xt')) return 16;
  if (gpu.includes('rx 6800')) return 16;
  if (gpu.includes('rx 6700 xt')) return 12;
  if (gpu.includes('rx 6700')) return 10;
  if (gpu.includes('rx 6600 xt')) return 8;
  if (gpu.includes('rx 6600')) return 8;
  
  // Intel Arc
  if (gpu.includes('arc a770')) return 16;
  if (gpu.includes('arc a750')) return 8;
  
  // 默认返回 8GB
  return 8;
}

/**
 * 获取硬件规格
 * 通过浏览器 API 探测硬件信息
 */
export function getHardwareSpecs(): HardwareDetectionResult {
  try {
    // 1. 获取内存（注意：deviceMemory 返回的是粗略值，单位 GB）
    const typedNavigator = navigator as NavigatorWithMemory;
    const ram = typedNavigator.deviceMemory || 8; // 默认 8GB
    
    // 2. 获取 CPU 核心数
    const cpuCores = navigator.hardwareConcurrency || 4; // 默认 4 核
    
    // 3. 通过 WebGL 获取显卡信息
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return {
        gpu: 'Unknown GPU',
        gpuVendor: 'unknown',
        ram,
        cpuCores,
        detected: false,
        error: 'WebGL 不可用，无法获取显卡信息',
      };
    }
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    
    if (!debugInfo) {
      return {
        gpu: 'Unknown GPU',
        gpuVendor: 'unknown',
        ram,
        cpuCores,
        detected: false,
        error: 'WEBGL_debug_renderer_info 扩展不可用',
      };
    }
    
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    if (!renderer) {
      return {
        gpu: 'Unknown GPU',
        gpuVendor: 'unknown',
        ram,
        cpuCores,
        detected: false,
        error: '无法获取显卡渲染器信息',
      };
    }
    
    // 检测是否为虚拟渲染器
    if (isVirtualRenderer(renderer)) {
      return {
        gpu: renderer,
        gpuVendor: 'unknown',
        ram,
        cpuCores,
        detected: true,
        isVirtualRenderer: true,
        error: '检测到虚拟渲染器，无法获取真实显卡信息',
      };
    }
    
    // 识别 GPU 厂商
    const gpuVendor = identifyGPUVendor(renderer);
    
    // 估算显存
    const estimatedVRAM = estimateVRAM(renderer);
    
    return {
      gpu: renderer,
      gpuVendor,
      ram,
      cpuCores,
      detected: true,
      isVirtualRenderer: false,
      estimatedVRAM,
    };
    
  } catch (error) {
    return {
      gpu: 'Unknown GPU',
      gpuVendor: 'unknown',
      ram: 8,
      cpuCores: 4,
      detected: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 获取推荐的操作系统
 */
export function getDetectedOS(): 'windows' | 'mac' | 'linux' {
  const platform = navigator.platform.toLowerCase();
  
  if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad')) {
    return 'mac';
  }
  if (platform.includes('win')) {
    return 'windows';
  }
  if (platform.includes('linux')) {
    return 'linux';
  }
  
  // 通过 userAgent 辅助判断
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  
  return 'windows'; // 默认 Windows
}
