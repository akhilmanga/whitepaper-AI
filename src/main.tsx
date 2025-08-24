import { StrictMode, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';

// Error boundary to catch unexpected errors
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // In production, you might want to send this to an error tracking service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize dark mode based on user preference or system setting
const initDarkMode = () => {
  const savedPreference = localStorage.getItem('darkMode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const shouldEnableDarkMode = savedPreference 
    ? savedPreference === 'true'
    : systemPrefersDark;
  
  if (shouldEnableDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Initialize font loading
const loadFonts = async () => {
  try {
    const font = new FontFace(
      'Inter',
      'url(https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap)'
    );
    
    await font.load();
    document.fonts.add(font);
    document.body.classList.add('font-loaded');
  } catch (e) {
    console.error('Failed to load fonts:', e);
    document.body.classList.add('font-failed');
  }
};

// Initialize service worker for PWA features
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Initialize the app
const initializeApp = async () => {
  // Initialize dark mode
  initDarkMode();
  
  // Load fonts
  await loadFonts();
  
  // Register service worker
  registerServiceWorker();
  
  // Render the app
  const container = document.getElementById('root');
  if (!container) throw new Error('Root container missing');
  
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
        <Toaster 
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            className: 'text-sm',
            style: {
              background: 'rgb(255, 255, 255)',
              color: 'rgb(28, 28, 30)',
              border: '1px solid rgb(226, 232, 240)'
            },
            success: {
              iconTheme: {
                primary: 'rgb(34, 197, 94)',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: 'rgb(239, 68, 68)',
                secondary: 'white',
              },
            },
          }}
        />
      </ErrorBoundary>
    </StrictMode>
  );
};

// Start initialization
initializeApp().catch(console.error);

// Handle dark mode preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  const isDark = e.matches;
  const savedPreference = localStorage.getItem('darkMode');
  
  // Only update if user hasn't explicitly set a preference
  if (!savedPreference) {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
});