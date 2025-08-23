import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StudySession {
  id: string;
  date: Date;
  duration: number; // minutes
  modulesCompleted: number;
  cardsReviewed: number;
  quizScore?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number; // 0-100
}

interface ProgressStats {
  totalStudyTime: number; // minutes
  totalCoursesCompleted: number;
  totalModulesCompleted: number;
  currentStreak: number; // days
  longestStreak: number; // days
  averageQuizScore: number;
  masteredCards: number;
  studySessions: StudySession[];
  achievements: Achievement[];
}

interface ProgressContextType {
  stats: ProgressStats;
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  updateAchievement: (achievementId: string, progress: number) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

interface ProgressProviderProps {
  children: ReactNode;
}

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<ProgressStats>({
    totalStudyTime: 180, // 3 hours
    totalCoursesCompleted: 1,
    totalModulesCompleted: 2,
    currentStreak: 3,
    longestStreak: 7,
    averageQuizScore: 87,
    masteredCards: 15,
    studySessions: [
      {
        id: '1',
        date: new Date('2024-01-15'),
        duration: 25,
        modulesCompleted: 1,
        cardsReviewed: 8,
        quizScore: 90
      },
      {
        id: '2',
        date: new Date('2024-01-16'),
        duration: 35,
        modulesCompleted: 1,
        cardsReviewed: 12,
        quizScore: 85
      },
      {
        id: '3',
        date: new Date('2024-01-17'),
        duration: 45,
        modulesCompleted: 2,
        cardsReviewed: 15,
        quizScore: 92
      }
    ],
    achievements: [
      {
        id: 'first_course',
        title: 'First Steps',
        description: 'Complete your first learning module',
        icon: '🎯',
        unlockedAt: new Date('2024-01-15'),
        progress: 100
      },
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Score 90% or higher on 5 quizzes',
        icon: '🧠',
        unlockedAt: new Date('2024-01-16'),
        progress: 100
      },
      {
        id: 'streak_week',
        title: 'Week Warrior',
        description: 'Study for 7 consecutive days',
        icon: '🔥',
        progress: 43 // 3/7 days
      },
      {
        id: 'card_master',
        title: 'Flashcard Master',
        description: 'Master 25 flashcards',
        icon: '⚡',
        progress: 60 // 15/25 cards
      },
      {
        id: 'deep_dive',
        title: 'Deep Dive',
        description: 'Study for 2 hours in a single session',
        icon: '🌊',
        progress: 0
      },
      {
        id: 'completionist',
        title: 'Completionist',
        description: 'Complete 5 full courses',
        icon: '👑',
        progress: 20 // 1/5 courses
      }
    ]
  });

  const addStudySession = (session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...session,
      id: Date.now().toString()
    };

    setStats(prev => ({
      ...prev,
      studySessions: [...prev.studySessions, newSession],
      totalStudyTime: prev.totalStudyTime + session.duration,
      totalModulesCompleted: prev.totalModulesCompleted + session.modulesCompleted
    }));
  };

  const updateAchievement = (achievementId: string, progress: number) => {
    setStats(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement => 
        achievement.id === achievementId
          ? { 
              ...achievement, 
              progress,
              unlockedAt: progress === 100 && !achievement.unlockedAt ? new Date() : achievement.unlockedAt
            }
          : achievement
      )
    }));
  };

  return (
    <ProgressContext.Provider value={{ stats, addStudySession, updateAchievement }}>
      {children}
    </ProgressContext.Provider>
  );
};