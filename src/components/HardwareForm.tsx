'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Cpu, MemoryStick, Zap, Loader2, CheckCircle, AlertTriangle, Edit2, X } from 'lucide-react';
import { getHardwareSpecs, getDetectedOS } from '@/lib/hardware';
import { getAllGPUs, getGPUById } from '@/lib/gpu';
import GPUCombobox from '@/components/GPUCombobox';
import type { OS, UserHardware, HardwareDetectionResult, GPUModel } from '@/types';

interface HardwareFormProps {
  onSubmit: (hardware: UserHardware) => void;
  isLoading?: boolean;
}

export default function HardwareForm({ onSubmit, isLoading = false }: HardwareFormProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  
  const [os, setOs] = useState<OS>('windows');
  const [ram, setRam] = useState<string>('16');
  const [vram, setVram] = useState<string>('8');
  const [selectedGpuId, setSelectedGpuId] = useState<string>('');
  const [isCustomVram, setIsCustomVram] = useState(false);
  
  // 自动检测相关状态
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<HardwareDetectionResult | null>(null);

  // RAM 选项（常见配置）
  const ramOptions = [8, 16, 32, 64, 128];

  // GPU 选择变化处理
  const handleGpuChange = (gpuId: string, gpu: GPUModel | null) => {
    setSelectedGpuId(gpuId);
    if (gpu && !isCustomVram) {
      setVram(gpu.vram.toString());
    }
  };

  // 允许用户手动修改显存
  const handleCustomVram = (value: string) => {
    const numValue = parseInt(value, 10);
    // 验证输入范围 1-128 GB
    if (isNaN(numValue) || numValue < 1) {
      setVram('1');
    } else if (numValue > 128) {
      setVram('128');
    } else {
      setVram(numValue.toString());
    }
    setIsCustomVram(true);
  };

  // 重置显存为显卡默认值
  const resetVram = () => {
    const gpu = getGPUById(selectedGpuId);
    if (gpu) {
      setVram(gpu.vram.toString());
    }
    setIsCustomVram(false);
  };

  // 自动检测硬件
  const handleAutoDetect = async () => {
    setDetecting(true);

    // 模拟检测延迟，提升用户体验
    await new Promise(resolve => setTimeout(resolve, 800));

    // 检查组件是否仍然挂载（使用 ref 模式）
    if (!isMounted) {
      return;
    }

    const result = getHardwareSpecs();
    setDetection(result);

    if (result.detected && isMounted) {
      // 自动填充检测到的值
      setOs(getDetectedOS());
      setRam(result.ram.toString());

      // 尝试匹配 GPU 天梯库中的型号
      if (result.gpu) {
        const allGPUs = getAllGPUs();
        const matchedGpu = allGPUs.find(g =>
          result.gpu.toLowerCase().includes(g.name.toLowerCase()) ||
          g.name.toLowerCase().includes(result.gpu.toLowerCase())
        );

        if (matchedGpu && isMounted) {
          setSelectedGpuId(matchedGpu.id);
          setVram(matchedGpu.vram.toString());
          setIsCustomVram(false);
        } else if (isMounted) {
          // 无法匹配，保持手动模式
          setVram(result.estimatedVRAM?.toString() || '8');
          setIsCustomVram(true);
        }
      }
    }

    if (isMounted) {
      setDetecting(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      os,
      ram: parseInt(ram),
      vram: parseInt(vram),
      gpuId: selectedGpuId || undefined,
    });
  };

  // 检测是否是虚拟渲染器
  const isVirtualRenderer = detection?.gpu?.toLowerCase().includes('angle') || 
                            detection?.gpu?.toLowerCase().includes('swiftshader') ||
                            detection?.gpu?.toLowerCase().includes('llvmpipe');

  // 获取当前选中的 GPU
  const selectedGPU = selectedGpuId ? getGPUById(selectedGpuId) : null;

  // 避免 Hydration 错误：在客户端挂载前显示骨架屏
  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <div className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
          </CardTitle>
          <CardDescription>
            <div className="h-4 w-48 bg-muted/30 animate-pulse rounded" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-10 bg-muted/20 animate-pulse rounded" />
          <div className="h-10 bg-muted/20 animate-pulse rounded" />
          <div className="h-10 bg-muted/20 animate-pulse rounded" />
          <div className="h-10 bg-muted/20 animate-pulse rounded" />
          <div className="h-12 bg-muted/20 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          {t('hardware.title')}
        </CardTitle>
        <CardDescription>
          {t('hardware.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 自动检测按钮 */}
        <Button 
          onClick={handleAutoDetect}
          variant="outline"
          className="w-full gap-2"
          disabled={detecting || isLoading}
        >
          {detecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('hardware.detecting')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {t('hardware.detect')}
            </>
          )}
        </Button>

        {/* 检测结果显示 */}
        {detection && (
          <div className={`p-3 rounded-lg border ${
            detection.detected && !isVirtualRenderer
              ? 'bg-green-500/5 border-green-500/20' 
              : 'bg-yellow-500/5 border-yellow-500/20'
          }`}>
            {detection.detected && !isVirtualRenderer ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{t('hardware.detection.success')}</span>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><span className="font-medium">{t('hardware.gpu')}:</span> {detection.gpu}</p>
                  <p><span className="font-medium">{t('hardware.ram')}:</span> {detection.ram} {t('hardware.gb')}</p>
                  <p><span className="font-medium">{t('hardware.cpuCores')}:</span> {detection.cpuCores}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('hardware.detection.confirmPlease')}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-500">
                    {isVirtualRenderer ? t('hardware.detection.virtualRenderer') : t('hardware.detection.failed')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isVirtualRenderer 
                      ? t('hardware.detection.virtualRendererDesc')
                      : detection.error || t('hardware.detection.failedDesc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OS 选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            {t('hardware.os')}
          </label>
          <Select value={os} onValueChange={(value: OS) => setOs(value)} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('hardware.selectOS')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="windows">Windows</SelectItem>
              <SelectItem value="mac">macOS</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* RAM 选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-muted-foreground" />
            {t('hardware.ram')}
          </label>
          <Select value={ram} onValueChange={setRam} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('hardware.selectRAM')} />
            </SelectTrigger>
            <SelectContent>
              {ramOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} {t('hardware.gb')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPU 型号选择 (Combobox) */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            {t('hardware.gpu')}
          </label>
          <GPUCombobox
            value={selectedGpuId}
            onChange={handleGpuChange}
            disabled={isLoading}
          />
          {selectedGPU && (
            <div className="text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">{selectedGPU.vram}{t('hardware.gb')} {t('hardware.vramBadge')}</Badge>
                <Badge variant="outline" className="text-xs">{t('hardware.performanceMultiplier')}: {selectedGPU.performanceMultiplier}x</Badge>
              </div>
            </div>
          )}
        </div>

        {/* VRAM 输入 */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            {t('hardware.vram')}
            {isCustomVram && selectedGpuId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-2 text-xs"
                onClick={resetVram}
              >
                <X className="w-3 h-3 mr-1" />
                {t('hardware.resetDefault')}
              </Button>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={vram}
              onChange={(e) => handleCustomVram(e.target.value)}
              onBlur={() => {
                // 确保失去焦点时重新验证
                handleCustomVram(vram);
              }}
              placeholder={t('hardware.enterVRAM')}
              className="pr-12"
              min={1}
              max={128}
              disabled={isLoading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t('hardware.gb')}
            </span>
          </div>
          {isCustomVram && selectedGpuId && (
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <Edit2 className="w-3 h-3" />
              {t('hardware.vramModified')}
            </p>
          )}
          {!selectedGpuId && (
            <p className="text-xs text-muted-foreground">
              {t('hardware.vramAutoFill')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('hardware.vramRange', { min: 1, max: 128 })}
          </p>
        </div>

        {/* 提交按钮 */}
        <Button 
          onClick={handleSubmit}
          className="w-full gap-2"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('hardware.evaluating')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {t('hardware.startEvaluation')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
