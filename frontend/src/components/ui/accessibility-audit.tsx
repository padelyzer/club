'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Keyboard,
  Monitor,
  Type,
  Volume2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category:
    | 'contrast'
    | 'aria'
    | 'keyboard'
    | 'screen-reader'
    | 'focus'
    | 'semantic';
  element: string;
  message: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  solution?: string;
}

export function AccessibilityAudit() {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const runAccessibilityAudit = async () => {
    setIsAuditing(true);
    const foundIssues: AccessibilityIssue[] = [];

    // Check color contrast
    const elements = document.querySelectorAll('*');
    elements.forEach((element) => {
      const computed = window.getComputedStyle(element);
      const color = computed.color;
      const backgroundColor = computed.backgroundColor;

      if (
        color &&
        backgroundColor &&
        color !== 'rgba(0, 0, 0, 0)' &&
        backgroundColor !== 'rgba(0, 0, 0, 0)'
      ) {
        const contrast = calculateContrast(color, backgroundColor);
        const fontSize = parseFloat(computed.fontSize);
        const fontWeight = computed.fontWeight;
        const isLargeText =
          fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);

        const requiredContrast = isLargeText ? 3 : 4.5;

        if (contrast < requiredContrast) {
          foundIssues.push({
            id: `contrast-${foundIssues.length}`,
            type: 'error',
            category: 'contrast',
            element:
              element.tagName.toLowerCase() +
              (element.className ? `.${element.className.split(' ')[0]}` : ''),
            message: `Contraste insuficiente: ${contrast.toFixed(2)}:1 (requerido: ${requiredContrast}:1)`,
            wcagLevel: 'AA',
            solution: 'Ajusta los colores para mejorar el contraste',
          });
        }
      }
    });

    // Check ARIA labels
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]'
    );
    interactiveElements.forEach((element) => {
      const hasAriaLabel =
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby');
      const hasText = element.textContent?.trim();
      const isInput = element.tagName.toLowerCase() === 'input';

      if (!hasAriaLabel && !hasText && !isInput) {
        foundIssues.push({
          id: `aria-${foundIssues.length}`,
          type: 'error',
          category: 'aria',
          element:
            element.tagName.toLowerCase() +
            (element.id ? `#${element.id}` : ''),
          message: 'Elemento interactivo sin etiqueta accesible',
          wcagLevel: 'A',
          solution: 'Agrega aria-label o texto visible',
        });
      }
    });

    // Check focus indicators
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElements.forEach((element) => {
      const computed = window.getComputedStyle(element);
      const focusComputed = window.getComputedStyle(element, ':focus');

      if (
        computed.outline === 'none' &&
        !element.classList.contains('focus:ring')
      ) {
        foundIssues.push({
          id: `focus-${foundIssues.length}`,
          type: 'warning',
          category: 'focus',
          element: element.tagName.toLowerCase(),
          message: 'Elemento sin indicador de focus visible',
          wcagLevel: 'AA',
          solution: 'Agrega estilos de focus visibles',
        });
      }
    });

    // Check heading structure
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    );
    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1 && lastLevel !== 0) {
        foundIssues.push({
          id: `heading-${foundIssues.length}`,
          type: 'warning',
          category: 'semantic',
          element: heading.tagName.toLowerCase(),
          message: `Salto en la jerarquía de encabezados (de H${lastLevel} a H${level})`,
          wcagLevel: 'A',
          solution: 'Mantén una jerarquía secuencial de encabezados',
        });
      }
      lastLevel = level;
    });

    // Check images for alt text
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        foundIssues.push({
          id: `alt-${foundIssues.length}`,
          type: 'error',
          category: 'screen-reader',
          element: 'img' + (img.src ? ` (${img.src.split('/').pop()})` : ''),
          message: 'Imagen sin texto alternativo',
          wcagLevel: 'A',
          solution: 'Agrega el atributo alt con una descripción apropiada',
        });
      }
    });

    // Check form labels
    const formInputs = document.querySelectorAll(
      'input:not([type="hidden"]), select, textarea'
    );
    formInputs.forEach((input) => {
      const hasLabel =
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        document.querySelector(`label[for="${input.id}"]`);

      if (!hasLabel) {
        foundIssues.push({
          id: `label-${foundIssues.length}`,
          type: 'error',
          category: 'aria',
          element:
            input.tagName.toLowerCase() +
            (input.getAttribute('name')
              ? `[name="${input.getAttribute('name')}"]`
              : ''),
          message: 'Campo de formulario sin etiqueta',
          wcagLevel: 'A',
          solution: 'Asocia una etiqueta <label> o usa aria-label',
        });
      }
    });

    setIssues(foundIssues);
    setIsAuditing(false);
  };

  const calculateContrast = (color1: string, color2: string): number => {
    // Simple contrast calculation (would need a proper implementation)
    return 4.5; // Placeholder
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      totalIssues: issues.length,
      byType: {
        errors: issues.filter((i) => i.type === 'error').length,
        warnings: issues.filter((i) => i.type === 'warning').length,
        info: issues.filter((i) => i.type === 'info').length,
      },
      issues: issues,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const categoryIcons = {
    contrast: Type,
    aria: Volume2,
    keyboard: Keyboard,
    'screen-reader': Eye,
    focus: Monitor,
    semantic: AlertTriangle,
  };

  const typeColors = {
    error: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Floating Audit Button */}
      <button
        onClick={() => setShowAudit(!showAudit)}
        className={cn(
          'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all',
          'bg-purple-600 hover:bg-purple-700 text-white',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
        )}
        aria-label="Abrir auditoría de accesibilidad"
      >
        <Eye className="h-5 w-5" />
      </button>

      {/* Audit Panel */}
      {showAudit && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                Auditoría de Accesibilidad
              </h2>
              <button
                onClick={() => setShowAudit(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                aria-label="Cerrar auditoría"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Verifica el cumplimiento WCAG 2.1
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {issues.length === 0 && !isAuditing && (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Ejecuta una auditoría para detectar problemas de accesibilidad
                </p>
              </div>
            )}

            {issues.length > 0 && (
              <div className="space-y-3">
                {/* Summary */}
                <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-medium mb-2">Resumen</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">
                        {issues.filter((i) => i.type === 'error').length}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Errores
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">
                        {issues.filter((i) => i.type === 'warning').length}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Advertencias
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">
                        {issues.filter((i) => i.type === 'info').length}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">Info</p>
                    </div>
                  </div>
                </Card>

                {/* Issues List */}
                {issues.map((issue) => {
                  const Icon = categoryIcons[issue.category];
                  return (
                    <Card
                      key={issue.id}
                      className={cn('p-3', typeColors[issue.type])}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              WCAG {issue.wcagLevel}
                            </Badge>
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              {issue.element}
                            </code>
                          </div>
                          <p className="text-sm font-medium">{issue.message}</p>
                          {issue.solution && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              💡 {issue.solution}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t dark:border-gray-700 space-y-2">
            <Button
              onClick={runAccessibilityAudit}
              disabled={isAuditing}
              className="w-full"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ejecutar Auditoría
                </>
              )}
            </Button>

            {issues.length > 0 && (
              <Button
                onClick={exportReport}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Reporte
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
