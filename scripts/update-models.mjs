#!/usr/bin/env node

/**
 * CanIRun.AI - 自动化模型数据更新流水线
 * 
 * 功能：
 * 1. 从 OpenRouter API 获取最新模型列表
 * 2. 过滤出热门开源模型
 * 3. 调用 LLM 生成中英双语描述和标签
 * 4. 转换为内部 AIModel 接口格式
 * 5. 去重并合并到现有 models.json
 * 
 * 环境变量：
 * - LLM_API_KEY: LLM API 密钥（可选，用于双语翻译）
 * - LLM_API_URL: LLM API 端点（默认: https://api.openai.com/v1）
 * - LLM_MODEL: 使用的模型（默认: gpt-4o-mini）
 * 
 * 运行方式：node scripts/update-models.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置常量 ====================

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';
const MODELS_FILE = path.join(__dirname, '../src/data/models.json');

// LLM 配置（用于双语翻译）
const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
};

// 开源模型关键词（用于过滤）
const OPEN_SOURCE_KEYWORDS = [
  'llama', 'qwen', 'mistral', 'deepseek', 'gemma', 'phi', 
  'mixtral', 'codellama', 'starcoder', 'flux', 'sdxl', 
  'stable-diffusion', 'whisper', 'llava', 'yi', 'phi-3',
  'command-r', 'solar', 'openchat', 'nous', 'airoboros'
];

// 云端服务商配置
const CLOUD_PROVIDERS = {
  OPENROUTER: {
    provider: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
  },
  SILICONFLOW: {
    provider: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1',
  },
  NVIDIA_NIM: {
    provider: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1',
  }
};

// ==================== LLM 双语翻译 ====================

/**
 * LLM 双语翻译 System Prompt
 * 强制输出标准化的中英双语结构
 */
const BILINGUAL_SYSTEM_PROMPT = `你是一个 AI 领域的资深多语言本地化专家。请根据提供的英文开源 AI 模型信息，提取、润色并输出中英双语的专业描述和极客标签。

**输出要求：**
1. 必须严格返回 JSON 格式，不要包含任何其他文字
2. description_en: 专业、简洁的英文描述（50-100词）
3. description_zh: 极客风格的专业中文描述（50-100字），避免翻译腔
4. tags_en: 3-5个英文标签，用小写，如 ["llm", "chat", "code"]
5. tags_zh: 3-5个中文标签，如 ["大语言模型", "对话", "代码"]

**必须返回如下 JSON 结构：**
{
  "description_en": "Professional English description...",
  "description_zh": "极客风格的专业中文描述...",
  "tags_en": ["tag1", "tag2", "tag3"],
  "tags_zh": ["标签1", "标签2", "标签3"]
}`;

/**
 * 调用 LLM 生成双语描述
 */
async function generateBilingualDescription(modelInfo) {
  // 如果没有配置 API Key，使用默认描述
  if (!LLM_CONFIG.apiKey) {
    return {
      description_en: modelInfo.description_en || modelInfo.description,
      description_zh: modelInfo.description_zh || modelInfo.description,
      tags_en: modelInfo.tags_en || modelInfo.tags,
      tags_zh: modelInfo.tags_zh || modelInfo.tags,
    };
  }

  const userPrompt = `模型信息：
- 名称: ${modelInfo.name}
- ID: ${modelInfo.id}
- 参数量: ${modelInfo.parameters}
- 分类: ${modelInfo.category}
- 原始描述: ${modelInfo.description || '无'}
- 原始标签: ${(modelInfo.tags || []).join(', ')}

请生成标准化的中英双语描述和标签。`;

  try {
    const response = await fetch(`${LLM_CONFIG.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          { role: 'system', content: BILINGUAL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ LLM API 调用失败: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    
    // 验证必需字段
    if (parsed.description_en && parsed.description_zh && 
        parsed.tags_en && parsed.tags_zh) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️ 双语翻译失败: ${error.message}`);
    return null;
  }
}

