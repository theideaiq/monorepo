import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import '../src/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
  globalTypes: {
    darkMode: {
      defaultValue: false, // Enable light mode by default
      toolbar: {
        title: 'Dark Mode',
        icon: 'moon',
        items: [
          { value: false, title: 'Light', icon: 'sun' },
          { value: true, title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.darkMode;

      useEffect(() => {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, [isDark]);

      return <Story />;
    },
  ],
};

export default preview;
