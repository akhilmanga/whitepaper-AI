import React, { useState } from 'react';
import { useCourse, FlashCard } from '../context/CourseContext';
import { RotateCcw, ChevronLeft, ChevronRight, Star, Brain, Target } from 'lucide-react';

interface FlashCardComponentProps {
  cards: FlashCard[];
  courseId: string;
  moduleId: string;
}

const FlashCardComponent: React.FC<FlashCardComponentProps> = ({ cards, courseId, moduleId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'all' | 'due' | 'difficult'>('all');
  const { updateFlashCardMastery } = useCourse();

  const filteredCards = cards.filter(card => {
    switch (studyMode) {
      case 'due':
        return card.nextReview <= new Date();
      case 'difficult':
        return card.masteryLevel < 70;
      default:
        return true;
    }
  });

  if (filteredCards.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {studyMode === 'due' ? 'No cards due for review' : 
           studyMode === 'difficult' ? 'No difficult cards found' : 
           'No flashcards available'}
        </h3>
        <p className="text-gray-600 mb-6">
          {studyMode === 'due' ? 'Come back later for more reviews' : 
           studyMode === 'difficult' ? 'Great job! All cards are well mastered' :
           'Flashcards will be generated automatically'}
        </p>
        {studyMode !== 'all' && (
          <button
            onClick={() => setStudyMode('all')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View all cards
          </button>
        )}
      </div>
    );
  }

  const currentCard = filteredCards[currentIndex];

  const handleCardRating = (difficulty: 'easy' | 'medium' | 'hard') => {
    let masteryChange = 0;
    switch (difficulty) {
      case 'easy':
        masteryChange = 15;
        break;
      case 'medium':
        masteryChange = 10;
        break;
      case 'hard':
        masteryChange = -5;
        break;
    }

    const newMastery = Math.min(100, Math.max(0, currentCard.masteryLevel + masteryChange));
    updateFlashCardMastery(courseId, moduleId, currentCard.id, newMastery);

    // Move to next card
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setFlipped(false);
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    setFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    setFlipped(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'text-green-600 bg-green-100';
    if (mastery >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Study Mode Selection */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStudyMode('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            studyMode === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Cards ({cards.length})
        </button>
        <button
          onClick={() => setStudyMode('due')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            studyMode === 'due'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Due for Review ({cards.filter(c => c.nextReview <= new Date()).length})
        </button>
        <button
          onClick={() => setStudyMode('difficult')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            studyMode === 'difficult'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Needs Work ({cards.filter(c => c.masteryLevel < 70).length})
        </button>
      </div>

      {/* Card Counter */}
      <div className="text-center text-sm text-gray-600">
        Card {currentIndex + 1} of {filteredCards.length}
      </div>

      {/* Main Card */}
      <div className="relative">
        <div 
          className="bg-white border-2 border-gray-200 rounded-xl p-8 min-h-[300px] cursor-pointer transition-all hover:shadow-lg"
          onClick={() => setFlipped(!flipped)}
        >
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentCard.difficulty)}`}>
              {currentCard.difficulty}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMasteryColor(currentCard.masteryLevel)}`}>
              {currentCard.masteryLevel}% mastered
            </span>
          </div>

          <div className="text-center">
            {!flipped ? (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{currentCard.term}</h3>
                <p className="text-gray-500">Click to reveal definition</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">{currentCard.term}</h3>
                <p className="text-gray-700 text-lg leading-relaxed">{currentCard.definition}</p>
                {currentCard.example && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Example:</strong> {currentCard.example}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-4">
          <button
            onClick={prevCard}
            className="w-8 h-8 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-4">
          <button
            onClick={nextCard}
            className="w-8 h-8 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Rating Buttons (only show when flipped) */}
      {flipped && (
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => handleCardRating('hard')}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Target className="h-4 w-4" />
            <span>Hard</span>
          </button>
          <button
            onClick={() => handleCardRating('medium')}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Good</span>
          </button>
          <button
            onClick={() => handleCardRating('easy')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Star className="h-4 w-4" />
            <span>Easy</span>
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default FlashCardComponent;