/**
 * 批量生成双语描述（带进度显示）
 */
async function batchGenerateBilingual(models) {
  if (!LLM_CONFIG.apiKey) {
    console.log('ℹ️ 未配置 LLM_API_KEY，跳过双语翻译');
    return models;
  }

  console.log(`\n🌐 正在调用 LLM 生成双语描述 (模型: ${LLM_CONFIG.model})...`);
  
  const results = [];
  let successCount = 0;
  let skipCount = 0;
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    process.stdout.write(`\r  [${i + 1}/${models.length}] 处理: ${model.name.substring(0, 30)}...`);
    
    // 如果已有完整双语数据，跳过
    if (model.description_en && model.description_zh && 
        model.tags_en && model.tags_zh) {
      results.push(model);
      skipCount++;
      continue;
    }
    
    // 调用 LLM 生成双语数据
    const bilingual = await generateBilingualDescription(model);
    
    if (bilingual) {
      results.push({
        ...model,
        description: bilingual.description_en, // 兼容字段
        description_en: bilingual.description_en,
        description_zh: bilingual.description_zh,
        tags: bilingual.tags_en, // 兼容字段
        tags_en: bilingual.tags_en,
        tags_zh: bilingual.tags_zh,
      });
      successCount++;
    } else {
      // 生成失败，保留原数据
      results.push({
        ...model,
        description_en: model.description_en || model.description,
        description_zh: model.description_zh || model.description,
        tags_en: model.tags_en || model.tags,
        tags_zh: model.tags_zh || model.tags,
      });
    }
    
    // 避免触发 API 限流
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n  ✅ 双语翻译完成: 成功 ${successCount}，跳过 ${skipCount}，失败 ${models.length - successCount - skipCount}\n`);
  
  return results;
}

// ==================== 工具函数 ====================

/**
 * 从模型名称/ID 推断参数量（单位：B）
 */
function inferParameters(modelName) {
  const name = modelName.toLowerCase();
  
  // 匹配常见参数量模式
  const patterns = [
    /(\d+(?:\.\d+)?)\s*b/i,           // "7B", "70B", "0.5B"
    /(\d+(?:\.\d+)?)\s* billion/i,     // "7 billion"
    /-(\d+)b-/i,                        // "-7b-"
    /_(\d+)b_/i,                        // "_7b_"
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  // 特殊模型推断
  if (name.includes('mini') || name.includes('tiny')) return 3;
  if (name.includes('small')) return 7;
  if (name.includes('medium')) return 14;
  if (name.includes('large')) return 30;
  if (name.includes('xl') || name.includes('extra')) return 70;
  
  // 默认估算
  return 7;
}

/**
 * 估算最小显存需求（GB）
 */
function estimateMinVRAM(parametersInB, quantized = true) {
  const baseMultiplier = quantized ? 1.2 : 2.2;
  const overhead = 2;
  
  let vram = parametersInB * baseMultiplier + overhead;
  
  if (parametersInB > 50) {
    vram *= 0.6;
  }
  
  const tiers = [4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80];
  for (const tier of tiers) {
    if (vram <= tier) return tier;
  }
  return Math.ceil(vram);
}

/**
 * 从模型名称推断分类
 */
function inferCategory(modelName, tags = []) {
  const name = modelName.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();
  
  if (name.includes('coder') || name.includes('code') || tagStr.includes('code')) {
    return 'Code';
  }
  if (name.includes('vl') || name.includes('vision') || name.includes('llava') || 
      name.includes('pixtral') || tagStr.includes('multimodal')) {
    return 'Multimodal';
  }
  if (name.includes('flux') || name.includes('sdxl') || name.includes('stable-diffusion') ||
      name.includes('image') || tagStr.includes('image')) {
    return 'Image';
  }
  if (name.includes('video') || name.includes('sora') || tagStr.includes('video')) {
    return 'Video';
  }
  if (name.includes('whisper') || name.includes('tts') || name.includes('audio') ||
      name.includes('speech') || tagStr.includes('audio')) {
    return 'Audio';
  }
  
  return 'Chat';
}

/**
 * 从模型名称推断支持的推理引擎
 */
function inferEngines(modelName, category) {
  const name = modelName.toLowerCase();
  
  if (category === 'Image' || category === 'Video') {
    return ['ComfyUI', 'WebUI'];
  }
  
  if (category === 'Audio') {
    return ['Transformers'];
  }
  
  if (name.includes('70b') || name.includes('120b') || name.includes('moe')) {
    return ['vLLM', 'Ollama', 'LM Studio'];
  }
  
  return ['Ollama', 'LM Studio'];
}

/**
 * 生成 Ollama 安装命令
 */
function generateInstallCommand(modelId, category) {
  if (category === 'Image' || category === 'Video') {
    return '通过 Stability Matrix 下载或导入 ComfyUI 节点';
  }
  if (category === 'Audio') {
    return 'pip install -U transformers';
  }
  
  const ollamaName = modelId
    .replace(/\//g, ':')
    .replace(/-/g, '')
    .toLowerCase();
  
  return `ollama run ${ollamaName.split(':')[0]}`;
}

/**
 * 推断推理速度
 */
function estimateSpeed(parametersInB, category) {
  if (category === 'Image') return Math.max(2, 8 - parametersInB * 0.5);
  if (category === 'Video') return Math.max(20, 60 - parametersInB);
  if (category === 'Audio') return Math.max(2, 10 - parametersInB);
  
  if (parametersInB <= 1) return 120;
  if (parametersInB <= 3) return 80;
  if (parametersInB <= 7) return 55;
  if (parametersInB <= 14) return 35;
  if (parametersInB <= 32) return 20;
  return 10;
}

/**
 * 推断速度单位
 */
function inferSpeedUnit(category) {
  switch (category) {
    case 'Image': return 's/img';
    case 'Video': return 's/s';
    case 'Audio': return 'x RT';
    default: return 't/s';
  }
}

/**
 * 计算优先级权重
 */
function calculatePriority(model, parametersInB) {
  let priority = 80;
  
  if (model.pricing?.prompt === '0' || model.pricing?.prompt?.includes('0')) {
    priority += 10;
  }
  
  if ([7, 8, 14, 32].includes(Math.round(parametersInB))) {
    priority += 5;
  }
  
  const name = (model.id || '').toLowerCase();
  if (name.includes('qwen') || name.includes('llama') || name.includes('deepseek')) {
    priority += 5;
  }
  
  return Math.min(100, Math.max(60, priority));
}

// ==================== 核心逻辑 ====================

/**
 * 从 OpenRouter 获取模型列表
 */
async function fetchOpenRouterModels() {
  console.log('📡 正在从 OpenRouter 获取模型列表...');
  
  try {
    const response = await fetch(OPENROUTER_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ 获取到 ${data.data?.length || 0} 个模型`);
    return data.data || [];
  } catch (error) {
    console.error('❌ 获取 OpenRouter 模型失败:', error.message);
    return [];
  }
}

