import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
  useCallback
} from 'react';
// import { v4 as uuidv4 } from 'uuid';
import { useProgress as useGlobalProgress } from './ProgressContext';
import { 
  FlashCard,
  QuizQuestion,

  ProcessedCourse,
  FlashCardCategory,
  DifficultyLevel,
  BloomLevel,
  TechnicalLevel,
  LearningObjective,
  CourseModule,
  KnowledgeGap,
  CourseRecommendation
} from '../types/course';
import api from '../services/api';
import { useAuth } from './AuthContext';

// Define course types with enhanced typing
export interface FlashCard {
  id: string;
  term: string;
  definition: string;
  context?: string;
  example?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: FlashCardCategory;
  masteryLevel: number;
  nextReview: string; // ISO string for serialization
  createdAt: string; // ISO string
  lastReviewed?: string; // ISO string
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
  answeredAt: string | null; // ISO string
}

export interface CourseModule {
  id: string;
  title: string;
  objectives: LearningObjective[];
  summary: string;
  estimatedTime: number; // in minutes
  difficulty: DifficultyLevel;
  content: string;
  flashCards: FlashCard[];
  quiz: QuizQuestion[];
  completed: boolean;
  progress: number; // 0-100
  error?: string;
}

export interface ProcessedCourse {
  id: string;
  title: string;
  description: string;
  modules: CourseModule[];
  originalDocument: string;
  createdAt: string; // ISO string
  progress: number; // 0-100
  documentHash: string;
  wordCount: number;
  technicalLevel: TechnicalLevel;
  keyConcepts: string[];
  totalEstimatedTime: number;
  lastAccessed: string; // ISO string
  tags?: string[];
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
  action: () => void;
}

