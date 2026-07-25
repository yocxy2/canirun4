'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HardwareForm from '@/components/HardwareForm';
import ModelList from '@/components/ModelList';
import InstallDialog from '@/components/InstallDialog';
import { Badge } from '@/components/ui/badge';
import { Cpu, MemoryStick, Zap, Bot, Monitor } from 'lucide-react';
import type { UserHardware, ModelEvaluation } from '@/types';
import { evaluateAllModels } from '@/lib/evaluate';
import { getGPUById } from '@/lib/gpu';

export default function Home() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  const [hardware, setHardware] = useState<UserHardware | null>(null);
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelEvaluation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaultTab, setDialogDefaultTab] = useState<'local' | 'tuning' | 'cloud'>('local');
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleHardwareSubmit = async (hw: UserHardware) => {
    setIsLoading(true);

    // 模拟短暂延迟以显示 Loading 效果
    await new Promise(resolve => setTimeout(resolve, 800));

    // 检查组件是否仍然挂载
    if (!isMounted) return;

    // 执行评估
    const result = evaluateAllModels(hw);
    setEvaluations(result.evaluations);
    setHardware(hw);
    setSelectedModel(null);
    setIsLoading(false);

    // 平滑滚动到结果区域
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSelectModel = (evaluation: ModelEvaluation, defaultTab?: 'local' | 'tuning' | 'cloud') => {
    setSelectedModel(evaluation);
    setDialogDefaultTab(defaultTab || 'local');
    setDialogOpen(true);
  };

  // 避免 Hydration 错误：在客户端挂载前显示骨架屏
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="h-[600px] bg-muted/20 animate-pulse rounded-lg" />
            </div>
            <div className="lg:col-span-3">
              <div className="h-[600px] bg-muted/20 animate-pulse rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Hardware Form */}
          <div className="lg:col-span-1">
            <HardwareForm onSubmit={handleHardwareSubmit} isLoading={isLoading} />
            
            {/* Current Hardware Display */}
            {hardware && !isLoading && (
              <div className="mt-6 bg-card border border-border rounded-lg p-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('home.currentConfig')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('home.system')}:</span>
                    <span className="font-medium capitalize">{hardware.os}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('home.memory')}:</span>
                    <span className="font-medium">{hardware.ram} GB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('home.vram')}:</span>
                    <span className="font-medium">{hardware.vram} GB</span>
                  </div>
                  {hardware.gpuId && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('home.gpu')}:</span>
                      <span className="font-medium text-xs">
                        {getGPUById(hardware.gpuId)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Model List or Placeholder */}
          <div className="lg:col-span-3" ref={resultsRef}>
            {isLoading ? (
              <div className="bg-card border border-border rounded-lg p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{t('home.evaluating')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.evaluatingDesc')}
                    </p>
                  </div>
                </div>
              </div>
            ) : hardware ? (
              <ModelList 
                evaluations={evaluations}
                hardware={hardware}
                onSelectModel={handleSelectModel}
              />
            ) : (
              <div className="bg-card border border-border rounded-lg p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <Bot className="w-16 h-16 text-muted-foreground/50" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{t('home.configureFirst')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.configureFirstDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{t('home.frontendOnly')}</span>
            <span>•</span>
            <span>{t('home.noDataUpload')}</span>
            <span>•</span>
            <span>{t('home.localEval')}</span>
          </div>
        </div>
      </footer>

      {/* Install Command Dialog */}
      <InstallDialog 
        evaluation={selectedModel}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={dialogDefaultTab}
      />
    </div>
  );
}
