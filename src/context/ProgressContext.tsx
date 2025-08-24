import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCourse } from './CourseContext';
import { v4 as uuidv4 } from 'uuid';

export interface StudySession {
  id: string;
  courseId: string;
  duration: number; // in milliseconds
  timestamp: string;
  modulesCompleted: number;
  flashcardsReviewed: number;
  quizScore?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number; // 0-100
  unlockedAt?: string;
  category: 'learning' | 'consistency' | 'mastery' | 'community';
}

export interface ProgressStats {
  studySessions: StudySession[];
  streak: {
    current: number;
    longest: number;
    lastSession: string | null;
  };
  achievements: Achievement[];
  knowledgeMastery: {
    overall: number;
    byCourse: { [courseId: string]: number };
    byConcept: { [concept: string]: number };
  };
  timeSpent: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

interface ProgressContextType {
  stats: ProgressStats;
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  updateAchievement: (achievementId: string, progress: number) => void;
  calculateKnowledgeMastery: () => void;
  getWeeklyProgress: () => { date: string; minutes: number }[];
  getRecommendedNextSteps: () => {
    type: 'review' | 'new-content' | 'practice';
    title: string;
    description: string;
    priority: number;
    action: () => void;
  }[];
  exportProgress: (format: 'json' | 'csv' | 'pdf') => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { courses } = useCourse();
  const [stats, setStats] = useState<ProgressStats>(() => {
    const saved = localStorage.getItem('whitepaperAI_progress');
    return saved 
      ? JSON.parse(saved) 
      : {
          studySessions: [],
          streak: { current: 0, longest: 0, lastSession: null },
          achievements: initialAchievements,
          knowledgeMastery: { overall: 0, byCourse: {}, byConcept: {} },
          timeSpent: { today: 0, week: 0, month: 0, total: 0 }
        };
  });
  
  // Initial achievements
  const initialAchievements: Achievement[] = [
    {
      id: 'first_course',
      title: 'First Steps',
      description: 'Completed your first learning module',
      icon: '📚',
      progress: 0,
      category: 'learning'
    },
    {
      id: 'daily_streak_3',
      title: 'Consistency Champion',
      description: 'Completed learning sessions for 3 consecutive days',
      icon: '🔥',
      progress: 0,
      category: 'consistency'
    },
    {
      id: 'mastery_beginner',
      title: 'Knowledge Builder',
      description: 'Achieved 70% mastery in a beginner course',
      icon: '🧠',
      progress: 0,
      category: 'mastery'
    },
    {
      id: 'flashcards_10',
      title: 'Flashcard Master',
      description: 'Reviewed 10 flashcards in a single session',
      icon: '✨',
      progress: 0,
      category: 'mastery'
    },
    {
      id: 'quiz_perfect',
      title: 'Perfect Score',
      description: 'Scored 100% on a quiz',
      icon: '🏆',
      progress: 0,
      category: 'mastery'
    }
  ];
  
  // Save to localStorage whenever stats change
  useEffect(() => {
    localStorage.setItem('whitepaperAI_progress', JSON.stringify(stats));
  }, [stats]);
  
  // Update streak daily
  useEffect(() => {
    const updateStreak = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastSession = stats.streak.lastSession 
        ? new Date(stats.streak.lastSession) 
        : null;
      
      let newStreak = { ...stats.streak };
      
      if (lastSession) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // If last session was yesterday, increment streak
        if (lastSession.toISOString().split('T')[0] === yesterdayStr) {
          newStreak.current += 1;
        } 
        // If last session was today, do nothing (already counted)
        else if (lastSession.toISOString().split('T')[0] !== today) {
          // Reset streak if missed a day
          newStreak.current = 1;
        }
        
        // Update longest streak if needed
        if (newStreak.current > newStreak.longest) {
          newStreak.longest = newStreak.current;
        }
      } else {
        // First session ever
        newStreak.current = 1;
        newStreak.longest = 1;
      }
      
      newStreak.lastSession = today;
      
      setStats(prev => ({
        ...prev,
        streak: newStreak
      }));
    };
    
    // Check streak once per day
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    // Update immediately if needed
    if (!stats.streak.lastSession || 
        stats.streak.lastSession.split('T')[0] !== today) {
      updateStreak();
    }
    
