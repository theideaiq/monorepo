'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#0F172A', // Brand Dark
          color: '#fff',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: {
          iconTheme: {
            primary: '#E91E63', // Brand Pink
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#FFD600', // Brand Yellow
            secondary: '#0F172A',
          },
        },
      }}
    />
  );
}
