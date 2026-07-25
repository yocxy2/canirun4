'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Code2, 
  Image, 
  Video, 
  Layers,
  Mic, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  Crown,
  Cloud,
  Server
} from 'lucide-react';
import type { UserHardware, ModelEvaluation, ModelCategory } from '@/types';
import { groupByCategory, applyStatusFilters, markTopPick } from '@/lib/evaluate';
import { useLocalizedModel } from '@/hooks/useLocalizedModel';

interface ModelListProps {
  evaluations: ModelEvaluation[];
  hardware: UserHardware;
  onSelectModel: (evaluation: ModelEvaluation, defaultTab?: 'local' | 'tuning' | 'cloud') => void;
}

// 分类图标映射
const categoryIcons: Record<ModelCategory, React.ReactNode> = {
  Chat: <MessageSquare className="w-4 h-4" />,
  Code: <Code2 className="w-4 h-4" />,
  Image: <Image className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  Multimodal: <Layers className="w-4 h-4" />,
  Audio: <Mic className="w-4 h-4" />,
};

// 分类名称键映射
const categoryKeys: Record<ModelCategory, string> = {
  Chat: 'categories.chat',
  Code: 'categories.code',
  Image: 'categories.image',
  Video: 'categories.video',
  Multimodal: 'categories.multimodal',
  Audio: 'categories.audio',
};

// 状态图标映射
const statusIcons = {
  compatible: <CheckCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  incompatible: <XCircle className="w-4 h-4" />,
};

// 状态翻译键映射
const statusKeys = {
  compatible: 'status.compatible',
  warning: 'status.warning',
  incompatible: 'status.incompatible',
};

