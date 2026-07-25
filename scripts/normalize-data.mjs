#!/usr/bin/env node

/**
 * CanIRun.AI - 数据清洗与规范化脚本
 * 
 * 功能：
 * 1. 读取现有 models.json
 * 2. 检测每个模型的双语数据完整性
 * 3. 对于缺失或不完整的双语数据，调用 LLM 生成
 * 4. 统一输出标准化的四字段结构：
 *    - description_en
 *    - description_zh
 *    - tags_en
 *    - tags_zh
 * 
 * 环境变量：
 * - LLM_API_KEY: LLM API 密钥（必需）
 * - LLM_API_URL: LLM API 端点（默认: https://api.openai.com/v1）
 * - LLM_MODEL: 使用的模型（默认: gpt-4o-mini）
 * 
 * 运行方式：node scripts/normalize-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================

const MODELS_FILE = path.join(__dirname, '../src/data/models.json');
const BACKUP_FILE = path.join(__dirname, '../src/data/models.json.backup');

const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
};

// ==================== LLM 调用 ====================

const BILINGUAL_SYSTEM_PROMPT = `你是一个 AI 领域的资深多语言本地化专家。请根据提供的 AI 模型信息，生成标准化的中英双语描述和标签。

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
 * 检测文本是否为中文
 */
function isChinese(text) {
  if (!text) return false;
  const chineseChars = text.match(/[\u4e00-\u9fff]/g);
  return chineseChars && chineseChars.length > text.length * 0.3;
}

/**
 * 调用 LLM 生成双语数据
 */
async function generateBilingualData(model) {
  if (!LLM_CONFIG.apiKey) {
    console.error('❌ 错误: 未配置 LLM_API_KEY 环境变量');
    process.exit(1);
  }

  const userPrompt = `模型信息：
- 名称: ${model.name}
- ID: ${model.id}
- 参数量: ${model.parameters}
- 分类: ${model.category}
- 原始描述: ${model.description || '无'}
- 原始标签: ${(model.tags || []).join(', ')}
- 现有中文描述: ${model.description_zh || '无'}
- 现有英文描述: ${model.description_en || '无'}

请生成/补全标准化的中英双语描述和标签。`;

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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const parsed = JSON.parse(content);
    
    // 验证必需字段
    if (parsed.description_en && parsed.description_zh && 
        parsed.tags_en && parsed.tags_zh) {
      return parsed;
    }
    
    throw new Error('Missing required fields in LLM response');
  } catch (error) {
    console.warn(`    ⚠️ LLM 调用失败: ${error.message}`);
    return null;
  }
}

/**
 * 检查模型的双语数据是否完整
 */
function checkBilingualComplete(model) {
  const hasEnDesc = !!model.description_en && model.description_en.length > 10;
  const hasZhDesc = !!model.description_zh && model.description_zh.length > 10;
  const hasEnTags = Array.isArray(model.tags_en) && model.tags_en.length > 0;
  const hasZhTags = Array.isArray(model.tags_zh) && model.tags_zh.length > 0;
  
  return {
    complete: hasEnDesc && hasZhDesc && hasEnTags && hasZhTags,
    hasEnDesc,
    hasZhDesc,
    hasEnTags,
    hasZhTags,
  };
}

/**
 * 规范化单个模型
 */
function normalizeModel(model, bilingualData) {
  return {
    ...model,
    // 保留原始 description 作为兼容字段
    description: bilingualData.description_en,
    // 标准化双语字段
    description_en: bilingualData.description_en,
    description_zh: bilingualData.description_zh,
    // 保留原始 tags 作为兼容字段
    tags: bilingualData.tags_en,
    // 标准化双语标签
    tags_en: bilingualData.tags_en,
    tags_zh: bilingualData.tags_zh,
  };
}

/**
 * 使用简单启发式规则生成双语数据（不调用 LLM）
 */
function heuristicNormalize(model) {
  const originalDesc = model.description || '';
  const originalTags = model.tags || [];
  
  let description_en = model.description_en || '';
  let description_zh = model.description_zh || '';
  let tags_en = model.tags_en || [];
  let tags_zh = model.tags_zh || [];
  
  // 描述处理
  if (isChinese(originalDesc)) {
    // 原始描述是中文
    description_zh = description_zh || originalDesc;
    description_en = description_en || `[English description needed] ${originalDesc}`;
  } else {
    // 原始描述是英文
    description_en = description_en || originalDesc;
    description_zh = description_zh || `[需要中文翻译] ${originalDesc}`;
  }
  
  // 标签处理（简单的中英文映射）
  const tagMapping = {
    'llm': '大语言模型',
    'chat': '对话',
    'code': '代码',
    'coding': '编程',
    'image': '图像',
    'video': '视频',
    'audio': '音频',
    'multimodal': '多模态',
    'chinese': '中文',
    'english': '英文',
    'open-source': '开源',
    'free': '免费',
    'fast': '快速',
    'small': '轻量',
    'large': '大模型',
    'reasoning': '推理',
    'math': '数学',
    'vision': '视觉',
    'speech': '语音',
  };
  
  if (tags_en.length === 0) {
    tags_en = originalTags;
  }
  
  if (tags_zh.length === 0) {
    tags_zh = originalTags.map(tag => tagMapping[tag.toLowerCase()] || tag);
  }
  
  return {
    description_en,
    description_zh,
    tags_en,
    tags_zh,
  };
}

