import React, { useState, useEffect, useRef } from 'react';
import { useCourse, FlashCard } from '../context/CourseContext';
import { RotateCcw, ChevronLeft, ChevronRight, Star, Target, Sparkles, BookOpen, Flame } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface FlashCardComponentProps {
  cards: FlashCard[];
  moduleId: string;
  onCompletion?: () => void;
  mode?: 'study' | 'review'; // Study mode shows all cards, review mode shows due cards
  difficultyFilter?: 'easy' | 'medium' | 'hard' | 'all';
}

const FlashCardComponent: React.FC<FlashCardComponentProps> = ({
  cards,
  moduleId,
  onCompletion,
  mode = 'study',
  difficultyFilter = 'all'
}) => {
  const { updateFlashCardMastery } = useCourse();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteryLevel, setMasteryLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animation, setAnimation] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter cards based on mode and difficulty
  const filteredCards = cards.filter(card => {
    if (difficultyFilter !== 'all' && card.difficulty !== difficultyFilter) {
      return false;
    }
    
    if (mode === 'review') {
      // Only show cards due for review (nextReview <= now)
      const nextReview = new Date(card.nextReview);
      return nextReview <= new Date();
    }
    
    return true;
  });

  useEffect(() => {
    if (filteredCards.length === 0 && onCompletion) {
      onCompletion();
    }
  }, [filteredCards, onCompletion]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setAnimation('animate__animated animate__flipInY');
    
    // Reset animation after it completes
    setTimeout(() => setAnimation(''), 1000);
  };

  const handleMastery = (level: number) => {
    if (currentIndex >= filteredCards.length) return;
    
    const card = filteredCards[currentIndex];
    updateFlashCardMastery(moduleId, card.id, level);
    setMasteryLevel(level);
    
    // Show confetti if all cards mastered
    if (currentIndex === filteredCards.length - 1 && 
        filteredCards.every(c => c.masteryLevel >= 70)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Move to next card after short delay
    setTimeout(() => {
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (onCompletion) {
        onCompletion();
      }
      setIsFlipped(false);
      setMasteryLevel(0);
    }, 500);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setMasteryLevel(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setMasteryLevel(0);
    } else if (onCompletion) {
      onCompletion();
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteryLevel(0);
  };

  const renderCardContent = (card: FlashCard) => {
    // Process content for LaTeX and code formatting
    const processContent = (content: string) => {
      // Handle code blocks
      const processed = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<code class="language-${lang || 'text'}">${code.trim()}</code>`;
      });
      
      return processed;
    };

    const renderMathContent = (content: string) => {
      // Split content by inline math delimiters
      const parts = content.split(/\$([^$]+)\$/g);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is math content
          return <InlineMath key={index} math={part} />;
        } else {
          // This is regular text
          return <span key={index} dangerouslySetInnerHTML={{ __html: processContent(part) }} />;
        }
      });
    };
    if (isFlipped) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <div>{renderMathContent(card.definition)}</div>
          </div>
          {card.context && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Context:</h4>
              <p className="text-gray-600">{card.context}</p>
            </div>
          )}
          {card.example && (
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Example:</h4>
              <div>{renderMathContent(card.example)}</div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div>{renderMathContent(card.term)}</div>
        </div>
        <div className="mt-auto flex justify-between items-center px-6 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">Category:</span>
            {card.category === 'math' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <BookOpen className="w-3 h-3 mr-1" />
                Math
              </span>
            )}
            {card.category === 'code' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <></>
                Code
              </span>
            )}
            {card.category === 'concept' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Target className="w-3 h-3 mr-1" />
                Concept
              </span>
            )}
            {card.category === 'terminology' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Sparkles className="w-3 h-3 mr-1" />
                Terminology
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-500">Difficulty:</span>
            {card.difficulty === 'easy' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Flame className="w-3 h-3 mr-1 text-green-500" fill="currentColor" />
                Easy
              </span>
            )}
            {card.difficulty === 'medium' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Flame className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" />
                Medium
              </span>
            )}
            {card.difficulty === 'hard' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Flame className="w-3 h-3 mr-1 text-red-500" fill="currentColor" />
                Hard
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (filteredCards.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">All Cards Mastered!</h3>
        <p className="text-gray-600 mb-6">
          You've mastered all flashcards for this module. Great job!
        </p>
        <button
          onClick={handleRestart}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Review Again</span>
        </button>
      </div>
    );
  }

  const currentCard = filteredCards[currentIndex];
  const masteryPercentage = Math.round((currentIndex + 1) / filteredCards.length * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Confetti effect for completion */}
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
                animation: `fall ${Math.random() * 3 + 2}s linear infinite`
              }}
            />
          ))}
        </div>
      )}

      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Flashcards</h3>
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-400 fill-current" />
          <span className="text-sm font-medium text-gray-700">
            {currentIndex + 1} / {filteredCards.length}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="min-h-[400px] flex flex-col">
        <div 
          ref={cardRef}
          className={`relative w-full flex-1 flex items-center justify-center perspective-1000 cursor-pointer
                     ${animation}`}
          onClick={handleFlip}
        >
          <div className="relative w-full h-full preserve-3d">
            <div className={`absolute w-full h-full backface-hidden rounded-xl shadow-md bg-gradient-to-br 
                           from-white to-gray-50 border border-gray-200 transition-all duration-500
                           ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="p-8 h-full">
                {renderCardContent(currentCard)}
              </div>
            </div>
            <div className={`absolute w-full h-full backface-hidden rounded-xl shadow-md bg-gradient-to-br 
                           from-blue-50 to-indigo-50 border border-blue-200 transition-all duration-500
                           ${isFlipped ? '' : 'rotate-y-180'}`}>
              <div className="p-8 h-full">
                {renderCardContent(currentCard)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>How well do you know this?</span>
              <span>{masteryLevel}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
                style={{ width: `${masteryLevel}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleMastery(30)}
              className="py-2 px-4 rounded-lg border border-gray-300 hover:border-red-500 
                        text-red-600 hover:bg-red-50 font-medium transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl mb-1">☹️</div>
                <span>Needs Work</span>
                <span className="text-xs opacity-75">30%</span>
              </div>
            </button>
            <button
              onClick={() => handleMastery(60)}
              className="py-2 px-4 rounded-lg border border-gray-300 hover:border-yellow-500 
                        text-yellow-600 hover:bg-yellow-50 font-medium transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl mb-1">😐</div>
                <span>Getting There</span>
                <span className="text-xs opacity-75">60%</span>
              </div>
            </button>
            <button
              onClick={() => handleMastery(90)}
              className="py-2 px-4 rounded-lg border border-gray-300 hover:border-green-500 
                        text-green-600 hover:bg-green-50 font-medium transition-colors"
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl mb-1">😊</div>
                <span>Got It!</span>
                <span className="text-xs opacity-75">90%</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 
                   hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Previous</span>
        </button>
        
        <div className="flex-1 mx-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600" 
              style={{ width: `${masteryPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentIndex >= filteredCards.length - 1}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 
                   hover:text-gray-900 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default FlashCardComponent;