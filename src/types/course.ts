// Core type definitions for the Whitepaper AI application

export type FlashCardCategory = 'math' | 'code' | 'concept' | 'terminology';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type TechnicalLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface LearningObjective {
  id: string;
  description: string;
  bloomLevel: BloomLevel;
  completed: boolean;
}

export interface FlashCard {
  id: string;
  term: string;
  definition: string;
  context?: string;
  example?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: FlashCardCategory;
  masteryLevel: number;
  nextReview: string;
  createdAt: string;
  lastReviewed?: string;
  sourceExcerpt?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  bloomLevel: BloomLevel;
  difficulty: DifficultyLevel;
  whitepaperReference: string;
  answered: boolean;
  correct: boolean | null;
  userAnswer: string | null;
  answeredAt: string | null;
}

export interface Module {
  id: string;
  title: string;
  objectives: LearningObjective[];
  summary: string;
  estimatedTime: number;
  difficulty: DifficultyLevel;
  content: string;
  flashCards: FlashCard[];
  quiz: QuizQuestion[];
  completed: boolean;
  progress: number;
  error?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  originalDocument: string;
  createdAt: string;
  progress: number;
  documentHash: string;
  wordCount: number;
  technicalLevel: TechnicalLevel;
  keyConcepts: string[];
  totalEstimatedTime: number;
  lastAccessed: string;
  tags?: string[];
}

export interface ProcessedCourse extends Course {
  lastSynced?: string;
  isSynced?: boolean;
}

export interface KnowledgeGap {
  concept: string;
  mastery: number;
  moduleId: string;
  cardIds: string[];
}

export interface CourseRecommendation {
  type: 'review' | 'new-content' | 'practice';
  title: string;
  description: string;
  priority: number;
  moduleId?: string;
  courseId?: string;
  originalDocument?: string;
  action: () => void;
}

export interface LearningAnalytics {
  completionRate: number;
  avgQuizScore: number;
  flashcardMastery: number;
  timeSpent: number;
  knowledgeGaps: KnowledgeGap[];
  recommendations: CourseRecommendation[];
}