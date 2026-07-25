#!/usr/bin/env node

/**
 * CanIRun.AI - i18n 数据迁移脚本
 * 
 * 功能：
 * 1. 读取 models.json，检测每个模型 description 的语言
 * 2. 中文描述 → 移入 description_zh / tags_zh
 * 3. 英文描述 → 移入 description_en / tags_en
 * 4. 调用 LLM API 补齐缺失的语言版本
 * 5. 输出标准化的四字段结构
 * 
 * 环境变量：
 * - LLM_API_KEY: LLM API 密钥（可选，无则跳过翻译）
 * - LLM_API_URL: LLM API 端点（默认: https://api.openai.com/v1）
 * - LLM_MODEL: 使用的模型（默认: gpt-4o-mini）
 * 
 * 运行方式：node scripts/migrate-i18n-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================

const MODELS_FILE = path.join(__dirname, '../src/data/models.json');
const BACKUP_FILE = path.join(__dirname, '../src/data/models.json.pre-migration');

const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
};

// ==================== 语言检测 ====================

/**
 * 检测文本是否为中文
 */
function isChinese(text) {
  if (!text || typeof text !== 'string') return false;
  const chineseChars = text.match(/[\u4e00-\u9fff]/g);
  // 中文字符占比超过 15% 则判定为中文
  return chineseChars && chineseChars.length > text.length * 0.15;
}

/**
 * 检测文本是否为英文
 */
function isEnglish(text) {
  if (!text || typeof text !== 'string') return false;
  const englishChars = text.match(/[a-zA-Z]/g);
  return englishChars && englishChars.length > text.length * 0.5;
}

/**
 * 检测标签是否包含中文
 */
function hasChineseTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return false;
  return tags.some(tag => isChinese(tag));
}

// ==================== LLM 翻译 ====================

const TRANSLATE_TO_EN_SYSTEM = `You are a professional AI localization expert. Translate the given Chinese AI model description and tags into professional, geek-style English.

**Output Requirements:**
1. Return ONLY valid JSON format, no other text
2. description_en: Professional English description (50-100 words), avoid translation-sounding phrasing
3. tags_en: 3-5 English tags in lowercase, e.g., ["llm", "chat", "code"]

**Required JSON Structure:**
{
  "description_en": "Professional English description...",
  "tags_en": ["tag1", "tag2", "tag3"]
}`;

const TRANSLATE_TO_ZH_SYSTEM = `你是一个 AI 领域的资深多语言本地化专家。请将给定的英文 AI 模型描述和标签翻译成专业的极客风格中文。

**输出要求：**
1. 必须严格返回 JSON 格式，不要包含任何其他文字
2. description_zh: 极客风格的专业中文描述（50-100字），避免翻译腔
3. tags_zh: 3-5个中文标签，如 ["大语言模型", "对话", "代码"]

**必须返回如下 JSON 结构：**
{
  "description_zh": "极客风格的专业中文描述...",
  "tags_zh": ["标签1", "标签2", "标签3"]
}`;

/**
 * 调用 LLM 翻译（中译英）
 */
async function translateToEnglish(model) {
  if (!LLM_CONFIG.apiKey) return null;

  const userPrompt = `模型信息：
- 名称: ${model.name}
- 中文描述: ${model.description_zh || model.description}
- 中文标签: ${(model.tags_zh || model.tags || []).join(', ')}

请翻译成专业的英文描述和标签。`;

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
          { role: 'system', content: TRANSLATE_TO_EN_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (parsed.description_en && parsed.tags_en) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn(`    ⚠️ 翻译失败 (中→英): ${error.message}`);
    return null;
  }
}

/**
 * 调用 LLM 翻译（英译中）
 */
async function translateToChinese(model) {
  if (!LLM_CONFIG.apiKey) return null;

  const userPrompt = `Model Information:
- Name: ${model.name}
- English Description: ${model.description_en || model.description}
- English Tags: ${(model.tags_en || model.tags || []).join(', ')}

Please translate into professional Chinese description and tags.`;

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
          { role: 'system', content: TRANSLATE_TO_ZH_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (parsed.description_zh && parsed.tags_zh) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn(`    ⚠️ 翻译失败 (英→中): ${error.message}`);
    return null;
  }
}

