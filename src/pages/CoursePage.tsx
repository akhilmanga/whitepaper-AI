import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { BookOpen, Clock, Target, ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Download, Share2 } from 'lucide-react';
import FlashCardComponent from '../components/FlashCardComponent';
import QuizComponent from '../components/QuizComponent';

type ViewMode = 'overview' | 'content' | 'flashcards' | 'quiz';

const CoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, currentCourse, selectCourse, updateModuleProgress } = useCourse();
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  
  useEffect(() => {
    if (id) {
      selectCourse(id);
    }
  }, [id, selectCourse]);

  if (!currentCourse) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  const currentModule = currentCourse.modules[selectedModuleIndex];
  const completedModules = currentCourse.modules.filter(m => m.completed).length;

  const handleModuleComplete = () => {
    updateModuleProgress(currentCourse.id, currentModule.id, true);
    if (selectedModuleIndex < currentCourse.modules.length - 1) {
      setSelectedModuleIndex(prev => prev + 1);
      setViewMode('overview');
    }
  };

  const exportToPDF = () => {
    // Mock export functionality
    alert('PDF export would be implemented here');
  };

  const shareContent = () => {
    // Mock sharing functionality
    alert('Sharing functionality would be implemented here');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToPDF}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={shareContent}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentCourse.title}</h1>
          <p className="text-gray-600 mb-4">{currentCourse.description}</p>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{currentCourse.totalEstimatedTime} minutes</span>
            </span>
            <span>{completedModules}/{currentCourse.modules.length} modules completed</span>
            <span>{currentCourse.progress}% complete</span>
          </div>

          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${currentCourse.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Module Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Course Modules</h3>
            <div className="space-y-2">
              {currentCourse.modules.map((module, index) => (
                <button
                  key={module.id}
                  onClick={() => {
                    setSelectedModuleIndex(index);
                    setViewMode('overview');
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedModuleIndex === index
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {module.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{module.title}</p>
                      <p className="text-sm text-gray-500">{module.estimatedTime}min</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Content Navigation */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentModule.title}</h2>
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'overview'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode('content')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'content'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setViewMode('flashcards')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'flashcards'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Flashcards ({currentModule.flashCards.length})
                </button>
                <button
                  onClick={() => setViewMode('quiz')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'quiz'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Quiz ({currentModule.quiz.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Overview Mode */}
              {viewMode === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700">{currentModule.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Learning Objectives</h3>
                    <ul className="space-y-2">
                      {currentModule.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{currentModule.estimatedTime} minutes</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      <span>{currentModule.flashCards.length} flashcards</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Target className="h-4 w-4" />
                      <span>{currentModule.quiz.length} quiz questions</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {!currentModule.completed ? (
                      <button
                        onClick={handleModuleComplete}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        <span>Mark as Complete</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Module Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Mode */}
              {viewMode === 'content' && (
                <div className="prose max-w-none">
                  <div className="text-gray-800 leading-relaxed">
                    {currentModule.content}
                  </div>
                </div>
              )}

              {/* Flashcards Mode */}
              {viewMode === 'flashcards' && (
                <FlashCardComponent
                  cards={currentModule.flashCards}
                  courseId={currentCourse.id}
                  moduleId={currentModule.id}
                />
              )}

              {/* Quiz Mode */}
              {viewMode === 'quiz' && (
                <QuizComponent
                  questions={currentModule.quiz}
                  onComplete={(score) => {
                    alert(`Quiz completed! Score: ${score}%`);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePage;