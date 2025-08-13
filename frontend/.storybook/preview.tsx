import type { Preview } from '@storybook/react';
import '../src/app/globals.css';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/lib/i18n';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <div className="min-h-screen bg-background">
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
};

export default preview;