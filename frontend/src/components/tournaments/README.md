# Tournament Form - Padelyzer

Complete multi-step tournament creation and editing form for the Padelyzer padel analytics platform.

## 🎯 Features

### ✅ Multi-Step Wizard
- **5 intuitive steps** with visual progress indicator
- **Smart navigation** with validation on step changes
- **Responsive design** for mobile and desktop
- **Accessibility compliant** with ARIA labels and keyboard navigation

### ✅ Comprehensive Validation
- **Real-time validation** with Zod and React Hook Form
- **Step-by-step validation** to prevent invalid data entry
- **Smart date validation** with conflict detection
- **Financial calculations** with automatic revenue/profit estimation

### ✅ Advanced Features
- **Auto-save functionality** with draft recovery
- **Template system** for quick tournament creation
- **Image upload** with drag-and-drop support
- **Resource availability checking** (mock implementation)
- **Tournament duration estimation**
- **Prize distribution calculator**

### ✅ Tournament Formats
- **Elimination**: Single-elimination tournament
- **Round-Robin**: Everyone plays everyone
- **Groups**: Group stage + knockout
- **Mixed**: Custom format combination

### ✅ Smart Defaults
- **Predefined templates** for common tournament types
- **Intelligent field suggestions** based on format/category
- **Auto-completion** of related fields
- **Validation warnings** and recommendations

## 📁 File Structure

```
src/components/tournaments/
├── tournament-form.tsx                 # Main form component
├── tournament-form-types.ts           # TypeScript interfaces
├── tournament-form-example.tsx        # Usage example
├── hooks/
│   └── use-tournament-form.ts         # Custom hook with advanced logic
└── steps/
    ├── tournament-basic-info.tsx      # Step 1: Basic Information
    ├── tournament-configuration.tsx   # Step 2: Format & Configuration
    ├── tournament-scheduling.tsx      # Step 3: Dates & Scheduling
    ├── tournament-rules-prizes.tsx    # Step 4: Rules & Prizes
    └── tournament-review.tsx          # Step 5: Review & Submit

src/lib/validations/
└── tournament-form.ts                 # Zod validation schemas
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { TournamentForm } from '@/components/tournaments';

function TournamentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsFormOpen(true)}>
        Create Tournament
      </button>
      
      <TournamentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={(tournament) => {
          console.log('Tournament created:', tournament);
          setIsFormOpen(false);
        }}
      />
    </>
  );
}
```

### Advanced Usage with Templates

```tsx
import { TournamentForm, TournamentTemplateData } from '@/components/tournaments';

const quickTemplate: TournamentTemplateData = {
  name: 'Quick Tournament',
  format: 'elimination',
  category: 'open',
  maxParticipants: 16,
  minParticipants: 8,
  entryFee: 20,
  prizeMoney: 200,
  pointsSystem: 'standard',
  isDefault: true,
};

function CreateTournament() {
  return (
    <TournamentForm
      isOpen={true}
      onClose={() => {}}
      defaultTemplate={quickTemplate}
      mode="create"
      onSuccess={(tournament) => {
        // Handle success
      }}
    />
  );
}
```

### Using the Custom Hook

```tsx
import { useTournamentForm } from '@/components/tournaments';

function CustomTournamentForm() {
  const {
    formState,
    data,
    nextStep,
    previousStep,
    submitForm,
    saveDraft,
    applyTemplate,
    estimateDuration,
  } = useTournamentForm({
    onEvent: (event) => {
      console.log('Form event:', event);
    },
  });

  const duration = estimateDuration();
  
  return (
    <div>
      <p>Estimated duration: {duration.estimatedDays} days</p>
      <p>Current step: {formState.currentStep + 1}/5</p>
      {/* Your custom form UI */}
    </div>
  );
}
```

## 🎨 Form Steps

### Step 1: Basic Information
- Tournament name (required)
- Description (required)
- Tournament image/logo (optional)
- Character counters and real-time validation
- Image upload with drag-and-drop

### Step 2: Configuration
- Tournament format selection with detailed explanations
- Category selection (Open, Beginner, Intermediate, Advanced, Professional, Senior, Junior)
- Participant limits with format-specific validation
- Doubles/singles configuration
- Mixed gender options

### Step 3: Scheduling
- Registration period dates
- Tournament start/end dates
- Smart date validation and conflict detection
- Visual timeline representation
- Quick setup suggestions

### Step 4: Rules & Prizes
- Entry fees and prize money
- Multi-currency support
- Prize distribution calculator
- Scoring system selection
- Custom rules and regulations
- Additional tournament settings

### Step 5: Review & Submit
- Complete tournament overview
- Financial summary
- Validation status for each step
- Edit buttons to go back to specific steps
- Final warnings and recommendations

## 🔧 Configuration Options

```tsx
interface TournamentFormConfig {
  enableAutoSave: boolean;           // Auto-save form data
  autoSaveInterval: number;          // Auto-save interval (ms)
  enablePreview: boolean;            // Enable preview functionality
  enableTemplates: boolean;          // Enable template system
  enableDraftRecovery: boolean;      // Enable draft recovery
  allowStepNavigation: boolean;      // Allow clicking on steps
  showProgressEstimate: boolean;     // Show time estimates
  validateOnStepChange: boolean;     // Validate when changing steps
  maxImageSize: number;              // Max image size (bytes)
  allowedImageTypes: string[];       // Allowed image MIME types
}
```

