# Court Model Unification

## Django Model vs TypeScript Interface Comparison

### Django Model (Backend)
```python
class Court(BaseModel):
    # Relationships
    club = ForeignKey(Club)
    organization = ForeignKey(Organization)
    
    # Basic Information
    name = CharField(max_length=100)
    number = IntegerField()
    surface_type = CharField(choices=SURFACE_CHOICES)
    
    # Features
    has_lighting = BooleanField(default=True)
    has_heating = BooleanField(default=False)
    has_roof = BooleanField(default=False)
    
    # Status
    is_maintenance = BooleanField(default=False)
    maintenance_notes = TextField(blank=True)
    
    # Pricing
    price_per_hour = DecimalField(max_digits=8, decimal_places=2)
    
    # From BaseModel
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### TypeScript Interface (Frontend)
```typescript
interface Court {
  id: number;
  club: number;
  club_name: string; // ❌ Not in Django model
  name: string;
  number: number;
  surface_type: 'glass' | 'wall' | 'mesh' | 'mixed';
  surface_type_display: string; // ❌ Not in Django model
  has_lighting: boolean;
  has_heating: boolean;
  has_roof: boolean;
  is_maintenance: boolean;
  maintenance_notes: string;
  price_per_hour: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // ❌ Missing: organization field
}
```

## Discrepancies Found

### 1. Missing in Django Model:
- `club_name` - Should be added in serializer
- `surface_type_display` - Should be added in serializer
- No `organization` field exposed in TypeScript interface

### 2. Type Mismatches:
- `price_per_hour`: Decimal in Django → string in TypeScript ✅ (correct for JSON)
- DateTime fields → string in TypeScript ✅ (correct for JSON)

### 3. Missing Features in TypeScript:
- `organization` field not included in interface

## Unified Type Definition

```typescript
// Aligned with Django model
export interface Court {
  id: number;
  club: number;
  club_name?: string; // Added by serializer
  organization: number; // Added to match Django
  name: string;
  number: number;
  surface_type: 'glass' | 'wall' | 'mesh' | 'mixed';
  surface_type_display?: string; // Added by serializer
  has_lighting: boolean;
  has_heating: boolean;
  has_roof: boolean;
  is_maintenance: boolean;
  maintenance_notes: string;
  price_per_hour: string; // Decimal as string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// For create/update operations
export interface CourtFormData {
  club: number;
  name: string;
  number: number;
  surface_type: 'glass' | 'wall' | 'mesh' | 'mixed';
  has_lighting?: boolean;
  has_heating?: boolean;
  has_roof?: boolean;
  is_maintenance?: boolean;
  maintenance_notes?: string;
  price_per_hour?: string;
  is_active?: boolean;
}
```

## Serializer Updates Needed

```python
class CourtSerializer(serializers.ModelSerializer):
    club_name = serializers.CharField(source='club.name', read_only=True)
    surface_type_display = serializers.CharField(source='get_surface_type_display', read_only=True)
    
    class Meta:
        model = Court
        fields = [
            'id', 'club', 'club_name', 'organization',
            'name', 'number', 'surface_type', 'surface_type_display',
            'has_lighting', 'has_heating', 'has_roof',
            'is_maintenance', 'maintenance_notes',
            'price_per_hour', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'club_name', 'surface_type_display', 'created_at', 'updated_at']
```

## API Endpoints Status

### Current Endpoints (from API_ENDPOINTS):
- ✅ LIST: `/clubs/courts/`
- ✅ DETAIL: `/clubs/courts/{id}/`
- ✅ CREATE: `/clubs/courts/`
- ✅ UPDATE: `/clubs/courts/{id}/`
- ✅ DELETE: `/clubs/courts/{id}/`
- ❓ AVAILABILITY: `/clubs/courts/{id}/availability/`
- ❓ WEEKLY_AVAILABILITY: `/clubs/courts/{id}/weekly-availability/`
- ❓ PRICING: `/clubs/courts/{id}/pricing/`
- ❓ OCCUPANCY: `/clubs/courts/{id}/occupancy/`
- ❓ BULK_AVAILABILITY: `/clubs/courts/{id}/bulk-availability/`
- ❓ MAINTENANCE: `/clubs/courts/{id}/maintenance/`

### ViewSet Implementation:
```python
class CourtViewSet(viewsets.ModelViewSet):
    serializer_class = CourtSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    
    def get_queryset(self):
        # Filters by organization and club
        pass
```

## Tasks to Complete:

1. **Update TypeScript Interface** ✅
   - Add `organization` field
   - Make `club_name` and `surface_type_display` optional

2. **Update Django Serializer**
   - Add `club_name` field
   - Add `surface_type_display` field
   - Ensure all fields match TypeScript

3. **Implement Missing Endpoints**
   - availability
   - weekly-availability
   - pricing
   - occupancy
   - bulk-availability
   - maintenance

4. **Add Validation**
   - Ensure court number is unique per club
   - Validate price_per_hour is positive
   - Validate maintenance status transitions