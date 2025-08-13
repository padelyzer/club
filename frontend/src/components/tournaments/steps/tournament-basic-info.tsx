'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Camera,
  Link as LinkIcon,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WizardStepProps } from '../tournament-form-types';

// Componente de subida de imagen
const ImageUploader: React.FC<{
  value?: string;
  onChange: (url: string) => void;
  maxSize?: number;
  allowedTypes?: string[];
}> = ({
  value,
  onChange,
  maxSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return t('tournaments.form.errors.invalidImageType');
    }
    if (file.size > maxSize) {
      return t('tournaments.form.errors.imageTooLarge', {
        size: (maxSize / (1024 * 1024)).toFixed(1),
      });
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Simular subida de archivo
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadError(t('tournaments.form.errors.uploadFailed'));
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview de imagen actual */}
      {value && (
        <div className="relative">
          <img
            src={value}
            alt="Tournament preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Área de subida */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700',
          !value && 'hover:border-gray-400 dark:hover:border-gray-600'
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('tournaments.form.uploadingImage')}...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('tournaments.form.uploadImage')}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {t('tournaments.form.dragDropOrClick')}
            </p>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('tournaments.form.selectFile')}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = prompt(t('tournaments.form.enterImageUrl'));
                  if (url) onChange(url);
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {t('tournaments.form.fromUrl')}
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              {t('tournaments.form.imageRequirements', {
                types: allowedTypes
                  .map((type) => type.split('/')[1])
                  .join(', '),
                size: (maxSize / (1024 * 1024)).toFixed(1),
              })}
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error de subida */}
      {uploadError && (
        <div className="flex items-center p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 mr-2" />
          {uploadError}
        </div>
      )}
    </div>
  );
};

export const TournamentBasicInfo: React.FC<WizardStepProps> = ({
  data,
  errors,
  register,
  watch,
  setValue,
}) => {
  const { t } = useTranslation();
  const [charCount, setCharCount] = useState({
    name: data.name?.length || 0,
    description: data.description?.length || 0,
  });

  const watchName = watch('name');
  const watchDescription = watch('description');
  const watchImage = watch('imageUrl');

  // Actualizar contadores de caracteres
  React.useEffect(() => {
    setCharCount({
      name: watchName?.length || 0,
      description: watchDescription?.length || 0,
    });
  }, [watchName, watchDescription]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tournaments.form.steps.basicInfo.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tournaments.form.steps.basicInfo.description')}
        </p>
      </div>

      {/* Formulario */}
      <div className="space-y-6">
        {/* Nombre del torneo */}
        <div>
          <Label htmlFor="name" className="flex items-center justify-between">
            <span>{t('tournaments.form.fields.name')} *</span>
            <span
              className={cn(
                'text-xs',
                charCount.name > 100 ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {charCount.name}/100
            </span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder={t('tournaments.form.placeholders.name')}
            className={cn(
              'mt-1',
              errors.name &&
                'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.name.message}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {t('tournaments.form.hints.name')}
          </p>
        </div>

        {/* Descripción */}
        <div>
          <Label
            htmlFor="description"
            className="flex items-center justify-between"
          >
            <span>{t('tournaments.form.fields.description')} *</span>
            <span
              className={cn(
                'text-xs',
                charCount.description > 500 ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {charCount.description}/500
            </span>
          </Label>
          <textarea
            id="description"
            {...register('description')}
            placeholder={t('tournaments.form.placeholders.description')}
            rows={4}
            maxLength={500}
            className={cn(
              'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              'resize-none',
              errors.description &&
                'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
          />
          {errors.description && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.description.message}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {t('tournaments.form.hints.description')}
          </p>
        </div>

        {/* Imagen del torneo */}
        <div>
          <Label className="block mb-3">
            {t('tournaments.form.fields.image')}
            <Badge variant="secondary" className="ml-2 text-xs">
              {t('common.optional')}
            </Badge>
          </Label>
          <ImageUploader
            value={watchImage || ''}
            onChange={(url) => setValue('imageUrl', url)}
          />
          <p className="mt-2 text-xs text-gray-500">
            {t('tournaments.form.hints.image')}
          </p>
        </div>

        {/* Vista previa de información */}
        {(watchName || watchDescription) && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t('tournaments.form.preview')}
            </h4>
            <div className="space-y-2">
              {watchName && (
                <div>
                  <span className="text-xs text-gray-500">
                    {t('tournaments.form.fields.name')}:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {watchName}
                  </p>
                </div>
              )}
              {watchDescription && (
                <div>
                  <span className="text-xs text-gray-500">
                    {t('tournaments.form.fields.description')}:
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {watchDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          {t('tournaments.form.tips.title')}
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t('tournaments.form.tips.basicInfo.name')}</li>
          <li>• {t('tournaments.form.tips.basicInfo.description')}</li>
          <li>• {t('tournaments.form.tips.basicInfo.image')}</li>
        </ul>
      </div>
    </motion.div>
  );
};
