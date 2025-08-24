import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { 
  ProcessedCourse,
  FlashCard,
  QuizQuestion,
  Module,
  Course,
  KnowledgeGap,
  LearningAnalytics,
  CourseRecommendation
} from '../types/course';
import { ProgressStats } from '../context/ProgressContext';

// API Configuration with environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 300000; // 5 minutes
const MAX_OFFLINE_QUEUE_SIZE = 20;
const OFFLINE_CHECK_INTERVAL = 5000; // 5 seconds
const RATE_LIMIT_RESET_THRESHOLD = 1000; // ms before rate limit resets

// API error codes
export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  OFFLINE = 'OFFLINE'
}

// Custom API error class
export class ApiError extends Error {
  code: ApiErrorCode;
  statusCode?: number;
  retryAfter?: number;
  details?: any;
  
  constructor(
    message: string, 
    code: ApiErrorCode, 
    statusCode?: number,
    retryAfter?: number,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
    this.details = details;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// API request metadata
interface RequestMetadata {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  method: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

// API analytics tracking
interface ApiAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestHistory: RequestMetadata[];
}

// Offline request queue item
interface OfflineRequest {
  id: string;
  config: AxiosRequestConfig;
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
  timestamp: number;
  retryCount: number;
}

// Server health status
export interface ServerStatus {
  status: 'ok' | 'warning' | 'error' | 'loading';
  timestamp: string;
  services: {
    azure_ai: 'connected' | 'disconnected' | 'checking';
    database: 'connected' | 'disconnected' | 'checking';
    processing: 'available' | 'unavailable' | 'checking';
  };
  limits: {
    max_file_size: string;
    rate_limit: string;
  };
  performance: {
    response_time: number;
    uptime: string;
  };
}

// Enhanced API response interface
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
  requestTime: number;
  requestId: string;
}

// API request options
export interface ApiRequestOptions {
  signal?: AbortSignal;
  cancelToken?: CancelTokenSource;
  retry?: boolean;
  cache?: boolean;
  timeout?: number;
  analytics?: boolean;
}

// API service configuration
export interface ApiServiceConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableAnalytics?: boolean;
  enableOfflineQueue?: boolean;
}

// API service statistics
export interface ApiServiceStats {
  requests: {
    total: number;
    successful: number;
    failed: number;
    byEndpoint: Record<string, { success: number; failed: number }>;
  };
  performance: {
    avgResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
  errors: {
    byType: Record<ApiErrorCode, number>;
    recent: Array<{
      timestamp: string;
      error: ApiError;
      endpoint: string;
    }>;
  };
}

// API client interface
export interface ApiClient {
  get<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
}

// Document processing response
export interface DocumentProcessingResponse {
  course: ProcessedCourse;
  processingTime: number;
  confidenceScore: number;
  warnings?: string[];
}

// Course analytics response
export interface CourseAnalyticsResponse {
  completionRate: number;
  avgQuizScore: number;
  flashcardMastery: number;
  timeSpent: number;
  knowledgeGaps: KnowledgeGap[];
  recommendations: CourseRecommendation[];
}

// Enhanced course interface with analytics
export interface EnhancedCourse extends ProcessedCourse {
  analytics?: {
    completionRate: number;
    avgQuizScore: number;
    flashcardMastery: number;
    timeSpent: number;
    knowledgeGaps: KnowledgeGap[];
    recommendations: CourseRecommendation[];
  };
  lastSynced: string;
  isSynced: boolean;
}

// User profile interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  subscription: {
    type: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due';
    expiresAt?: string;
  };
  preferences: {
    darkMode: boolean;
    learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
    notifications: {
      email: boolean;
      push: boolean;
      quizReminders: boolean;
    };
  };
  stats: ProgressStats;
}

// Flash card mastery update
export interface FlashCardMasteryUpdate {
  courseId: string;
  moduleId: string;
  cardId: string;
  masteryLevel: number;
  timestamp: string;
}

// Quiz answer submission
export interface QuizAnswerSubmission {
  courseId: string;
  moduleId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: string;
}

