'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Check, Copy, Terminal, AlertTriangle, ExternalLink, Settings2, 
  Cloud, Server, Zap, Gamepad2, Scale, Code2, Sparkles,
  AlertCircle, Video, Image as ImageIcon, Gift
} from 'lucide-react';
import type { ModelEvaluation, SupportedEngine, DeployMode, CloudProvider } from '@/types';

interface InstallDialogProps {
  evaluation: ModelEvaluation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'local' | 'tuning' | 'cloud';
}

// 引擎下载链接
const engineUrls: Record<SupportedEngine, string> = {
  'Ollama': 'https://ollama.ai',
  'LM Studio': 'https://lmstudio.ai',
  'ComfyUI': 'https://github.com/comfyanonymous/ComfyUI',
  'Transformers': 'https://huggingface.co/docs/transformers',
  'WebUI': 'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
  'vLLM': 'https://github.com/vllm-project/vllm',
  'Stability Matrix': 'https://github.com/LykosAI/StabilityMatrix',
};

// 引擎指南翻译键
const engineGuideKeys: Record<SupportedEngine, string> = {
  'Ollama': 'dialog.engineGuides.Ollama',
  'LM Studio': 'dialog.engineGuides.LM Studio',
  'ComfyUI': 'dialog.engineGuides.ComfyUI',
  'Transformers': 'dialog.engineGuides.Transformers',
  'WebUI': 'dialog.engineGuides.WebUI',
  'vLLM': 'dialog.engineGuides.vLLM',
  'Stability Matrix': 'dialog.engineGuides.Stability Matrix',
};

// 本地 API 地址
const LOCAL_API_URLS: Record<string, string> = {
  'Ollama': 'http://localhost:11434/v1',
  'LM Studio': 'http://localhost:1234/v1',
  'vLLM': 'http://localhost:8000/v1',
};

// 从 URL 提取主域名
const extractMainDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('api.', '').replace('www.', '');
  } catch {
    return url;
  }
};

