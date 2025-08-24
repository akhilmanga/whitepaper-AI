import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Zap, 
  Target, 
  TrendingUp, 
  ArrowRight, 
  Upload, 
  Brain, 
  BarChart,
  ChevronDown,
  ChevronRight,
  Users,
  ShieldCheck,
  Sparkles,
  Globe,
  Clock,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingScreen from '../components/LoadingScreen';
import { useCourse } from '../context/CourseContext';

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { courses } = useCourse();
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const features = [
    {
      icon: Upload,
      title: 'Smart Document Processing',
      description: 'Upload PDFs, paste URLs, or input text. Our AI handles the rest with advanced parsing and structure detection.',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Brain,
      title: 'Interactive Learning',
      description: 'Transform dense whitepapers into engaging flashcards, quizzes, and structured learning modules.',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: BarChart,
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed analytics, streak tracking, and personalized insights.',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: Target,
      title: 'Adaptive Difficulty',
      description: 'Our AI adjusts content complexity based on your performance, ensuring optimal learning pace.',
      gradient: 'from-amber-500 to-orange-600'
    }
  ];
  
  const stats = [
    { label: 'Whitepapers Processed', value: '2,500+' },
    { label: 'Learning Hours Saved', value: '15,000+' },
    { label: 'Active Learners', value: '1,200+' },
    { label: 'Knowledge Retention', value: '40%↑' }
  ];
  
  const testimonials = [
    {
      name: 'Alex Chen',
      role: 'Computer Science Graduate',
      content: 'Whitepaper AI cut my research time in half. I can now understand complex blockchain papers in minutes instead of hours.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80'
    },
    {
      name: 'Taylor Rodriguez',
      role: 'VC Analyst',
      content: 'As a non-technical analyst, this tool has been invaluable for quickly assessing the technical viability of blockchain projects.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80'
    },
    {
      name: 'Jordan Patel',
      role: 'CTO at Tech Startup',
      content: 'Staying current with emerging technologies is critical for my role. Whitepaper AI has become my go-to resource for technical deep dives.',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80'
    }
  ];
  
  const useCases = [
    {
      title: 'Academic Research',
      description: 'Quickly understand technical papers for your research projects',
      icon: BookOpen,
      color: 'blue'
    },
    {
      title: 'Technical Due Diligence',
      description: 'Evaluate blockchain and crypto projects with confidence',
      icon: Target,
      color: 'purple'
    },
    {
      title: 'Professional Development',
      description: 'Stay current with emerging technologies in your field',
      icon: TrendingUp,
      color: 'green'
    }
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeatureIndex(prev => (prev + 1) % features.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleGetStarted = () => {
    if (authLoading) return;
    
    if (user) {
      navigate('/dashboard');
    } else {
      setShowLoading(true);
      setTimeout(() => {
        navigate('/signup');
      }, 800);
    }
  };
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Email submitted:', email);
      setEmail('');
      setEmailError('');
      setIsSubmitting(false);
      alert('Thank you for subscribing! We\'ll notify you when we launch.');
    }, 1000);
  };
  
  if (showLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-4"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              <span>Now with Azure AI GPT-4o integration</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Transform Whitepapers into{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Interactive Learning
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8"
            >
              Turn any technical whitepaper into a personalized learning course in minutes. No more struggling with dense content - learn at your own pace with AI-powered flashcards, quizzes, and progress tracking.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
            >
              <button
                onClick={handleGetStarted}
                disabled={authLoading}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 disabled:opacity-70 w-full sm:w-auto"
              >
                <span>Start Learning Today</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowVideoModal(true)}
                className="inline-flex items-center space-x-2 border border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-medium transition-colors w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Watch Demo</span>
              </button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-8 flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex -space-x-2">
                {testimonials.slice(0, 3).map((testimonial, index) => (
                  <img
                    key={index}
                    className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800"
                    src={testimonial.avatar}
                    alt={testimonial.name}
                  />
                ))}
              </div>
              <span>Join {stats[2].value} learners who trust Whitepaper AI</span>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How Whitepaper AI Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our AI-powered platform transforms complex technical documents into personalized learning experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl transform -rotate-2"></div>
                <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Bitcoin Whitepaper</h3>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                          A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution.
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <Clock className="w-3 h-3 mr-1" />
                            15 min
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Intermediate
                          </span>
                        </div>
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">3 modules</div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex space-x-3 mb-4">
                        <button className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                          Overview
                        </button>
                        <button className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 transition-colors">
                          Flashcards
                        </button>
                        <button className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                          Quiz
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-start">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-bold text-blue-600 dark:text-blue-400">1</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Introduction to Bitcoin</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                                Understanding the problem with traditional electronic cash systems
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="h-1.5 bg-gray-200 rounded-full w-full mr-2">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">65%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-start">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-bold text-purple-600 dark:text-purple-400">2</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Blockchain Technology</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                                How the blockchain solves the double-spending problem
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="h-1.5 bg-gray-200 rounded-full w-full mr-2">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">30%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeatureIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`p-8 rounded-2xl bg-gradient-to-br ${features[currentFeatureIndex].gradient} text-white`}>
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center mr-4">
                        <features[currentFeatureIndex].icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold">{features[currentFeatureIndex].title}</h3>
                    </div>
                    
                    <p className="text-lg text-white/90 mb-8">
                      {features[currentFeatureIndex].description}
                    </p>
                    
                    <div className="flex space-x-3">
                      {features.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentFeatureIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentFeatureIndex 
                              ? 'bg-white w-8' 
                              : 'bg-white/50 hover:bg-white/70'
                          }`}
                          aria-label={`Feature ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {useCases.slice(0, 2).map((useCase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-${useCase.color}-100 dark:bg-${useCase.color}-900/30 flex items-center justify-center mb-4`}>
                      <useCase.icon className={`h-5 w-5 text-${useCase.color}-600 dark:text-${useCase.color}-400`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{useCase.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{useCase.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Learners Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Join thousands of students, researchers, and professionals who are learning faster with WhitepaperAI.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start mb-4">
                  <img
                    className="h-10 w-10 rounded-full mr-3"
                    src={testimonial.avatar}
                    alt={testimonial.name}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-600 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform How You Learn Technical Content?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students, researchers, and professionals who are learning faster with WhitepaperAI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-white focus:border-white border-2 border-white/20 bg-white/10 text-white placeholder-white/70"
              disabled={isSubmitting}
            />
            <button
              onClick={handleEmailSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Get Early Access</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          
          {emailError && (
            <p className="text-red-200 text-sm mt-2 text-left w-full max-w-md mx-auto">{emailError}</p>
          )}
          
          <p className="text-blue-100 text-sm mt-4">
            By signing up, you'll get early access to our platform and exclusive learning resources.
          </p>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400 mb-4">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Special Launch Offer</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Get 50% Off Your First Year
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Limited time offer for early adopters. Transform your learning experience today.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105"
          >
            <span>Start Learning Today</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>
      
      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-t-xl"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="Whitepaper AI Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">How Whitepaper AI Works</h2>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;