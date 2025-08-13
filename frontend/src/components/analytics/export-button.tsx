'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Loader2,
  Settings,
} from 'lucide-react';
import { useAnalyticsExport } from '@/hooks/useAnalyticsExport';

interface ExportButtonProps {
  type: 'kpis' | 'revenue' | 'usage' | 'growth' | 'complete';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onCustomExportClick?: () => void;
}

export function ExportButton({ 
  type, 
  variant = 'ghost', 
  size = 'sm',
  showLabel = false,
  onCustomExportClick,
}: ExportButtonProps) {
  const { t } = useTranslation();
  const {
    isExporting,
    exportKPIs,
    exportRevenue,
    exportUsage,
    exportGrowth,
    exportCompleteReport,
  } = useAnalyticsExport();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleQuickExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsDropdownOpen(false);
    
    try {
      switch (type) {
        case 'kpis':
          await exportKPIs(format);
          break;
        case 'revenue':
          await exportRevenue({ format });
          break;
        case 'usage':
          await exportUsage({ format });
          break;
        case 'growth':
          await exportGrowth({ format });
          break;
        case 'complete':
          await exportCompleteReport({ 
            format, 
            sections: ['kpis', 'revenue', 'usage', 'growth'] 
          });
          break;
      }
    } catch (error) {
      console.error('Quick export failed:', error);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'kpis': return t('analytics.kpis');
      case 'revenue': return t('analytics.revenue');
      case 'usage': return t('analytics.usage');
      case 'growth': return t('analytics.growth');
      case 'complete': return t('analytics.completeReport');
      default: return t('common.export');
    }
  };

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant as any}
          size={buttonSize as any}
          disabled={isExporting}
          className="gap-1"
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {showLabel && (
            <span className="text-xs">
              {isExporting ? t('analytics.export.exporting') : t('common.export')}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">
          {t('analytics.export.quickExport')} - {getTypeLabel()}
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => handleQuickExport('pdf')}
          disabled={isExporting}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-red-500" />
          <div>
            <div className="font-medium">PDF Report</div>
            <div className="text-xs text-muted-foreground">
              {t('analytics.export.pdfDescription')}
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleQuickExport('excel')}
          disabled={isExporting}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <div>
            <div className="font-medium">Excel Spreadsheet</div>
            <div className="text-xs text-muted-foreground">
              {t('analytics.export.excelDescription')}
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleQuickExport('csv')}
          disabled={isExporting}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">CSV Data</div>
            <div className="text-xs text-muted-foreground">
              {t('analytics.export.csvDescription')}
            </div>
          </div>
        </DropdownMenuItem>
        
        {onCustomExportClick && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                onCustomExportClick();
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <div>
                <div className="font-medium">{t('analytics.export.customExport')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('analytics.export.customDescription')}
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for use in chart headers
export function ExportButtonCompact({ 
  type, 
  onCustomExportClick 
}: Pick<ExportButtonProps, 'type' | 'onCustomExportClick'>) {
  return (
    <ExportButton 
      type={type}
      variant="ghost"
      size="sm"
      showLabel={false}
      onCustomExportClick={onCustomExportClick}
    />
  );
}

// Full button with label for main actions
export function ExportButtonFull({ 
  type, 
  onCustomExportClick 
}: Pick<ExportButtonProps, 'type' | 'onCustomExportClick'>) {
  return (
    <ExportButton 
      type={type}
      variant="outline"
      size="md"
      showLabel={true}
      onCustomExportClick={onCustomExportClick}
    />
  );
}