// ==================== 数据迁移逻辑 ====================

/**
 * 分析模型的当前语言状态
 */
function analyzeLanguageStatus(model) {
  const originalDesc = model.description || '';
  const originalTags = model.tags || [];
  
  const descIsChinese = isChinese(originalDesc);
  const descIsEnglish = isEnglish(originalDesc);
  const tagsHaveChinese = hasChineseTags(originalTags);
  
  // 判断主语言
  let primaryLanguage = 'unknown';
  if (descIsChinese) {
    primaryLanguage = 'zh';
  } else if (descIsEnglish) {
    primaryLanguage = 'en';
  }
  
  return {
    primaryLanguage,
    descIsChinese,
    descIsEnglish,
    tagsHaveChinese,
    hasEnFields: !!(model.description_en && model.tags_en),
    hasZhFields: !!(model.description_zh && model.tags_zh),
  };
}

/**
 * 迁移单个模型的数据结构
 */
function migrateModelStructure(model, status) {
  const migrated = { ...model };
  const originalDesc = model.description || '';
  const originalTags = model.tags || [];
  
  // 根据语言状态迁移字段
  if (status.primaryLanguage === 'zh') {
    // 原始数据是中文
    if (!model.description_zh) {
      migrated.description_zh = originalDesc;
    }
    if (!model.tags_zh && originalTags.length > 0) {
      migrated.tags_zh = originalTags;
    }
  } else if (status.primaryLanguage === 'en') {
    // 原始数据是英文
    if (!model.description_en) {
      migrated.description_en = originalDesc;
    }
    if (!model.tags_en && originalTags.length > 0) {
      migrated.tags_en = originalTags;
    }
  }
  
  // 保留原始字段作为兼容层
  migrated.description = originalDesc;
  migrated.tags = originalTags;
  
  return migrated;
}

/**
 * 批量翻译缺失的语言版本
 */
async function translateMissingLanguages(models) {
  if (!LLM_CONFIG.apiKey) {
    console.log('ℹ️ 未配置 LLM_API_KEY，跳过自动翻译');
    console.log('   请手动配置环境变量后重新运行，或手动补全缺失数据\n');
    return models;
  }

  console.log(`\n🌐 启动 LLM 翻译流水线 (模型: ${LLM_CONFIG.model})...\n`);
  
  const results = [];
  let zhToEnCount = 0;
  let enToZhCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const status = analyzeLanguageStatus(model);
    
    const hasEn = !!(model.description_en && model.tags_en?.length > 0);
    const hasZh = !!(model.description_zh && model.tags_zh?.length > 0);
    
    // 如果双语都完整，跳过
    if (hasEn && hasZh) {
      results.push(model);
      skipCount++;
      continue;
    }
    
    process.stdout.write(
      `\r  [${i + 1}/${models.length}] ${model.name.substring(0, 35).padEnd(35)} ` +
      `${hasEn ? '✓EN' : '✗EN'} ${hasZh ? '✓ZH' : '✗ZH'}`
    );
    
    let updatedModel = { ...model };
    
    // 缺英文 → 中译英
    if (!hasEn && hasZh) {
      const translation = await translateToEnglish(updatedModel);
      if (translation) {
        updatedModel.description_en = translation.description_en;
        updatedModel.tags_en = translation.tags_en;
        zhToEnCount++;
      } else {
        failCount++;
      }
    }
    // 缺中文 → 英译中
    else if (!hasZh && hasEn) {
      const translation = await translateToChinese(updatedModel);
      if (translation) {
        updatedModel.description_zh = translation.description_zh;
        updatedModel.tags_zh = translation.tags_zh;
        enToZhCount++;
      } else {
        failCount++;
      }
    }
    // 双语都缺 → 根据原始语言翻译
    else if (!hasEn && !hasZh) {
      if (status.primaryLanguage === 'zh') {
        // 原始是中文，翻译成英文
        const translation = await translateToEnglish(updatedModel);
        if (translation) {
          updatedModel.description_en = translation.description_en;
          updatedModel.tags_en = translation.tags_en;
          zhToEnCount++;
        } else {
          failCount++;
        }
      } else if (status.primaryLanguage === 'en') {
        // 原始是英文，翻译成中文
        const translation = await translateToChinese(updatedModel);
        if (translation) {
          updatedModel.description_zh = translation.description_zh;
          updatedModel.tags_zh = translation.tags_zh;
          enToZhCount++;
        } else {
          failCount++;
        }
      } else {
        // 无法判断语言，跳过
        failCount++;
      }
    }
    
    results.push(updatedModel);
    
    // 避免触发 API 限流
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`\n\n📊 翻译统计:`);
  console.log(`   ✓ 中译英: ${zhToEnCount}`);
  console.log(`   ✓ 英译中: ${enToZhCount}`);
  console.log(`   ○ 跳过（已有完整数据）: ${skipCount}`);
  console.log(`   ✗ 失败: ${failCount}\n`);
  
  return results;
}

