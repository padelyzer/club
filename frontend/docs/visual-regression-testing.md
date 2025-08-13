# Visual Regression Testing Guide

## Overview

Visual regression testing helps catch unintended visual changes in our components by comparing screenshots over time.

## Setup

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run Storybook**
   ```bash
   npm run storybook
   ```

3. **Run visual tests**
   ```bash
   npm run test:visual
   ```

4. **Update baselines** (when changes are intentional)
   ```bash
   npm run test:visual:update
   ```

## How It Works

1. **Baseline Creation**: First run creates baseline images
2. **Comparison**: Subsequent runs compare against baselines
3. **Diff Generation**: Differences are highlighted in diff images
4. **Reporting**: JSON report with pass/fail status

## Directory Structure

```
visual-tests/
├── baseline/     # Reference screenshots
├── current/      # Latest screenshots
├── diff/         # Difference images
└── report.json   # Test results
```

## Writing Visual Tests

### 1. Create Story
```tsx
// Button.stories.tsx
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

### 2. Add Visual Test
The test runner automatically captures all stories.

### 3. Test Multiple Viewports
Tests run on:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1280x800)

## Best Practices

### DO ✅
- Keep stories focused and isolated
- Use consistent test data
- Test all component states
- Review diffs carefully before updating baselines

### DON'T ❌
- Include dynamic content (timestamps, random data)
- Test animations (use static states)
- Ignore legitimate visual bugs
- Update baselines without review

## CI/CD Integration

### GitHub Actions
Visual tests run automatically on PRs that modify:
- Component files
- Style files
- Storybook config

### Reviewing Results
1. Check PR comments for failures
2. Download artifacts to view diffs
3. Approve changes or fix issues

## Handling Failures

### Intended Changes
```bash
# Update baselines locally
npm run test:visual:update

# Commit new baselines
git add visual-tests/baseline/
git commit -m "Update visual baselines for [component]"
```

### Unintended Changes
1. Review the diff images
2. Fix the visual regression
3. Re-run tests to verify

## Advanced Configuration

### Custom Viewports
Edit `scripts/visual-regression.ts`:
```ts
viewports: [
  { width: 320, height: 568, name: 'iphone-se' },
  { width: 1920, height: 1080, name: 'full-hd' },
]
```

### Threshold Adjustment
```ts
threshold: 0.1, // Allow 0.1% pixel difference
```

### Exclude Stories
Add to story parameters:
```tsx
export const AnimatedStory: Story = {
  parameters: {
    visualTest: { skip: true },
  },
};
```

## Troubleshooting

### Tests timing out
- Increase timeout in config
- Check for infinite animations
- Verify Storybook is running

### False positives
- Check for font loading issues
- Disable animations
- Use consistent test data

### Missing baselines
- Run `npm run test:visual:update`
- Commit baseline images

## Example Output

```json
{
  "story": "Button-Primary",
  "viewport": "desktop",
  "status": "passed",
  "message": "No changes"
}
```

## Integration with Design System

Visual regression testing ensures our design system remains consistent:

1. **Component Library**: All UI components tested
2. **Theme Changes**: Catch unintended theme impacts
3. **Responsive Design**: Verify all breakpoints
4. **Dark Mode**: Test both themes

## Performance Tips

1. **Parallel Testing**: Run viewports in parallel
2. **Selective Testing**: Only test changed components
3. **Optimize Images**: Use PNG compression
4. **Cache Baselines**: Store in git LFS for large files

## Future Enhancements

- [ ] Integrate with design tools (Figma)
- [ ] AI-powered diff analysis
- [ ] Performance metrics capture
- [ ] Accessibility snapshot testing