// Course sharing options
export interface CourseSharingOptions {
  type: 'private' | 'public' | 'collaborative';
  recipients?: string[];
  permissions?: {
    view: boolean;
    edit: boolean;
    share: boolean;
  };
  expiresIn?: number; // milliseconds
}

// Course export options
export interface CourseExportOptions {
  format: 'pdf' | 'notion' | 'slides' | 'markdown';
  includeFlashcards?: boolean;
  includeQuizzes?: boolean;
  includeAnalytics?: boolean;
}

// API analytics tracking
class ApiAnalyticsTracker {
  private stats: ApiAnalytics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    requestHistory: []
  };
  
  trackRequest(metadata: Omit<RequestMetadata, 'id' | 'startTime'> & { startTime?: number }) {
    const id = uuidv4();
    const startTime = metadata.startTime || Date.now();
    
    this.stats.totalRequests++;
    
    const requestMetadata: RequestMetadata = {
      id,
      startTime,
      method: metadata.method,
      url: metadata.url,
      success: metadata.success
    };
    
    if (metadata.endTime) {
      requestMetadata.endTime = metadata.endTime;
      requestMetadata.duration = metadata.endTime - startTime;
    }
    
    if (metadata.statusCode) {
      requestMetadata.statusCode = metadata.statusCode;
    }
    
    if (metadata.error) {
      requestMetadata.error = metadata.error;
      this.stats.failedRequests++;
    } else {
      this.stats.successfulRequests++;
    }
    
    this.stats.requestHistory.push(requestMetadata);
    
    // Keep history size manageable
    if (this.stats.requestHistory.length > 1000) {
      this.stats.requestHistory.shift();
    }
    
    // Update average response time
    const totalTime = this.stats.requestHistory
      .filter(r => r.duration !== undefined)
      .reduce((sum, r) => sum + (r.duration || 0), 0);
      
    this.stats.avgResponseTime = this.stats.requestHistory.length > 0 
      ? totalTime / this.stats.requestHistory.length 
      : 0;
    
    return id;
  }
  
  getStats() {
    return { ...this.stats };
  }
}

// Offline request queue
class OfflineRequestQueue {
  private queue: OfflineRequest[] = [];
  private isProcessing = false;
  private offlineCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private api: AxiosInstance,
    private onQueueEmpty?: () => void
  ) {}
  
  enqueue(request: Omit<OfflineRequest, 'id' | 'timestamp' | 'retryCount'>) {
    if (this.queue.length >= MAX_OFFLINE_QUEUE_SIZE) {
      throw new ApiError(
        'Offline queue is full. Cannot add more requests.',
        ApiErrorCode.OFFLINE
      );
    }
    
    const offlineRequest: OfflineRequest = {
      id: uuidv4(),
      config: request.config,
      resolve: request.resolve,
      reject: request.reject,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.queue.push(offlineRequest);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    if (!this.offlineCheckInterval) {
      this.startOfflineCheck();
    }
    
    return offlineRequest.id;
  }
  
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const request = this.queue[0];
        
        try {
          // Check if we're online
          if (!navigator.onLine) {
            break;
          }
          
          // Make the request
          const response = await this.api.request(request.config);
          request.resolve(response);
          
          // Remove from queue
          this.queue.shift();
        } catch (error: any) {
          if (request.retryCount < MAX_RETRIES) {
            request.retryCount++;
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, RETRY_DELAY * Math.pow(2, request.retryCount))
            );
          } else {
            request.reject(error);
            this.queue.shift();
          }
        }
      }
    } finally {
      this.isProcessing = false;
      
      if (this.queue.length === 0 && this.onQueueEmpty) {
        this.onQueueEmpty();
      }
    }
  }
  
  private startOfflineCheck() {
    this.offlineCheckInterval = setInterval(() => {
      if (navigator.onLine && this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, OFFLINE_CHECK_INTERVAL);
  }
  
  clear() {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
    }
    
    // Reject all queued requests
    this.queue.forEach(request => {
      request.reject(new ApiError(
        'Request canceled due to offline queue clear',
        ApiErrorCode.OFFLINE
      ));
    });
    
    this.queue = [];
  }
  
  getQueueSize() {
    return this.queue.length;
  }
}

