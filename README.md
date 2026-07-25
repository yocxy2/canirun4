# CanIRun.AI

> 检测你的硬件能否运行本地 AI 模型

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

## 免部署使用地址
https://2fhgft3472.coze.site/

## 项目简介

**CanIRun.AI** 是一个纯前端的硬件兼容性评估工具，帮助用户快速判断自己的电脑能否运行各类本地 AI 模型。

用户只需输入或自动检测硬件配置（GPU、显存、内存），系统即可智能匹配模型库，输出：
- 兼容性状态（绿灯/黄灯/红灯）
- 本地部署命令（一键复制）
- 云端替代方案（免费 API）

## 核心功能

### 硬件检测
- 自动检测 GPU 型号、显存大小、内存容量
- 支持手动配置硬件参数
- 虚拟渲染器拦截（ANGLE/SwiftShader）

### 智能评估
- 基于静态模型数据的兼容性计算
- 性能预估算法（速度 = 基准速度 × 显卡性能系数）
- Top Pick 智能推荐

### 部署指南
- 支持 Ollama、LM Studio、vLLM、ComfyUI 等主流引擎
- 一键复制安装/运行命令
- 高阶调参建议（量化精度、上下文窗口、GPU Offload）

### 云端方案
- 多服务商云端替代（NVIDIA NIM、OpenRouter、硅基流动等）
- 免费额度说明
- API 调用示例代码

### 国际化
- 中英文双语支持
- 模型数据动态切换
- 语言回退机制

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.1 (App Router) |
| 核心 | React 19.2.3 |
| 语言 | TypeScript 5.9.3 |
| 样式 | Tailwind CSS 4.1.18 |
| 组件 | shadcn/ui (Radix UI) |
| 图标 | Lucide React |
| 主题 | next-themes |
| 国际化 | i18next + react-i18next |

## 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
# 或
coze dev
```

访问 [http://localhost:5000](http://localhost:5000)

### 构建生产版本

```bash
pnpm build
# 或
coze build
```

### 启动生产服务器

```bash
pnpm start
# 或
coze start
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局（主题、i18n Provider）
│   ├── page.tsx           # 首页
│   ├── globals.css        # 全局样式 + Shadcn 主题变量
│   └── api/               # API 路由（如有）
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── HardwareConfig.tsx    # 硬件配置表单
│   ├── ModelList.tsx      # 模型列表展示
│   └── ModelDialog.tsx    # 部署工作站弹窗
├── data/                  # 静态数据
│   ├── models.json       # AI 模型数据库
│   └── gpus.json         # GPU 显卡数据库
├── lib/                   # 核心逻辑
│   ├── evaluate.ts       # 兼容性评估算法
│   ├── detect.ts         # 硬件检测逻辑
│   └── utils.ts          # 工具函数
├── hooks/                 # 自定义 Hooks
│   ├── useLocalizedModel.ts  # 模型数据国际化
│   └── useCurrentLanguage.ts # 安全语言状态
├── i18n/                  # 国际化配置
│   ├── config.ts         # i18next 配置
│   └── locales/          # 翻译文件
│       ├── zh.json       # 中文
│       └── en.json       # 英文
└── types/                 # TypeScript 类型定义
    └── index.ts          # AIModel, UserHardware 等
```

## 核心算法

### 兼容性评估

```typescript
// 本地兼容性判断
if (userVRAM >= model.minVRAM * 1.2) {
  return 'compatible';  // 绿灯：完全兼容
} else if (userVRAM >= model.minVRAM * 0.9) {
  return 'warning';     // 黄灯：勉强运行
} else {
  return 'incompatible'; // 红灯：不兼容
}
```

### 性能预估

```typescript
// 速度 = 模型基准速度 × 显卡性能系数
estimatedSpeed = model.baselineSpeed * gpuPerformanceMultiplier;
```

### 智能路由

```typescript
// 弹窗默认 Tab 选择
if (status === 'incompatible' && hasCloudOptions) {
  defaultTab = 'cloud';  // 不兼容 → 云端方案
} else {
  defaultTab = 'local';  // 兼容/警告 → 本地部署
}
```

## 模型分类

| 分类 | 描述 | 示例模型 |
|------|------|---------|
| Chat | 对话与文本生成 | DeepSeek V3, Llama 3.2 |
| Code | 编程辅助 | Qwen2.5-Coder, DeepSeek-Coder |
| Image | 图像创作 | Stable Diffusion, FLUX |
| Video | 视频创作 | Stable Video Diffusion |
| Multimodal | 多模态 | LLaVA, Qwen2-VL |
| Audio | 语音处理 | Whisper, CosyVoice |

## 开发规范

### 组件开发

优先使用预装的 shadcn/ui 组件：

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

### 样式规范

使用 Tailwind CSS 语义化变量：

```tsx
// ✅ 推荐
<div className="bg-background text-foreground">
  <Button variant="default">Primary</Button>
</div>

// ❌ 禁止
<div className="bg-[#1a1a1a] text-white">
  <Button className="bg-purple-500">...</Button>
</div>
```

### 国际化

所有 UI 文本必须通过 i18n：

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<h1>{t('app.title')}</h1>
```

## 更新模型数据

```bash
pnpm update-data
# 或
node scripts/update-models.mjs
```

## 许可证

MIT License

## 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库
- [Lucide](https://lucide.dev/) - 优雅的图标库
- [Next.js](https://nextjs.org/) - 强大的 React 框架
