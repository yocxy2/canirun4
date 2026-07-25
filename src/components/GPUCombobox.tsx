'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Monitor, Cpu } from 'lucide-react';
import { getAllGPUs } from '@/lib/gpu';
import type { GPUModel, GPUVendor } from '@/types';
import { cn } from '@/lib/utils';

interface GPUComboboxProps {
  value: string;
  onChange: (gpuId: string, gpu: GPUModel | null) => void;
  disabled?: boolean;
}

// 厂商名称映射
const vendorNames: Record<GPUVendor, string> = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  apple: 'Apple Silicon',
  intel: 'Intel',
  unknown: 'Other',
};

// 厂商排序
const vendorOrder: GPUVendor[] = ['nvidia', 'amd', 'apple', 'intel', 'unknown'];

export default function GPUCombobox({ value, onChange, disabled }: GPUComboboxProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const allGPUs = getAllGPUs();
  
  // 当前选中的 GPU
  const selectedGPU = allGPUs.find(gpu => gpu.id === value);
  
  // 按厂商分组
  const groupedGPUs = useMemo(() => {
    const groups: Record<GPUVendor, GPUModel[]> = {
      nvidia: [],
      amd: [],
      apple: [],
      intel: [],
      unknown: [],
    };
    
    // 先筛选搜索结果
    const filtered = search
      ? allGPUs.filter(gpu => 
          gpu.name.toLowerCase().includes(search.toLowerCase()) ||
          gpu.id.toLowerCase().includes(search.toLowerCase())
        )
      : allGPUs;
    
    // 再按厂商分组
    for (const gpu of filtered) {
      if (groups[gpu.vendor]) {
        groups[gpu.vendor].push(gpu);
      }
    }
    
    return groups;
  }, [allGPUs, search]);

  // 避免 Hydration 错误：在客户端挂载前显示占位符
  if (!isMounted) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-between font-normal"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Monitor className="w-4 h-4" />
          <span className="h-4 w-24 bg-muted/30 animate-pulse rounded" />
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedGPU ? (
            <div className="flex items-center gap-2 truncate">
              <Monitor className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedGPU.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {selectedGPU.vram}GB
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Monitor className="w-4 h-4" />
              <span>{t('hardware.gpuCombobox.selectGPU')}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('hardware.gpuCombobox.searchGPU')} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-60">
            <CommandEmpty>
              <div className="py-4 text-center text-sm text-muted-foreground">
                {t('hardware.gpuCombobox.noGPUFound')}
              </div>
            </CommandEmpty>
            
            {/* "不选择" 选项 */}
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onChange('', null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cpu className="w-4 h-4" />
                  <span>{t('hardware.gpuCombobox.noSelect')}</span>
                </div>
              </CommandItem>
            </CommandGroup>
            
            {/* 按厂商分组显示 */}
            {vendorOrder.map((vendor) => {
              const gpus = groupedGPUs[vendor];
              if (!gpus || gpus.length === 0) return null;
              
              return (
                <div key={vendor}>
                  <CommandSeparator />
                  <CommandGroup heading={vendorNames[vendor]}>
                    {gpus.map((gpu) => (
                      <CommandItem
                        key={gpu.id}
                        value={gpu.id}
                        onSelect={() => {
                          onChange(gpu.id, gpu);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === gpu.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="truncate">{gpu.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {gpu.vram}GB
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {gpu.performanceMultiplier}x
                            </Badge>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