export interface CourseContextType {
  courses: ProcessedCourse[];
  currentCourse: ProcessedCourse | null;
  addCourse: (course: ProcessedCourse) => void;
  selectCourse: (courseId: string) => void;
  updateModuleProgress: (moduleId: string, completed: boolean, progress?: number) => void;
  updateFlashCardMastery: (moduleId: string, cardId: string, masteryLevel: number) => void;
  updateQuizAnswer: (moduleId: string, questionId: string, userAnswer: string, isCorrect: boolean) => void;
  retryModuleProcessing: (moduleId: string) => Promise<void>;
  exportCourse: (format: 'pdf' | 'notion' | 'slides') => Promise<void>;
  shareCourse: (options: { 
    type: 'private' | 'public' | 'collaborative'; 
    recipients?: string[] 
  }) => Promise<string>;
  getKnowledgeGaps: () => KnowledgeGap[];
  getPersonalizedRecommendations: () => CourseRecommendation[];
  deleteCourse: (courseId: string) => void;
  updateCourseMetadata: (courseId: string, metadata: Partial<Omit<ProcessedCourse, 'id' | 'modules'>>) => void;
  createFlashCard: (moduleId: string, flashCard: Omit<FlashCard, 'id' | 'createdAt'>) => void;
  updateFlashCard: (moduleId: string, cardId: string, updates: Partial<FlashCard>) => void;
  deleteFlashCard: (moduleId: string, cardId: string) => void;
  createQuizQuestion: (moduleId: string, question: Omit<QuizQuestion, 'id' | 'answered' | 'correct' | 'userAnswer' | 'answeredAt'>) => void;
  updateQuizQuestion: (moduleId: string, questionId: string, updates: Partial<QuizQuestion>) => void;
  deleteQuizQuestion: (moduleId: string, questionId: string) => void;
  getCourseAnalytics: (courseId: string) => {
    completionRate: number;
    avgQuizScore: number;
    flashcardMastery: number;
    timeSpent: number;
    knowledgeGaps: KnowledgeGap[];
  };
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addStudySession } = useGlobalProgress();
  const [courses, setCourses] = useState<ProcessedCourse[]>(() => {
    try {
      const saved = localStorage.getItem('whitepaperAI_courses');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load courses from localStorage:', error);
      return [];
    }
  });
  
  const [currentCourse, setCurrentCourse] = useState<ProcessedCourse | null>(null);
  // const [processingRetries, setProcessingRetries] = useState<{ [key: string]: number }>({});

  // Persist courses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('whitepaperAI_courses', JSON.stringify(courses));
    } catch (error) {
      console.error('Failed to save courses to localStorage:', error);
    }
  }, [courses]);

  // Load current course from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');
    
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course) setCurrentCourse(course);
    } else if (courses.length > 0 && !currentCourse) {
      setCurrentCourse(courses[0]);
    }
  }, [courses]);

  // Sync with server if user is logged in
  useEffect(() => {
    const syncWithServer = async () => {
      if (!user || courses.length === 0) return;
      
      try {
        // Get server courses
        const serverCourses = await api.getCourses();
        
        // Find courses that need syncing
        const localOnly = courses.filter(local => 
          !serverCourses.some(server => server.id === local.id)
        );
        
        const serverOnly = serverCourses.filter(server => 
          !courses.some(local => local.id === server.id)
        );
        
        // Sync local-only courses to server
        for (const course of localOnly) {
          await api.addCourse(course);
        }
        
        // Sync server-only courses to local
        setCourses(prev => {
          const newCourses = [...prev];
          for (const serverCourse of serverOnly) {
            if (!newCourses.some(c => c.id === serverCourse.id)) {
              newCourses.push(serverCourse);
            }
          }
          return newCourses;
        });
        
      } catch (error) {
        console.error('Course sync failed:', error);
      }
    };
    
    if (user) {
      syncWithServer();
      
      // Set up periodic sync
      const syncInterval = setInterval(syncWithServer, 300000); // Every 5 minutes
      return () => clearInterval(syncInterval);
    }
  }, [user, courses]);

  const addCourse = useCallback((course: ProcessedCourse) => {
    setCourses(prev => {
      // Check if course already exists
      const exists = prev.some(c => c.id === course.id);
      if (exists) return prev;
      
      return [course, ...prev];
    });
    setCurrentCourse(course);
    
    // Track study session for new course
    addStudySession({
      courseId: course.id,
      duration: 0,
      timestamp: new Date().toISOString(),
      modulesCompleted: 0,
      flashcardsReviewed: 0
    });
    
    // Update URL for shareability
    const params = new URLSearchParams(window.location.search);
    params.set('courseId', course.id);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    
    // Sync with server if logged in
    if (user) {
      api.addCourse(course).catch(console.error);
    }
  }, [user, addStudySession]);

  const selectCourse = useCallback((courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setCurrentCourse(course);
      // Update URL for shareability
      const params = new URLSearchParams(window.location.search);
      params.set('courseId', courseId);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      
      // Track course selection
      addStudySession({
        courseId,
        duration: 0,
        timestamp: new Date().toISOString(),
        modulesCompleted: course.modules.filter(m => m.completed).length,
        flashcardsReviewed: 0
      });
    }
  }, [courses, addStudySession]);

  const updateModuleProgress = useCallback((moduleId: string, completed: boolean, progress?: number) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      const updatedModules = course.modules.map(module => {
        if (module.id !== moduleId) return module;
        
        // Calculate overall course progress
        // const completedModules = course.modules.filter(m => m.completed).length;
        // const totalModules = course.modules.length;
        // const newProgress = Math.round(((completedModules + (completed ? 1 : 0)) / totalModules) * 100);
        
        return {
          ...module,
          completed,
          progress: progress ?? (completed ? 100 : module.progress)
        };
      });
      
      return {
        ...course,
        modules: updatedModules,
        progress: newProgress,
        lastAccessed: new Date().toISOString()
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.updateCourse(currentCourse.id, {
        progress: currentCourse.progress,
        lastAccessed: new Date().toISOString()
      }).catch(console.error);
    }
  }, [currentCourse, user]);

  const updateFlashCardMastery = useCallback((moduleId: string, cardId: string, masteryLevel: number) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      const updatedModules = course.modules.map(module => {
        if (module.id !== moduleId) return module;
        
        const updatedFlashCards = module.flashCards.map(card => {
          if (card.id !== cardId) return card;
          
          // Calculate next review date based on spaced repetition
          let nextReview: Date;
          if (masteryLevel >= 90) {
            // Long interval for high mastery
            nextReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          } else if (masteryLevel >= 70) {
            // Medium interval
            nextReview = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
          } else {
            // Short interval for low mastery
            nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
          }
          
          return {
            ...card,
            masteryLevel,
            nextReview: nextReview.toISOString(),
            lastReviewed: new Date().toISOString()
          };
        });
        
        // Update module progress based on flashcard mastery
        const masteredCards = updatedFlashCards.filter(c => c.masteryLevel >= 70).length;
        const totalCards = updatedFlashCards.length;
        const moduleProgress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
        
        return {
          ...module,
          flashCards: updatedFlashCards,
          progress: moduleProgress
        };
      });
      
      // Calculate overall course progress
      const completedModules = course.modules.filter(m => m.completed).length;
      const totalModules = course.modules.length;
      const courseProgress = Math.round((completedModules / totalModules) * 100);
      
      return { 
        ...course, 
        modules: updatedModules,
        progress: courseProgress,
        lastAccessed: new Date().toISOString()
      };
    }));
    
    // Track flashcard review
    if (user && currentCourse) {
      addStudySession({
        courseId: currentCourse.id,
        duration: 0,
        timestamp: new Date().toISOString(),
        modulesCompleted: 0,
        flashcardsReviewed: 1
      });
      
      // Sync with server
      api.updateFlashCardMastery(currentCourse.id, moduleId, cardId, masteryLevel)
        .catch(console.error);
    }
  }, [currentCourse, user, addStudySession]);

  const updateQuizAnswer = useCallback((moduleId: string, questionId: string, userAnswer: string, isCorrect: boolean) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      const updatedModules = course.modules.map(module => {
        if (module.id !== moduleId) return module;
        
        const updatedQuiz = module.quiz.map(question => {
          if (question.id !== questionId) return question;
          
          return {
            ...question,
            answered: true,
            correct: isCorrect,
            userAnswer,
            answeredAt: new Date().toISOString()
          };
        });
        
        // Calculate quiz score
        const answered = updatedQuiz.filter(q => q.answered).length;
        const correct = updatedQuiz.filter(q => q.correct).length;
        const quizScore = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        
        // Update module progress
        const flashCardProgress = module.flashCards.length > 0 
          ? Math.round(module.flashCards.filter(c => c.masteryLevel >= 70).length / module.flashCards.length * 100)
          : 0;
          
        const moduleProgress = Math.round((flashCardProgress + quizScore) / 2);
        
        return {
          ...module,
          quiz: updatedQuiz,
          progress: moduleProgress
        };
      });
      
      // Calculate overall course progress
      const completedModules = course.modules.filter(m => m.completed).length;
      const totalModules = course.modules.length;
      const courseProgress = Math.round((completedModules / totalModules) * 100);
      
      return { 
        ...course, 
        modules: updatedModules,
        progress: courseProgress,
        lastAccessed: new Date().toISOString()
      };
    }));
    
    // Track quiz attempt
    if (user && currentCourse) {
      addStudySession({
        courseId: currentCourse.id,
        duration: 0,
        timestamp: new Date().toISOString(),
        modulesCompleted: 0,
        flashcardsReviewed: 0,
        quizScore: isCorrect ? 100 : 0
      });
      
      // Sync with server
      api.updateQuizAnswer(currentCourse.id, moduleId, questionId, userAnswer, isCorrect)
        .catch(console.error);
    }
  }, [currentCourse, user, addStudySession]);

  const retryModuleProcessing = useCallback(async (moduleId: string) => {
    if (!currentCourse || !user) return;
    
    try {
      // Find the module to retry
      const moduleIndex = currentCourse.modules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) throw new Error('Module not found');
      
      // Get the course content
      const courseData = await api.processText(currentCourse.modules[moduleIndex].content);
      
      // Update with new data
      setCourses(prev => prev.map(course => {
        if (course.id !== currentCourse.id) return course;
        
        const updatedModules = [...course.modules];
        updatedModules[moduleIndex] = {
          ...course.modules[moduleIndex],
          ...courseData.modules[moduleIndex],
          error: undefined
        };
        
        // Update retry count
        setProcessingRetries(prev => ({
          ...prev,
          [moduleId]: (prev[moduleId] || 0) + 1
        }));
        
        return { ...course, modules: updatedModules };
      }));
    } catch (error) {
      console.error('Failed to retry module processing:', error);
      
      // Update with error state
      setCourses(prev => prev.map(course => {
        if (course.id !== currentCourse?.id) return course;
        
        return {
          ...course,
          modules: course.modules.map(module => 
            module.id === moduleId 
              ? { ...module, error: 'Failed to regenerate content. Please try again later.' }
              : module
          )
        };
      }));
    }
  }, [currentCourse, user]);

  const exportCourse = useCallback(async (format: 'pdf' | 'notion' | 'slides') => {
    if (!currentCourse) return;
    
    try {
      // Track export action
      addStudySession({
        courseId: currentCourse.id,
        duration: 0,
        timestamp: new Date().toISOString(),
        modulesCompleted: 0,
        flashcardsReviewed: 0
      });
      
      // Call API to export
      const blob = await api.exportCourse(currentCourse.id, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentCourse.title.replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Failed to export course as ${format}:`, error);
      throw new Error('Failed to export course. Please try again.');
    }
  }, [currentCourse, addStudySession]);

  const shareCourse = useCallback(async (options: { type: 'private' | 'public' | 'collaborative'; recipients?: string[] }) => {
    if (!currentCourse || !user) throw new Error('No course selected or user not logged in');
    
    try {
      // Generate shareable link
      const shareLink = await api.shareCourse(currentCourse.id, options);
      
      // Track share action
      addStudySession({
        courseId: currentCourse.id,
        duration: 0,
        timestamp: new Date().toISOString(),
        modulesCompleted: 0,
        flashcardsReviewed: 0
      });
      
      return shareLink;
    } catch (error) {
      console.error('Failed to share course:', error);
      throw new Error('Failed to generate share link. Please try again.');
    }
  }, [currentCourse, user, addStudySession]);

  const getKnowledgeGaps = useCallback((): KnowledgeGap[] => {
    if (!currentCourse) return [];
    
    // Identify concepts with low mastery
    const lowMasteryConcepts: KnowledgeGap[] = [];
    
    currentCourse.modules.forEach(module => {
      const lowMasteryCards = module.flashCards
        .filter(card => card.masteryLevel < 50)
        .map(card => ({
          concept: card.term,
          mastery: card.masteryLevel,
          moduleId: module.id,
          cardIds: [card.id]
        }));
      
      // Group by concept
      lowMasteryCards.forEach(card => {
        const existing = lowMasteryConcepts.find(c => c.concept === card.concept);
        if (existing) {
          existing.cardIds.push(card.id);
          existing.mastery = Math.min(existing.mastery, card.mastery);
        } else {
          lowMasteryConcepts.push(card);
        }
      });
    });
    
    // Sort by lowest mastery first
    return lowMasteryConcepts.sort((a, b) => a.mastery - b.mastery);
  }, [currentCourse]);

  const getPersonalizedRecommendations = useCallback((): CourseRecommendation[] => {
    if (!currentCourse) return [];
    
    const recommendations: CourseRecommendation[] = [];
    const knowledgeGaps = getKnowledgeGaps();
    
    // 1. Review overdue flashcards
    const now = new Date();
    const overdueFlashcards = currentCourse.modules.flatMap(module => 
      module.flashCards.filter(card => new Date(card.nextReview) <= now)
    );
    
    if (overdueFlashcards.length > 0) {
      recommendations.push({
        type: 'review',
        title: 'Review Flashcards',
        description: `You have ${overdueFlashcards.length} flashcards due for review today`,
        priority: 90,
        action: () => {
          const firstOverdueModule = currentCourse.modules.find(module => 
            module.flashCards.some(card => new Date(card.nextReview) <= now)
          );
          if (firstOverdueModule) {
            selectCourse(currentCourse.id);
            // In a real app, this would navigate to flashcard review
          }
        }
      });
    }
    
    // 2. Complete in-progress modules
    const inProgressModules = currentCourse.modules.filter(m => !m.completed);
    if (inProgressModules.length > 0) {
      const nextModule = inProgressModules[0];
      recommendations.push({
        type: 'new-content',
        title: `Continue ${nextModule.title}`,
        description: `Estimated time: ${nextModule.estimatedTime} minutes`,
        priority: 85,
        moduleId: nextModule.id,
        action: () => {
          selectCourse(currentCourse.id);
          // In a real app, this would navigate to the module
        }
      });
    }
    
    // 3. Address knowledge gaps
    if (knowledgeGaps.length > 0) {
      const biggestGap = knowledgeGaps[0];
      recommendations.push({
        type: 'practice',
        title: `Strengthen Understanding: ${biggestGap.concept}`,
        description: `Your mastery is at ${biggestGap.mastery}% for this concept`,
        priority: 80,
        action: () => {
          selectCourse(currentCourse.id);
          // In a real app, this would navigate to relevant content
        }
      });
    }
    
    // 4. Suggest related courses based on key concepts
    if (currentCourse.keyConcepts.length > 0) {
      const relatedConcept = currentCourse.keyConcepts[0];
      recommendations.push({
        type: 'new-content',
        title: `Deepen Knowledge: ${relatedConcept}`,
        description: 'Based on your progress in this course',
        priority: 75,
        action: () => {
          // In a real app, this would search for related courses
          console.log('Search for courses related to:', relatedConcept);
        }
      });
    }
    
    // 5. Suggest completing the course
    if (currentCourse.progress < 100 && currentCourse.progress > 70) {
      recommendations.push({
        type: 'new-content',
        title: 'Complete Your Course',
        description: `Only ${100 - currentCourse.progress}% remaining to complete`,
        priority: 70,
        action: () => {
          selectCourse(currentCourse.id);
          // In a real app, this would navigate to the next module
        }
      });
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }, [currentCourse, getKnowledgeGaps, selectCourse]);

  const deleteCourse = useCallback((courseId: string) => {
    setCourses(prev => {
      const courseToDelete = prev.find(c => c.id === courseId);
      
      // Track deletion for analytics
      if (courseToDelete && user) {
        addStudySession({
          courseId: courseId,
          duration: 0,
          timestamp: new Date().toISOString(),
          modulesCompleted: courseToDelete.modules.filter(m => m.completed).length,
          flashcardsReviewed: 0
        });
      }
      
      const newCourses = prev.filter(c => c.id !== courseId);
      
      // Update current course if deleted
      if (currentCourse?.id === courseId) {
        setCurrentCourse(newCourses.length > 0 ? newCourses[0] : null);
      }
      
      return newCourses;
    });
    
    // Sync with server if logged in
    if (user) {
      api.deleteCourse(courseId).catch(console.error);
    }
  }, [currentCourse, user, addStudySession]);

  const updateCourseMetadata = useCallback((courseId: string, metadata: Partial<Omit<ProcessedCourse, 'id' | 'modules'>>) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      
      return {
        ...course,
        ...metadata,
        lastAccessed: new Date().toISOString()
      };
    }));
    
    // Sync with server if logged in
    if (user) {
      api.updateCourse(courseId, metadata).catch(console.error);
    }
  }, [user]);

  const createFlashCard = useCallback((moduleId: string, flashCard: Omit<FlashCard, 'id' | 'createdAt'>) => {
    const newFlashCard: FlashCard = {
      ...flashCard,
      id: `fc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      masteryLevel: 0,
      nextReview: new Date().toISOString()
    };
    
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            flashCards: [...module.flashCards, newFlashCard]
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.createFlashCard(currentCourse.id, moduleId, newFlashCard).catch(console.error);
    }
  }, [currentCourse, user]);

  const updateFlashCard = useCallback((moduleId: string, cardId: string, updates: Partial<FlashCard>) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            flashCards: module.flashCards.map(card => 
              card.id === cardId ? { ...card, ...updates } : card
            )
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.updateFlashCard(currentCourse.id, moduleId, cardId, updates).catch(console.error);
    }
  }, [currentCourse, user]);

  const deleteFlashCard = useCallback((moduleId: string, cardId: string) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            flashCards: module.flashCards.filter(card => card.id !== cardId)
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.deleteFlashCard(currentCourse.id, moduleId, cardId).catch(console.error);
    }
  }, [currentCourse, user]);

  const createQuizQuestion = useCallback((moduleId: string, question: Omit<QuizQuestion, 'id' | 'answered' | 'correct' | 'userAnswer' | 'answeredAt'>) => {
    const newQuestion: QuizQuestion = {
      ...question,
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      answered: false,
      correct: null,
      userAnswer: null,
      answeredAt: null
    };
    
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            quiz: [...module.quiz, newQuestion]
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.createQuizQuestion(currentCourse.id, moduleId, newQuestion).catch(console.error);
    }
  }, [currentCourse, user]);

  const updateQuizQuestion = useCallback((moduleId: string, questionId: string, updates: Partial<QuizQuestion>) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            quiz: module.quiz.map(question => 
              question.id === questionId ? { ...question, ...updates } : question
            )
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.updateQuizQuestion(currentCourse.id, moduleId, questionId, updates).catch(console.error);
    }
  }, [currentCourse, user]);

  const deleteQuizQuestion = useCallback((moduleId: string, questionId: string) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      return {
        ...course,
        modules: course.modules.map(module => {
          if (module.id !== moduleId) return module;
          
          return {
            ...module,
            quiz: module.quiz.filter(question => question.id !== questionId)
          };
        })
      };
    }));
    
    // Sync with server if logged in
    if (user && currentCourse) {
      api.deleteQuizQuestion(currentCourse.id, moduleId, questionId).catch(console.error);
    }
  }, [currentCourse, user]);

  const getCourseAnalytics = useCallback((courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return {
        completionRate: 0,
        avgQuizScore: 0,
        flashcardMastery: 0,
        timeSpent: 0,
        knowledgeGaps: []
      };
    }
    
    // Calculate quiz scores
    const quizScores = course.modules.flatMap(module => 
      module.quiz.filter(q => q.answered).map(q => q.correct ? 100 : 0)
    );
    
    const avgQuizScore = quizScores.length > 0 
      ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length 
      : 0;
    
    // Calculate flashcard mastery
    const allFlashCards = course.modules.flatMap(module => module.flashCards);
    const flashcardMastery = allFlashCards.length > 0 
      ? allFlashCards.reduce((sum, card) => sum + card.masteryLevel, 0) / allFlashCards.length 
      : 0;
    
    // Get knowledge gaps
    const knowledgeGaps = getKnowledgeGaps();
    
    return {
      completionRate: course.progress,
      avgQuizScore,
      flashcardMastery,
      timeSpent: 0, // Would be retrieved from progress context
      knowledgeGaps
    };
  }, [courses, getKnowledgeGaps]);

  return (
    <CourseContext.Provider value={{
      courses,
      currentCourse,
      addCourse,
      selectCourse,
      updateModuleProgress,
      updateFlashCardMastery,
      updateQuizAnswer,
      retryModuleProcessing,
      exportCourse,
      shareCourse,
      getKnowledgeGaps,
      getPersonalizedRecommendations,
      deleteCourse,
      updateCourseMetadata,
      createFlashCard,
      updateFlashCard,
      deleteFlashCard,
      createQuizQuestion,
      updateQuizQuestion,
      deleteQuizQuestion,
      getCourseAnalytics
    }}>
      {children}
    </CourseContext.Provider>
  );
};