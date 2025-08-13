# Client Module Tests

This directory contains test files for the client module components.

## Test Files

- **client-card.test.tsx**: Tests for the ClientCard component
  - Rendering client information
  - Status badges (active/inactive)
  - Membership badges
  - Action handlers (view, edit, delete)
  - Accessibility

- **client-form.test.tsx**: Tests for the ClientForm component
  - Create mode with empty fields
  - Edit mode with pre-filled data
  - Form validation
  - Email availability checking
  - Form submission (create/update)
  - Error handling

- **client-filters.test.tsx**: Tests for the ClientFilters component
  - Search functionality with debouncing
  - Filter dropdown interactions
  - Status filtering (active/inactive/all)
  - Membership filtering
  - Active filters display
  - Filter removal and clearing

- **clients-list.test.tsx**: Tests for the ClientsList component
  - List view rendering
  - Grid view rendering
  - Client data display
  - Pagination
  - Action handlers
  - Empty state
  - Document information display

- **client-detail.test.tsx**: Tests for the ClientDetail component
  - Header information and actions
  - Tab navigation
  - Information tab content
  - Activity tab (placeholder)
  - Statistics tab
  - Footer actions
  - Data formatting

## Running Tests

```bash
# Run all client module tests
npm run test:clients

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test client-card.test.tsx
```

## Test Utilities

The tests use custom utilities located in `/src/test-utils/`:

- **index.tsx**: Custom render function with providers
- **mocks.ts**: Mock data for clients

## Common Test Patterns

1. **Component Rendering**: Testing that components render with correct props
2. **User Interactions**: Testing click handlers, form submissions
3. **State Management**: Testing store actions and state updates
4. **Async Operations**: Using `waitFor` for async state changes
5. **Accessibility**: Testing keyboard navigation and ARIA attributes

## Known Issues

- Some dropdown menu tests require `waitFor` to handle async rendering
- Mock i18n returns translation keys instead of translated text
- Date formatting is mocked to return consistent values

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Mock external dependencies
4. Test both success and error cases
5. Include accessibility tests