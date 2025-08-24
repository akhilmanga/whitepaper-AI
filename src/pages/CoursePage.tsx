import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, CourseModule, useProgress } from '../context/CourseContext';
import { useProgress as useGlobalProgress } from '../context/ProgressContext';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Target, 
  BarChart3, 
  Sparkles,
  Share2,
  Download,
  Users,
  Flame,
  Star,
  Brain,
  Trophy,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import FlashCardComponent from '../components/FlashCardComponent';
import QuizComponent from '../components/QuizComponent';
import KnowledgeMap from '../components/KnowledgeMap';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'overview' | 'flashcards' | 'quiz' | 'knowledge-map';

const CoursePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentCourse, 
    updateModuleProgress,
    getKnowledgeGaps,
    getPersonalizedRecommendations
  } = useCourse();
  const { addStudySession } = useGlobalProgress();
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [moduleRetryCount, setModuleRetryCount] = useState<{ [key: string]: number }>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      // In a real app, this would fetch the course if not already loaded
      // For now, we assume it's already in context
    }
  }, [id]);

  useEffect(() => {
    // Track study session when component mounts
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      if (duration > 30000 && currentCourse) { // Only track sessions > 30 seconds
        addStudySession({
          courseId: currentCourse.id,
          duration,
          timestamp: new Date().toISOString(),
          modulesCompleted: currentCourse.modules.filter(m => m.completed).length
        });
      }
    };
  }, [currentCourse]);

  if (!currentCourse) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading course content...</p>
      </div>
    );
  }

  const currentModule = currentCourse.modules[selectedModuleIndex];
  const completedModules = currentCourse.modules.filter(m => m.completed).length;
  const totalModules = currentCourse.modules.length;
  const courseProgress = Math.round((completedModules / totalModules) * 100);
  const knowledgeGaps = getKnowledgeGaps();
  const recommendations = getPersonalizedRecommendations();

  const handleModuleSelect = (index: number) => {
    setSelectedModuleIndex(index);
    setViewMode('overview');
  };

  const handleModuleComplete = (completed: boolean) => {
    updateModuleProgress(currentModule.id, completed);
    
    if (completed && selectedModuleIndex < totalModules - 1) {
      setTimeout(() => {
        setSelectedModuleIndex(prev => prev + 1);
      }, 1000);
    }
  };

  const handleExport = async (format: 'pdf' | 'notion' | 'slides') => {
    try {
      await currentCourse.exportCourse(format);
      setShowExportOptions(false);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    }
  };

  const handleShare = async (type: 'private' | 'public' | 'collaborative') => {
    try {
      const shareLink = await currentCourse.shareCourse({ type });
      navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
      setShowShareOptions(false);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleRetryModule = async () => {
    try {
      await currentCourse.retryModuleProcessing(currentModule.id);
      setProcessingError(null);
      setModuleRetryCount(prev => ({
        ...prev,
        [currentModule.id]: (prev[currentModule.id] || 0) + 1
      }));
    } catch (error) {
      setProcessingError(error.message);
    }
  };

  const renderModuleContent = () => {
    if (currentModule.error && moduleRetryCount[currentModule.id] < 3) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Content Generation Failed</h3>
          <p className="text-yellow-700 mb-4">
            {currentModule.error}
          </p>
          <button
            onClick={handleRetryModule}
            className="inline-flex items-center space-x-2 bg-yellow-100 hover:bg-yellow-200 
                     text-yellow-800 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Content Generation</span>
          </button>
        </div>
      );
    }

    switch (viewMode) {
      case 'overview':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{currentModule.title}</h2>
                  <p className="text-gray-600">{currentModule.summary}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Time Estimate</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentModule.estimatedTime} min</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Learning Objectives</h3>
                </div>
                <ul className="space-y-1">
                  {currentModule.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-1">•</span>
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Difficulty</h3>
                </div>
                <div className="flex items-center">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-1
                                ${i < (currentModule.difficulty === 'beginner' ? 1 : 
                                      currentModule.difficulty === 'intermediate' ? 2 : 3) 
                                  ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {knowledgeGaps.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-500 mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Knowledge Gaps Detected</h3>
                    <p className="text-yellow-700 mb-3">
                      Based on your progress, we've identified some concepts you might want to review:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {knowledgeGaps.slice(0, 3).map((gap, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          {gap.concept} ({gap.mastery}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Module Content</h3>
              </div>
              <div className="p-6 prose max-w-none">
                <p>{currentModule.content.substring(0, 500)}...</p>
                <button
                  onClick={() => setViewMode('flashcards')}
                  className="mt-4 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 
                           text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Start Learning with Flashcards</span>
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'flashcards':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FlashCardComponent
              cards={currentModule.flashCards}
              courseId={currentCourse.id}
              moduleId={currentModule.id}
              onCompletion={() => {
                handleModuleComplete(true);
                setViewMode('quiz');
              }}
            />
          </motion.div>
        );

      case 'quiz':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <QuizComponent
              questions={currentModule.quiz}
              onComplete={(score) => {
                // If score is high enough, mark module as completed
                if (score >= 70) {
                  handleModuleComplete(true);
                }
                setViewMode('overview');
              }}
            />
          </motion.div>
        );

      case 'knowledge-map':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <KnowledgeMap 
              courseId={currentCourse.id} 
              moduleId={currentModule.id}
              onConceptSelect={(concept) => {
                // Could navigate to specific content related to the concept
                console.log('Selected concept:', concept);
              }}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Module Navigation */}
          <div 
            ref={sidebarRef}
            className="lg:w-80 flex-shrink-0 space-y-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
                <span className="text-sm text-gray-500">
                  {completedModules}/{totalModules}
                </span>
              </div>
              
              <div className="space-y-2">
                {currentCourse.modules.map((module, index) => {
                  const isCurrent = index === selectedModuleIndex;
                  const isCompleted = module.completed;
                  const isLocked = index > completedModules;
                  
                  return (
                    <button
                      key={module.id}
                      onClick={() => !isLocked && handleModuleSelect(index)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden
                                ${isCurrent 
                                  ? 'bg-blue-50 border border-blue-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.5)]' 
                                  : isCompleted
                                    ? 'bg-green-50 hover:bg-green-100'
                                    : isLocked
                                      ? 'bg-gray-50 hover:bg-gray-100 cursor-not-allowed opacity-50'
                                      : 'hover:bg-gray-50'}`}
                    >
                      {isCompleted && (
                        <div className="absolute top-3 right-3 text-green-500">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                      ${isCompleted 
                                        ? 'bg-green-100 text-green-600' 
                                        : isCurrent
                                          ? 'bg-blue-100 text-blue-600'
                                          : isLocked
                                            ? 'bg-gray-200 text-gray-400'
                                            : 'bg-purple-100 text-purple-600'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{module.title}</h3>
                          <div className="flex items-center mt-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500 mr-2">
                              {module.estimatedTime} min
                            </span>
                            {module.difficulty && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs
                                            ${module.difficulty === 'beginner' 
                                              ? 'bg-green-100 text-green-800' 
                                              : module.difficulty === 'intermediate'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'}`}>
                                {module.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Course Progress Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
                <span className="text-sm font-semibold text-blue-600">
                  {courseProgress}%
                </span>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${courseProgress}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {completedModules}
                  </div>
                  <div className="text-sm text-gray-600">Modules</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {currentCourse.modules.reduce((sum, m) => sum + m.flashCards.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Flashcards</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 
                         hover:border-blue-500 text-gray-700 px-4 py-2.5 rounded-lg font-medium 
                         transition-colors shadow-sm"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Course</span>
              </button>
              
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 
                         hover:border-blue-500 text-gray-700 px-4 py-2.5 rounded-lg font-medium 
                         transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export Course</span>
              </button>
              
              {recommendations.length > 0 && (
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r 
                           from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium 
                           transition-colors shadow-sm hover:from-blue-600 hover:to-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Recommended Next Steps</span>
                </button>
              )}
            </div>

            {/* Share Options */}
            {showShareOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10"
              >
                <button
                  onClick={() => handleShare('public')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Share Publicly (Read-Only)</span>
                </button>
                <button
                  onClick={() => handleShare('private')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Share Privately (With Progress)</span>
                </button>
                <button
                  onClick={() => handleShare('collaborative')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Collaborative Learning Group</span>
                </button>
              </motion.div>
            )}

            {/* Export Options */}
            {showExportOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10"
              >
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={() => handleExport('notion')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <NotionLogo className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export to Notion</span>
                </button>
                <button
                  onClick={() => handleExport('slides')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Presentation className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export as Slides</span>
                </button>
              </motion.div>
            )}

            {/* Recommendations */}
            {showRecommendations && recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10 max-h-96 overflow-y-auto"
              >
                {recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {rec.originalDocument}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Main Content Area */}
          <div ref={contentRef} className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Course Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <button
                      onClick={() => navigate(-1)}
                      className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span>Back to Dashboard</span>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{currentCourse.title}</h1>
                    <p className="text-gray-600 mt-1">{currentCourse.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-5 w-5 ${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">(4.7/5 • 248 reviews)</span>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="flex border-b border-gray-200 mt-4 -mx-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: BookOpen },
                    { id: 'flashcards', label: 'Flashcards', icon: Sparkles },
                    { id: 'quiz', label: 'Quiz', icon: Target },
                    { id: 'knowledge-map', label: 'Knowledge Map', icon: Brain }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id as ViewMode)}
                      className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors
                                ${viewMode === tab.id 
                                  ? 'border-blue-600 text-blue-600' 
                                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {renderModuleContent()}
                </AnimatePresence>
              </div>
            </div>

            {/* Module Navigation Controls */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={selectedModuleIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 
                         hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Module</span>
              </button>
              
              <button
                onClick={handleNext}
                disabled={selectedModuleIndex >= totalModules - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white rounded-lg font-medium transition-colors"
              >
                <span>Next Module</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for icons not in lucide-react
const Globe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20z" />
    <path d="M2 12h20M12 2v20" />
  </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const NotionLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.8 2.4H4.8C3.7 2.4 2.8 3.3 2.8 4.4V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3.2h3.6c1.1 0 2-.9 2-2v-6.4c0-1.1-.9-2-2-2H10.8V4.4c0-1.1-.9-2-2-2z"/>
  </svg>
);

const Presentation = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export default CoursePage;
```

## 3. Advanced Styling (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom animations for flashcard flipping */
@keyframes flipInY {
  from {
    transform: rotateY(0deg);
    opacity: 1;
  }
  to {
    transform: rotateY(180deg);
    opacity: 1;
  }
}

.animate__flipInY {
  animation-name: flipInY;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Confetti animation */
@keyframes fall {
  to {
    transform: translateY(100vh);
  }
}

/* MathJax styling */
.mjx-chtml {
  @apply inline-block;
}

.mjx-char {
  @apply text-gray-900;
}

/* Code block styling */
code[class*="language-"],
pre[class*="language-"] {
  @apply font-mono text-sm rounded-lg p-4 my-2 overflow-x-auto;
  line-height: 1.5;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  @apply text-gray-500 italic;
}

.token.punctuation {
  @apply text-gray-700;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  @apply text-blue-600;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  @apply text-green-600;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  @apply text-orange-500;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  @apply text-purple-600;
}

.token.function,
.token.class-name {
  @apply text-indigo-600;
}

.token.regex,
.token.important,
.token.variable {
  @apply text-red-600;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}

/* Progress bar animation */
@keyframes progress-bar-stripes {
  0% { background-position: 40px 0; }
  100% { background-position: 0 0; }
}

.progress-striped {
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
  background-size: 40px 40px;
}

/* Spaced repetition indicators */
.mastery-low {
  @apply border-2 border-red-500;
}

.mastery-medium {
  @apply border-2 border-yellow-500;
}

.mastery-high {
  @apply border-2 border-green-500;
}

/* 3D card flip effect */
.perspective-1000 {
  perspective: 1000px;
}

.backface-hidden {
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* Enhanced button effects */
.button-glow {
  transition: all 0.3s ease;
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
}

.button-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Knowledge map styling */
.knowledge-node {
  transition: all 0.3s ease;
  cursor: pointer;
}

.knowledge-node:hover {
  transform: scale(1.1);
  z-index: 10;
}

.knowledge-link {
  stroke: #94a3b8;
  stroke-width: 1.5;
  transition: stroke 0.3s ease;
}

.knowledge-link:hover {
  stroke: #3b82f6;
  stroke-width: 2.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .mobile-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    border-top: 1px solid #e2e8f0;
    background: white;
    padding: 0.75rem;
  }
  
  .mobile-content {
    padding-bottom: 5rem;
  }
  
  .mobile-tab {
    flex: 1;
    text-align: center;
    padding: 0.5rem;
    font-size: 0.875rem;
  }
  
  .mobile-tab.active {
    color: #3b82f6;
    font-weight: 500;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dark .prose {
    color: #e2e8f0;
  }
  
  .dark .prose a {
    color: #60a5fa;
  }
  
  .dark .prose strong {
    color: #f1f5f9;
  }
  
  .dark .prose code {
    background-color: #334155;
    color: #e2e8f0;
  }
  
  .dark .knowledge-link {
    stroke: #475569;
  }
  
  .dark .knowledge-link:hover {
    stroke: #93c5fd;
  }
}



