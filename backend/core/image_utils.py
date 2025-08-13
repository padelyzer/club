"""
Image upload utilities for Padelyzer.
Handles validation, processing, and storage of images.
"""

import os
import uuid
from datetime import datetime
from io import BytesIO
from typing import Dict, List, Optional, Tuple

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image


class ImageValidator:
    """Validate uploaded images."""
    
    # Allowed image formats
    ALLOWED_FORMATS = ["JPEG", "JPG", "PNG", "WEBP"]
    
    # File size limits (in bytes)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MIN_FILE_SIZE = 1024  # 1KB
    
    # Image dimension limits
    MAX_DIMENSIONS = (4096, 4096)  # 4K max
    MIN_DIMENSIONS = (100, 100)    # Minimum readable size
    
    # Specific limits for different image types
    CLUB_LOGO_LIMITS = {
        'max_size': 5 * 1024 * 1024,  # 5MB
        'max_dimensions': (1000, 1000),
        'min_dimensions': (200, 200),
        'aspect_ratio_range': (0.5, 2.0),  # Square-ish preferred
    }
    
    CLUB_COVER_LIMITS = {
        'max_size': 10 * 1024 * 1024,  # 10MB
        'max_dimensions': (2000, 1500),
        'min_dimensions': (800, 400),
        'aspect_ratio_range': (1.2, 3.0),  # Wide preferred
    }
    
    COURT_IMAGE_LIMITS = {
        'max_size': 8 * 1024 * 1024,  # 8MB
        'max_dimensions': (1920, 1080),
        'min_dimensions': (400, 300),
        'aspect_ratio_range': (0.8, 2.0),  # Flexible
    }

    @classmethod
    def validate_image_file(cls, image_file, image_type: str = "general") -> Dict:
        """
        Validate an uploaded image file.
        
        Args:
            image_file: Django UploadedFile instance
            image_type: Type of image (club_logo, club_cover, court_image)
            
        Returns:
            Dict with validation results and processed image data
            
        Raises:
            ValidationError: If validation fails
        """
        result = {
            'valid': False,
            'errors': [],
            'warnings': [],
            'image_info': {},
            'processed_file': None
        }
        
        try:
            # Basic file validation
            cls._validate_file_basic(image_file, result)
            
            # Open and validate image
            image = Image.open(image_file)
            result['image_info'] = {
                'format': image.format,
                'size': image.size,
                'mode': image.mode,
                'file_size': image_file.size
            }
            
            # Type-specific validation
            type_limits = cls._get_type_limits(image_type)
            cls._validate_image_specs(image, image_file.size, type_limits, result)
            
            # Security validation
            cls._validate_image_security(image, result)
            
            # Process image if valid
            if not result['errors']:
                result['processed_file'] = cls._process_image(image, image_file, image_type)
                result['valid'] = True
                
        except Exception as e:
            result['errors'].append(f"Invalid image file: {str(e)}")
            
        if result['errors']:
            raise ValidationError(result['errors'])
            
        return result
    
    @classmethod
    def _validate_file_basic(cls, image_file, result: Dict):
        """Basic file validation."""
        if not hasattr(image_file, 'content_type'):
            result['errors'].append("Invalid file upload")
            return
            
        # File size validation
        if image_file.size > cls.MAX_FILE_SIZE:
            result['errors'].append(f"File too large. Maximum size: {cls.MAX_FILE_SIZE // (1024*1024)}MB")
        elif image_file.size < cls.MIN_FILE_SIZE:
            result['errors'].append(f"File too small. Minimum size: {cls.MIN_FILE_SIZE}B")
            
        # Content type validation
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if image_file.content_type not in allowed_types:
            result['errors'].append(f"Invalid file type. Allowed: {', '.join(allowed_types)}")
    
    @classmethod
    def _validate_image_specs(cls, image: Image.Image, file_size: int, limits: Dict, result: Dict):
        """Validate image specifications against limits."""
        width, height = image.size
        
        # Size validation
        if file_size > limits['max_size']:
            result['errors'].append(f"Image too large. Maximum: {limits['max_size'] // (1024*1024)}MB")
        
        # Dimension validation
        max_w, max_h = limits['max_dimensions']
        min_w, min_h = limits['min_dimensions']
        
        if width > max_w or height > max_h:
            result['errors'].append(f"Image dimensions too large. Maximum: {max_w}x{max_h}")
        elif width < min_w or height < min_h:
            result['errors'].append(f"Image dimensions too small. Minimum: {min_w}x{min_h}")
        
        # Aspect ratio validation
        if limits.get('aspect_ratio_range'):
            aspect_ratio = width / height
            min_ratio, max_ratio = limits['aspect_ratio_range']
            
            if not (min_ratio <= aspect_ratio <= max_ratio):
                result['warnings'].append(
                    f"Non-optimal aspect ratio: {aspect_ratio:.2f}. "
                    f"Recommended range: {min_ratio}-{max_ratio}"
                )
    
    @classmethod
    def _validate_image_security(cls, image: Image.Image, result: Dict):
        """Security validation for image files."""
        # Check for potential malicious content
        if hasattr(image, 'info') and image.info:
            # Remove potentially dangerous metadata
            dangerous_keys = ['exif', 'icc_profile', 'photoshop']
            for key in dangerous_keys:
                if key in image.info:
                    result['warnings'].append(f"Removed {key} metadata for security")
        
        # Validate image format
        if image.format not in cls.ALLOWED_FORMATS:
            result['errors'].append(f"Unsupported format: {image.format}")
    
    @classmethod
    def _get_type_limits(cls, image_type: str) -> Dict:
        """Get validation limits for specific image type."""
        limits_map = {
            'club_logo': cls.CLUB_LOGO_LIMITS,
            'club_cover': cls.CLUB_COVER_LIMITS,
            'court_image': cls.COURT_IMAGE_LIMITS,
        }
        return limits_map.get(image_type, {
            'max_size': cls.MAX_FILE_SIZE,
            'max_dimensions': cls.MAX_DIMENSIONS,
            'min_dimensions': cls.MIN_DIMENSIONS,
            'aspect_ratio_range': None
        })
    
    @classmethod
    def _process_image(cls, image: Image.Image, original_file, image_type: str) -> ContentFile:
        """
        Process and optimize the image.
        
        Args:
            image: PIL Image instance
            original_file: Original uploaded file
            image_type: Type of image
            
        Returns:
            ContentFile with processed image
        """
        # Convert RGBA to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # Optimize based on image type
        if image_type == 'club_logo':
            image = cls._optimize_logo(image)
        elif image_type == 'club_cover':
            image = cls._optimize_cover(image)
        elif image_type == 'court_image':
            image = cls._optimize_court_image(image)
        
        # Save to BytesIO
        output = BytesIO()
        
        # Choose format (prefer WebP for better compression)
        save_format = 'WebP' if hasattr(Image, 'SAVE_WEBP') else 'JPEG'
        quality = 85 if save_format == 'JPEG' else 90
        
        image.save(output, format=save_format, quality=quality, optimize=True)
        output.seek(0)
        
        # Generate filename
        ext = '.webp' if save_format == 'WebP' else '.jpg'
        filename = f"{uuid.uuid4().hex}{ext}"
        
        return ContentFile(output.getvalue(), name=filename)
    
    @classmethod
    def _optimize_logo(cls, image: Image.Image) -> Image.Image:
        """Optimize club logo image."""
        # Resize if too large
        if image.size[0] > 800 or image.size[1] > 800:
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
        return image
    
    @classmethod
    def _optimize_cover(cls, image: Image.Image) -> Image.Image:
        """Optimize club cover image."""
        # Resize if too large
        if image.size[0] > 1920 or image.size[1] > 1080:
            image.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
        return image
    
    @classmethod
    def _optimize_court_image(cls, image: Image.Image) -> Image.Image:
        """Optimize court image."""
        # Resize if too large
        if image.size[0] > 1200 or image.size[1] > 900:
            image.thumbnail((1200, 900), Image.Resampling.LANCZOS)
        return image