// ==================== 主函数 ====================

async function main() {
  console.log('🔧 CanIRun.AI 数据清洗与规范化脚本\n');
  console.log(`📝 LLM 配置: ${LLM_CONFIG.apiKey ? `已配置 (${LLM_CONFIG.model})` : '未配置 (将使用启发式规则)'}\n`);
  
  // Step 1: 读取现有数据
  console.log('📂 正在读取 models.json...');
  let models;
  try {
    const content = fs.readFileSync(MODELS_FILE, 'utf-8');
    models = JSON.parse(content);
    console.log(`✅ 读取到 ${models.length} 个模型\n`);
  } catch (error) {
    console.error(`❌ 读取失败: ${error.message}`);
    process.exit(1);
  }
  
  // Step 2: 备份原始数据
  console.log('💾 正在备份原始数据...');
  fs.copyFileSync(MODELS_FILE, BACKUP_FILE);
  console.log(`✅ 已备份到 ${BACKUP_FILE}\n`);
  
  // Step 3: 分析数据完整性
  console.log('🔍 正在分析数据完整性...\n');
  
  const stats = {
    complete: 0,
    needEnDesc: 0,
    needZhDesc: 0,
    needEnTags: 0,
    needZhTags: 0,
    needAll: 0,
  };
  
  const needsProcessing = [];
  
  for (const model of models) {
    const check = checkBilingualComplete(model);
    
    if (check.complete) {
      stats.complete++;
    } else {
      needsProcessing.push(model);
      
      if (!check.hasEnDesc) stats.needEnDesc++;
      if (!check.hasZhDesc) stats.needZhDesc++;
      if (!check.hasEnTags) stats.needEnTags++;
      if (!check.hasZhTags) stats.needZhTags++;
      if (!check.hasEnDesc && !check.hasZhDesc && !check.hasEnTags && !check.hasZhTags) {
        stats.needAll++;
      }
    }
  }
  
  console.log('📊 数据分析结果:');
  console.log(`   完整数据: ${stats.complete} 个模型`);
  console.log(`   需要处理: ${needsProcessing.length} 个模型`);
  console.log(`     - 缺少英文描述: ${stats.needEnDesc}`);
  console.log(`     - 缺少中文描述: ${stats.needZhDesc}`);
  console.log(`     - 缺少英文标签: ${stats.needEnTags}`);
  console.log(`     - 缺少中文标签: ${stats.needZhTags}`);
  console.log(`     - 完全缺失: ${stats.needAll}\n`);
  
  if (needsProcessing.length === 0) {
    console.log('✅ 所有模型数据已完整，无需处理');
    return;
  }
  
  // Step 4: 批量处理
  console.log(`🔄 开始处理 ${needsProcessing.length} 个模型...\n`);
  
  const processedModels = [...models];
  let successCount = 0;
  let heuristicCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < needsProcessing.length; i++) {
    const model = needsProcessing[i];
    const modelIndex = processedModels.findIndex(m => m.id === model.id);
    
    process.stdout.write(`\r  [${i + 1}/${needsProcessing.length}] ${model.name.substring(0, 40)}...`);
    
    let bilingualData = null;
    
    // 尝试调用 LLM
    if (LLM_CONFIG.apiKey) {
      bilingualData = await generateBilingualData(model);
      
      // 避免触发 API 限流
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 如果 LLM 失败或未配置，使用启发式规则
    if (!bilingualData) {
      bilingualData = heuristicNormalize(model);
      heuristicCount++;
    } else {
      successCount++;
    }
    
    // 更新模型数据
    if (bilingualData && modelIndex !== -1) {
      processedModels[modelIndex] = normalizeModel(model, bilingualData);
    } else {
      failCount++;
    }
  }
  
  console.log(`\n\n📊 处理完成:`);
  console.log(`   ✅ LLM 成功: ${successCount}`);
  console.log(`   ⚙️ 启发式规则: ${heuristicCount}`);
  console.log(`   ❌ 失败: ${failCount}\n`);
  
  // Step 5: 保存
  console.log('💾 正在保存规范化数据...');
  fs.writeFileSync(MODELS_FILE, JSON.stringify(processedModels, null, 2), 'utf-8');
  console.log(`✅ 已保存到 ${MODELS_FILE}\n`);
  
  console.log('🎉 数据清洗完成！');
}

// 执行
main().catch(console.error);
