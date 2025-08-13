import type { Meta, StoryObj } from '@storybook/react';
import { 
  Typography, 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Body, 
  Lead, 
  Caption, 
  Code,
  Quote,
  // Apple HIG Components
  DisplayXL,
  DisplayLG,
  DisplayMD,
  DisplaySM,
  HeadlineLG,
  HeadlineMD,
  HeadlineSM,
  BodyLG,
  BodySM,
  Callout,
  CaptionLG,
  CaptionSM
} from './typography';

const meta = {
  title: 'UI/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'display-xl', 'display-lg', 'display-md', 'display-sm',
        'headline-lg', 'headline-md', 'headline-sm',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'body-lg', 'body-md', 'body-sm', 'body-xs',
        'callout',
        'caption-lg', 'caption-sm',
        'ui-lg', 'ui-md', 'ui-sm',
        'lead', 'quote', 'code', 'label', 'caption', 'overline'
      ],
    },
    color: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'muted', 'destructive', 'success', 'warning', 'info'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify'],
    },
    weight: {
      control: 'select',
      options: ['normal', 'medium', 'semibold', 'bold'],
    },
  },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'The quick brown fox jumps over the lazy dog',
    variant: 'body-md',
  },
};

export const DisplayVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <DisplayXL>Display XL - Hero Text</DisplayXL>
      <DisplayLG>Display LG - Page Title</DisplayLG>
      <DisplayMD>Display MD - Section Title</DisplayMD>
      <DisplaySM>Display SM - Subsection</DisplaySM>
    </div>
  ),
};

export const AppleHIGVariants: Story = {
  render: () => (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-4">
        <Typography variant="overline" color="primary">APPLE HIG DISPLAY SCALES</Typography>
        <div className="space-content-md">
          <DisplayXL>Display XL - Impact Headlines</DisplayXL>
          <DisplayLG>Display Large - Hero Content</DisplayLG>
          <DisplayMD>Display Medium - Page Headers</DisplayMD>
          <DisplaySM>Display Small - Section Headers</DisplaySM>
        </div>
      </section>

      <section className="space-y-4">
        <Typography variant="overline" color="primary">APPLE HIG HEADLINE SCALES</Typography>
        <div className="space-content-md">
          <HeadlineLG>Headline Large - Primary Sections</HeadlineLG>
          <HeadlineMD>Headline Medium - Secondary Sections</HeadlineMD>
          <HeadlineSM>Headline Small - Subsections</HeadlineSM>
        </div>
      </section>

      <section className="space-y-4">
        <Typography variant="overline" color="primary">APPLE HIG BODY & CONTENT</Typography>
        <div className="space-content-md max-w-2xl">
          <BodyLG>
            Body Large - Enhanced readability for important content. 
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </BodyLG>
          <Body>
            Body Medium (Default) - Standard reading experience optimized for Apple devices. 
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Body>
          <BodySM>
            Body Small - Secondary information and captions. 
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </BodySM>
          <Callout>
            Callout - Emphasized secondary content with medium weight for better hierarchy and visual distinction.
          </Callout>
        </div>
      </section>

      <section className="space-y-4">
        <Typography variant="overline" color="primary">APPLE HIG CAPTIONS</Typography>
        <div className="space-content-sm">
          <CaptionLG>Caption Large - Supplementary information</CaptionLG>
          <CaptionSM>Caption Small - Minimal context and metadata</CaptionSM>
        </div>
      </section>
    </div>
  ),
};

export const HeadingVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading1>Heading 1 - Main Title</Heading1>
      <Heading2>Heading 2 - Section Title</Heading2>
      <Heading3>Heading 3 - Subsection Title</Heading3>
      <Heading4>Heading 4 - Card Title</Heading4>
      <Typography variant="h5">Heading 5 - Small Title</Typography>
      <Typography variant="h6">Heading 6 - Tiny Title</Typography>
    </div>
  ),
};

export const BodyVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Typography variant="body-lg">
        Body Large - Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </Typography>
      <Body>
        Body Medium (Default) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </Body>
      <Typography variant="body-sm">
        Body Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </Typography>
      <Typography variant="body-xs">
        Body Extra Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </Typography>
    </div>
  ),
};

export const SpecialVariants: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <Lead>
        Lead paragraph - Make a statement with larger, muted text that stands out 
        from regular body content.
      </Lead>
      
      <Quote>
        "Design is not just what it looks like and feels like. 
        Design is how it works." - Steve Jobs
      </Quote>
      
      <Typography>
        Here's some inline <Code>const example = "code"</Code> within a paragraph.
      </Typography>
      
      <div className="space-y-2">
        <Typography variant="label">Form Label</Typography>
        <Typography variant="caption">
          Caption text for additional context or help text
        </Typography>
        <Typography variant="overline">Overline Text</Typography>
      </div>
    </div>
  ),
};

export const ColorVariants: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography color="default">Default color text</Typography>
      <Typography color="primary">Primary color text</Typography>
      <Typography color="secondary">Secondary color text</Typography>
      <Typography color="muted">Muted color text</Typography>
      <Typography color="destructive">Destructive color text</Typography>
      <Typography color="success">Success color text</Typography>
      <Typography color="warning">Warning color text</Typography>
      <Typography color="info">Info color text</Typography>
    </div>
  ),
};

export const AlignmentVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Typography align="left">Left aligned text (default)</Typography>
      <Typography align="center">Center aligned text</Typography>
      <Typography align="right">Right aligned text</Typography>
      <Typography align="justify">
        Justified text alignment. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation.
      </Typography>
    </div>
  ),
};

export const WeightVariants: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography weight="normal">Normal weight text</Typography>
      <Typography weight="medium">Medium weight text</Typography>
      <Typography weight="semibold">Semibold weight text</Typography>
      <Typography weight="bold">Bold weight text</Typography>
    </div>
  ),
};

export const RealWorldExample: Story = {
  render: () => (
    <article className="max-w-2xl space-y-6">
      <header className="space-y-4">
        <Typography variant="overline" color="primary">TUTORIAL</Typography>
        <Heading1>Getting Started with Our Design System</Heading1>
        <Lead color="muted">
          Learn how to use our comprehensive design system to build 
          beautiful and consistent user interfaces.
        </Lead>
      </header>
      
      <Body>
        Our design system provides a complete set of components and utilities 
        to help you build modern web applications. It's built on top of 
        React, TypeScript, and Tailwind CSS.
      </Body>
      
      <div className="space-y-3">
        <Heading2>Installation</Heading2>
        <Body>
          To get started, install the required dependencies:
        </Body>
        <Typography variant="code" as="div" className="p-4 bg-muted rounded-lg">
          npm install @pzr4/design-system
        </Typography>
      </div>
      
      <div className="space-y-3">
        <Heading3>Key Features</Heading3>
        <ul className="space-y-2">
          <li>
            <Typography variant="ui-md">✓ Fully typed with TypeScript</Typography>
          </li>
          <li>
            <Typography variant="ui-md">✓ Dark mode support</Typography>
          </li>
          <li>
            <Typography variant="ui-md">✓ Accessibility compliant</Typography>
          </li>
          <li>
            <Typography variant="ui-md">✓ Responsive by default</Typography>
          </li>
        </ul>
      </div>
      
      <Quote>
        "A design system isn't a project. It's a product serving products." 
        - Nathan Curtis
      </Quote>
      
      <footer>
        <Caption>
          Last updated: January 2024 • 5 min read
        </Caption>
      </footer>
    </article>
  ),
};