// 状态颜色映射
const statusColors = {
  compatible: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  incompatible: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function ModelList({ 
  evaluations, 
  hardware, 
  onSelectModel 
}: ModelListProps) {
  const { t } = useTranslation();
  const { getDescription, getTags } = useLocalizedModel();
  
  const [isMounted, setIsMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ModelCategory>('Chat');
  const [activeFilters, setActiveFilters] = useState<('compatible' | 'warning' | 'incompatible')[]>(['compatible', 'warning', 'incompatible']);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 按类别分组
  const grouped = groupByCategory(evaluations);
  
  // 获取当前分类的评估结果
  const currentCategoryEvaluations = grouped[activeCategory] || [];
  
  // 应用状态筛选
  const filteredEvaluations = applyStatusFilters(currentCategoryEvaluations, activeFilters);
  
  // 标记 Top Pick
  const displayEvaluations = markTopPick(filteredEvaluations);
  
  // 计算总体统计
  const stats = {
    total: evaluations.length,
    compatible: evaluations.filter(e => e.status === 'compatible').length,
    warning: evaluations.filter(e => e.status === 'warning').length,
    incompatible: evaluations.filter(e => e.status === 'incompatible').length,
  };

  // 切换状态筛选器
  const toggleFilter = (filter: 'compatible' | 'warning' | 'incompatible') => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // 获取分类名称
  const getCategoryName = (category: ModelCategory) => t(categoryKeys[category]);

  // 避免 Hydration 错误：在客户端挂载前显示加载骨架
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="h-96 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总体统计 */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4">
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              ✓ {t('status.compatible')} {stats.compatible}
            </Badge>
            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              ⚠ {t('status.warning')} {stats.warning}
            </Badge>
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
              ✗ {t('status.incompatible')} {stats.incompatible}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 分类 Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ModelCategory)}>
        <TabsList className="grid w-full grid-cols-6">
          {(Object.keys(categoryKeys) as ModelCategory[]).map((category) => {
            const count = grouped[category]?.filter(e => e.status !== 'incompatible').length || 0;
            return (
              <TabsTrigger 
                key={category} 
                value={category}
                className="flex items-center gap-1 text-xs"
              >
                {categoryIcons[category]}
                <span className="hidden lg:inline">{getCategoryName(category)}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* 状态筛选器 */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            variant={activeFilters.includes('compatible') ? 'default' : 'outline'}
            onClick={() => toggleFilter('compatible')}
            className="gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            {t('status.compatible')}
          </Button>
          <Button
            size="sm"
            variant={activeFilters.includes('warning') ? 'default' : 'outline'}
            onClick={() => toggleFilter('warning')}
            className="gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {t('status.warning')}
          </Button>
          <Button
            size="sm"
            variant={activeFilters.includes('incompatible') ? 'default' : 'outline'}
            onClick={() => toggleFilter('incompatible')}
            className="gap-1"
          >
            <XCircle className="w-3 h-3" />
            {t('status.incompatible')}
          </Button>
        </div>

        {/* 模型列表 */}
        {(Object.keys(categoryKeys) as ModelCategory[]).map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <div className="grid gap-3">
              {category === activeCategory && displayEvaluations.length > 0 ? (
                displayEvaluations.map((evaluation) => {
                  // ============================================
                  // Step 2: 独立计算状态常量（状态解耦）
                  // ============================================
                  
                  // 1. 本地兼容性状态（绿/黄/红灯）
                  const isCompatible = evaluation.status === 'compatible';
                  const isWarning = evaluation.status === 'warning';
                  const isIncompatible = evaluation.status === 'incompatible';
                  
                  // 2. 云端方案存在性状态（严格独立，不受本地状态影响）
                  const hasCloudOptions = Array.isArray(evaluation.model.cloudAlternatives) && 
                                          evaluation.model.cloudAlternatives.length > 0;
                  
                  return (
                    <Card 
                      key={evaluation.model.id}
                      className={`transition-all hover:shadow-md ${
                        isIncompatible 
                          ? 'opacity-75 hover:opacity-100' 
                          : evaluation.isTopPick
                            ? 'ring-2 ring-primary shadow-lg'
                            : 'hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* 左侧：模型信息 */}
                          <div className="flex-1 min-w-0">
                            {/* 标题行 */}
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">{evaluation.model.name}</h3>
                              {evaluation.isTopPick && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                                  <Crown className="w-3 h-3" />
                                  {t('model.topPickBadge')}
                                </Badge>
                              )}
                              <Badge variant="outline" className="shrink-0">
                                {evaluation.model.parameters}
                              </Badge>
                            </div>
                            
                            {/* 描述 */}
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {getDescription(evaluation.model)}
                            </p>
                            
                            {/* 状态标签行 */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={statusColors[evaluation.status]}>
                                {statusIcons[evaluation.status]}
                                <span className="ml-1">{t(statusKeys[evaluation.status])}</span>
                              </Badge>
                              
                              <Badge variant="secondary" className="text-xs">
                                {t('model.needVram', { vram: evaluation.model.minVRAM })}
                              </Badge>
                              
                              {!isIncompatible && evaluation.estimatedSpeed && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Zap className="w-3 h-3" />
                                  ~{evaluation.estimatedSpeed} {evaluation.speedUnit}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {getTags(evaluation.model).slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* ============================================
                              Step 3: 右侧操作区（统一 Action Group）
                              并排渲染双独立逻辑按钮
                              ============================================ */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {/* 按钮 A: 本地部署 (Primary) */}
                            <Button 
                              size="sm" 
                              variant={isIncompatible ? 'outline' : 'default'}
                              disabled={isIncompatible}
                              className="gap-1 min-w-[100px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectModel(evaluation, 'local');
                              }}
                            >
                              <Server className="w-4 h-4" />
                              {isIncompatible ? t('model.incompatible') : t('model.deployLocal')}
                            </Button>
                            
                            {/* 按钮 B: 云端调用 (Secondary) */}
                            {/* 只受 hasCloudOptions 控制，与本地状态完全独立 */}
                            {hasCloudOptions && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="gap-1 min-w-[100px] text-primary border-primary/30 hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectModel(evaluation, 'cloud');
                                }}
                              >
                                <Cloud className="w-4 h-4" />
                                {t('model.cloudAPI')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {t('model.noModels')}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
