"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string | null) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
  preview?: boolean;
  uploadText?: string;
  imageType?: 'club_logo' | 'club_cover' | 'court_image';
  aspectRatio?: 'square' | 'wide' | 'auto';
  showPreview?: boolean;
  multiple?: boolean;
  // Optional custom upload function - if provided, will use this instead of default simulation
  onUpload?: (file: File) => Promise<string>;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
  className,
  accept = "image/*",
  maxSize = 10,
  preview = true,
  uploadText = "Click to upload or drag and drop",
  imageType = 'club_logo',
  aspectRatio = 'auto',
  showPreview = true,
  multiple = false,
  onUpload
}: ImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // File type validation
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }

    // File size validation
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Specific validations based on image type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed';
    }

    return null;
  }, [maxSize]);

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }));
      onError?.(validationError);
      return;
    }

    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      success: false
    });

    // Create a temporary URL for immediate preview
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);

    try {
      if (onUpload) {
        // Use custom upload function provided by parent
        const uploadedUrl = await onUpload(file);
        
        // Set final progress and success state
        setUploadState({
          uploading: false,
          progress: 100,
          error: null,
          success: true
        });

        // Clean up temporary URL and use the uploaded URL
        URL.revokeObjectURL(tempUrl);
        setPreviewUrl(uploadedUrl);
        onChange(uploadedUrl);
      } else {
        // Fallback to simulation for demo purposes
        const progressInterval = setInterval(() => {
          setUploadState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + Math.random() * 30, 90)
          }));
        }, 200);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        clearInterval(progressInterval);
        
        // Set final progress and success state
        setUploadState({
          uploading: false,
          progress: 100,
          error: null,
          success: true
        });

        // Keep the temporary URL for simulation
        onChange(tempUrl);
      }

      // Clear success state after a delay
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      // Clean up the temporary URL
      URL.revokeObjectURL(tempUrl);
      
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false
      });
      onError?.(error instanceof Error ? error.message : 'Upload failed');
      
      // Clean up preview on error
      setPreviewUrl(value || null);
    }
  }, [validateFile, onChange, onError, value]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [disabled, uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, [disabled, uploadFile]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    onChange(null);
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'wide':
        return 'aspect-video';
      default:
        return '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed border-gray-300 rounded-lg transition-colors",
          "hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
          dragActive && "border-blue-500 bg-blue-50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
          getAspectRatioClass()
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          multiple={multiple}
        />

        {previewUrl && showPreview ? (
          // Preview Mode
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          // Upload Mode
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="mb-4">
              {uploadState.uploading ? (
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              ) : uploadState.success ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <Upload className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-900 font-medium">
                {uploadText}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WebP up to {maxSize}MB
              </p>
            </div>
            
            {imageType === 'club_logo' && (
              <p className="text-xs text-gray-400 mt-2">
                Recommended: Square format (1:1 ratio)
              </p>
            )}
            {imageType === 'club_cover' && (
              <p className="text-xs text-gray-400 mt-2">
                Recommended: Wide format (16:9 or 3:2 ratio)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploadState.uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{Math.round(uploadState.progress)}%</span>
          </div>
          <Progress value={uploadState.progress} className="h-2" />
        </div>
      )}

      {/* Error State */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {uploadState.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Image uploaded successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Advanced Multi-Image Upload Component
interface MultiImageUploadProps {
  values?: string[];
  onChange: (imageUrls: string[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  maxFiles?: number;
  maxSize?: number;
  imageType?: 'club_logo' | 'club_cover' | 'court_image';
}

export function MultiImageUpload({
  values = [],
  onChange,
  onError,
  disabled = false,
  className,
  maxFiles = 5,
  maxSize = 10,
  imageType = 'court_image'
}: MultiImageUploadProps) {
  const [uploads, setUploads] = useState<{[key: string]: UploadState}>({});

  const handleSingleUpload = useCallback((imageUrl: string | null, index: number) => {
    const newValues = [...values];
    if (imageUrl) {
      newValues[index] = imageUrl;
    } else {
      newValues.splice(index, 1);
    }
    onChange(newValues.filter(Boolean));
  }, [values, onChange]);

  const handleAddMore = useCallback(() => {
    if (values.length < maxFiles) {
      onChange([...values, '']);
    }
  }, [values, onChange, maxFiles]);

  const handleRemove = useCallback((index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  }, [values, onChange]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {values.map((imageUrl, index) => (
          <div key={index} className="relative">
            <ImageUpload
              value={imageUrl}
              onChange={(url) => handleSingleUpload(url, index)}
              onError={onError}
              disabled={disabled}
              imageType={imageType}
              maxSize={maxSize}
              uploadText={`Upload image ${index + 1}`}
              aspectRatio="square"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => handleRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {values.length < maxFiles && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={handleAddMore}
          >
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Add another image</p>
            <p className="text-xs text-gray-400 mt-1">
              {values.length} of {maxFiles} images
            </p>
          </div>
        )}
      </div>
    </div>
  );
}