export default function InstallDialog({ 
  evaluation, 
  open, 
  onOpenChange,
  defaultTab = 'local'
}: InstallDialogProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [deployMode, setDeployMode] = useState<DeployMode>('balanced');
  const [codeLang, setCodeLang] = useState<'python' | 'js'>('python');
  
  // V6.0 新增：选中的云端服务商状态
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 智能路由：根据 defaultTab 或模型状态自动切换
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // V6.0 新增：智能默认排序逻辑
  const cloudProviders = useMemo(() => {
    if (!evaluation) return [];
    
    if (evaluation.model.cloudAlternatives && evaluation.model.cloudAlternatives.length > 0) {
      return evaluation.model.cloudAlternatives;
    }
    
    if (evaluation.model.cloudAlternative) {
      return [{
        provider: evaluation.model.cloudAlternative.provider,
        url: evaluation.model.cloudAlternative.url,
        modelId: evaluation.model.cloudAlternative.modelId,
        freeTierDesc: t('dialog.freeTierDefault'),
      }];
    }
    
    return [];
  }, [evaluation, t]);

  // 智能默认选中逻辑 (V6.1 更新: NVIDIA 绝对优先)
  useEffect(() => {
    if (cloudProviders.length > 0 && !selectedProvider) {
      const nvidia = cloudProviders.find(p => 
        p.provider.toLowerCase().includes('nvidia')
      );
      const openRouter = cloudProviders.find(p => 
        p.provider.toLowerCase().includes('openrouter')
      );
      setSelectedProvider(nvidia || openRouter || cloudProviders[0]);
    }
  }, [cloudProviders, selectedProvider]);

  // 弹窗关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedProvider(null);
    }
  }, [open]);

  // 避免 Hydration 错误
  if (!isMounted || !evaluation) return null;

  const { model, status } = evaluation;
  const isIncompatible = status === 'incompatible';
  const isCVOrVideo = model.category === 'Image' || model.category === 'Video';

  // 复制命令到剪贴板
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // 根据模型类别选择默认引擎
  const getDefaultEngine = (): SupportedEngine => {
    if (model.supportedEngines && model.supportedEngines.length > 0) {
      return model.supportedEngines[0];
    }
    if (model.category === 'Image' || model.category === 'Video') return 'ComfyUI';
    return 'Ollama';
  };

  // 获取安装命令
  const getInstallCommand = (engine: SupportedEngine): string => {
    if (engine === 'Ollama') {
      return model.installCommand;
    }
    if (engine === 'LM Studio') {
      return model.name.toLowerCase().replace(/\s+/g, '-');
    }
    if (engine === 'vLLM') {
      return model.installCommand;
    }
    return model.installCommand;
  };

  // 根据部署模式生成参数建议
  const getTuningRecommendation = () => {
    const base = model.tuningParams || { temp: 0.7, minCtx: 4096, maxCtx: 8192 };
    
    const recommendations = {
      exclusive: {
        ctx: base.maxCtx,
        gpuOffload: 100,
        temp: base.temp,
        tip: t('dialog.deployModes.exclusiveTip'),
      },
      balanced: {
        ctx: Math.floor((base.minCtx + base.maxCtx) / 2),
        gpuOffload: 80,
        temp: base.temp,
        tip: t('dialog.deployModes.balancedTip'),
      },
      gamer: {
        ctx: Math.min(base.minCtx, 4096),
        gpuOffload: 60,
        temp: base.temp,
        tip: t('dialog.deployModes.gamerTip'),
      },
    };
    
    return recommendations[deployMode];
  };

  // V6.0 更新：动态生成云端 API 代码示例
  const getCloudCodeExamples = () => {
    if (!selectedProvider) return { python: '', js: '' };
    
    const baseUrl = selectedProvider.url;
    const modelId = selectedProvider.modelId;
    
    const python = `import openai

client = openai.OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${baseUrl}"
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`;

    const js = `const response = await fetch("${baseUrl}/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${modelId}",
    messages: [{ role: "user", content: "Hello!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`;

    return { python, js };
  };

  const supportedEngines = model.supportedEngines || [getDefaultEngine()];
  const defaultEngine = getDefaultEngine();
  const tuning = getTuningRecommendation();
  const localApiUrl = LOCAL_API_URLS[defaultEngine] || 'http://localhost:11434/v1';
  const cloudCode = getCloudCodeExamples();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            {t('dialog.title')}: {model.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">{model.category}</Badge>
            <Badge variant="secondary">{model.parameters}</Badge>
            {status === 'warning' && (
              <Badge className="bg-yellow-500/10 text-yellow-500">{t('dialog.vramTight')}</Badge>
            )}
            {status === 'incompatible' && (
              <Badge className="bg-red-500/10 text-red-500">{t('status.incompatible')}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* 主 Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="local" className="gap-1">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dialog.localDeploy')}</span>
            </TabsTrigger>
            <TabsTrigger value="tuning" className="gap-1">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dialog.tuning')}</span>
            </TabsTrigger>
            <TabsTrigger value="cloud" className="gap-1">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dialog.cloud')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: 本地部署 */}
          <TabsContent value="local" className="space-y-4 mt-4">
            {/* V5.0 新增：图像/视频模型生态警告 */}
            {isCVOrVideo && (
              <Alert className="border-yellow-500/50 bg-yellow-500/5">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500 flex items-center gap-2">
                  {model.category === 'Video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  {t('dialog.cvDeployNotice')}
                </AlertTitle>
                <AlertDescription className="text-sm space-y-2 mt-2">
                  <p>1. <strong>{t('dialog.cvDeployNotice1')}</strong></p>
                  <p>2. <strong>{t('dialog.cvDeployNotice2')}</strong></p>
                  {isIncompatible && (
                    <p className="text-red-500 font-medium">⚠️ {t('dialog.vramWarningOom')}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 不兼容警告 */}
            {isIncompatible && !isCVOrVideo && (
              <Alert className="border-red-500/50 bg-red-500/5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-red-500">{t('dialog.hardwareIncompatible')}</AlertTitle>
                <AlertDescription>
                  {t('dialog.hardwareIncompatibleDesc', { 
                    vram: evaluation.userHardware.vram, 
                    minVram: model.minVRAM 
                  })}
                </AlertDescription>
              </Alert>
            )}

            {status === 'warning' && (
              <Alert className="border-yellow-500/50 bg-yellow-500/5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">{t('dialog.performanceTip')}</AlertTitle>
                <AlertDescription>
                  {t('dialog.performanceTipDesc')}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: 安装运行时 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline">{t('dialog.step1')}</Badge>
                {t('dialog.installRuntime')}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {supportedEngines.map((engine) => (
                  <Button 
                    key={engine}
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    asChild
                  >
                    <a 
                      href={engineUrls[engine]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {engine}
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            {/* Step 2: 运行安装命令 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline">{t('dialog.step2')}</Badge>
                {t('dialog.runInstallCommand')}
              </h4>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto pr-12">
                  {getInstallCommand(defaultEngine)}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(getInstallCommand(defaultEngine))}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="ml-1 text-green-500">{t('dialog.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="ml-1">{t('dialog.copy')}</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(engineGuideKeys[defaultEngine])}
              </p>
            </div>

            {/* Step 3: 接入应用 */}
            {model.integrations && model.integrations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline">{t('dialog.step3')}</Badge>
                  {t('dialog.integrateApp')}
                </h4>
                
                {/* 本地 API 地址提示 */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{t('dialog.localApiUrl')}</p>
                  <code className="text-sm font-mono text-primary">{localApiUrl}</code>
                </div>

                {/* 接入指南卡片 */}
                <div className="grid gap-2">
                  {model.integrations.map((integration, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {integration.description}
                          </p>
                          {integration.url && (
                            <a 
                              href={integration.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {t('dialog.viewDocs')}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 高阶配置 */}
            {model.advancedConfig && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border-border">
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      {t('dialog.advancedParams')}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">{t('dialog.recommendedQuantization')}:</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {model.advancedConfig.quantization}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">{t('dialog.contextWindowLabel')}:</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {model.advancedConfig.contextWindow}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground">
                      <p className="font-medium mb-1">💡 {t('dialog.optimizationTip')}</p>
                      <p>{model.advancedConfig.tips}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </TabsContent>

          {/* Tab 2: 高阶调参 */}
          <TabsContent value="tuning" className="space-y-4 mt-4">
            {/* 部署模式选择 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('dialog.selectDeployMode')}</h4>
              <RadioGroup 
                value={deployMode} 
                onValueChange={(v) => setDeployMode(v as DeployMode)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="exclusive" id="exclusive" />
                  <Label htmlFor="exclusive" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{t('dialog.exclusiveMode')}</p>
                        <p className="text-xs text-muted-foreground">{t('dialog.exclusiveModeDesc')}</p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{t('dialog.balancedMode')}</p>
                        <p className="text-xs text-muted-foreground">{t('dialog.balancedModeDesc')}</p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="gamer" id="gamer" />
                  <Label htmlFor="gamer" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{t('dialog.gamerMode')}</p>
                        <p className="text-xs text-muted-foreground">{t('dialog.gamerModeDesc')}</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 参数建议面板 */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">{t('dialog.recommendedParams')}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dialog.contextWindowLabel')} (num_ctx)</p>
                  <Badge variant="secondary" className="font-mono">
                    {tuning.ctx} tokens
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dialog.gpuOffload')}</p>
                  <Badge variant="secondary" className="font-mono">
                    {tuning.gpuOffload}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('dialog.temperature')}</p>
                  <Badge variant="secondary" className="font-mono">
                    {tuning.temp}
                  </Badge>
                </div>
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  {tuning.tip}
                </AlertDescription>
              </Alert>
            </div>

            {/* 模型类型提示 */}
            {model.category === 'Code' && (
              <Alert>
                <Code2 className="h-4 h-4" />
                <AlertTitle>{t('dialog.codeModelTip')}</AlertTitle>
                <AlertDescription className="text-xs">
                  {t('dialog.codeModelTipDesc')}
                </AlertDescription>
              </Alert>
            )}

            {/* 示例命令 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('dialog.sampleCommand')}</h4>
              <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
{`ollama run ${model.id} --num-ctx ${tuning.ctx} --temp ${tuning.temp}`}
              </pre>
            </div>
          </TabsContent>

          {/* Tab 3: 免费云端 (V6.0 重构) */}
          <TabsContent value="cloud" className="space-y-4 mt-4">
            {cloudProviders.length > 0 ? (
              <>
                {/* V5.0: 醒目的白嫖引导 */}
                <Alert className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
                  <Gift className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary text-lg">{t('dialog.freeCloudCall')}</AlertTitle>
                  <AlertDescription className="text-sm mt-2">
                    {t('dialog.freeCloudDesc')}
                  </AlertDescription>
                </Alert>

                {/* V6.0: 多服务商切换器 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('dialog.selectProvider')}</span>
                    {selectedProvider && (
                      <a 
                        href={`https://${extractMainDomain(selectedProvider.url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {t('dialog.visitWebsite')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  {/* ToggleGroup 切换器 */}
                  <ToggleGroup 
                    type="single" 
                    value={selectedProvider?.provider || ''} 
                    onValueChange={(value) => {
                      if (value) {
                        const provider = cloudProviders.find(p => p.provider === value);
                        if (provider) setSelectedProvider(provider);
                      }
                    }}
                    className="justify-start flex-wrap gap-2"
                  >
                    {cloudProviders.map((provider) => (
                      <ToggleGroupItem 
                        key={provider.provider}
                        value={provider.provider}
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4 py-2 rounded-lg border border-border data-[state=on]:border-primary"
                      >
                        <Cloud className="w-4 h-4 mr-2" />
                        {provider.provider}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* 当前服务商详情 */}
                {selectedProvider && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('dialog.modelId')}</span>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {selectedProvider.modelId}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('dialog.apiBaseUrl')}</span>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[60%] truncate">
                        {selectedProvider.url}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('dialog.freeTier')}</span>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        ✓ {selectedProvider.freeTierDesc || t('dialog.freeTierDefault')}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* V6.0: 动态代码块 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t('dialog.apiExample')}</h4>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant={codeLang === 'python' ? 'default' : 'outline'}
                        onClick={() => setCodeLang('python')}
                      >
                        Python
                      </Button>
                      <Button 
                        size="sm" 
                        variant={codeLang === 'js' ? 'default' : 'outline'}
                        onClick={() => setCodeLang('js')}
                      >
                        JavaScript
                      </Button>
                    </div>
                  </div>
                  <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                    {codeLang === 'python' ? cloudCode.python : cloudCode.js}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleCopy(codeLang === 'python' ? cloudCode.python : cloudCode.js)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {codeLang === 'python' ? t('dialog.copyPythonCode') : t('dialog.copyJsCode')}
                  </Button>
                </div>

                {/* 快速开始提示 */}
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-green-500">💡 {t('dialog.quickStart')}:</strong>
                    {t('dialog.quickStartDesc')}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('dialog.noCloudAlternatives')}</p>
                <p className="text-xs mt-1">{t('dialog.noCloudAlternativesDesc')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
