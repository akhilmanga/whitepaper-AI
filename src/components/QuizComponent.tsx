import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourse, QuizQuestion, CourseModule } from '../context/CourseContext';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Trophy,
  Brain,
  Target,
  BarChart3,
  Clock,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MathJax from 'react-mathjax';

interface QuizComponentProps {
  questions: QuizQuestion[];
  courseId: string;
  moduleId: string;
  onComplete: (score: number, correctAnswers: number, totalQuestions: number) => void;
  mode?: 'practice' | 'assessment' | 'review'; // Different quiz modes
  difficultyFilter?: 'easy' | 'medium' | 'hard' | 'all';
  timeLimit?: number; // Time limit in seconds
  onTimeUp?: () => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  questions,
  courseId,
  moduleId,
  onComplete,
  mode = 'practice',
  difficultyFilter = 'all',
  timeLimit,
  onTimeUp
}) => {
  const { updateQuizAnswer } = useCourse();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit || null);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    masteryChange: number;
    knowledgeGaps: string[]
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animation, setAnimation] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  
  // Filter questions based on difficulty
  const filteredQuestions = questions.filter(question => {
    if (difficultyFilter === 'all') return true;
    return question.difficulty === difficultyFilter;
  });
  
  const currentQuestion = filteredQuestions[currentIndex];
  
  useEffect(() => {
    if (timeLeft === 0 && onTimeUp) {
      handleTimeUp();
    }
    
    if (timeLeft && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  const handleTimeUp = () => {
    if (onTimeUp) {
      onTimeUp();
    }
    
    // Auto-submit current question
    if (selectedAnswer === null && currentQuestion) {
      handleAnswerSubmit(null);
    }
    
    // Move to next question or complete quiz
    if (currentIndex < filteredQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowExplanation(false);
      }, 2000);
    } else {
      setTimeout(handleQuizComplete, 2000);
    }
  };
  
  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };
  
  const handleAnswerSubmit = (submittedAnswer: string | null = selectedAnswer) => {
    if (!currentQuestion || isAnswered) return;
    
    const isCorrect = submittedAnswer === currentQuestion.correctAnswer;
    const explanation = currentQuestion.explanation;
    
    // Update context
    updateQuizAnswer(
      courseId,
      moduleId,
      currentQuestion.id,
      submittedAnswer || '',
      isCorrect
    );
    
    // Update local state
    const newAnswers = [...answers];
    newAnswers[currentIndex] = submittedAnswer;
    setAnswers(newAnswers);
    
    setIsAnswered(true);
    setShowExplanation(true);
    
    // Set animation for feedback
    setAnimation(isCorrect ? 'animate__animated animate__bounceIn' : 'animate__animated animate__shakeX');
    
    // Auto-advance in assessment mode
    if (mode === 'assessment') {
      setTimeout(() => {
        if (currentIndex < filteredQuestions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setShowExplanation(false);
          setAnimation('');
        } else {
          handleQuizComplete();
        }
      }, 3000);
    }
  };
  
  const handleQuizComplete = () => {
    const totalQuestions = filteredQuestions.length;
    const correctAnswers = filteredQuestions.filter((q, i) => 
      answers[i] === q.correctAnswer
    ).length;
    
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    // Calculate mastery change based on performance
    let masteryChange = 0;
    if (score >= 90) {
      masteryChange = 20;
    } else if (score >= 75) {
      masteryChange = 10;
    } else if (score >= 60) {
      masteryChange = 5;
    } else {
      masteryChange = -5;
    }
    
    // Identify knowledge gaps
    const knowledgeGaps = filteredQuestions
      .filter((q, i) => answers[i] !== q.correctAnswer)
      .map(q => q.question.substring(0, 50) + '...');
    
    setQuizResult({
      score,
      correctAnswers,
      totalQuestions,
      masteryChange,
      knowledgeGaps
    });
    
    // Show confetti for high scores
    if (score >= 85) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };
  
  const handleNextQuestion = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(answers[currentIndex + 1] || null);
      setIsAnswered(answers[currentIndex + 1] !== null);
      setShowExplanation(false);
      setAnimation('');
      
      // Reset timer if applicable
      if (timeLimit) {
        setTimeLeft(timeLimit);
      }
    } else {
      handleQuizComplete();
    }
  };
  
  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(answers[currentIndex - 1] || null);
      setIsAnswered(answers[currentIndex - 1] !== null);
      setShowExplanation(false);
      setAnimation('');
      
      // Reset timer if applicable
      if (timeLimit) {
        setTimeLeft(timeLimit);
      }
    }
  };
  
  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowExplanation(false);
    setAnswers(Array(questions.length).fill(null));
    setQuizResult(null);
    setAnimation('');
    
    // Reset timer if applicable
    if (timeLimit) {
      setTimeLeft(timeLimit);
    }
  };
  
  const renderQuestionContent = (content: string) => {
    // Process content for LaTeX and code formatting
    const processContent = (text: string) => {
      // Handle LaTeX
      let processed = text.replace(/\$([^\$]+)\$/g, (match, p1) => `\\(${p1}\\)`);
      
      // Handle code blocks
      processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<code class="language-${lang || 'text'}">${code.trim()}</code>`;
      });
      
      return processed;
    };

    return (
      <MathJax.Provider>
        <MathJax.Node formula={processContent(content)} />
      </MathJax.Provider>
    );
  };
  
  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    return (
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        ref={questionRef}
        className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${animation}`}
      >
        {/* Question Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Question {currentIndex + 1} of {filteredQuestions.length}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {renderQuestionContent(currentQuestion.question)}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {timeLeft !== null && (
                <div className="flex items-center space-x-1 bg-white px-3 py-1 rounded-lg border border-gray-200">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700 font-medium">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              
              <div className={`px-3 py-1 rounded-lg ${
                currentQuestion.difficulty === 'easy' 
                  ? 'bg-green-100 text-green-800' 
                  : currentQuestion.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Target className="w-3 h-3 mr-1" />
              {currentQuestion.bloomLevel.charAt(0).toUpperCase() + currentQuestion.bloomLevel.slice(1)}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {currentQuestion.whitepaperReference}
            </span>
          </div>
        </div>
        
        {/* Question Content */}
        <div className="p-6">
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                const isIncorrect = isAnswered && isSelected && !isCorrect;
                
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                             ${!isAnswered 
                               ? 'hover:border-blue-500 hover:bg-blue-50' 
                               : isSelected
                                 ? isCorrect
                                   ? 'border-green-500 bg-green-50'
                                   : 'border-red-500 bg-red-50'
                                 : 'opacity-50'}`}
                  >
                    <div className="flex items-start">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 mt-1 flex-shrink-0
                                    ${!isAnswered 
                                      ? 'border-gray-400' 
                                      : isSelected
                                        ? isCorrect
                                          ? 'border-green-500 bg-green-500' 
                                          : 'border-red-500 bg-red-500'
                                        : 'border-gray-300'}`}>
                        {isAnswered && isSelected && (
                          isCorrect ? (
                            <CheckCircle className="h-3 w-3 text-white" />
                          ) : (
                            <XCircle className="h-3 w-3 text-white" />
                          )
                        )}
                      </div>
                      <div className="flex-1">
                        {renderQuestionContent(option)}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
          
          {currentQuestion.type === 'fill_blank' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                {renderQuestionContent(currentQuestion.question.replace(/_____/g, '_____'))}
              </div>
              
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {currentQuestion.type === 'short_answer' && (
            <div className="space-y-4">
              <textarea
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {/* Explanation */}
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-4 border-t border-gray-200"
            >
              <div className="flex items-start space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  isAnswered && answers[currentIndex] === currentQuestion.correctAnswer
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {isAnswered && answers[currentIndex] === currentQuestion.correctAnswer 
                    ? <CheckCircle className="h-5 w-5" /> 
                    : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {isAnswered && answers[currentIndex] === currentQuestion.correctAnswer 
                      ? 'Correct!' 
                      : 'Incorrect'}
                  </h4>
                  <p className="text-gray-600">
                    {isAnswered && answers[currentIndex] === currentQuestion.correctAnswer 
                      ? 'Great job! You\'ve mastered this concept.' 
                      : 'Let\'s review why the correct answer is the best choice.'}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                  Explanation
                </h5>
                <p className="text-gray-700 leading-relaxed">
                  {renderQuestionContent(currentQuestion.explanation)}
                </p>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Navigation Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 
                     hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          
          <div className="flex-1 mx-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600" 
                style={{ width: `${((currentIndex + 1) / filteredQuestions.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <button
            onClick={isAnswered ? handleNextQuestion : () => handleAnswerSubmit()}
            disabled={isAnswered && currentIndex >= filteredQuestions.length - 1}
            className={`flex items-center space-x-2 px-4 py-2 ${
              isAnswered 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            } text-white rounded-lg font-medium transition-colors`}
          >
            <span>
              {isAnswered 
                ? (currentIndex < filteredQuestions.length - 1 ? 'Next' : 'Complete Quiz')
                : 'Submit Answer'}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  };
  
  const renderResults = () => {
    if (!quizResult) return null;
    
    const masteryChangeColor = quizResult.masteryChange > 0 
      ? 'text-green-600' 
      : quizResult.masteryChange < 0 
        ? 'text-red-600' 
        : 'text-gray-600';
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Confetti for high scores */}
        {showConfetti && (
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
        )}
        
        <div className="p-8 text-center">
          <div className="relative inline-block mb-6">
            {quizResult.score >= 90 ? (
              <Trophy className="h-16 w-16 text-yellow-500" />
            ) : quizResult.score >= 75 ? (
              <Trophy className="h-16 w-16 text-gray-300" />
            ) : quizResult.score >= 60 ? (
              <Trophy className="h-16 w-16 text-amber-600" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-500" />
            )}
            {quizResult.score >= 85 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                ★
              </div>
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Quiz Complete!
          </h2>
          
          <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">
            {quizResult.score}%
          </div>
          
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-medium text-gray-900">
                {quizResult.correctAnswers} of {quizResult.totalQuestions} correct
              </span>
            </div>
            
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                style={{ width: `${quizResult.score}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          {quizResult.knowledgeGaps.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-left">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
                <div>
                  <h3 className="font-medium text-yellow-800 mb-2">Knowledge Gaps</h3>
                  <p className="text-yellow-700 mb-3">
                    Based on your answers, here are concepts to review:
                  </p>
                  <div className="space-y-2">
                    {quizResult.knowledgeGaps.slice(0, 3).map((gap, index) => (
                      <div 
                        key={index}
                        className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-yellow-100"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className="text-sm text-gray-700">{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">{quizResult.score}%</div>
              <div className="text-sm text-gray-600">Your Score</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className={`text-2xl font-bold mb-1 ${masteryChangeColor}`}>
                {quizResult.masteryChange > 0 ? '+' : ''}{quizResult.masteryChange}%
              </div>
              <div className="text-sm text-gray-600">Knowledge Mastery</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handleRestartQuiz}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 
                       text-gray-700 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Review Quiz</span>
            </button>
            <button
              onClick={() => onComplete(quizResult.score, quizResult.correctAnswers, quizResult.totalQuestions)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r 
                       from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                       text-white rounded-lg font-medium transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Continue Learning</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  };
  
  if (filteredQuestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h3>
        <p className="text-gray-600 mb-6">
          There are no questions matching your current filter settings.
        </p>
        <button
          onClick={handleRestartQuiz}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset Filters</span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-[500px]">
      <AnimatePresence mode="wait">
        {quizResult ? renderResults() : renderQuestion()}
      </AnimatePresence>
      
      <style jsx global>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate__bounceIn {
          animation-name: bounceIn;
          animation-duration: 0.5s;
        }
        
        .animate__shakeX {
          animation-name: shakeX;
          animation-duration: 0.5s;
        }
        
        @keyframes bounceIn {
          from, 20%, 40%, 60%, 80%, to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
          }
          0% {
            opacity: 0;
            transform: scale3d(0.3, 0.3, 0.3);
          }
          20% {
            transform: scale3d(1.1, 1.1, 1.1);
          }
          40% {
            transform: scale3d(0.9, 0.9, 0.9);
          }
          60% {
            opacity: 1;
            transform: scale3d(1.03, 1.03, 1.03);
          }
          80% {
            transform: scale3d(0.97, 0.97, 0.97);
          }
          to {
            opacity: 1;
            transform: scale3d(1, 1, 1);
          }
        }
        
        @keyframes shakeX {
          from, to {
            transform: translate3d(0, 0, 0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translate3d(-10px, 0, 0);
          }
          20%, 40%, 60%, 80% {
            transform: translate3d(10px, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default QuizComponent;