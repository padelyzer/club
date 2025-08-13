"use client";

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
import { imageService } from '@/lib/api/services/image.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Image as ImageIcon, Upload } from 'lucide-react';

interface ClubImageUploadProps {
  clubId: number;
  currentLogoUrl?: string;
  currentCoverUrl?: string;
  onLogoUploaded?: (logoUrl: string) => void;
  onCoverUploaded?: (coverUrl: string) => void;
  disabled?: boolean;
}

export function ClubImageUpload({
  clubId,
  currentLogoUrl,
  currentCoverUrl,
  onLogoUploaded,
  onCoverUploaded,
  disabled = false
}: ClubImageUploadProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || '');
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleLogoUpload = useCallback(async (file: File): Promise<string> => {
    if (!file) throw new Error('No file provided');

    setIsUploading(true);
    try {
      const result = await imageService.uploadClubImage(
        clubId,
        file,
        'logo',
        (progress) => {
          // Progress is handled by the ImageUpload component
        }
      );

      if (result.success && result.image_url) {
        setLogoUrl(result.image_url);
        onLogoUploaded?.(result.image_url);
        toast.success('Club logo uploaded successfully!');
        
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => 
            toast.warning(warning, { duration: 5000 })
          );
        }
        
        return result.image_url;
      } else {
        const errorMessage = result.errors?.join(', ') || result.message || 'Failed to upload logo';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo';
      toast.error(message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [clubId, onLogoUploaded]);

  const handleCoverUpload = useCallback(async (file: File): Promise<string> => {
    if (!file) throw new Error('No file provided');

    setIsUploading(true);
    try {
      const result = await imageService.uploadClubImage(
        clubId,
        file,
        'cover',
        (progress) => {
          // Progress is handled by the ImageUpload component
        }
      );

      if (result.success && result.image_url) {
        setCoverUrl(result.image_url);
        onCoverUploaded?.(result.image_url);
        toast.success('Club cover uploaded successfully!');
        
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => 
            toast.warning(warning, { duration: 5000 })
          );
        }
        
        return result.image_url;
      } else {
        const errorMessage = result.errors?.join(', ') || result.message || 'Failed to upload cover';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload cover';
      toast.error(message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [clubId, onCoverUploaded]);

  const handleDeleteLogo = useCallback(async () => {
    try {
      const result = await imageService.deleteClubImage(clubId, 'logo');
      if (result.success) {
        setLogoUrl('');
        onLogoUploaded?.('');
        toast.success('Club logo deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete logo');
      }
    } catch (error) {
      toast.error('Failed to delete logo');
    }
  }, [clubId, onLogoUploaded]);

  const handleDeleteCover = useCallback(async () => {
    try {
      const result = await imageService.deleteClubImage(clubId, 'cover');
      if (result.success) {
        setCoverUrl('');
        onCoverUploaded?.('');
        toast.success('Club cover deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete cover');
      }
    } catch (error) {
      toast.error('Failed to delete cover');
    }
  }, [clubId, onCoverUploaded]);

  // Create upload handlers that integrate with the ImageUpload component
  const logoUploadHandler = useCallback((imageUrl: string | null) => {
    if (imageUrl) {
      setLogoUrl(imageUrl);
      onLogoUploaded?.(imageUrl);
    } else {
      handleDeleteLogo();
    }
  }, [onLogoUploaded, handleDeleteLogo]);

  const coverUploadHandler = useCallback((imageUrl: string | null) => {
    if (imageUrl) {
      setCoverUrl(imageUrl);
      onCoverUploaded?.(imageUrl);
    } else {
      handleDeleteCover();
    }
  }, [onCoverUploaded, handleDeleteCover]);

  // The handleLogoUpload and handleCoverUpload functions now return URLs directly

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Club Images
          </CardTitle>
          <CardDescription>
            Upload and manage your club's logo and cover image. Images will be optimized automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logo" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logo" className="flex items-center gap-2">
                <Badge variant="outline" className="h-4 w-4 rounded-full p-0 flex items-center justify-center">
                  L
                </Badge>
                Logo
              </TabsTrigger>
              <TabsTrigger value="cover" className="flex items-center gap-2">
                <Badge variant="outline" className="h-4 w-4 rounded-full p-0 flex items-center justify-center">
                  C
                </Badge>
                Cover
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="logo" className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Club Logo</h4>
                <p className="text-sm text-gray-500">
                  Upload a square logo image. Recommended size: 400x400px or larger.
                  Maximum file size: 5MB.
                </p>
              </div>
              <ImageUpload
                value={logoUrl}
                onChange={logoUploadHandler}
                onUpload={handleLogoUpload}
                onError={(error) => toast.error(error)}
                disabled={disabled || isUploading}
                imageType="club_logo"
                aspectRatio="square"
                uploadText="Click to upload logo or drag and drop"
                maxSize={5}
                className="max-w-md mx-auto"
              />
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Logo will be used in the app header and club listings</span>
              </div>
            </TabsContent>
            
            <TabsContent value="cover" className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Cover Image</h4>
                <p className="text-sm text-gray-500">
                  Upload a wide cover image for your club page. Recommended size: 1920x1080px or similar.
                  Maximum file size: 10MB.
                </p>
              </div>
              <ImageUpload
                value={coverUrl}
                onChange={coverUploadHandler}
                onUpload={handleCoverUpload}
                onError={(error) => toast.error(error)}
                disabled={disabled || isUploading}
                imageType="club_cover"
                aspectRatio="wide"
                uploadText="Click to upload cover image or drag and drop"
                maxSize={10}
              />
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Cover image will be displayed on your club's main page</span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface CourtImageUploadProps {
  clubId: number;
  courtId: number;
  currentImages?: string[];
  onImagesUploaded?: (imageUrls: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function CourtImageUpload({
  clubId,
  courtId,
  currentImages = [],
  onImagesUploaded,
  disabled = false,
  maxImages = 5
}: CourtImageUploadProps) {
  const [images, setImages] = useState<string[]>(currentImages);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await imageService.uploadCourtImage(
        clubId,
        courtId,
        file,
        (progress) => {
          // Progress is handled by the ImageUpload component
        }
      );

      if (result.success && result.image_url) {
        const newImages = [...images, result.image_url];
        setImages(newImages);
        onImagesUploaded?.(newImages);
        toast.success('Court image uploaded successfully!');
        
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => 
            toast.warning(warning, { duration: 5000 })
          );
        }
      } else {
        const errorMessage = result.errors?.join(', ') || result.message || 'Failed to upload image';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [clubId, courtId, images, onImagesUploaded]);

  const handleImagesChange = useCallback((newImages: string[]) => {
    setImages(newImages);
    onImagesUploaded?.(newImages);
  }, [onImagesUploaded]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Court Images
          <Badge variant="secondary" className="ml-auto">
            {images.length}/{maxImages}
          </Badge>
        </CardTitle>
        <CardDescription>
          Upload multiple images of this court. Maximum {maxImages} images, 8MB each.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MultiImageUpload
          values={images}
          onChange={handleImagesChange}
          onError={(error) => toast.error(error)}
          disabled={disabled || isUploading}
          maxFiles={maxImages}
          maxSize={8}
          imageType="court_image"
          className="space-y-4"
        />
        
        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No images uploaded yet</p>
            <p className="text-sm">Add images to help customers see your court</p>
          </div>
        )}
        
        {images.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {images.length} image{images.length !== 1 ? 's' : ''} uploaded
              </Badge>
              <span>Images will appear in court listings and details</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}