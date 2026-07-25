/**
 * 核心类型定义
 * CanIRun.AI - 本地 AI 部署评估工具
 * Phase 1 V6.0
 */

/**
 * 模型分类（场景化 - V3.0 更新）
 */
export type ModelCategory = 'Chat' | 'Code' | 'Image' | 'Video' | 'Multimodal' | 'Audio';

/**
 * 速度单位 (V3.0 更新)
 * - t/s: tokens per second (文本生成)
 * - s/img: seconds per image (图像生成)
 * - s/s: seconds per second (视频生成)
 * - x RT: 实时倍率 (语音处理)
 * - iter/s: iterations per second (迭代速度)
 */
export type SpeedUnit = 't/s' | 's/img' | 's/s' | 'x RT' | 'iter/s';

/**
 * 操作系统类型
 */
export type OS = 'windows' | 'mac' | 'linux';

/**
 * GPU 厂商
 */
export type GPUVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';

/**
 * 支持的推理引擎
 */
export type SupportedEngine = 'Ollama' | 'LM Studio' | 'ComfyUI' | 'Transformers' | 'WebUI' | 'vLLM' | 'Stability Matrix';

/**
 * 高阶配置
 */
export interface AdvancedConfig {
  quantization: string;
  contextWindow: string;
  tips: string;
}

/**
 * 云端替代方案 (V4.0 - 已废弃，保留兼容)
 * @deprecated 请使用 CloudProvider 接口
 */
export interface CloudAlternative {
  /** 服务商名称 */
  provider: string;
  /** 服务商链接 */
  url: string;
  /** 模型 ID */
  modelId: string;
}

/**
 * 云端服务商定义 (V6.0 新增)
 */
export interface CloudProvider {
  /** 服务商名称 */
  provider: string;
  /** 服务商 API 地址 */
  url: string;
  /** 模型 ID */
  modelId: string;
  /** 免费额度描述 */
  freeTierDesc?: string;
}

/**
 * 生态接入 (V4.0 新增)
 */
export interface Integration {
  /** 接入名称 */
  name: string;
  /** 接入描述 */
  description: string;
  /** 相关链接 */
  url?: string;
}

/**
 * 调参建议 (V4.0 新增)
 */
export interface TuningParams {
  /** 推荐温度 */
  temp: number;
  /** 最小上下文 */
  minCtx: number;
  /** 最大上下文 */
  maxCtx: number;
}

/**
 * AI 模型定义 (V6.0 更新 - V7.0 i18n 深度国际化)
 */
export interface AIModel {
  /** 模型唯一标识 */
  id: string;
  /** 模型名称 */
  name: string;
  /** 模型分类 */
  category: ModelCategory;
  /** 参数量 */
  parameters: string;
  /** 最小显存要求 (GB) */
  minVRAM: number;
  /** 最小内存要求 (GB) */
  minRAM: number;
  /** 模型描述 (原始/英文 - 兼容旧数据) */
  description: string;
  /** 模型描述 (英文 - 标准化字段) */
  description_en?: string;
  /** 模型描述 (中文) */
  description_zh?: string;
  /** 安装命令 */
  installCommand: string;
  /** 标签 (原始/英文 - 兼容旧数据) */
  tags: string[];
  /** 标签 (英文 - 标准化字段) */
  tags_en?: string[];
  /** 标签 (中文) */
  tags_zh?: string[];
  /** 支持的推理引擎 */
  supportedEngines: SupportedEngine[];
  /** 高阶配置 */
  advancedConfig?: AdvancedConfig;
  /** 基准推理速度（用于性能估算） */
  baselineSpeed?: number;
  /** 速度单位 */
  speedUnit?: SpeedUnit;
  /** 优先级权重 (1-100，用于推荐排序) */
  priority?: number;
  /** 云端替代方案 (V4.0 - 已废弃，保留兼容) */
  cloudAlternative?: CloudAlternative;
  /** 多云端服务商聚合选项 (V6.0 新增) */
  cloudAlternatives?: CloudProvider[];
  /** 生态接入 (V4.0 新增) */
  integrations?: Integration[];
  /** 调参建议 (V4.0 新增) */
  tuningParams?: TuningParams;
}

/**
 * GPU 型号定义
 */
export interface GPUModel {
  /** GPU 唯一标识 */
  id: string;
  /** GPU 名称 */
  name: string;
  /** GPU 厂商 */
  vendor: GPUVendor;
  /** 显存大小 (GB) */
  vram: number;
  /** 性能系数（相对基准性能的倍数） */
  performanceMultiplier: number;
  /** 架构代号 */
  architecture?: string;
  /** 推出年份 */
  releaseYear?: number;
}

/**
 * 用户硬件配置
 */
export interface UserHardware {
  /** 操作系统 */
  os: OS;
  /** 内存大小 (GB) */
  ram: number;
  /** 显存大小 (GB) */
  vram: number;
  /** 显卡 ID（可选） */
  gpuId?: string;
}

/**
 * 硬件检测结果
 */
export interface HardwareDetectionResult {
  /** 显卡名称 */
  gpu: string;
  /** 显卡厂商 */
  gpuVendor: GPUVendor;
  /** 内存大小 */
  ram: number;
  /** CPU 核心数 */
  cpuCores: number;
  /** 是否检测成功 */
  detected: boolean;
  /** 是否为虚拟渲染器 */
  isVirtualRenderer?: boolean;
  /** 错误信息 */
  error?: string;
  /** 估算的显存大小 */
  estimatedVRAM?: number;
}

/**
 * 模型评估结果
 */
export interface ModelEvaluation {
  /** 模型信息 */
  model: AIModel;
  /** 兼容性状态 */
  status: 'compatible' | 'warning' | 'incompatible';
  /** 用户硬件 */
  userHardware: UserHardware;
  /** 预估推理速度 */
  estimatedSpeed?: number;
  /** 速度单位 */
  speedUnit?: SpeedUnit;
  /** 是否为 Top Pick 推荐 */
  isTopPick?: boolean;
}

/**
 * 评估结果汇总
 */
export interface EvaluationSummary {
  /** 总数 */
  total: number;
  /** 兼容数 */
  compatible: number;
  /** 警告数 */
  warning: number;
  /** 不兼容数 */
  incompatible: number;
}

/**
 * 完整评估结果
 */
export interface EvaluationResult {
  /** 所有评估结果 */
  evaluations: ModelEvaluation[];
  /** 统计汇总 */
  summary: EvaluationSummary;
}

/**
 * 状态筛选器类型
 */
export type StatusFilter = 'compatible' | 'warning' | 'incompatible';

/**
 * 部署模式 (V4.0 新增)
 */
export type DeployMode = 'exclusive' | 'balanced' | 'gamer';

/**
 * 分类名称映射
 */
export const CATEGORY_LABELS: Record<ModelCategory, string> = {
  Chat: '对话&写作',
  Code: '编程辅助',
  Image: '图像创作',
  Video: '视频创作',
  Multimodal: '多模态',
  Audio: '语音处理',
};
