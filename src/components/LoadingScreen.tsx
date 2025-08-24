import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, Target, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { useCourse } from '../context/CourseContext';

const LoadingScreen: React.FC = () => {
  const { currentCourse } = useCourse();
  const [loadingMessage, setLoadingMessage] = useState('Initializing Whitepaper AI...');
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  // Loading steps with timing
  const loadingSteps = [
    { text: "Initializing Whitepaper AI...", duration: 300 },
    { text: "Setting up document processing pipeline...", duration: 400 },
    { text: "Connecting to Azure AI services...", duration: 500 },
    { text: "Analyzing document structure...", duration: 600 },
    { text: "Generating learning modules...", duration: 700 },
    { text: "Creating interactive flashcards...", duration: 800 },
    { text: "Building knowledge assessment...", duration: 900 },
    { text: "Finalizing course structure...", duration: 1000 }
  ];

  useEffect(() => {
    let mounted = true;
    let stepTimer: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    
    // Start progress animation
    progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return Math.min(95, prev + Math.random() * 3);
      });
    }, 200);
    
    // Process loading steps
    const processSteps = async () => {
      for (let i = 0; i < loadingSteps.length; i++) {
        if (!mounted) break;
        
        setCurrentStep(i);
        setLoadingMessage(loadingSteps[i].text);
        
        // Add small delay between steps
        await new Promise(resolve => 
          setTimeout(resolve, loadingSteps[i].duration)
        );
      }
      
      // Final completion
      if (mounted) {
        setProgress(100);
        setShowConfetti(true);
        
        // Hide confetti after animation
        setTimeout(() => {
          setShowConfetti(false);
          setAnimationKey(prev => prev + 1);
        }, 3000);
      }
    };
    
    processSteps();
    
    return () => {
      mounted = false;
      clearInterval(progressInterval);
      clearTimeout(stepTimer);
    };
  }, []);

  useEffect(() => {
    if (currentCourse && progress === 100) {
      // Simulate final transition
      setTimeout(() => {
        setProgress(100);
      }, 300);
    }
  }, [currentCourse, progress]);

  // Confetti animation
  const renderConfetti = () => {
    if (!showConfetti) return null;
    
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              animation: `fall ${Math.random() * 3 + 2}s linear forwards`
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      {renderConfetti()}
      
      <AnimatePresence mode="wait" key={animationKey}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 2, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </motion.div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Whitepaper AI</h1>
            <p className="text-gray-600">Transforming complex whitepapers into interactive learning experiences</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {loadingMessage}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {progress}%
                </span>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              
              <div className="mt-4 flex justify-between text-xs text-gray-500">
                {loadingSteps.map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 h-2 rounded-full ${index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-center gap-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-gray-700">AI Processing</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-purple-50 rounded-lg">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-gray-700">Learning Modules</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-lg">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span className="text-xs text-gray-700">Interactive Content</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <motion.div
              animate={{ 
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1, 0.95]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-sm text-gray-500 flex items-center"
            >
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Preparing your personalized learning experience
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <style jsx global>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;