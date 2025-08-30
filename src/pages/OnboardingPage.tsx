import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Target, 
  Brain, 
  Sparkles,
  CheckCircle,
  Upload,

} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingPageProps {
  onComplete: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    learningStyle: 'visual',
    difficulty: 'intermediate',
    goals: [] as string[],
    interests: [] as string[]
  });
  
  const steps = [
    {
      title: 'Welcome to Whitepaper AI',
      subtitle: 'Transform complex whitepapers into interactive learning experiences',
      content: (
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to the Future of Learning
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            We use AI to break down complex technical documents into digestible, interactive learning modules tailored to your pace and style.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Upload</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">PDF, URL, or text</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Process</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">AI analysis</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <Target className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Learn</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Interactive content</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Choose Your Learning Style',
      subtitle: 'Help us personalize your experience',
      content: (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            How do you prefer to learn?
          </h2>
          <div className="space-y-3">
            {[
              { id: 'visual', label: 'Visual', description: 'Diagrams, charts, and visual aids', icon: '👁️' },
              { id: 'auditory', label: 'Auditory', description: 'Audio explanations and discussions', icon: '🎧' },
              { id: 'reading', label: 'Reading/Writing', description: 'Text-based learning and note-taking', icon: '📝' },
              { id: 'kinesthetic', label: 'Hands-on', description: 'Interactive exercises and practice', icon: '🤲' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setUserPreferences(prev => ({ ...prev, learningStyle: style.id }))}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  userPreferences.learningStyle === style.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{style.icon}</div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{style.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{style.description}</p>
                  </div>
                  {userPreferences.learningStyle === style.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Set Your Learning Goals',
      subtitle: 'What would you like to achieve?',
      content: (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            What are your learning goals?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Academic Research',
              'Professional Development',
              'Investment Analysis',
              'Technical Understanding',
              'Exam Preparation',
              'Stay Current with Tech'
            ].map((goal) => (
              <button
                key={goal}
                onClick={() => {
                  setUserPreferences(prev => ({
                    ...prev,
                    goals: prev.goals.includes(goal)
                      ? prev.goals.filter(g => g !== goal)
                      : [...prev.goals, goal]
                  }));
                }}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  userPreferences.goals.includes(goal)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'You\'re All Set!',
      subtitle: 'Ready to start your learning journey',
      content: (
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            You're Ready to Learn!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            Your personalized learning experience is configured. Start by uploading your first whitepaper or explore our sample courses.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Learning Profile</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Learning Style:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {userPreferences.learningStyle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Goals:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {userPreferences.goals.length} selected
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];
  
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStepData.title}
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{currentStepData.subtitle}</p>
        </div>
        
        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 disabled:text-gray-400 dark:disabled:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <span>{isLastStep ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;