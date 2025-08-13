'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { AnalyticsService } from '@/lib/api/services/analytics.service';
import { useAuthStore } from '@/store/auth';
import { useActiveClub } from '@/store/clubs';
import { useAnalyticsStore } from '@/store/analyticsStore';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSections?: ('kpis' | 'revenue' | 'usage' | 'growth')[];
  defaultFormat?: 'pdf' | 'excel' | 'csv';
  defaultSections?: string[];
}

export function ExportDialog({
  open,
  onOpenChange,
  availableSections = ['kpis', 'revenue', 'usage', 'growth'],
  defaultFormat = 'pdf',
  defaultSections = ['kpis'],
}: ExportDialogProps) {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const { activeClub } = useActiveClub();
  const { filters } = useAnalyticsStore();

  // Export configuration state
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>(defaultFormat);
  const [selectedSections, setSelectedSections] = useState<string[]>(defaultSections);
  const [templateType, setTemplateType] = useState<'executive' | 'detailed' | 'summary'>('detailed');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [dateRangeOption, setDateRangeOption] = useState<'current' | 'custom'>('current');

  // Export progress state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const formatIcons = {
    pdf: FileText,
    excel: FileSpreadsheet,
    csv: FileSpreadsheet,
  };

  const sectionIcons = {
    kpis: BarChart3,
    revenue: DollarSign,
    usage: Activity,
    growth: TrendingUp,
  };

  const sectionDescriptions = {
    kpis: t('analytics.export.kpisDescription'),
    revenue: t('analytics.export.revenueDescription'),
    usage: t('analytics.export.usageDescription'),
    growth: t('analytics.export.growthDescription'),
  };

  const templateDescriptions = {
    executive: t('analytics.export.executiveTemplate'),
    detailed: t('analytics.export.detailedTemplate'),
    summary: t('analytics.export.summaryTemplate'),
  };

  const handleSectionToggle = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const generateFileName = () => {
    const clubName = activeClub?.name || 'Organization';
    const dateStr = new Date().toISOString().split('T')[0];
    const sectionsStr = selectedSections.join('-');
    return `${clubName.replace(/\s+/g, '-')}-Analytics-${sectionsStr}-${dateStr}`;
  };

  const estimateReportSize = () => {
    let sizeKB = 50; // Base size
    
    if (selectedSections.includes('kpis')) sizeKB += 100;
    if (selectedSections.includes('revenue')) sizeKB += 200;
    if (selectedSections.includes('usage')) sizeKB += 300;
    if (selectedSections.includes('growth')) sizeKB += 150;
    
    if (includeCharts) sizeKB *= 2;
    if (includeRawData) sizeKB *= 1.5;
    if (templateType === 'detailed') sizeKB *= 1.3;

    if (sizeKB > 1024) {
      return `~${(sizeKB / 1024).toFixed(1)} MB`;
    }
    return `~${Math.round(sizeKB)} KB`;
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      setExportError(t('analytics.export.noSectionsSelected'));
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportSuccess(false);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const exportParams = {
        format,
        sections: selectedSections as ('kpis' | 'revenue' | 'usage' | 'growth')[],
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
        includeCharts,
        includeRawData,
        templateType,
      };

      const blob = await AnalyticsService.exportBIReport(exportParams);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generateFileName()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setExportProgress(0);
        setExportSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportError(
        error instanceof Error 
          ? error.message 
          : t('analytics.export.exportFailed')
      );
      setExportProgress(0);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = async (type: 'kpis' | 'revenue' | 'usage' | 'growth') => {
    setIsExporting(true);
    setExportError(null);

    try {
      const baseParams = {
        format: 'pdf' as const,
        start_date: filters.dateRange.start,
        end_date: filters.dateRange.end,
        clubs: role === 'ROOT' ? undefined : activeClub ? [activeClub.id] : undefined,
      };

      let blob: Blob;
      let filename: string;

      switch (type) {
        case 'kpis':
          blob = await AnalyticsService.exportKPIsOnly(baseParams);
          filename = `${generateFileName()}-KPIs.pdf`;
          break;
        case 'revenue':
          blob = await AnalyticsService.exportRevenueTrends({
            ...baseParams,
            includeBreakdown: true,
          });
          filename = `${generateFileName()}-Revenue.pdf`;
          break;
        case 'usage':
          blob = await AnalyticsService.exportUsageReport({
            ...baseParams,
            includeHeatmap: true,
          });
          filename = `${generateFileName()}-Usage.pdf`;
          break;
        case 'growth':
          blob = await AnalyticsService.exportGrowthAnalysis({
            ...baseParams,
            metric: 'all',
            includePredictions: true,
          });
          filename = `${generateFileName()}-Growth.pdf`;
          break;
      }

      // Create download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Quick export failed:', error);
      setExportError(
        error instanceof Error 
          ? error.message 
          : t('analytics.export.exportFailed')
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('analytics.export.title')}
          </DialogTitle>
          <DialogDescription>
            {t('analytics.export.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Export Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {t('analytics.export.quickExport')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {availableSections.map(section => {
                const IconComponent = sectionIcons[section];
                return (
                  <Button
                    key={section}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickExport(section)}
                    disabled={isExporting}
                    className="justify-start h-auto p-3"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">
                        {t(`analytics.${section}`)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        PDF • {t('analytics.export.quick')}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">
              {t('analytics.export.customExport')}
            </Label>

            {/* Format Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                {t('analytics.export.format')}
              </Label>
              <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'excel', 'csv'] as const).map(fmt => {
                    const IconComponent = formatIcons[fmt];
                    return (
                      <Label key={fmt} className="cursor-pointer">
                        <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                          <RadioGroupItem value={fmt} />
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {fmt.toUpperCase()}
                          </span>
                        </div>
                      </Label>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Section Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                {t('analytics.export.sections')}
              </Label>
              <div className="space-y-2">
                {availableSections.map(section => {
                  const IconComponent = sectionIcons[section];
                  return (
                    <div key={section} className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedSections.includes(section)}
                        onCheckedChange={() => handleSectionToggle(section)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <IconComponent className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {t(`analytics.${section}`)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sectionDescriptions[section]}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                {t('analytics.export.template')}
              </Label>
              <Select value={templateType} onValueChange={(value: any) => setTemplateType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['executive', 'detailed', 'summary'] as const).map(template => (
                    <SelectItem key={template} value={template}>
                      <div>
                        <div className="font-medium">
                          {t(`analytics.export.${template}`)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {templateDescriptions[template]}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={includeCharts}
                  onCheckedChange={setIncludeCharts}
                />
                <Label className="text-sm">
                  {t('analytics.export.includeCharts')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={includeRawData}
                  onCheckedChange={setIncludeRawData}
                />
                <Label className="text-sm">
                  {t('analytics.export.includeRawData')}
                </Label>
              </div>
            </div>

            {/* Export Info */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{t('analytics.export.estimatedSize')}:</div>
                    <div className="text-muted-foreground">{estimateReportSize()}</div>
                  </div>
                  <div>
                    <div className="font-medium">{t('analytics.export.dateRange')}:</div>
                    <div className="text-muted-foreground">
                      {filters.dateRange.start} - {filters.dateRange.end}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  {t('analytics.export.generating')}...
                </span>
              </div>
              <Progress value={exportProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {exportProgress}% {t('analytics.export.complete')}
              </div>
            </div>
          )}

          {/* Success Message */}
          {exportSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('analytics.export.success')}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {exportError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {exportError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || selectedSections.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('analytics.export.generating')}...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('analytics.export.generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}