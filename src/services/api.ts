import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for document processing
});

export interface ProcessedCourse {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    estimatedTime: number;
    objectives: string[];
    content: string;
    flashCards: Array<{
      id: string;
      term: string;
      definition: string;
      example?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      masteryLevel: number;
      nextReview: Date;
    }>;
    quiz: Array<{
      id: string;
      type: 'multiple_choice' | 'fill_blank' | 'short_answer';
      question: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    completed: boolean;
  }>;
  originalDocument: string;
  createdAt: Date;
  progress: number;
}

export const documentAPI = {
  // Process PDF file
  processFile: async (file: File): Promise<ProcessedCourse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/process-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Process URL
  processURL: async (url: string): Promise<ProcessedCourse> => {
    const response = await api.post('/process-url', { url });
    return response.data;
  },

  // Process text input
  processText: async (text: string): Promise<ProcessedCourse> => {
    const response = await api.post('/process-text', { text });
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;