// API service class
class ApiService implements ApiClient {
  private axiosInstance: AxiosInstance;
  private analyticsTracker = new ApiAnalyticsTracker();
  private offlineQueue: OfflineRequestQueue;
  private config: Required<ApiServiceConfig>;
  private serverStatus: ServerStatus | null = null;
  private lastStatusCheck: number = 0;
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private rateLimitReset: number | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;
  
  constructor(config?: ApiServiceConfig) {
    this.config = {
      baseUrl: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY,
      enableAnalytics: true,
      enableOfflineQueue: true,
      ...config
    };
    
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': uuidv4(),
        'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0'
      }
    });
    
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      config => {
        const requestId = uuidv4();
        config.headers['X-Request-ID'] = requestId;
        
        // Add auth token if available
        const token = localStorage.getItem('whitepaperAI_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Track request start time
        config.metadata = { startTime: Date.now() };
        
        // Rate limiting
        const now = Date.now();
        if (this.rateLimitReset && now < this.rateLimitReset) {
          throw new ApiError(
            'API rate limit exceeded',
            ApiErrorCode.RATE_LIMITED,
            429,
            this.rateLimitReset - now
          );
        }
        
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      response => {
        // Track response time
        const endTime = Date.now();
        const duration = endTime - (response.config.metadata?.startTime || endTime);
        
        // Update analytics
        if (this.config.enableAnalytics) {
          this.analyticsTracker.trackRequest({
            method: response.config.method || 'GET',
            url: response.config.url || '',
            success: true,
            endTime,
            statusCode: response.status,
            duration
          });
        }
        
        // Update rate limit info
        const rateLimitReset = response.headers['x-ratelimit-reset'];
        if (rateLimitReset) {
          this.rateLimitReset = parseInt(rateLimitReset) * 1000;
        }
        
        // Add request ID to response
        response.data.requestId = response.headers['x-request-id'] || uuidv4();
        response.data.requestTime = duration;
        
        return response;
      },
      async error => {
        const config = error.config;
        const startTime = config?.metadata?.startTime || Date.now();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Update analytics
        if (this.config.enableAnalytics) {
          this.analyticsTracker.trackRequest({
            method: config?.method || 'GET',
            url: config?.url || '',
            success: false,
            endTime,
            statusCode: error.response?.status,
            duration,
            error: error.message
          });
        }
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          const reset = error.response.headers['x-ratelimit-reset'];
          this.rateLimitReset = reset ? parseInt(reset) * 1000 : Date.now() + RATE_LIMIT_RESET_THRESHOLD;
          
          if (config && !config._retry && this.config.maxRetries > 0) {
            config._retry = true;
            config.retryCount = (config.retryCount || 0) + 1;
            
            // Exponential backoff
            const delay = this.config.retryDelay * Math.pow(2, config.retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return this.axiosInstance(config);
          }
        }
        
        // Handle auth errors
        if (error.response?.status === 401) {
          localStorage.removeItem('whitepaperAI_token');
          window.dispatchEvent(new Event('auth:expired'));
        }
        
        // Handle network errors
        if (!navigator.onLine) {
          return new Promise((resolve, reject) => {
            if (this.config.enableOfflineQueue && this.offlineQueue) {
              this.offlineQueue.enqueue({
                config,
                resolve,
                reject
              });
            } else {
              reject(new ApiError(
                'No internet connection',
                ApiErrorCode.OFFLINE
              ));
            }
          });
        }
        
        // Create custom API error
        let apiError;
        const status = error.response?.status;
        
        if (status) {
          switch (status) {
            case 400:
              apiError = new ApiError(
                error.response.data.message || 'Bad request',
                ApiErrorCode.VALIDATION_ERROR,
                status
              );
              break;
            case 401:
            case 403:
              apiError = new ApiError(
                error.response.data.message || 'Authentication error',
                ApiErrorCode.AUTH_ERROR,
                status
              );
              break;
            case 429:
              apiError = new ApiError(
                error.response.data.message || 'API rate limit exceeded',
                ApiErrorCode.RATE_LIMITED,
                status,
                this.rateLimitReset ? this.rateLimitReset - Date.now() : undefined
              );
              break;
            default:
              apiError = new ApiError(
                error.response.data.message || 'Server error',
                ApiErrorCode.SERVER_ERROR,
                status
              );
          }
        } else {
          apiError = new ApiError(
            error.message || 'Network error',
            ApiErrorCode.NETWORK_ERROR
          );
        }
        
        return Promise.reject(apiError);
      }
    );
    
    // Initialize offline queue
    this.offlineQueue = new OfflineRequestQueue(this.axiosInstance, () => {
      console.log('Offline request queue processed');
    });
    
    // Start periodic server status checks
    this.startStatusChecks();
  }
  
  private startStatusChecks() {
    this.checkServerStatus().catch(console.error);
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    
    this.statusCheckInterval = setInterval(() => {
      this.checkServerStatus().catch(console.error);
    }, 30000); // Check every 30 seconds
  }
  
  private async checkServerStatus(): Promise<ServerStatus> {
    const now = Date.now();
    
    // Don't check too frequently
    if (this.lastStatusCheck && now - this.lastStatusCheck < 5000) {
      return this.serverStatus as ServerStatus;
    }
    
    try {
      this.lastStatusCheck = now;
      const response = await this.axiosInstance.get<ServerStatus>('/health');
      this.serverStatus = response.data;
      return response.data;
    } catch (error) {
      this.serverStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          azure_ai: 'disconnected',
          database: 'disconnected',
          processing: 'unavailable'
        },
        limits: {
          max_file_size: '50MB',
          rate_limit: '100 requests/15 minutes'
        },
        performance: {
          response_time: 0,
          uptime: '0%'
        }
      };
      return this.serverStatus;
    }
  }
  
  public async get<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('get', url, undefined, options);
  }
  
  public async post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('post', url, data, options);
  }
  
  public async put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('put', url, data, options);
  }
  
  public async patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('patch', url, data, options);
  }
  
  public async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('delete', url, undefined, options);
  }
  
  private async request<T = any>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url,
        data,
        signal: options?.signal,
        cancelToken: options?.cancelToken?.token,
        timeout: options?.timeout || this.config.timeout
      };
      
      const response = await this.axiosInstance.request<T>(config);
      return {
        ...response,
        requestId: response.headers['x-request-id'] || uuidv4(),
        requestTime: Date.now() - (response.config.metadata?.startTime || Date.now())
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new ApiError('Request canceled', ApiErrorCode.NETWORK_ERROR);
      }
      throw error;
    }
  }
  
  public async processFile(file: File): Promise<ProcessedCourse> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await this.post<DocumentProcessingResponse>('/process-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 600000 // 10 minutes for large files
      });
      
      return response.data.course;
    } catch (error) {
      if (error instanceof ApiError && error.code === ApiErrorCode.PROCESSING_ERROR) {
        throw error;
      }
      throw new ApiError(
        'Failed to process document. Please try again.',
        ApiErrorCode.PROCESSING_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async processURL(url: string): Promise<ProcessedCourse> {
    try {
      const response = await this.post<DocumentProcessingResponse>('/process-url', { url });
      return response.data.course;
    } catch (error) {
      throw new ApiError(
        'Failed to process URL. Please check the link and try again.',
        ApiErrorCode.PROCESSING_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async processText(text: string): Promise<ProcessedCourse> {
    if (!text || text.length < 100) {
      throw new ApiError(
        'Text must be at least 100 characters',
        ApiErrorCode.VALIDATION_ERROR,
        400
      );
    }
    
    try {
      const response = await this.post<DocumentProcessingResponse>('/process-text', { text });
      return response.data.course;
    } catch (error) {
      throw new ApiError(
        'Failed to process text. Please try again.',
        ApiErrorCode.PROCESSING_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async healthCheck(): Promise<ServerStatus> {
    return this.checkServerStatus();
  }
  
  public async getCourses(): Promise<ProcessedCourse[]> {
    try {
      const response = await this.get<ProcessedCourse[]>('/courses');
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to load courses',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async addCourse(course: ProcessedCourse): Promise<ProcessedCourse> {
    try {
      const response = await this.post<ProcessedCourse>('/courses', course);
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to save course',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async updateCourse(
    courseId: string, 
    updates: Partial<Omit<ProcessedCourse, 'id' | 'modules'>>
  ): Promise<ProcessedCourse> {
    try {
      const response = await this.patch<ProcessedCourse>(`/courses/${courseId}`, updates);
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to update course',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async deleteCourse(courseId: string): Promise<void> {
    try {
      await this.delete(`/courses/${courseId}`);
    } catch (error) {
      throw new ApiError(
        'Failed to delete course',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async updateFlashCardMastery(
    courseId: string,
    moduleId: string,
    cardId: string,
    masteryLevel: number
  ): Promise<FlashCard> {
    try {
      const response = await this.patch<FlashCard>(
        `/courses/${courseId}/modules/${moduleId}/flashcards/${cardId}`,
        { masteryLevel }
      );
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to update flashcard mastery',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async updateQuizAnswer(
    courseId: string,
    moduleId: string,
    questionId: string,
    userAnswer: string,
    isCorrect: boolean
  ): Promise<QuizQuestion> {
    try {
      const response = await this.post<QuizQuestion>(
        `/courses/${courseId}/modules/${moduleId}/quiz/${questionId}/answer`,
        { userAnswer, isCorrect }
      );
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to submit quiz answer',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async getCourseAnalytics(courseId: string): Promise<CourseAnalyticsResponse> {
    try {
      const response = await this.get<CourseAnalyticsResponse>(`/courses/${courseId}/analytics`);
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to load course analytics',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async exportCourse(
    courseId: string,
    format: 'pdf' | 'notion' | 'slides' | 'markdown'
  ): Promise<Blob> {
    try {
      const response = await this.get<Blob>(`/courses/${courseId}/export/${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to export course',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async shareCourse(
    courseId: string,
    options: CourseSharingOptions
  ): Promise<string> {
    try {
      const response = await this.post<{ shareLink: string }>(
        `/courses/${courseId}/share`,
        options
      );
      return response.data.shareLink;
    } catch (error) {
      throw new ApiError(
        'Failed to generate share link',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await this.get<UserProfile>('/users/me');
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to load user profile',
        ApiErrorCode.AUTH_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async updateUserPreferences(
    preferences: Partial<UserProfile['preferences']>
  ): Promise<UserProfile> {
    try {
      const response = await this.patch<UserProfile>('/users/me/preferences', preferences);
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to update user preferences',
        ApiErrorCode.SERVER_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    try {
      const response = await this.post<{ token: string; user: UserProfile }>('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Invalid email or password',
        ApiErrorCode.AUTH_ERROR,
        401,
        undefined,
        error
      );
    }
  }
  
  public async signup(
    name: string, 
    email: string, 
    password: string
  ): Promise<{ token: string; user: UserProfile }> {
    try {
      const response = await this.post<{ token: string; user: UserProfile }>('/auth/signup', {
        name,
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw new ApiError(
        'Failed to create account',
        ApiErrorCode.VALIDATION_ERROR,
        undefined,
        undefined,
        error
      );
    }
  }
  
  public async logout(): Promise<void> {
    try {
      await this.post('/auth/logout', {});
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('whitepaperAI_token');
    }
  }
  
  public getAnalyticsStats(): ApiAnalytics {
    return this.analyticsTracker.getStats();
  }
  
  public getServerStatus(): ServerStatus | null {
    return this.serverStatus;
  }
  
  public getOfflineQueueSize(): number {
    return this.offlineQueue.getQueueSize();
  }
  
  public clearOfflineQueue(): void {
    this.offlineQueue.clear();
  }
  
  public getApiStats(): ApiServiceStats {
    const analytics = this.analyticsTracker.getStats();
    const requestHistory = analytics.requestHistory;
    
    // Calculate stats by endpoint
    const byEndpoint: Record<string, { success: number; failed: number }> = {};
    requestHistory.forEach(req => {
      if (!byEndpoint[req.url]) {
        byEndpoint[req.url] = { success: 0, failed: 0 };
      }
      if (req.success) {
        byEndpoint[req.url].success++;
      } else {
        byEndpoint[req.url].failed++;
      }
    });
    
    // Find slowest and fastest endpoints
    let slowestEndpoint = '';
    let fastestEndpoint = '';
    let slowestTime = 0;
    let fastestTime = Infinity;
    
    Object.entries(byEndpoint).forEach(([url, stats]) => {
      const avgTime = requestHistory
        .filter(r => r.url === url && r.duration !== undefined)
        .reduce((sum, r) => sum + (r.duration || 0), 0) / 
        requestHistory.filter(r => r.url === url).length;
      
      if (avgTime > slowestTime) {
        slowestTime = avgTime;
        slowestEndpoint = url;
      }
      
      if (avgTime < fastestTime) {
        fastestTime = avgTime;
        fastestEndpoint = url;
      }
    });
    
    // Error stats
    const errorTypes: Record<ApiErrorCode, number> = {
      [ApiErrorCode.NETWORK_ERROR]: 0,
      [ApiErrorCode.AUTH_ERROR]: 0,
      [ApiErrorCode.VALIDATION_ERROR]: 0,
      [ApiErrorCode.RATE_LIMITED]: 0,
      [ApiErrorCode.SERVER_ERROR]: 0,
      [ApiErrorCode.PROCESSING_ERROR]: 0,
      [ApiErrorCode.OFFLINE]: 0
    };
    
    const recentErrors = requestHistory
      .filter(r => !r.success)
      .slice(-10)
      .map(r => ({
        timestamp: new Date(r.startTime).toISOString(),
        error: new ApiError(
          r.error || 'Unknown error',
          r.statusCode === 401 || r.statusCode === 403 
            ? ApiErrorCode.AUTH_ERROR
            : r.statusCode === 429
              ? ApiErrorCode.RATE_LIMITED
              : r.statusCode && r.statusCode >= 400 && r.statusCode < 500
                ? ApiErrorCode.VALIDATION_ERROR
                : ApiErrorCode.SERVER_ERROR,
          r.statusCode
        ),
        endpoint: r.url
      }));
    
    // Count error types
    recentErrors.forEach(err => {
      errorTypes[err.error.code]++;
    });
    
    return {
      requests: {
        total: analytics.totalRequests,
        successful: analytics.successfulRequests,
        failed: analytics.failedRequests,
        byEndpoint
      },
      performance: {
        avgResponseTime: analytics.avgResponseTime,
        slowestEndpoint,
        fastestEndpoint
      },
      errors: {
        byType: errorTypes,
        recent: recentErrors
      }
    };
  }
}

// Initialize API service
const apiService = new ApiService();

// Export API service instance
export default apiService;

// Export API methods for convenience
export const documentAPI = {
  processFile: apiService.processFile.bind(apiService),
  processURL: apiService.processURL.bind(apiService),
  processText: apiService.processText.bind(apiService),
  healthCheck: apiService.healthCheck.bind(apiService),
  getCourses: apiService.getCourses.bind(apiService),
  addCourse: apiService.addCourse.bind(apiService),
  updateCourse: apiService.updateCourse.bind(apiService),
  deleteCourse: apiService.deleteCourse.bind(apiService),
  updateFlashCardMastery: apiService.updateFlashCardMastery.bind(apiService),
  updateQuizAnswer: apiService.updateQuizAnswer.bind(apiService),
  getCourseAnalytics: apiService.getCourseAnalytics.bind(apiService),
  exportCourse: apiService.exportCourse.bind(apiService),
  shareCourse: apiService.shareCourse.bind(apiService),
  getCurrentUser: apiService.getCurrentUser.bind(apiService),
  updateUserPreferences: apiService.updateUserPreferences.bind(apiService),
  login: apiService.login.bind(apiService),
  signup: apiService.signup.bind(apiService),
  logout: apiService.logout.bind(apiService)
};

// Export API analytics
export const apiAnalytics = {
  getStats: apiService.getAnalyticsStats.bind(apiService),
  getApiStats: apiService.getApiStats.bind(apiService),
  getServerStatus: apiService.getServerStatus.bind(apiService),
  getOfflineQueueSize: apiService.getOfflineQueueSize.bind(apiService),
  clearOfflineQueue: apiService.clearOfflineQueue.bind(apiService)
};