class ImageStorageManager:
    """Manage image storage and URL generation."""
    
    @classmethod
    def save_image(cls, processed_file: ContentFile, image_type: str, 
                   organization_id: int, entity_id: Optional[int] = None) -> str:
        """
        Save processed image to storage and return URL.
        
        Args:
            processed_file: Processed image file
            image_type: Type of image (club_logo, club_cover, court_image)
            organization_id: Organization ID for path organization
            entity_id: Club/Court ID for path organization
            
        Returns:
            URL of saved image
        """
        # Generate organized path
        date_path = datetime.now().strftime('%Y/%m/%d')
        path_parts = [
            'images',
            str(organization_id),
            image_type,
            date_path,
            processed_file.name
        ]
        
        if entity_id:
            path_parts.insert(-1, str(entity_id))
        
        file_path = '/'.join(path_parts)
        
        # Save file
        saved_path = default_storage.save(file_path, processed_file)
        
        # Generate URL
        if hasattr(default_storage, 'url'):
            return default_storage.url(saved_path)
        else:
            # Fallback for local storage
            return f"{settings.MEDIA_URL}{saved_path}"
    
    @classmethod
    def delete_image(cls, image_url: str) -> bool:
        """
        Delete image from storage.
        
        Args:
            image_url: URL of image to delete
            
        Returns:
            True if deleted successfully
        """
        if not image_url:
            return True
            
        try:
            # Extract path from URL
            if image_url.startswith(settings.MEDIA_URL):
                path = image_url.replace(settings.MEDIA_URL, '', 1)
                if default_storage.exists(path):
                    default_storage.delete(path)
                return True
        except Exception:
            pass
        
        return False
    
    @classmethod
    def generate_thumbnail(cls, image_url: str, size: Tuple[int, int]) -> Optional[str]:
        """
        Generate thumbnail for existing image.
        
        Args:
            image_url: Original image URL
            size: Thumbnail size (width, height)
            
        Returns:
            Thumbnail URL or None if failed
        """
        if not image_url:
            return None
            
        try:
            # Extract path from URL
            if image_url.startswith(settings.MEDIA_URL):
                original_path = image_url.replace(settings.MEDIA_URL, '', 1)
                
                if not default_storage.exists(original_path):
                    return None
                
                # Generate thumbnail path
                path_parts = original_path.split('/')
                filename = path_parts[-1]
                name, ext = os.path.splitext(filename)
                thumb_filename = f"{name}_thumb_{size[0]}x{size[1]}{ext}"
                path_parts[-1] = thumb_filename
                thumb_path = '/'.join(path_parts)
                
                # Check if thumbnail already exists
                if default_storage.exists(thumb_path):
                    return default_storage.url(thumb_path)
                
                # Create thumbnail
                with default_storage.open(original_path) as original_file:
                    image = Image.open(original_file)
                    image.thumbnail(size, Image.Resampling.LANCZOS)
                    
                    output = BytesIO()
                    format = 'WebP' if ext.lower() == '.webp' else 'JPEG'
                    image.save(output, format=format, quality=85, optimize=True)
                    output.seek(0)
                    
                    thumbnail_file = ContentFile(output.getvalue(), name=thumb_filename)
                    saved_path = default_storage.save(thumb_path, thumbnail_file)
                    
                    return default_storage.url(saved_path)
                    
        except Exception:
            pass
        
        return None


def validate_and_process_image(image_file, image_type: str, 
                              organization_id: int, entity_id: Optional[int] = None) -> Dict:
    """
    Complete image validation and processing pipeline.
    
    Args:
        image_file: Uploaded image file
        image_type: Type of image (club_logo, club_cover, court_image)
        organization_id: Organization ID
        entity_id: Optional entity ID (club or court)
        
    Returns:
        Dict with processing results including URL
    """
    # Validate image
    validation_result = ImageValidator.validate_image_file(image_file, image_type)
    
    if not validation_result['valid']:
        return validation_result
    
    try:
        # Save processed image
        image_url = ImageStorageManager.save_image(
            validation_result['processed_file'],
            image_type,
            organization_id,
            entity_id
        )
        
        # Generate thumbnail
        thumbnail_url = ImageStorageManager.generate_thumbnail(image_url, (300, 300))
        
        validation_result.update({
            'image_url': image_url,
            'thumbnail_url': thumbnail_url,
            'success': True
        })
        
    except Exception as e:
        validation_result['errors'].append(f"Failed to save image: {str(e)}")
        validation_result['valid'] = False
    
    return validation_result