## 📊 Data Flow

### Form Data Structure

```tsx
interface TournamentFormData {
  // Basic Info
  name: string;
  description: string;
  imageUrl?: string;
  
  // Configuration
  format: 'elimination' | 'round-robin' | 'groups' | 'mixed';
  category: 'open' | 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'senior' | 'junior';
  maxParticipants: number;
  minParticipants: number;
  isDoublesOnly: boolean;
  allowMixedGender: boolean;
  
  // Scheduling
  registrationStartDate: string;
  registrationEndDate: string;
  startDate: string;
  endDate: string;
  
  // Rules & Prizes
  entryFee: number;
  currency: string;
  prizeMoney: number;
  prizeDistribution?: PrizeDistribution[];
  rules?: string;
  pointsSystem: 'standard' | 'advantage' | 'no-advantage' | 'tiebreak';
  requiresApproval: boolean;
  allowWalkIns: boolean;
  
  // Advanced
  notificationSettings?: NotificationSettings;
  saveAsTemplate?: boolean;
  templateName?: string;
}
```

### Events System

The form emits events for different actions:

```tsx
type TournamentFormEvent =
  | { type: 'STEP_CHANGE'; payload: { from: number; to: number } }
  | { type: 'VALIDATION_ERROR'; payload: { step: number; errors: any } }
  | { type: 'AUTO_SAVE'; payload: { success: boolean; draftId?: string } }
  | { type: 'TEMPLATE_APPLIED'; payload: { template: TournamentTemplateData } }
  | { type: 'PREVIEW_OPENED'; payload: { step: number } }
  | { type: 'FORM_SUBMITTED'; payload: { data: TournamentFormData } }
  | { type: 'FORM_RESET'; payload: {} };
```

## 🎯 Validation Rules

### Format-Specific Validations
- **Elimination**: Participants must be power of 2 (4, 8, 16, 32, 64, 128)
- **Round-Robin**: Optimal for 4-16 participants
- **Groups**: Minimum 8 participants for group stage + knockout
- **Mixed**: Flexible participant count

### Date Validations
- Registration start < Registration end
- Registration end ≤ Tournament start
- Tournament start ≤ Tournament end
- No dates in the past (with warnings)
- Minimum preparation time recommendations

### Financial Validations
- Entry fee ≥ 0
- Prize money ≤ Total potential revenue
- Prize distribution percentages ≤ 100%
- Currency consistency

## 🌐 Internationalization

The form is fully internationalized using react-i18next:

```json
{
  "tournaments": {
    "form": {
      "title": "Create Tournament",
      "steps": {
        "basicInfo": {
          "title": "Basic Information",
          "description": "Tournament name, description, and image"
        }
      },
      "fields": {
        "name": "Tournament Name",
        "description": "Description"
      }
    }
  }
}
```

## 🔒 Security Considerations

- Input sanitization for all text fields
- File type validation for image uploads
- Size limits for uploaded files
- XSS prevention in description fields
- CSRF protection (implementation dependent)

## 🧪 Testing

### Unit Tests
- Form validation logic
- Step navigation
- Data persistence
- Event emission

### Integration Tests
- Complete form workflow
- API integration
- Store updates
- Error handling

### Example Test
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentForm } from './tournament-form';

test('should validate tournament name', async () => {
  render(<TournamentForm isOpen={true} onClose={() => {}} />);
  
  const nameInput = screen.getByLabelText(/tournament name/i);
  fireEvent.change(nameInput, { target: { value: 'A' } });
  
  expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
});
```

## 🚀 Performance Optimizations

- **Lazy loading** of step components
- **Memoized calculations** for duration estimates
- **Debounced auto-save** to reduce API calls
- **Virtual scrolling** for large participant lists
- **Image compression** before upload

## 🔮 Future Enhancements

- **Bracket preview** generation
- **Court scheduling** integration
- **Player invitation** system
- **Payment processing** integration
- **Live tournament** updates
- **Analytics integration**
- **Social sharing** features
- **Mobile app** support

## 📝 Contributing

1. Follow the existing code patterns
2. Add TypeScript types for new features
3. Include proper validation schemas
4. Add internationalization keys
5. Write tests for new functionality
6. Update this documentation

## 🐛 Troubleshooting

### Common Issues

**Form not submitting:**
- Check validation errors in browser console
- Verify all required fields are filled
- Check network connectivity

**Auto-save not working:**
- Verify localStorage is available
- Check browser storage quotas
- Review auto-save configuration

**Images not uploading:**
- Check file size limits
- Verify file type restrictions
- Review upload permissions

### Debug Mode

Enable debug logging:
```tsx
const formHook = useTournamentForm({
  onEvent: (event) => {
    console.log('Tournament Form Event:', event);
  },
});
```

## 📄 License

This component is part of the Padelyzer project and follows the project's licensing terms.