import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FlashCard {
  id: string;
  term: string;
  definition: string;
  example?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  masteryLevel: number; // 0-100
  nextReview: Date;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Module {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  objectives: string[];
  content: string;
  flashCards: FlashCard[];
  quiz: QuizQuestion[];
  completed: boolean;
}

export interface Course {
  id: string;
  title: string;
  originalDocument: string;
  description: string;
  totalEstimatedTime: number;
  modules: Module[];
  createdAt: Date;
  progress: number; // 0-100
}

interface CourseContextType {
  courses: Course[];
  currentCourse: Course | null;
  addCourse: (course: Course) => void;
  selectCourse: (courseId: string) => void;
  updateModuleProgress: (courseId: string, moduleId: string, completed: boolean) => void;
  updateFlashCardMastery: (courseId: string, moduleId: string, cardId: string, mastery: number) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

interface CourseProviderProps {
  children: ReactNode;
}

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'Bitcoin: A Peer-to-Peer Electronic Cash System',
      originalDocument: 'bitcoin-whitepaper.pdf',
      description: 'Satoshi Nakamoto\'s revolutionary whitepaper that introduced Bitcoin and blockchain technology.',
      totalEstimatedTime: 45,
      createdAt: new Date('2024-01-15'),
      progress: 75,
      modules: [
        {
          id: 'm1',
          title: 'Introduction & Abstract',
          description: 'Understanding the motivation behind Bitcoin and its core principles.',
          estimatedTime: 8,
          objectives: [
            'Understand the double-spending problem',
            'Learn about peer-to-peer networks',
            'Grasp the concept of digital signatures'
          ],
          content: 'Bitcoin represents a groundbreaking approach to digital currency...',
          completed: true,
          flashCards: [
            {
              id: 'fc1',
              term: 'Double Spending',
              definition: 'The risk that a digital currency can be spent twice',
              example: 'Without proper safeguards, Alice could send the same digital coin to both Bob and Charlie',
              difficulty: 'medium',
              masteryLevel: 85,
              nextReview: new Date(Date.now() + 86400000)
            },
            {
              id: 'fc2',
              term: 'Peer-to-Peer Network',
              definition: 'A decentralized network where participants communicate directly without intermediaries',
              difficulty: 'easy',
              masteryLevel: 90,
              nextReview: new Date(Date.now() + 172800000)
            }
          ],
          quiz: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'What is the main problem Bitcoin aims to solve?',
              options: [
                'High transaction fees',
                'Double spending in digital payments',
                'Slow transaction processing',
                'Government regulation'
              ],
              correctAnswer: 'Double spending in digital payments',
              explanation: 'Bitcoin was specifically designed to solve the double-spending problem in digital currencies without requiring a trusted third party.',
              difficulty: 'medium'
            }
          ]
        },
        {
          id: 'm2',
          title: 'Transactions & Digital Signatures',
          description: 'How Bitcoin transactions work and are secured.',
          estimatedTime: 12,
          objectives: [
            'Understand transaction structure',
            'Learn about public-private key cryptography',
            'Explore transaction verification'
          ],
          content: 'Bitcoin transactions are secured using digital signatures...',
          completed: true,
          flashCards: [
            {
              id: 'fc3',
              term: 'Digital Signature',
              definition: 'A cryptographic mechanism that proves ownership and prevents tampering',
              difficulty: 'hard',
              masteryLevel: 65,
              nextReview: new Date(Date.now() + 43200000)
            }
          ],
          quiz: [
            {
              id: 'q2',
              type: 'fill_blank',
              question: 'In Bitcoin, transactions are secured using _____ signatures.',
              correctAnswer: 'digital',
              explanation: 'Digital signatures ensure that only the owner of Bitcoin can spend it and prevent transaction tampering.',
              difficulty: 'easy'
            }
          ]
        },
        {
          id: 'm3',
          title: 'Timestamp Server & Proof-of-Work',
          description: 'The consensus mechanism that secures the Bitcoin network.',
          estimatedTime: 15,
          objectives: [
            'Understand timestamp servers',
            'Learn about proof-of-work consensus',
            'Explore mining and block creation'
          ],
          content: 'The timestamp server creates a chronological record of transactions...',
          completed: false,
          flashCards: [
            {
              id: 'fc4',
              term: 'Proof of Work',
              definition: 'A consensus mechanism where miners compete to solve computational puzzles',
              difficulty: 'hard',
              masteryLevel: 45,
              nextReview: new Date(Date.now() + 21600000)
            }
          ],
          quiz: [
            {
              id: 'q3',
              type: 'short_answer',
              question: 'Explain how proof-of-work prevents tampering with the blockchain.',
              correctAnswer: 'Proof-of-work makes it computationally expensive to alter past transactions because an attacker would need to redo all the work for that block and all subsequent blocks.',
              explanation: 'The computational cost of proof-of-work ensures that honest nodes collectively have more computing power than any attacker.',
              difficulty: 'hard'
            }
          ]
        }
      ]
    },
    {
      id: '2',
      title: 'Ethereum: A Next-Generation Smart Contract Platform',
      originalDocument: 'ethereum-whitepaper.pdf',
      description: 'Vitalik Buterin\'s vision for a programmable blockchain platform.',
      totalEstimatedTime: 60,
      createdAt: new Date('2024-01-20'),
      progress: 25,
      modules: [
        {
          id: 'm4',
          title: 'Introduction to Smart Contracts',
          description: 'Understanding programmable blockchain applications.',
          estimatedTime: 20,
          objectives: [
            'Define smart contracts',
            'Understand Turing completeness',
            'Learn about decentralized applications'
          ],
          content: 'Smart contracts are self-executing contracts with terms directly written into code...',
          completed: true,
          flashCards: [
            {
              id: 'fc5',
              term: 'Smart Contract',
              definition: 'Self-executing contracts with terms directly written into code',
              difficulty: 'medium',
              masteryLevel: 70,
              nextReview: new Date(Date.now() + 86400000)
            }
          ],
          quiz: [
            {
              id: 'q4',
              type: 'multiple_choice',
              question: 'What makes Ethereum different from Bitcoin?',
              options: [
                'Faster transactions',
                'Smart contract capability',
                'Better security',
                'Lower fees'
              ],
              correctAnswer: 'Smart contract capability',
              explanation: 'Ethereum\'s key innovation is its ability to run smart contracts, making it a programmable blockchain platform.',
              difficulty: 'medium'
            }
          ]
        }
      ]
    }
  ]);

  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);

  const addCourse = (course: Course) => {
    setCourses(prev => [...prev, course]);
  };

  const selectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setCurrentCourse(course || null);
  };

  const updateModuleProgress = (courseId: string, moduleId: string, completed: boolean) => {
    setCourses(prev => prev.map(course => {
      if (course.id === courseId) {
        const updatedModules = course.modules.map(module => 
          module.id === moduleId ? { ...module, completed } : module
        );
        const progress = Math.round((updatedModules.filter(m => m.completed).length / updatedModules.length) * 100);
        return { ...course, modules: updatedModules, progress };
      }
      return course;
    }));
  };

  const updateFlashCardMastery = (courseId: string, moduleId: string, cardId: string, mastery: number) => {
    setCourses(prev => prev.map(course => {
      if (course.id === courseId) {
        const updatedModules = course.modules.map(module => {
          if (module.id === moduleId) {
            const updatedCards = module.flashCards.map(card => 
              card.id === cardId 
                ? { ...card, masteryLevel: mastery, nextReview: new Date(Date.now() + (mastery > 80 ? 172800000 : 86400000)) }
                : card
            );
            return { ...module, flashCards: updatedCards };
          }
          return module;
        });
        return { ...course, modules: updatedModules };
      }
      return course;
    }));
  };

  return (
    <CourseContext.Provider value={{
      courses,
      currentCourse,
      addCourse,
      selectCourse,
      updateModuleProgress,
      updateFlashCardMastery
    }}>
      {children}
    </CourseContext.Provider>
  );
};