'use client';

import { 
  DisplayXL, DisplayLG, DisplayMD, DisplaySM,
  HeadlineLG, HeadlineMD, HeadlineSM,
  BodyLG, Body, BodySM,
  Callout,
  CaptionLG, CaptionSM,
  Typography
} from '@/components/ui/typography';
import { Card } from '@/components/ui/card';

export default function TypographyShowcasePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="text-center space-y-4 py-8">
        <DisplayLG>Apple HIG Typography</DisplayLG>
        <Body className="text-muted-foreground max-w-2xl mx-auto">
          Professional typography system following Apple Human Interface Guidelines 
          for optimal readability and visual hierarchy across all devices.
        </Body>
      </div>

      {/* Display Variants */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Display Typography</HeadlineMD>
        <div className="space-y-4">
          <DisplayXL>Hero Headlines</DisplayXL>
          <DisplayLG>Page Titles</DisplayLG>
          <DisplayMD>Section Headers</DisplayMD>
          <DisplaySM>Subsection Titles</DisplaySM>
        </div>
      </Card>

      {/* Headlines */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Headlines</HeadlineMD>
        <div className="space-y-4">
          <HeadlineLG>Primary Section Header</HeadlineLG>
          <HeadlineMD>Secondary Section Header</HeadlineMD>
          <HeadlineSM>Tertiary Section Header</HeadlineSM>
        </div>
      </Card>

      {/* Body Text */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Body Text</HeadlineMD>
        <div className="space-y-4">
          <BodyLG>
            Enhanced body text for important content that needs extra emphasis 
            and improved readability on larger screens.
          </BodyLG>
          <Body>
            Standard body text optimized for reading at 16px with proper line 
            height following Apple's guidelines for optimal readability.
          </Body>
          <BodySM>
            Smaller body text for secondary information, footnotes, or content 
            that requires less visual prominence in the hierarchy.
          </BodySM>
        </div>
      </Card>

      {/* Special Variants */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Special Variants</HeadlineMD>
        <div className="space-y-4">
          <Callout>
            Callout text emphasizes important secondary content with medium 
            font weight for better visual hierarchy.
          </Callout>
          <div className="space-y-2">
            <CaptionLG>
              Large caption for supplementary information and metadata
            </CaptionLG>
            <CaptionSM>
              Small caption for minimal context and timestamp information
            </CaptionSM>
          </div>
        </div>
      </Card>

      {/* Spacing Example */}
      <Card className="p-8 space-y-content-md">
        <HeadlineMD>8pt Grid Spacing</HeadlineMD>
        <Body>
          All components use Apple's 8-point grid system for consistent spacing:
        </Body>
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <Typography variant="ui-md">content-xs: 8px</Typography>
            <Typography variant="ui-md">content-sm: 16px</Typography>
            <Typography variant="ui-md">content-md: 24px</Typography>
            <Typography variant="ui-md">content-lg: 32px</Typography>
            <Typography variant="ui-md">content-xl: 48px</Typography>
          </div>
        </div>
      </Card>

      {/* Touch Targets */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Touch Target Compliance</HeadlineMD>
        <Body>
          All interactive elements meet Apple's minimum 44x44px touch target size:
        </Body>
        <div className="flex gap-touch-spacing flex-wrap">
          <button className="px-4 py-2 bg-primary text-white rounded-lg">
            Standard Button
          </button>
          <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg">
            Large Button
          </button>
          <button className="p-2 bg-muted rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </Card>

      {/* Color & Contrast */}
      <Card className="p-8 space-y-6">
        <HeadlineMD>Accessibility & Contrast</HeadlineMD>
        <div className="space-y-4">
          <Body>
            All text meets WCAG 2.1 AA contrast requirements:
          </Body>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background border rounded-lg">
              <Typography variant="body-md" color="default">Default Text</Typography>
              <Typography variant="caption-sm" color="muted">Muted Text</Typography>
            </div>
            <div className="p-4 bg-primary text-primary-foreground rounded-lg">
              <Typography variant="body-md">Primary Text</Typography>
              <Typography variant="caption-sm">On Brand Colors</Typography>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}