/**
 * 生成迁移报告
 */
function generateMigrationReport(models) {
  const stats = {
    total: models.length,
    complete: 0,
    onlyEn: 0,
    onlyZh: 0,
    missing: 0,
  };
  
  for (const model of models) {
    const hasEn = !!(model.description_en && model.tags_en?.length > 0);
    const hasZh = !!(model.description_zh && model.tags_zh?.length > 0);
    
    if (hasEn && hasZh) {
      stats.complete++;
    } else if (hasEn) {
      stats.onlyEn++;
    } else if (hasZh) {
      stats.onlyZh++;
    } else {
      stats.missing++;
    }
  }
  
  console.log('\n📈 迁移报告:');
  console.log(`   总模型数: ${stats.total}`);
  console.log(`   ✓ 完整双语: ${stats.complete} (${(stats.complete / stats.total * 100).toFixed(1)}%)`);
  console.log(`   △ 仅英文: ${stats.onlyEn}`);
  console.log(`   △ 仅中文: ${stats.onlyZh}`);
  console.log(`   ✗ 缺失双语: ${stats.missing}\n`);
  
  return stats;
}

// ==================== 主函数 ====================

async function main() {
  console.log('🔄 CanIRun.AI i18n 数据迁移脚本\n');
  console.log(`📝 LLM 配置: ${LLM_CONFIG.apiKey ? `已配置 (${LLM_CONFIG.model})` : '未配置'}\n`);
  
  // Step 1: 读取数据
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
  
  // Step 3: 分析并迁移结构
  console.log('🔍 正在分析语言状态并迁移结构...\n');
  
  const migratedModels = models.map(model => {
    const status = analyzeLanguageStatus(model);
    return migrateModelStructure(model, status);
  });
  
  // Step 4: 统计初始状态
  console.log('📊 初始数据状态:');
  generateMigrationReport(migratedModels);
  
  // Step 5: 翻译缺失语言
  const translatedModels = await translateMissingLanguages(migratedModels);
  
  // Step 6: 最终统计
  console.log('📊 最终数据状态:');
  const finalStats = generateMigrationReport(translatedModels);
  
  // Step 7: 保存
  console.log('💾 正在保存迁移后的数据...');
  fs.writeFileSync(MODELS_FILE, JSON.stringify(translatedModels, null, 2), 'utf-8');
  console.log(`✅ 已保存到 ${MODELS_FILE}\n`);
  
  // Step 8: 输出未完成列表（如有）
  if (finalStats.missing > 0 || finalStats.onlyEn > 0 || finalStats.onlyZh > 0) {
    console.log('⚠️ 以下模型需要手动补全双语数据:');
    
    translatedModels.forEach(model => {
      const hasEn = !!(model.description_en && model.tags_en?.length > 0);
      const hasZh = !!(model.description_zh && model.tags_zh?.length > 0);
      
      if (!hasEn || !hasZh) {
        console.log(`   - ${model.id}: ${!hasEn ? '缺英文 ' : ''}${!hasZh ? '缺中文' : ''}`);
      }
    });
    console.log('');
  }
  
  console.log('🎉 i18n 数据迁移完成！');
}

// 执行
main().catch(console.error);
