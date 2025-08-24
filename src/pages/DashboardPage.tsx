import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useProgress } from '../context/ProgressContext';
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Plus, 
  Play, 
  CheckCircle, 
  Target, 
  Sparkles,
  BarChart3,
  Trophy,
  Brain,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KnowledgeMap from '../components/KnowledgeMap';
import QuizComponent from '../components/QuizComponent';
import FlashCardComponent from '../components/FlashCardComponent';

const DashboardPage: React.FC = () => {
  const { courses, currentCourse, selectCourse } = useCourse();
  const { stats, getRecommendedNextSteps } = useProgress();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed'>('in-progress');
  const [showKnowledgeMap, setShowKnowledgeMap] = useState(false);
  [showQuickQuiz, setShowQuickQuiz] = useState(false);
  const [showFlashCardReview, setShowFlashCardReview] = useState(false);
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState<string | null>(null);
  const [selectedModuleForQuiz, setSelectedModuleForQuiz] = useState<string | null>(null);
  const [selectedCourseForFlashcards, setSelectedCourseForFlashcards] = useState<string | null>(null);
  const [selectedModuleForFlashcards, setSelectedModuleForFlashcards] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  
  useEffect(() => {
    // Auto-expand the first in-progress course
    if (activeTab === 'in-progress' && courses.length > 0) {
      const inProgressCourse = courses.find(c => c.progress < 100);
      if (inProgressCourse && !expandedCourse) {
        setExpandedCourse(inProgressCourse.id);
      }
    }
  }, [activeTab, courses]);
  
  const handleStartQuiz = (courseId: string, moduleId: string) => {
    setSelectedCourseForQuiz(courseId);
    setSelectedModuleForQuiz(moduleId);
    setShowQuickQuiz(true);
  };
  
  const handleStartFlashcardReview = (courseId: string, moduleId: string) => {
    setSelectedCourseForFlashcards(courseId);
    setSelectedModuleForFlashcards(moduleId);
    setShowFlashCardReview(true);
  };
  
  const handleQuizComplete = (score: number, correctAnswers: number, totalQuestions: number) => {
    setShowQuickQuiz(false);
    setSelectedCourseForQuiz(null);
    setSelectedModuleForQuiz(null);
    
    // Show success message
    alert(`Quiz completed! Score: ${score}% (${correctAnswers}/${totalQuestions})`);
  };
  
  const handleFlashcardComplete = () => {
    setShowFlashCardReview(false);
    setSelectedCourseForFlashcards(null);
    setSelectedModuleForFlashcards(null);
  };
  
  const renderCourseCard = (course: ProcessedCourse) => {
    const isExpanded = expandedCourse === course.id;
    const inProgress = course.progress < 100;
    
    return (
      <motion.div
        key={course.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                  {course.title}
                </h3>
                <div className="flex items-center space-x-2">
                  {inProgress && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Clock className="w-3 h-3 mr-1" />
                      In Progress
                    </span>
                  )}
                  <button
                    onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 line-clamp-2">
                {course.description}
              </p>
              
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  <span>{course.modules.length} modules</span>
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>{course.totalEstimatedTime} min</span>
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Target className="w-4 h-4 mr-1.5" />
                  <span>{course.technicalLevel.charAt(0).toUpperCase() + course.technicalLevel.slice(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1.5">
                {inProgress ? 'Progress' : 'Completed'}
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full ${inProgress ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-green-500'}`}
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className="font-medium text-gray-900 dark:text-white">
                  {course.progress}%
                </span>
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* Upcoming content */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                      Upcoming Content
                    </h4>
                    <div className="space-y-3">
                      {course.modules
                        .filter(m => !m.completed)
                        .slice(0, 2)
                        .map((module, index) => (
                          <div 
                            key={module.id} 
                            className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 dark:text-white truncate">
                                {module.title}
                              </h5>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                                    {module.estimatedTime} min
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    module.difficulty === 'beginner' 
                                      ? 'bg-green-100 text-green-800' 
                                      : module.difficulty === 'intermediate'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}>
                                    {module.difficulty}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleStartFlashcardReview(course.id, module.id)}
                                    className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                    title="Review flashcards"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStartQuiz(course.id, module.id)}
                                    className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                    title="Take quiz"
                                  >
                                    <Target className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Knowledge mastery */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Brain className="w-4 h-4 mr-2 text-purple-500" />
                      Knowledge Mastery
                    </h4>
                    <div className="space-y-3">
                      {course.modules.slice(0, 2).map((module, index) => {
                        // Calculate module mastery
                        const flashcards = module.flashCards;
                        const mastered = flashcards.filter(c => c.masteryLevel >= 70).length;
                        const mastery = flashcards.length > 0 ? Math.round((mastered / flashcards.length) * 100) : 0;
                        
                        return (
                          <div key={module.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300 truncate">
                                {module.title}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {mastery}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-600"
                                style={{ width: `${mastery}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setShowKnowledgeMap(true)}
                      className="mt-4 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>View Full Knowledge Map</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {inProgress ? (
                    <Link
                      to={`/course/${course.id}`}
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-colors w-full sm:w-auto"
                    >
                      <Play className="w-4 h-4" />
                      <span>Continue Learning</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => selectCourse(course.id)}
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors w-full sm:w-auto"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Review Course</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowKnowledgeMap(true)}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors w-full sm:w-auto"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Knowledge Insights</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };
  
  const renderRecommendations = () => {
    const recommendations = getRecommendedNextSteps();
    
    if (recommendations.length === 0) return null;
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 mb-8 border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recommended Next Steps</h2>
          </div>
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showRecommendations ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <AnimatePresence>
          {showRecommendations && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`rounded-xl p-4 ${
                      rec.type === 'review' 
                        ? 'bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700/50 shadow-sm' 
                        : rec.type === 'new-content'
                          ? 'bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-500/30 shadow-sm'
                          : 'bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700/50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        rec.type === 'review' 
                          ? 'bg-yellow-100 text-yellow-600' 
                          : rec.type === 'new-content'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                      }`}>
                        {rec.type === 'review' && <AlertTriangle className="w-5 h-5" />}
                        {rec.type === 'new-content' && <BookOpen className="w-5 h-5" />}
                        {rec.type === 'practice' && <Target className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">{rec.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{rec.description}</p>
                        <button
                          onClick={rec.action}
                          className={`inline-flex items-center space-x-1.5 text-sm font-medium ${
                            rec.type === 'review' 
                              ? 'text-yellow-600 hover:text-yellow-700' 
                              : rec.type === 'new-content'
                                ? 'text-blue-600 hover:text-blue-700'
                                : 'text-purple-600 hover:text-purple-700'
                          }`}
                        >
                          <span>Get started</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  const renderAchievements = () => {
    const unlockedAchievements = stats.achievements.filter(a => a.unlockedAt);
    
    if (unlockedAchievements.length === 0) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Achievements</h2>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {unlockedAchievements.length} of {stats.achievements.length} unlocked
            </span>
          </div>
        </div>
        
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {unlockedAchievements.slice(0, 4).map((achievement, index) => (
              <div 
                key={index}
                className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all hover:scale-105"
                title={achievement.description}
              >
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <h3 className="font-medium text-center text-gray-900 dark:text-white text-sm truncate w-full">
                  {achievement.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(achievement.unlockedAt!).toLocaleDateString()}
                </p>
              </div>
            ))}
            
            {unlockedAchievements.length > 4 && (
              <div className="flex items-center justify-center">
                <Link
                  to="/progress"
                  className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">More</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderProgressSummary = () => {
    const weeklyProgress = stats.studySessions
      .filter(session => {
        const sessionDate = new Date(session.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      })
      .reduce((sum, session) => sum + session.duration, 0) / 3600000; // Convert to hours
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todaySessions = stats.studySessions.filter(session => 
      new Date(session.timestamp).toDateString() === today.toDateString()
    );
    
    const yesterdaySessions = stats.studySessions.filter(session => 
      new Date(session.timestamp).toDateString() === yesterday.toDateString()
    );
    
    const todayHours = todaySessions.reduce((sum, session) => sum + session.duration, 0) / 3600000;
    const yesterdayHours = yesterdaySessions.reduce((sum, session) => sum + session.duration, 0) / 3600000;
    
    const hoursChange = yesterdayHours > 0 
      ? Math.round(((todayHours - yesterdayHours) / yesterdayHours) * 100)
      : todayHours > 0 ? 100 : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-500 dark:text-gray-400">Today's Learning</h3>
            <div className={`flex items-center space-x-1 ${
              hoursChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {hoursChange >= 0 ? '↑' : '↓'}
              <span>{Math.abs(hoursChange)}%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {todayHours.toFixed(1)}h
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-500 dark:text-gray-400">This Week</h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {weeklyProgress.toFixed(1)}h
          </p>
          <div className="flex items-center">
            <div className="h-1.5 bg-gray-200 rounded-full w-full mr-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                style={{ width: `${Math.min(100, (weeklyProgress / 10) * 100)}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.min(100, Math.round((weeklyProgress / 10) * 100))}%
            </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-500 dark:text-gray-400">Learning Streak</h3>
            <div className="flex items-center space-x-1">
              <span className="text-yellow-500">🔥</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats.streak.current}
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.streak.current} day{stats.streak.current !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Longest streak: {stats.streak.longest} days
          </p>
        </div>
      </div>
    );
  };
  
  const inProgressCourses = courses.filter(c => c.progress < 100);
  const completedCourses = courses.filter(c => c.progress >= 100);
  
  if (courses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to Whitepaper AI</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
          Get started by uploading your first technical whitepaper. We'll transform it into an interactive learning course in minutes.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span>Upload Your First Whitepaper</span>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Continue your learning journey with personalized recommendations
          </p>
        </div>
        
        <Link
          to="/upload"
          className="mt-4 sm:mt-0 inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Course</span>
        </Link>
      </div>
      
      {/* Progress Summary */}
      {renderProgressSummary()}
      
      {/* Recommendations */}
      {renderRecommendations()}
      
      {/* Course Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['in-progress', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'in-progress' | 'completed')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'in-progress' ? 'In Progress' : 'Completed'}
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                }`}>
                  {tab === 'in-progress' ? inProgressCourses.length : completedCourses.length}
                </span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search courses..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full sm:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Courses Grid */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'in-progress' && inProgressCourses.length > 0 ? (
          inProgressCourses.map(renderCourseCard)
        ) : activeTab === 'completed' && completedCourses.length > 0 ? (
          completedCourses.map(renderCourseCard)
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {activeTab === 'in-progress' ? 'No In Progress Courses' : 'No Completed Courses'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {activeTab === 'in-progress' 
                ? 'Start learning by uploading a whitepaper' 
                : 'Keep going! Complete more courses to see them here'}
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Upload New Whitepaper</span>
            </Link>
          </div>
        )}
      </div>
      
      {/* Knowledge Map Modal */}
      <AnimatePresence>
        {showKnowledgeMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowKnowledgeMap(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Map</h2>
                <button
                  onClick={() => setShowKnowledgeMap(false)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <KnowledgeMap 
                  courseId={currentCourse?.id || ''} 
                  onConceptSelect={(concept) => console.log('Selected concept:', concept)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Quick Quiz Modal */}
      <AnimatePresence>
        {showQuickQuiz && selectedCourseForQuiz && selectedModuleForQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowQuickQuiz(false);
              setSelectedCourseForQuiz(null);
              setSelectedModuleForQuiz(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Quiz</h2>
                <button
                  onClick={() => {
                    setShowQuickQuiz(false);
                    setSelectedCourseForQuiz(null);
                    setSelectedModuleForQuiz(null);
                  }}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {currentCourse && (
                  <QuizComponent
                    questions={currentCourse.modules.find(m => m.id === selectedModuleForQuiz)?.quiz || []}
                    courseId={selectedCourseForQuiz}
                    moduleId={selectedModuleForQuiz}
                    onComplete={handleQuizComplete}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Flash Card Review Modal */}
      <AnimatePresence>
        {showFlashCardReview && selectedCourseForFlashcards && selectedModuleForFlashcards && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowFlashCardReview(false);
              setSelectedCourseForFlashcards(null);
              setSelectedModuleForFlashcards(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Flashcard Review</h2>
                <button
                  onClick={() => {
                    setShowFlashCardReview(false);
                    setSelectedCourseForFlashcards(null);
                    setSelectedModuleForFlashcards(null);
                  }}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {currentCourse && (
                  <FlashCardComponent
                    cards={currentCourse.modules.find(m => m.id === selectedModuleForFlashcards)?.flashCards || []}
                    courseId={selectedCourseForFlashcards}
                    moduleId={selectedModuleForFlashcards}
                    onCompletion={handleFlashcardComplete}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;