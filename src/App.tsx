import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CourseProvider } from './context/CourseContext';
import { ProgressProvider } from './context/ProgressContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import CoursePage from './pages/CoursePage';
import ProgressPage from './pages/ProgressPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoadingScreen from './components/LoadingScreen';
import OnboardingPage from './pages/OnboardingPage';

// Private route wrapper component
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Public route wrapper component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user is new and hasn't completed onboarding
    if (user && !loading) {
      const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
      setShowOnboarding(!hasCompletedOnboarding);
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      
      {showOnboarding && user ? (
        <OnboardingPage 
          onComplete={() => {
            localStorage.setItem('onboardingCompleted', 'true');
            setShowOnboarding(false);
          }} 
        />
      ) : (
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } 
          />
          
          {/* Private routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/upload" 
            element={
              <PrivateRoute>
                <UploadPage />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/course/:id" 
            element={
              <PrivateRoute>
                <CoursePage />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/progress" 
            element={
              <PrivateRoute>
                <ProgressPage />
              </PrivateRoute>
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CourseProvider>
          <ProgressProvider>
            <AppRoutes />
          </ProgressProvider>
        </CourseProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;