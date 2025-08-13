"""
Image upload views for clubs and courts.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.image_utils import validate_and_process_image, ImageStorageManager
from core.permissions import IsClubStaffOrOwner
from .models import Club, Court
from .serializers import ClubSerializer, CourtSerializer


class ClubImageUploadView(APIView):
    """Handle club image uploads (logo and cover)."""
    
    permission_classes = [IsAuthenticated, IsClubStaffOrOwner]
    
    @extend_schema(
        operation_id='upload_club_image',
        summary='Upload club logo or cover image',
        description='Upload and process club logo or cover image with validation',
        parameters=[
            OpenApiParameter(
                name='image_type',
                description='Type of image: logo or cover',
                required=True,
                type=OpenApiTypes.STR,
                enum=['logo', 'cover']
            )
        ],
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Image file to upload'
                    }
                },
                'required': ['image']
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'image_url': {'type': 'string'},
                    'thumbnail_url': {'type': 'string'},
                    'message': {'type': 'string'},
                    'image_info': {'type': 'object'}
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'errors': {'type': 'array', 'items': {'type': 'string'}},
                    'message': {'type': 'string'}
                }
            }
        }
    )
    def post(self, request, club_id):
        """Upload club image."""
        club = get_object_or_404(Club, id=club_id, organization=request.user.organization)
        
        # Check permissions
        self.check_object_permissions(request, club)
        
        image_type = request.query_params.get('image_type', 'logo')
        if image_type not in ['logo', 'cover']:
            return Response({
                'success': False,
                'errors': ['Invalid image_type. Must be "logo" or "cover"'],
                'message': 'Invalid image type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if image file is provided
        if 'image' not in request.FILES:
            return Response({
                'success': False,
                'errors': ['No image file provided'],
                'message': 'Image file required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        try:
            # Process image
            image_type_key = f'club_{image_type}'  # club_logo or club_cover
            result = validate_and_process_image(
                image_file=image_file,
                image_type=image_type_key,
                organization_id=club.organization.id,
                entity_id=club.id
            )
            
            if not result['valid']:
                return Response({
                    'success': False,
                    'errors': result['errors'],
                    'warnings': result.get('warnings', []),
                    'message': 'Image validation failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete old image
            old_image_url = getattr(club, f'{image_type}_url', None)
            if old_image_url:
                ImageStorageManager.delete_image(old_image_url)
            
            # Update club model
            field_name = f'{image_type}_url'
            setattr(club, field_name, result['image_url'])
            club.save(update_fields=[field_name, 'updated_at'])
            
            return Response({
                'success': True,
                'image_url': result['image_url'],
                'thumbnail_url': result.get('thumbnail_url'),
                'message': f'Club {image_type} uploaded successfully',
                'image_info': result.get('image_info', {}),
                'warnings': result.get('warnings', [])
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'errors': [str(e)],
                'message': 'Failed to process image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        operation_id='delete_club_image',
        summary='Delete club logo or cover image',
        description='Delete club logo or cover image and clear from database',
        parameters=[
            OpenApiParameter(
                name='image_type',
                description='Type of image: logo or cover',
                required=True,
                type=OpenApiTypes.STR,
                enum=['logo', 'cover']
            )
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'}
                }
            }
        }
    )
    def delete(self, request, club_id):
        """Delete club image."""
        club = get_object_or_404(Club, id=club_id, organization=request.user.organization)
        
        # Check permissions
        self.check_object_permissions(request, club)
        
        image_type = request.query_params.get('image_type', 'logo')
        if image_type not in ['logo', 'cover']:
            return Response({
                'success': False,
                'errors': ['Invalid image_type. Must be "logo" or "cover"'],
                'message': 'Invalid image type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Delete image file
            field_name = f'{image_type}_url'
            image_url = getattr(club, field_name, None)
            if image_url:
                ImageStorageManager.delete_image(image_url)
                setattr(club, field_name, '')
                club.save(update_fields=[field_name, 'updated_at'])
            
            return Response({
                'success': True,
                'message': f'Club {image_type} deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'errors': [str(e)],
                'message': 'Failed to delete image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourtImageUploadView(APIView):
    """Handle court image uploads."""
    
    permission_classes = [IsAuthenticated, IsClubStaffOrOwner]
    
    @extend_schema(
        operation_id='upload_court_image',
        summary='Upload court image',
        description='Upload and process court image with validation',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Image file to upload'
                    }
                },
                'required': ['image']
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'image_url': {'type': 'string'},
                    'thumbnail_url': {'type': 'string'},
                    'message': {'type': 'string'},
                    'image_info': {'type': 'object'}
                }
            }
        }
    )
    def post(self, request, club_id, court_id):
        """Upload court image."""
        club = get_object_or_404(Club, id=club_id, organization=request.user.organization)
        court = get_object_or_404(Court, id=court_id, club=club)
        
        # Check permissions
        self.check_object_permissions(request, club)
        
        # Check if image file is provided
        if 'image' not in request.FILES:
            return Response({
                'success': False,
                'errors': ['No image file provided'],
                'message': 'Image file required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        try:
            # Process image
            result = validate_and_process_image(
                image_file=image_file,
                image_type='court_image',
                organization_id=club.organization.id,
                entity_id=court.id
            )
            
            if not result['valid']:
                return Response({
                    'success': False,
                    'errors': result['errors'],
                    'warnings': result.get('warnings', []),
                    'message': 'Image validation failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add image to court's images list
            from datetime import datetime
            court_images = court.images if court.images else []
            court_images.append({
                'url': result['image_url'],
                'thumbnail_url': result.get('thumbnail_url'),
                'uploaded_at': datetime.now().isoformat(),
                'image_info': result.get('image_info', {}),
                'id': len(court_images) + 1  # Simple ID for referencing
            })
            
            # Update court model
            court.images = court_images
            court.save(update_fields=['images', 'updated_at'])
            
            return Response({
                'success': True,
                'image_url': result['image_url'],
                'thumbnail_url': result.get('thumbnail_url'),
                'message': 'Court image uploaded successfully',
                'image_info': result.get('image_info', {}),
                'warnings': result.get('warnings', [])
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'errors': [str(e)],
                'message': 'Failed to process image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_image_upload(request):
    """
    Handle bulk image upload for multiple entities.
    Useful for initial setup or batch operations.
    """
    try:
        files = request.FILES.getlist('images')
        image_type = request.data.get('image_type', 'general')
        entity_type = request.data.get('entity_type', 'club')  # club or court
        entity_ids = request.data.getlist('entity_ids', [])
        
        if not files:
            return Response({
                'success': False,
                'errors': ['No image files provided'],
                'message': 'At least one image file required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(files) != len(entity_ids):
            return Response({
                'success': False,
                'errors': ['Number of images must match number of entity IDs'],
                'message': 'Mismatched images and entities'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        
        for image_file, entity_id in zip(files, entity_ids):
            try:
                # Process each image
                result = validate_and_process_image(
                    image_file=image_file,
                    image_type=image_type,
                    organization_id=request.user.organization.id,
                    entity_id=int(entity_id)
                )
                
                results.append({
                    'entity_id': entity_id,
                    'success': result['valid'],
                    'image_url': result.get('image_url'),
                    'errors': result.get('errors', []),
                    'warnings': result.get('warnings', [])
                })
                
            except Exception as e:
                results.append({
                    'entity_id': entity_id,
                    'success': False,
                    'errors': [str(e)]
                })
        
        successful_uploads = sum(1 for r in results if r['success'])
        
        return Response({
            'success': successful_uploads > 0,
            'message': f'Processed {len(results)} images, {successful_uploads} successful',
            'results': results,
            'summary': {
                'total': len(results),
                'successful': successful_uploads,
                'failed': len(results) - successful_uploads
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'errors': [str(e)],
            'message': 'Bulk upload failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_thumbnail(request):
    """Generate thumbnail for existing image."""
    image_url = request.query_params.get('image_url')
    width = int(request.query_params.get('width', 300))
    height = int(request.query_params.get('height', 300))
    
    if not image_url:
        return Response({
            'success': False,
            'errors': ['image_url parameter required'],
            'message': 'Missing image URL'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        thumbnail_url = ImageStorageManager.generate_thumbnail(image_url, (width, height))
        
        if thumbnail_url:
            return Response({
                'success': True,
                'thumbnail_url': thumbnail_url,
                'original_url': image_url,
                'size': f'{width}x{height}',
                'message': 'Thumbnail generated successfully'
            })
        else:
            return Response({
                'success': False,
                'errors': ['Failed to generate thumbnail'],
                'message': 'Thumbnail generation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'success': False,
            'errors': [str(e)],
            'message': 'Thumbnail generation failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)