/**
 * 过滤出值得关注的开源模型
 */
function filterModels(models) {
  console.log('🔍 正在过滤开源模型...');
  
  return models.filter(model => {
    const name = (model.id || '').toLowerCase();
    const nameLower = (model.name || '').toLowerCase();
    
    const hasKeyword = OPEN_SOURCE_KEYWORDS.some(keyword => 
      name.includes(keyword) || nameLower.includes(keyword)
    );
    
    if (!hasKeyword) return false;
    
    if (name.includes('deprecated') || name.includes('legacy')) return false;
    
    if (model.stats?.requests_24h < 10) return false;
    
    return true;
  });
}

/**
 * 将 OpenRouter 模型转换为内部 AIModel 格式
 */
function convertToAIModel(orModel) {
  const params = inferParameters(orModel.id);
  const category = inferCategory(orModel.id, orModel.tags || []);
  const minVRAM = estimateMinVRAM(params);
  const minRAM = Math.max(8, minVRAM * 0.5);
  const speed = estimateSpeed(params, category);
  const speedUnit = inferSpeedUnit(category);
  const priority = calculatePriority(orModel, params);
  
  // 构建云端方案列表
  const cloudAlternatives = [];
  
  cloudAlternatives.push({
    provider: CLOUD_PROVIDERS.OPENROUTER.provider,
    url: CLOUD_PROVIDERS.OPENROUTER.url,
    modelId: orModel.id,
    freeTierDesc: orModel.pricing?.prompt === '0' ? '完全免费' : '价格极低',
  });
  
  return {
    id: orModel.id.replace(/\//g, '-').toLowerCase(),
    name: orModel.name || orModel.id.split('/').pop(),
    category,
    parameters: params >= 1 ? `${params}B` : `${params * 1000}M`,
    minVRAM,
    minRAM,
    // 初始描述（稍后会通过 LLM 双语化）
    description: orModel.description || `开源 ${params}B 参数模型，适用于 ${category} 场景。`,
    description_en: '',  // 待 LLM 填充
    description_zh: '',  // 待 LLM 填充
    installCommand: generateInstallCommand(orModel.id, category),
    tags: (orModel.tags || []).slice(0, 3),
    tags_en: [],  // 待 LLM 填充
    tags_zh: [],  // 待 LLM 填充
    supportedEngines: inferEngines(orModel.id, category),
    baselineSpeed: speed,
    speedUnit,
    priority,
    cloudAlternatives,
    tuningParams: {
      temp: category === 'Code' ? 0.1 : 0.7,
      minCtx: 4096,
      maxCtx: 8192,
    },
  };
}

/**
 * 读取现有模型数据
 */
function loadExistingModels() {
  try {
    const content = fs.readFileSync(MODELS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ 读取现有模型失败:', error.message);
    return [];
  }
}

/**
 * 去重合并模型
 */
function mergeModels(existing, newModels) {
  const existingIds = new Set(existing.map(m => m.id.toLowerCase()));
  const unique = newModels.filter(m => !existingIds.has(m.id.toLowerCase()));
  
  console.log(`📊 统计: 现有 ${existing.length} 个，新增 ${unique.length} 个`);
  
  return [...existing, ...unique];
}

/**
 * 保存模型数据
 */
function saveModels(models) {
  models.sort((a, b) => (b.priority || 80) - (a.priority || 80));
  
  fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8');
  console.log(`✅ 已保存 ${models.length} 个模型到 ${MODELS_FILE}`);
}

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 CanIRun.AI 模型数据更新流水线启动\n');
  console.log(`📝 LLM 配置: ${LLM_CONFIG.apiKey ? `已配置 (${LLM_CONFIG.model})` : '未配置'}\n`);
  
  // Step 1: 获取 OpenRouter 模型
  const orModels = await fetchOpenRouterModels();
  if (orModels.length === 0) {
    console.log('⚠️ 未获取到任何模型，跳过更新');
    return;
  }
  
  // Step 2: 过滤
  const filtered = filterModels(orModels);
  console.log(`✅ 过滤后剩余 ${filtered.length} 个值得关注的开源模型\n`);
  
  // Step 3: 转换格式
  console.log('🔄 正在转换模型格式...');
  const converted = filtered.map(convertToAIModel);
  
  // Step 4: 读取现有数据
  console.log('\n📂 正在读取现有模型数据...');
  const existing = loadExistingModels();
  
  // Step 5: 合并去重
  console.log('\n🔀 正在合并数据...');
  const merged = mergeModels(existing, converted);
  
  // Step 6: 批量生成双语描述（新增）
  const bilingualModels = await batchGenerateBilingual(merged);
  
  // Step 7: 保存
  console.log('💾 正在保存...');
  saveModels(bilingualModels);
  
  console.log('\n🎉 模型数据更新完成！');
}

// 执行
main().catch(console.error);