    // Set up timer for next midnight
    const timer = setTimeout(updateStreak, timeUntilMidnight);
    
    return () => clearTimeout(timer);
  }, [stats.streak.lastSession]);
  
  const addStudySession = (session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      id: uuidv4(),
      ...session
    };
    
    setStats(prev => {
      // Update time spent
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const newTimeSpent = {
        ...prev.timeSpent,
        today: prev.timeSpent.today + session.duration,
        week: prev.timeSpent.week + session.duration,
        total: prev.timeSpent.total + session.duration
      };
      
      // Update knowledge mastery
      const flashcardsReviewed = session.flashcardsReviewed || 0;
      const totalFlashcards = courses.flatMap(c => 
        c.modules.flatMap(m => m.flashCards)
      ).length;
      
      const masteryChange = totalFlashcards > 0 
        ? (flashcardsReviewed / totalFlashcards) * 20 
        : 0;
      
      const newMastery = {
        ...prev.knowledgeMastery,
        overall: Math.min(100, prev.knowledgeMastery.overall + masteryChange),
        byCourse: {
          ...prev.knowledgeMastery.byCourse,
          [session.courseId]: Math.min(100, (prev.knowledgeMastery.byCourse[session.courseId] || 0) + masteryChange)
        }
      };
      
      // Check for achievements
      let newAchievements = [...prev.achievements];
      
      // First course achievement
      if (session.modulesCompleted > 0 && newAchievements[0].progress === 0) {
        newAchievements[0] = {
          ...newAchievements[0],
          progress: 100,
          unlockedAt: new Date().toISOString()
        };
      }
      
      // Daily streak achievement
      if (prev.streak.current >= 3 && newAchievements[1].progress < 100) {
        newAchievements[1] = {
          ...newAchievements[1],
          progress: 100,
          unlockedAt: new Date().toISOString()
        };
      }
      
      // Flashcard achievement
      if (flashcardsReviewed >= 10 && newAchievements[3].progress < 100) {
        newAchievements[3] = {
          ...newAchievements[3],
          progress: 100,
          unlockedAt: new Date().toISOString()
        };
      }
      
      // Quiz perfect score
      if (session.quizScore === 100 && newAchievements[4].progress < 100) {
        newAchievements[4] = {
          ...newAchievements[4],
          progress: 100,
          unlockedAt: new Date().toISOString()
        };
      }
      
      return {
        ...prev,
        studySessions: [newSession, ...prev.studySessions],
        timeSpent: newTimeSpent,
        knowledgeMastery: newMastery,
        achievements: newAchievements
      };
    });
  };
  
  const updateAchievement = (achievementId: string, progress: number) => {
    setStats(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement => 
        achievement.id === achievementId
          ? { 
              ...achievement, 
              progress: Math.min(100, progress),
              unlockedAt: progress === 100 && !achievement.unlockedAt 
                ? new Date().toISOString() 
                : achievement.unlockedAt
            }
          : achievement
      )
    }));
  };
  
  const calculateKnowledgeMastery = () => {
    setStats(prev => {
      // Calculate overall mastery
      const totalFlashcards = courses.flatMap(c => 
        c.modules.flatMap(m => m.flashCards)
      );
      
      const masteredFlashcards = totalFlashcards.filter(c => c.masteryLevel >= 70).length;
      const overallMastery = totalFlashcards.length > 0 
        ? Math.round((masteredFlashcards / totalFlashcards.length) * 100) 
        : 0;
      
      // Calculate by course
      const byCourse: { [courseId: string]: number } = {};
      courses.forEach(course => {
        const courseFlashcards = course.modules.flatMap(m => m.flashCards);
        const mastered = courseFlashcards.filter(c => c.masteryLevel >= 70).length;
        byCourse[course.id] = courseFlashcards.length > 0 
          ? Math.round((mastered / courseFlashcards.length) * 100) 
          : 0;
      });
      
      // Calculate by concept (simplified)
      const concepts: { [concept: string]: { count: number; mastered: number } } = {};
      totalFlashcards.forEach(card => {
        const concept = card.category || 'general';
        if (!concepts[concept]) {
          concepts[concept] = { count: 0, mastered: 0 };
        }
        concepts[concept].count++;
        if (card.masteryLevel >= 70) {
          concepts[concept].mastered++;
        }
      });
      
      const byConcept: { [concept: string]: number } = {};
      Object.entries(concepts).forEach(([concept, data]) => {
        byConcept[concept] = Math.round((data.mastered / data.count) * 100);
      });
      
      return {
        ...prev,
        knowledgeMastery: {
          overall: overallMastery,
          byCourse,
          byConcept
        }
      };
    });
  };
  
  const getWeeklyProgress = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      
      const minutes = stats.studySessions
        .filter(session => session.timestamp.startsWith(dayStr))
        .reduce((sum, session) => sum + session.duration / 60000, 0);
      
      result.push({
        date: days[date.getDay()],
        minutes: Math.round(minutes)
      });
    }
    
    return result;
  };
  
  const getRecommendedNextSteps = () => {
    const recommendations = [];
    const now = new Date();
    
    // Review overdue flashcards
    const overdueFlashcards = courses.flatMap(course => 
      course.modules.flatMap(module => 
        module.flashCards.filter(card => new Date(card.nextReview) <= now)
      )
    );
    
    if (overdueFlashcards.length > 0) {
      recommendations.push({
        type: 'review',
        title: 'Review Flashcards',
        description: `You have ${overdueFlashcards.length} flashcards due for review today`,
        priority: 90,
        action: () => console.log('Review flashcards')
      });
    }
    
    // Continue incomplete courses
    const incompleteCourses = courses.filter(course => 
      course.progress < 100 && course.modules.some(m => !m.completed)
    );
    
    if (incompleteCourses.length > 0) {
      const nextCourse = incompleteCourses[0];
      const nextModule = nextCourse.modules.find(m => !m.completed);
      
      recommendations.push({
        type: 'new-content',
        title: `Continue ${nextCourse.title}`,
        description: `Next: ${nextModule?.title || 'Continue learning'}`,
        priority: 80,
        action: () => console.log('Continue course')
      });
    }
    
    // New content based on interests
    if (stats.knowledgeMastery.byConcept['blockchain'] > 80) {
      recommendations.push({
        type: 'new-content',
        title: 'Advanced Blockchain Concepts',
        description: 'Based on your mastery of blockchain fundamentals',
        priority: 70,
        action: () => console.log('Explore advanced blockchain')
      });
    }
    
    // Practice quiz if knowledge gap detected
    const knowledgeGaps = Object.entries(stats.knowledgeMastery.byConcept)
      .filter(([_, mastery]) => mastery < 60)
      .map(([concept]) => concept);
    
    if (knowledgeGaps.length > 0) {
      recommendations.push({
        type: 'practice',
        title: 'Practice Quiz',
        description: `Test your knowledge of ${knowledgeGaps[0]}`,
        priority: 85,
        action: () => console.log('Take practice quiz')
      });
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  };
  
  const exportProgress = (format: 'json' | 'csv' | 'pdf') => {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        // Convert BigInt durations to numbers for export
        timeSpent: {
          today: stats.timeSpent.today,
          week: stats.timeSpent.week,
          month: stats.timeSpent.month,
          total: stats.timeSpent.total
        }
      }
    };
    
    switch (format) {
      case 'json':
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `whitepaper-ai-progress-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
        
      case 'csv':
        // Simplified CSV export
        let csv = 'Date,Duration (min),Course,Modules Completed,Flashcards Reviewed,Quiz Score\n';
        
        stats.studySessions.forEach(session => {
          csv += `${new Date(session.timestamp).toLocaleDateString()},${Math.round(session.duration / 60000)},${session.courseId},${session.modulesCompleted},${session.flashcardsReviewed || 0},${session.quizScore || ''}\n`;
        });
        
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        
        const csvA = document.createElement('a');
        csvA.href = csvUrl;
        csvA.download = `whitepaper-ai-progress-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(csvA);
        csvA.click();
        document.body.removeChild(csvA);
        URL.revokeObjectURL(csvUrl);
        break;
        
      case 'pdf':
        // In a real app, this would use a library like jsPDF
        alert('PDF export would generate a professional progress report with charts and insights.');
        break;
    }
  };
  
  return (
    <ProgressContext.Provider value={{
      stats,
      addStudySession,
      updateAchievement,
      calculateKnowledgeMastery,
      getWeeklyProgress,
      getRecommendedNextSteps,
      exportProgress
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};