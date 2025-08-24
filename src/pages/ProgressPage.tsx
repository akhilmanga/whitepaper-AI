import React, { useState, useEffect, useRef } from 'react';
import { useProgress } from '../context/ProgressContext';
import { useCourse } from '../context/CourseContext';
import { 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Award, 
  Star,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Share2,
  Users,
  Filter,
  Search,
  Sparkles,
  BookOpen,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ProgressPage: React.FC = () => {
  const { stats, exportProgress } = useProgress();
  const { courses } = useCourse();
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'insights'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showCourseBreakdown, setShowCourseBreakdown] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Calculate overall mastery
  const totalFlashcards = courses.flatMap(c => c.modules.flatMap(m => m.flashCards));
  const masteredFlashcards = totalFlashcards.filter(c => c.masteryLevel >= 70).length;
  const overallMastery = totalFlashcards.length > 0 
    ? Math.round((masteredFlashcards / totalFlashcards.length) * 100) 
    : 0;
  
  // Get recent sessions
  const recentSessions = stats.studySessions.slice(0, 7).reverse();
  
  // Get achievements by category
  const achievementsByCategory = {
    learning: stats.achievements.filter(a => a.category === 'learning'),
    consistency: stats.achievements.filter(a => a.category === 'consistency'),
    mastery: stats.achievements.filter(a => a.category === 'mastery'),
    community: stats.achievements.filter(a => a.category === 'community')
  };
  
  // Get knowledge gaps
  const knowledgeGaps = Object.entries(stats.knowledgeMastery.byConcept)
    .filter(([_, mastery]) => mastery < 60)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format time spent
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 
      ? `${hours}h ${mins}m` 
      : `${mins}m`;
  };
  
  // Generate PDF report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Learning Progress Report', 14, 22);
    
    // Date
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    
    // Overall stats
    doc.setFontSize(16);
    doc.setTextColor(60);
    doc.text('Overall Progress', 14, 45);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Total Time Spent: ${formatTime(stats.timeSpent.total / 60000)}`, 14, 55);
    doc.text(`Learning Streak: ${stats.streak.current} days (Longest: ${stats.streak.longest})`, 14, 62);
    doc.text(`Knowledge Mastery: ${overallMastery}%`, 14, 69);
    
    // Recent sessions
    doc.setFontSize(16);
    doc.setTextColor(60);
    doc.text('Recent Learning Sessions', 14, 82);
    
    const sessionData = recentSessions.map(session => [
      formatDate(session.timestamp),
      formatTime(session.duration / 60000),
      session.modulesCompleted,
      session.flashcardsReviewed || 0,
      session.quizScore ? `${session.quizScore}%` : 'N/A'
    ]);
    
    (doc as any).autoTable({
      head: [['Date', 'Duration', 'Modules', 'Flashcards', 'Quiz']],
      body: sessionData,
      startY: 88,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { top: 10, right: 14, bottom: 10, left: 14 }
    });
    
    // Save the PDF
    doc.save(`whitepaper-ai-progress-${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Learning Progress</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTimeRange(timeRange === 'week' ? 'month' : 'week')}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
                      </button>
                      <button
                        onClick={() => setShowExportOptions(!showExportOptions)}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="h-64 relative">
                    <div ref={chartRef} className="w-full h-full">
                      {/* In a real app, this would render a chart using a library like Chart.js */}
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <BarChart3 className="h-12 w-12 mr-2" />
                        <span>Learning progress chart</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {stats.timeSpent.today > 0 ? Math.round(stats.timeSpent.today / 60000) : 0}m
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {Math.round(stats.timeSpent.week / 3600000)}h
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {stats.streak.current}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Streak</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                        {overallMastery}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Mastery</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                  <button
                    onClick={() => setShowCourseBreakdown(!showCourseBreakdown)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                  >
                    {showCourseBreakdown ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        <span>Hide course breakdown</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        <span>Show course breakdown</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {recentSessions.map((session, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Completed {session.modulesCompleted} module{session.modulesCompleted !== 1 ? 's' : ''} in {courses.find(c => c.id === session.courseId)?.title}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(session.timestamp)} · {formatTime(session.duration / 60000)}
                            {session.quizScore && ` · Quiz: ${session.quizScore}%`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <AnimatePresence>
                    {showCourseBreakdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                      >
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Course Breakdown</h3>
                        <div className="space-y-4">
                          {courses.map(course => {
                            const courseSessions = stats.studySessions.filter(s => s.courseId === course.id);
                            const totalDuration = courseSessions.reduce((sum, session) => sum + session.duration, 0);
                            
                            return (
                              <div key={course.id} className="flex items-center">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                                  <span className="text-white font-bold">
                                    {course.title.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {course.title}
                                  </div>
                                  <div className="mt-1 flex items-center">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                        style={{ width: `${course.progress}%` }}
                                      ></div>
                                    </div>
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                      {course.progress}%
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {formatTime(totalDuration / 60000)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            {/* Knowledge Insights */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Knowledge Mastery</h2>
                </div>
                
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
                      {overallMastery}%
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">Overall Mastery</div>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(stats.knowledgeMastery.byConcept).map(([concept, mastery], index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-300 capitalize">{concept}</span>
                          <span className="font-medium">{mastery}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${mastery}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {knowledgeGaps.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                        Knowledge Gaps
                      </h3>
                      <div className="space-y-2">
                        {knowledgeGaps.map(([concept, mastery], index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-200 capitalize">
                                {concept}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                              {mastery}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Study Calendar</h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                      <div key={index} className="text-center text-xs text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, index) => {
                      const intensity = Math.min(4, Math.floor(Math.random() * 5));
                      return (
                        <div
                          key={index}
                          className={`h-4 rounded ${intensity === 0 
                            ? 'bg-gray-200 dark:bg-gray-700' 
                            : `bg-blue-${100 + intensity * 100} dark:bg-blue-${900 - intensity * 100}`}`}
                          title={`Study time: ${Math.floor(Math.random() * 60)} minutes`}
                        ></div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Less</span>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="w-3 h-3 rounded bg-blue-300 dark:bg-blue-700"></div>
                      <div className="w-3 h-3 rounded bg-blue-500 dark:bg-blue-500"></div>
                      <div className="w-3 h-3 rounded bg-blue-700 dark:bg-blue-300"></div>
                      <div className="w-3 h-3 rounded bg-blue-900 dark:bg-blue-100"></div>
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'achievements':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Achievement Categories */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Achievement Categories</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-2">
                    {Object.entries(achievementsByCategory).map(([category, achievements]) => {
                      const unlocked = achievements.filter(a => a.unlockedAt).length;
                      const total = achievements.length;
                      const progress = total > 0 ? Math.round((unlocked / total) * 100) : 0;
                      
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            if (selectedCourse === category) {
                              setSelectedCourse(null);
                            } else {
                              setSelectedCourse(category);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedCourse === category
                              ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">
                              {category}
                            </span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {unlocked}/{total}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Streak Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {stats.streak.current} day streak
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Longest streak: {stats.streak.longest} days
                    </p>
                    
                    <div className="flex justify-center space-x-1">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < stats.streak.current 
                              ? 'bg-yellow-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Achievements Grid */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedCourse 
                      ? `${selectedCourse.charAt(0).toUpperCase() + selectedCourse.slice(1)} Achievements` 
                      : 'All Achievements'}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.achievements.filter(a => a.unlockedAt).length} of {stats.achievements.length} unlocked
                    </span>
                    <button
                      onClick={() => setShowShareOptions(!showShareOptions)}
                      className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCourse
                      ? achievementsByCategory[selectedCourse as keyof typeof achievementsByCategory].map(renderAchievementCard)
                      : stats.achievements.map(renderAchievementCard)}
                  </div>
                  
                  {stats.achievements.filter(a => a.unlockedAt).length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Trophy className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Achievements Yet
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Start learning to unlock your first achievements! Complete courses, maintain your study streak, and master key concepts.
                      </p>
                      <Link
                        to="/dashboard"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        <span>Go to Dashboard</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'insights':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Learning Insights */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Learning Insights</h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-8">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Your Learning Pattern</h3>
                    <div className="h-64 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <TrendingUp className="h-12 w-12 mr-2" />
                        <span>Learning pattern chart</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Best Learning Time</h4>
                          <p className="text-gray-600 dark:text-gray-300">You're most productive between 9 AM - 11 AM</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Learning Style</h4>
                          <p className="text-gray-600 dark:text-gray-300">You prefer visual learning with flashcards</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Knowledge Growth</h2>
                </div>
                
                <div className="p-6">
                  <div className="h-64 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <BarChart3 className="h-12 w-12 mr-2" />
                      <span>Knowledge growth chart</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">+42%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Retention</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">2.3x</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Speed</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">86%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Mastery</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">15h</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Saved</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personalized Recommendations</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3 flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Review Flashcards</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            You have 8 flashcards due for review today
                          </p>
                          <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                            Review now
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-3 flex-shrink-0">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Knowledge Gap</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Your understanding of cryptographic algorithms is at 52%
                          </p>
                          <button className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium">
                            Strengthen knowledge
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3 flex-shrink-0">
                          <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Next Achievement</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Complete 3 more modules to unlock "Consistency Champion"
                          </p>
                          <button className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium">
                            Continue learning
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export & Share</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <button
                      onClick={() => exportProgress('pdf')}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export as PDF</span>
                    </button>
                    
                    <button
                      onClick={() => exportProgress('csv')}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export as CSV</span>
                    </button>
                    
                    <button
                      onClick={() => setShowShareOptions(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share Progress</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };
  
  const renderAchievementCard = (achievement: Achievement, index: number) => {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`rounded-xl p-4 ${
          achievement.unlockedAt
            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700/50'
            : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            achievement.unlockedAt
              ? 'bg-yellow-100 text-yellow-600' 
              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
          }`}>
            <Award className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-medium ${
                achievement.unlockedAt
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {achievement.title}
              </h3>
              {achievement.unlockedAt && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {achievement.description}
            </p>
            {achievement.unlockedAt && (
              <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(achievement.unlockedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Progress</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track your learning journey and celebrate your achievements
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search progress..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full sm:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
          
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <Filter className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['overview', 'achievements', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'overview' | 'achievements' | 'insights')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Content */}
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
      
      {/* Export Options */}
      <AnimatePresence>
        {showExportOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute mt-2 right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10"
          >
            <button
              onClick={() => exportProgress('pdf')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              <span>Export as PDF</span>
            </button>
            <button
              onClick={() => exportProgress('csv')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={generatePDFReport}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              <span>Generate Report</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Share Options */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute mt-2 right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10"
          >
            <button
              onClick={() => {
                // In a real app, this would generate a shareable link
                alert('Share link copied to clipboard!');
                setShowShareOptions(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <Share2 className="h-4 w-4 mr-2 text-gray-500" />
              <span>Copy Share Link</span>
            </button>
            <button
              onClick={() => {
                // In a real app, this would share directly to social media
                alert('Shared to Twitter!');
                setShowShareOptions(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <Twitter className="h-4 w-4 mr-2 text-gray-500" />
              <span>Share to Twitter</span>
            </button>
            <button
              onClick={() => {
                // In a real app, this would share directly to social media
                alert('Shared to LinkedIn!');
                setShowShareOptions(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
            >
              <Linkedin className="h-4 w-4 mr-2 text-gray-500" />
              <span>Share to LinkedIn</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper components for icons not in lucide-react
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
  </svg>
);

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.062-2.062 2.062 2.062 0 0 1 2.062-2.062 2.062 2.062 0 0 1 2.062 2.062 2.062 2.062 0 0 1-2.062 2.062zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export default ProgressPage;