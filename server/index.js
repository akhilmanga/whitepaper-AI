
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createClient } = require('@libsql/client/web');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.azureedge.net; style-src 'self' 'unsafe-inline'; img-src 'self' ;");
  next();
};

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// Enhanced document storage with UUID-based organization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const uploadDir = `uploads/${userId}/${uuidv4()}/`;
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `source${ext}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 1 
  }
});

// Enhanced middleware stack
app.use(securityHeaders);
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database initialization (Turso - lightweight SQLite alternative)
let db;
try {
  if (process.env.DATABASE_URL) {
    db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN
    });
    
    // Initialize database schema
    db.execute(`
      CREATE TABLE IF NOT EXISTS processed_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        original_filename TEXT,
        document_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed_data TEXT
      )
    `);
  }
} catch (error) {
  console.warn('Database initialization failed, falling back to file storage:', error);
}

// Azure AI configuration with retry logic
const AZURE_CONFIG = {
  endpoint: process.env.AZURE_AI_ENDPOINT || 'https://models.inference.ai.azure.com',
  modelName: process.env.AZURE_AI_MODEL_NAME || 'gpt-4o',
  token: process.env.AZURE_AI_TOKEN,
  maxRetries: 3,
  retryDelay: 1000 // 1 second
};

// Enhanced Azure AI client with retry mechanism
const azureAIClient = {
  async callAzureAI(prompt, temperature = 0.3, maxTokens = 2048, retryCount = 0) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AZURE_CONFIG.token}`
    };
    
    const payload = {
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      model: AZURE_CONFIG.modelName
    };
    
    try {
      const response = await axios.post(
        `${AZURE_CONFIG.endpoint}/chat/completions`,
        payload,
        { headers, timeout: 300000 } // 5 minute timeout
      );
      
      return response.data;
    } catch (error) {
      if (retryCount < AZURE_CONFIG.maxRetries && error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, AZURE_CONFIG.retryDelay * Math.pow(2, retryCount)));
        return this.callAzureAI(prompt, temperature, maxTokens, retryCount + 1);
      }
      
      console.error('Azure AI API error:', {
        status: error.response?.status,
        data: error.response?.data,
        retryCount
      });
      
      throw new Error(`Azure AI processing failed after ${retryCount} retries: ${error.message}`);
    }
  },
  
  // Advanced prompt templates for different processing stages
  promptTemplates: {
    structure: (text, context = '') => `
      ANALYSIS INSTRUCTIONS:
      You are an expert educator specializing in technical content. Analyze the whitepaper excerpt and:

      1. Identify the core concepts and their relationships
      2. Determine natural knowledge boundaries for optimal learning
      3. Create a logical module structure with 3-7 modules (adjust based on complexity)
      4. For each module, provide:
         - A clear, engaging title
         - 2-3 specific learning objectives using Bloom's taxonomy verbs
         - A concise summary highlighting key insights
         - Estimated time to complete (5-20 minutes)
      
      TECHNICAL CONTEXT:
      ${context}
      
      WHITEPAPER EXCERPT (first 2000 characters):
      ${text.substring(0, 2000)}
      
      ADDITIONAL PROCESSING RULES:
      - Preserve all technical terms and mathematical notation exactly
      - Identify code snippets and mark them for special formatting
      - Note any references to figures/tables for later processing
      - If the content appears to be non-technical, adjust learning approach accordingly
      
      OUTPUT FORMAT (STRICT JSON):
      {
        "title": "Course title derived from document",
        "description": "Brief overview of the whitepaper's contribution",
        "modules": [
          {
            "title": "Module title",
            "objectives": ["objective 1", "objective 2"],
            "summary": "Concise module summary",
            "estimatedTime": 15,
            "difficulty": "beginner|intermediate|advanced"
          }
        ],
        "technicalLevel": "beginner|intermediate|advanced",
        "keyConcepts": ["concept 1", "concept 2"]
      }
    `,
    
    flashcards: (content, moduleTitle) => `
      FLASHCARD GENERATION INSTRUCTIONS:
      Create educational flashcards for the specified module. Follow these guidelines:
      
      1. Identify 5-8 key concepts that are fundamental to understanding the module
      2. For each concept:
         - Term: Clear, precise terminology (include LaTeX for math)
         - Definition: Concise explanation in simple language
         - Context: How this concept relates to the broader whitepaper
         - Example: Practical application or illustrative example
         - Difficulty: easy|medium|hard based on conceptual complexity
      
      MODULE: ${moduleTitle}
      CONTENT EXCERPT:
      ${content.substring(0, 2000)}
      
      SPECIAL HANDLING:
      - For mathematical concepts: preserve LaTeX notation exactly
      - For code snippets: include language-specific syntax highlighting instructions
      - For acronyms: always include the full expansion
      
      OUTPUT FORMAT (STRICT JSON ARRAY):
      [
        {
          "term": "Key term or concept",
          "definition": "Clear, concise definition",
          "context": "How this relates to broader concepts",
          "example": "Practical example or application",
          "difficulty": "easy|medium|hard",
          "category": "math|code|concept|terminology"
        }
      ]
    `,
    
    quiz: (content, moduleTitle) => `
      QUIZ GENERATION INSTRUCTIONS:
      Create a comprehensive quiz that assesses understanding across Bloom's taxonomy levels:
      
      1. Generate questions covering:
         - 2 Recall questions (Remember)
         - 2 Comprehension questions (Understand)
         - 2 Application questions (Apply)
         - 1 Analysis question (Analyze)
      
      2. For each question:
         - Clear, unambiguous wording
         - Plausible distractors for multiple choice
         - Reference to specific part of the whitepaper
         - Bloom's taxonomy level identification
         - Difficulty rating (easy|medium|hard)
      
      MODULE: ${moduleTitle}
      CONTENT EXCERPT:
      ${content.substring(0, 2000)}
      
      SPECIAL HANDLING:
      - For mathematical questions: preserve equations in LaTeX
      - For code-related questions: include syntax highlighting
      - Always provide detailed explanations for correct answers
      
      OUTPUT FORMAT (STRICT JSON ARRAY):
      [
        {
          "id": "q_${Date.now()}_1",
          "type": "multiple_choice|fill_blank|short_answer",
          "question": "Question text",
          "options": ["option 1", "option 2", ...] (for multiple choice),
          "correctAnswer": "Correct answer",
          "explanation": "Detailed explanation with reference to whitepaper",
          "bloomLevel": "remember|understand|apply|analyze",
          "difficulty": "easy|medium|hard",
          "whitepaperReference": "Section X, Paragraph Y"
        }
      ]
    `
  }
};

// Document processing utilities with advanced features
const documentUtils = {
  // Enhanced PDF text extraction with layout preservation
  async extractTextFromPDF(filePath) {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer, {
        // Preserve layout and formatting
        pagerender: page => {
          // Custom rendering to maintain structure
          return {
            text: page.text,
            width: page.width,
            height: page.height,
            items: page.items
          };
        }
      });
      
      // Advanced layout analysis to preserve structure
      return this.analyzeLayout(data);
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  },
  
  // Layout analysis to maintain document structure
  analyzeLayout(pdfData) {
    const lines = pdfData.text.split('\n');
    let structuredContent = [];
    let currentSection = { type: 'paragraph', content: [] };
    
    // Analyze font sizes and positions to identify structure
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Detect headings based on capitalization and position
      if (/^[A-Z][A-Z\s:]+$/.test(trimmed) && trimmed.length < 50) {
        if (currentSection.content.length > 0) {
          structuredContent.push(currentSection);
          currentSection = { type: 'heading', content: [trimmed] };
        }
      } 
      // Detect code blocks
      else if (/^ {4,}|\t/.test(line)) {
        if (currentSection.type !== 'code') {
          if (currentSection.content.length > 0) structuredContent.push(currentSection);
          currentSection = { type: 'code', content: [] };
        }
        currentSection.content.push(line.trim());
      }
      // Detect mathematical notation
      else if (/\$.*\$/.test(line) || /\\begin\{.*\}/.test(line)) {
        if (currentSection.type !== 'math') {
          if (currentSection.content.length > 0) structuredContent.push(currentSection);
          currentSection = { type: 'math', content: [] };
        }
        currentSection.content.push(line);
      }
      else {
        currentSection.content.push(trimmed);
      }
    });
    
    if (currentSection.content.length > 0) {
      structuredContent.push(currentSection);
    }
    
    return structuredContent;
  },
  
  // Advanced text preprocessing with semantic chunking
  preprocessText(structuredContent) {
    // Convert structured content to clean text with preserved semantics
    let fullText = '';
    const chunks = [];
    let currentChunk = '';
    let chunkWordCount = 0;
    
    structuredContent.forEach(section => {
      const sectionText = Array.isArray(section.content) ? 
        section.content.join(' ') : section.content;
      
      fullText += `\n\n${sectionText}`;
      
      // Semantic chunking based on section type
      if (section.type === 'heading' || chunkWordCount > 300) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          chunkWordCount = 0;
        }
      }
      
      currentChunk += `\n\n${sectionText}`;
      chunkWordCount += sectionText.split(' ').length;
    });
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    // Remove excessive whitespace and normalize
    const cleaned = fullText.replace(/\s+/g, ' ').trim();
    
    return {
      fullText: cleaned,
      chunks,
      wordCount: cleaned.split(' ').length,
      structuredContent
    };
  },
  
  // Document fingerprinting for duplicate detection
  generateDocumentHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  },
  
  // Advanced course structure validation
  validateCourseStructure(course) {
    // Validate minimum structure
    if (!course.title || !course.modules || course.modules.length < 2) {
      throw new Error('Invalid course structure: must have title and at least 2 modules');
    }
    
    // Validate module structure
    course.modules.forEach((module, index) => {
      if (!module.title || !module.objectives || module.objectives.length < 1) {
        throw new Error(`Invalid module at position ${index + 1}: must have title and objectives`);
      }
      
      if (!module.estimatedTime || module.estimatedTime < 5 || module.estimatedTime > 30) {
        // Default to 15 if invalid
        module.estimatedTime = 15;
      }
    });
    
    return course;
  }
};

// Advanced processing pipeline with caching
const processingPipeline = {
  async processDocument(filePath, userId = 'anonymous') {
    try {
      // 1. Extract text from PDF
      console.log('Extracting text from PDF...');
      const structuredContent = await documentUtils.extractTextFromPDF(filePath);
      const processedText = documentUtils.preprocessText(structuredContent);
      
      // 2. Generate document fingerprint for caching
      const docHash = documentUtils.generateDocumentHash(processedText.fullText);
      
      // 3. Check for cached version
      if (db) {
        try {
          const cached = await db.execute({
            sql: 'SELECT processed_data FROM processed_documents WHERE document_hash = ?',
            args: [docHash]
          });
          
          if (cached.rows.length > 0) {
            console.log('Using cached processing result');
            return JSON.parse(cached.rows[0].processed_data);
          }
        } catch (error) {
          console.warn('Cache lookup failed:', error);
        }
      }
      
      // 4. Generate course structure
      console.log('Generating course structure...');
      const courseStructure = await this.generateCourseStructure(processedText);
      
      // 5. Generate interactive content for each module
      console.log('Generating interactive content...');
      const modulesWithContent = await this.generateModuleContent(courseStructure, processedText);
      
      // 6. Create complete course object
      const completeCourse = {
        id: `course_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...courseStructure,
        modules: modulesWithContent,
        originalDocument: path.basename(filePath),
        createdAt: new Date().toISOString(),
        progress: 0,
        documentHash: docHash,
        wordCount: processedText.wordCount
      };
      
      // 7. Cache the result if database is available
      if (db) {
        try {
          await db.execute({
            sql: `INSERT INTO processed_documents (id, user_id, original_filename, document_hash, processed_data)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              completeCourse.id,
              userId,
              path.basename(filePath),
              docHash,
              JSON.stringify(completeCourse)
            ]
          });
        } catch (error) {
          console.warn('Failed to cache document:', error);
        }
      }
      
      // 8. Clean up uploaded file
      try {
        const uploadDir = path.dirname(filePath);
        fs.rmSync(uploadDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temporary files:', error);
      }
      
      return completeCourse;
    } catch (error) {
      console.error('Document processing error:', error);
      
      // Clean up on failure
      try {
        const uploadDir = path.dirname(filePath);
        fs.rmSync(uploadDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to clean up after error:', cleanupError);
      }
      
      throw error;
    }
  },
  
  async generateCourseStructure(processedText) {
    try {
      // Determine technical context for better prompting
      const technicalContext = this.detectTechnicalContext(processedText.fullText);
      
      const prompt = azureAIClient.promptTemplates.structure(
        processedText.fullText, 
        technicalContext
      );
      
      const response = await azureAIClient.callAzureAI(prompt, 0.2, 2048);
      const content = response.choices[0].message.content;
      
      // Enhanced JSON extraction with validation
      const courseStructure = this.extractAndValidateJSON(
        content, 
        'course structure'
      );
      
      return documentUtils.validateCourseStructure(courseStructure);
    } catch (error) {
      console.error('Course structure generation failed:', error);
      
      // Fallback to rule-based structure if AI fails
      return this.generateFallbackStructure(processedText);
    }
  },
  
  async generateModuleContent(courseStructure, processedText) {
    // Process modules in parallel with controlled concurrency
    const CONCURRENCY_LIMIT = 3;
    const results = [];
    
    for (let i = 0; i < courseStructure.modules.length; i += CONCURRENCY_LIMIT) {
      const batch = courseStructure.modules.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map((module, index) => 
          this.processModule(module, index + i, processedText)
        )
      );
      results.push(...batchResults);
    }
    
    return results;
  },
  
  async processModule(module, index, processedText) {
    try {
      // Find relevant content chunk for this module
      const moduleContent = this.findRelevantContent(module, processedText);
      
      // Generate flashcards and quiz in parallel
      const [flashcards, quiz] = await Promise.all([
        this.generateFlashcards(moduleContent, module.title),
        this.generateQuiz(moduleContent, module.title)
      ]);
      
      return {
        id: `module_${Date.now()}_${index}`,
        ...module,
        content: moduleContent,
        flashCards: flashcards,
        quiz: quiz,
        completed: false,
        progress: 0
      };
    } catch (error) {
      console.error(`Module ${index} processing failed:`, error);
      return {
        id: `module_${Date.now()}_${index}`,
        ...module,
        flashCards: [],
        quiz: [],
        content: '',
        error: 'Failed to generate interactive content'
      };
    }
  },
  
  async generateFlashcards(moduleContent, moduleTitle) {
    try {
      const prompt = azureAIClient.promptTemplates.flashcards(
        moduleContent, 
        moduleTitle
      );
      
      const response = await azureAIClient.callAzureAI(prompt, 0.1, 1024);
      const content = response.choices[0].message.content;
      
      // Extract and validate flashcards
      const flashcards = this.extractAndValidateJSON(
        content,
        'flashcards',
        Array
      );
      
      // Add metadata to flashcards
      return flashcards.map((card, index) => ({
        id: `fc_${Date.now()}_${index}`,
        ...card,
        masteryLevel: 0,
        nextReview: new Date(Date.now() + 86400000), // 24 hours
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Flashcard generation failed:', error);
      return [];
    }
  },
  
  async generateQuiz(moduleContent, moduleTitle) {
    try {
      const prompt = azureAIClient.promptTemplates.quiz(
        moduleContent, 
        moduleTitle
      );
      
      const response = await azureAIClient.callAzureAI(prompt, 0.1, 2048);
      const content = response.choices[0].message.content;
      
      // Extract and validate quiz questions
      const questions = this.extractAndValidateJSON(
        content,
        'quiz questions',
        Array
      );
      
      // Add metadata to questions
      return questions.map((q, index) => ({
        id: `q_${Date.now()}_${index}`,
        ...q,
        answered: false,
        correct: null,
        userAnswer: null,
        answeredAt: null
      }));
    } catch (error) {
      console.error('Quiz generation failed:', error);
      return [];
    }
  },
  
  // Helper methods
  extractAndValidateJSON(text, name, expectedType = Object) {
    try {
      // More robust JSON extraction
      const jsonMatch = text.match(/({[\s\S]*})|(\[[\s\S]*\])/);
      if (!jsonMatch) {
        throw new Error(`No valid JSON found in ${name} response`);
      }
      
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (expectedType && !(parsed instanceof expectedType)) {
        throw new Error(`Invalid ${name} format: expected ${expectedType.name}`);
      }
      
      return parsed;
    } catch (error) {
      console.error(`Failed to parse ${name}:`, error);
      
      // Try to fix common JSON issues
      try {
        const fixed = this.fixCommonJSONIssues(text);
        return JSON.parse(fixed);
      } catch (fixError) {
        throw new Error(`Failed to parse ${name} after fix attempts: ${fixError.message}`);
      }
    }
  },
  
  fixCommonJSONIssues(text) {
    // Handle common JSON issues in AI responses
    return text
      .replace(/'/g, '"') // Replace single quotes with double
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']')
      .replace(/(\w+):/g, '"$1":') // Add quotes to keys
      .replace(/:\s*([a-zA-Z_][\w-]*)\b(?=,|})/g, ':"$1"'); // Quote unquoted values
  },
  
  detectTechnicalContext(text) {
    // Analyze text to determine technical domain for better prompting
    const domains = {
      'blockchain': /blockchain|bitcoin|ethereum|smart contract|decentralized/gi,
      'ai_ml': /machine learning|neural network|deep learning|transformer|llm/gi,
      'crypto': /cryptography|encryption|public key|signature|hash/gi,
      'distributed_systems': /consensus|distributed|paxos|raft|replication/gi,
      'web3': /web3|dapp|nft|token|defi/gi
    };
    
    let context = 'General technical document';
    let maxMatches = 0;
    
    Object.entries(domains).forEach(([domain, regex]) => {
      const matches = (text.match(regex) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        context = `This document is in the ${domain.replace('_', ' ')} domain.`;
      }
    });
    
    return context;
  },
  
  findRelevantContent(module, processedText) {
    // Find content most relevant to this module
    if (processedText.structuredContent) {
      // Use structured content for better relevance
      return processedText.structuredContent
        .filter(section => 
          section.type === 'paragraph' && 
          this.calculateRelevance(section.content.join(' '), module.title) > 0.3
        )
        .map(section => section.content.join(' '))
        .join('\n\n');
    }
    
    // Fallback to simple chunking
    return processedText.chunks
      .filter(chunk => this.calculateRelevance(chunk, module.title) > 0.2)
      .join('\n\n');
  },
  
  calculateRelevance(text, query) {
    // Simple cosine similarity for relevance scoring
    const textWords = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const textWordSet = new Set(textWords);
    const queryWordSet = new Set(queryWords);
    
    let commonWords = 0;
    queryWordSet.forEach(word => {
      if (textWordSet.has(word)) commonWords++;
    });
    
    return commonWords / (queryWords.length || 1);
  },
  
  generateFallbackStructure(processedText) {
    // Rule-based fallback if AI processing fails
    const words = processedText.fullText.split(/\s+/);
    const estimatedTime = Math.min(60, Math.max(10, Math.ceil(words.length / 250 / 5) * 5));
    
    return {
      title: "Document Analysis",
      description: "Automatically generated course structure",
      modules: [
        {
          title: "Introduction & Overview",
          objectives: ["Understand the document's main purpose", "Identify key contributions"],
          summary: processedText.fullText.substring(0, 300) + "...",
          estimatedTime: 10,
          difficulty: "beginner"
        },
        {
          title: "Core Concepts",
          objectives: ["Learn fundamental terminology", "Understand main technical approach"],
          summary: "Key concepts and methodology described in the document",
          estimatedTime: estimatedTime - 10,
          difficulty: "intermediate"
        }
      ],
      technicalLevel: "intermediate",
      keyConcepts: []
    };
  }
};

// API Routes
// Health check with detailed system status
app.get('/api/health', (req, res) => {
  const status = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      azure_ai: AZURE_CONFIG.token ? 'connected' : 'disconnected',
      database: db ? 'connected' : 'file storage',
      processing: 'available'
    },
    limits: {
      max_file_size: '50MB',
      rate_limit: '100 requests/15 minutes'
    }
  };
  
  res.json(status);
});

// Process document from file upload
app.post('/api/process-document', apiLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.headers['x-user-id'] || 'anonymous';
    console.log(`Processing file for user ${userId}:`, req.file.filename);
    
    const course = await processingPipeline.processDocument(req.file.path, userId);
    res.json(course);
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'PROCESSING_ERROR'
    });
  }
});

// Process document from URL
app.post('/api/process-url', apiLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const userId = req.headers['x-user-id'] || 'anonymous';
    console.log(`Processing URL for user ${userId}:`, url);
    
    // Download the content
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'WhitepaperAI/1.0'
      }
    });
    
    // Save to temporary file
    const tempPath = `uploads/temp/${uuidv4()}.html`;
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, response.data);
    
    // Process the downloaded content
    const course = await processingPipeline.processDocument(tempPath, userId);
    
    // Clean up
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.warn('Failed to clean up temp file:', error);
    }
    
    res.json(course);
  } catch (error) {
    console.error('URL processing error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'URL_PROCESSING_ERROR'
    });
  }
});

// Process document from text input
app.post('/api/process-text', apiLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'Text must be at least 100 characters long' });
    }
    
    const userId = req.headers['x-user-id'] || 'anonymous';
    console.log(`Processing text input for user ${userId}...`);
    
    // Create temporary file
    const tempPath = `uploads/temp/${uuidv4()}.txt`;
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, text);
    
    // Process the text
    const course = await processingPipeline.processDocument(tempPath, userId);
    
    // Clean up
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.warn('Failed to clean up temp file:', error);
    }
    
    res.json(course);
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'TEXT_PROCESSING_ERROR'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 50MB.',
        code: 'FILE_SIZE_EXCEEDED'
      });
    }
    return res.status(400).json({ 
      error: `File upload error: ${error.message}`,
      code: 'FILE_UPLOAD_ERROR'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Azure AI Configuration:', { 
    endpoint: AZURE_CONFIG.endpoint,
    model: AZURE_CONFIG.modelName,
    tokenPresent: !!AZURE_CONFIG.token,
    database: db ? 'Turso' : 'File storage'
  });
  
  // Create uploads directory if it doesn't exist
  fs.mkdirSync('uploads', { recursive: true });
  fs.mkdirSync('uploads/temp', { recursive: true });
});
```

## 2. Advanced Frontend Components

### `src/context/CourseContext.tsx` (Enhanced)

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface FlashCard {
  id: string;
  term: string;
  definition: string;
  context?: string;
  example?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: 'math' | 'code' | 'concept' | 'terminology';
  masteryLevel: number;
  nextReview: string;
  createdAt: string;
  lastReviewed?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze';
  difficulty: 'easy' | 'medium' | 'hard';
  whitepaperReference: string;
  answered: boolean;
  correct: boolean | null;
  userAnswer: string | null;
  answeredAt: string | null;
}

export interface CourseModule {
  id: string;
  title: string;
  objectives: string[];
  summary: string;
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  flashCards: FlashCard[];
  quiz: QuizQuestion[];
  completed: boolean;
  progress: number;
  error?: string;
}

export interface ProcessedCourse {
  id: string;
  title: string;
  description: string;
  modules: CourseModule[];
  originalDocument: string;
  createdAt: string;
  progress: number;
  documentHash: string;
  wordCount: number;
  technicalLevel: 'beginner' | 'intermediate' | 'advanced';
  keyConcepts: string[];
}

interface CourseContextType {
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
  getKnowledgeGaps: () => { concept: string; mastery: number }[];
  getPersonalizedRecommendations: () => ProcessedCourse[];
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<ProcessedCourse[]>(() => {
    const saved = localStorage.getItem('whitepaperAI_courses');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentCourse, setCurrentCourse] = useState<ProcessedCourse | null>(null);

  // Persist courses to localStorage
  useEffect(() => {
    localStorage.setItem('whitepaperAI_courses', JSON.stringify(courses));
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

  const addCourse = (course: ProcessedCourse) => {
    setCourses(prev => {
      // Check if course already exists
      const exists = prev.some(c => c.id === course.id);
      if (exists) return prev;
      
      return [course, ...prev];
    });
    setCurrentCourse(course);
  };

  const selectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setCurrentCourse(course);
      // Update URL for shareability
      const params = new URLSearchParams(window.location.search);
      params.set('courseId', courseId);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  const updateModuleProgress = (moduleId: string, completed: boolean, progress?: number) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== currentCourse?.id) return course;
      
      const updatedModules = course.modules.map(module => {
        if (module.id !== moduleId) return module;
        
        // Calculate overall course progress
        const completedModules = course.modules.filter(m => m.completed).length;
        const totalModules = course.modules.length;
        const newProgress = Math.round(((completedModules + (completed ? 1 : 0)) / totalModules) * 100);
        
        return {
          ...module,
          completed,
          progress: progress ?? (completed ? 100 : module.progress)
        };
      });
      
      return {
        ...course,
        modules: updatedModules,
        progress: newProgress
      };
    }));
  };

  const updateFlashCardMastery = (moduleId: string, cardId: string, masteryLevel: number) => {
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
      
      return { ...course, modules: updatedModules };
    }));
  };

  const updateQuizAnswer = (moduleId: string, questionId: string, userAnswer: string, isCorrect: boolean) => {
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
      
      return { ...course, modules: updatedModules };
    }));
  };

  const retryModuleProcessing = async (moduleId: string) => {
    if (!currentCourse) return;
    
    try {
      // Find the module to retry
      const moduleIndex = currentCourse.modules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) throw new Error('Module not found');
      
      // Get the course content (would normally fetch from server)
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
  };

  const exportCourse = async (format: 'pdf' | 'notion' | 'slides') => {
    if (!currentCourse) return;
    
    try {
      // In a real app, this would call your export API
      console.log(`Exporting course ${currentCourse.id} to ${format} format`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would trigger file download
      alert(`Course exported successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error(`Failed to export course as ${format}:`, error);
      alert(`Failed to export course. Please try again.`);
    }
  };

  const shareCourse = async (options: { type: 'private' | 'public' | 'collaborative'; recipients?: string[] }) => {
    if (!currentCourse) throw new Error('No course selected');
    
    try {
      // In a real app, this would call your sharing API
      console.log(`Sharing course ${currentCourse.id} as ${options.type}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate shareable link
      const shareId = Math.random().toString(36).substring(2, 15);
      const baseUrl = window.location.origin;
      const shareLink = `${baseUrl}/shared-course?courseId=${currentCourse.id}&shareId=${shareId}`;
      
      return shareLink;
    } catch (error) {
      console.error('Failed to share course:', error);
      throw new Error('Failed to generate share link. Please try again.');
    }
  };

  const getKnowledgeGaps = () => {
    if (!currentCourse) return [];
    
    // Identify concepts with low mastery
    const lowMasteryConcepts = currentCourse.modules.flatMap(module => 
      module.flashCards
        .filter(card => card.masteryLevel < 50)
        .map(card => ({
          concept: card.term,
          mastery: card.masteryLevel
        }))
    );
    
    // Sort by lowest mastery first
    return lowMasteryConcepts.sort((a, b) => a.mastery - b.mastery);
  };

  const getPersonalizedRecommendations = () => {
    if (!currentCourse) return [];
    
    // In a real app, this would call a recommendation API
    // For now, return some mock recommendations based on current course
    
    const technicalLevel = currentCourse.technicalLevel;
    const keyConcepts = currentCourse.keyConcepts;
    
    // Generate some related courses
    return keyConcepts.slice(0, 3).map(concept => ({
      id: `rec_${concept.toLowerCase().replace(/\s+/g, '_')}`,
      title: `Advanced ${concept} Concepts`,
      description: `Deep dive into advanced aspects of ${concept}`,
      modules: [
        {
          id: `mod_rec_1`,
          title: "Core Principles",
          objectives: ["Understand advanced principles", "Apply concepts in complex scenarios"],
          summary: "In-depth exploration of core principles",
          estimatedTime: 25,
          difficulty: technicalLevel === 'beginner' ? 'intermediate' : 'advanced',
          content: "Detailed content about advanced concepts...",
          flashCards: [],
          quiz: [],
          completed: false,
          progress: 0
        }
      ],
      originalDocument: `advanced_${concept.toLowerCase()}.pdf`,
      createdAt: new Date().toISOString(),
      progress: 0,
      documentHash: `hash_${Math.random().toString(36).substring(2)}`,
      wordCount: 1500,
      technicalLevel: technicalLevel === 'beginner' ? 'intermediate' : 'advanced',
      keyConcepts: [concept]
    }));
  };

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
      getPersonalizedRecommendations
    }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};
```

### `src/components/FlashCardComponent.tsx` (Enhanced)

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useCourse, FlashCard, CourseModule } from '../context/CourseContext';
import { RotateCcw, ChevronLeft, ChevronRight, Star, Brain, Target, Sparkles, BookOpen, Flame } from 'lucide-react';
import MathJax from 'react-mathjax';

interface FlashCardComponentProps {
  cards: FlashCard[];
  courseId: string;
  moduleId: string;
  onCompletion?: () => void;
  mode?: 'study' | 'review'; // Study mode shows all cards, review mode shows due cards
  difficultyFilter?: 'easy' | 'medium' | 'hard' | 'all';
}

const FlashCardComponent: React.FC<FlashCardComponentProps> = ({
  cards,
  courseId,
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
      // Handle LaTeX
      let processed = content.replace(/\$([^\$]+)\$/g, (match, p1) => `\\(${p1}\\)`);
      
      // Handle code blocks
      processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<code class="language-${lang || 'text'}">${code.trim()}</code>`;
      });
      
      return processed;
    };

    if (isFlipped) {
      return (
        <MathJax.Provider>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center p-6">
              <MathJax.Node formula={processContent(card.definition)} />
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
                <MathJax.Node formula={processContent(card.example)} />
              </div>
            )}
          </div>
        </MathJax.Provider>
      );
    }
    
    return (
      <MathJax.Provider>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <MathJax.Node formula={processContent(card.term)} />
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
      </MathJax.Provider>
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
```

### `src/pages/CoursePage.tsx` (Enhanced)

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, CourseModule, useProgress } from '../context/CourseContext';
import { useProgress as useGlobalProgress } from '../context/ProgressContext';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Target, 
  BarChart3, 
  Sparkles,
  Share2,
  Download,
  Users,
  Flame,
  Star,
  Brain,
  Trophy,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import FlashCardComponent from '../components/FlashCardComponent';
import QuizComponent from '../components/QuizComponent';
import KnowledgeMap from '../components/KnowledgeMap';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'overview' | 'flashcards' | 'quiz' | 'knowledge-map';

const CoursePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentCourse, 
    updateModuleProgress,
    getKnowledgeGaps,
    getPersonalizedRecommendations
  } = useCourse();
  const { addStudySession } = useGlobalProgress();
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [moduleRetryCount, setModuleRetryCount] = useState<{ [key: string]: number }>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      // In a real app, this would fetch the course if not already loaded
      // For now, we assume it's already in context
    }
  }, [id]);

  useEffect(() => {
    // Track study session when component mounts
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      if (duration > 30000 && currentCourse) { // Only track sessions > 30 seconds
        addStudySession({
          courseId: currentCourse.id,
          duration,
          timestamp: new Date().toISOString(),
          modulesCompleted: currentCourse.modules.filter(m => m.completed).length
        });
      }
    };
  }, [currentCourse]);

  if (!currentCourse) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading course content...</p>
      </div>
    );
  }

  const currentModule = currentCourse.modules[selectedModuleIndex];
  const completedModules = currentCourse.modules.filter(m => m.completed).length;
  const totalModules = currentCourse.modules.length;
  const courseProgress = Math.round((completedModules / totalModules) * 100);
  const knowledgeGaps = getKnowledgeGaps();
  const recommendations = getPersonalizedRecommendations();

  const handleModuleSelect = (index: number) => {
    setSelectedModuleIndex(index);
    setViewMode('overview');
  };

  const handleModuleComplete = (completed: boolean) => {
    updateModuleProgress(currentModule.id, completed);
    
    if (completed && selectedModuleIndex < totalModules - 1) {
      setTimeout(() => {
        setSelectedModuleIndex(prev => prev + 1);
      }, 1000);
    }
  };

  const handleExport = async (format: 'pdf' | 'notion' | 'slides') => {
    try {
      await currentCourse.exportCourse(format);
      setShowExportOptions(false);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    }
  };

  const handleShare = async (type: 'private' | 'public' | 'collaborative') => {
    try {
      const shareLink = await currentCourse.shareCourse({ type });
      navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
      setShowShareOptions(false);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleRetryModule = async () => {
    try {
      await currentCourse.retryModuleProcessing(currentModule.id);
      setProcessingError(null);
      setModuleRetryCount(prev => ({
        ...prev,
        [currentModule.id]: (prev[currentModule.id] || 0) + 1
      }));
    } catch (error) {
      setProcessingError(error.message);
    }
  };

  const renderModuleContent = () => {
    if (currentModule.error && moduleRetryCount[currentModule.id] < 3) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Content Generation Failed</h3>
          <p className="text-yellow-700 mb-4">
            {currentModule.error}
          </p>
          <button
            onClick={handleRetryModule}
            className="inline-flex items-center space-x-2 bg-yellow-100 hover:bg-yellow-200 
                     text-yellow-800 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Content Generation</span>
          </button>
        </div>
      );
    }

    switch (viewMode) {
      case 'overview':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{currentModule.title}</h2>
                  <p className="text-gray-600">{currentModule.summary}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Time Estimate</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentModule.estimatedTime} min</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Learning Objectives</h3>
                </div>
                <ul className="space-y-1">
                  {currentModule.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-1">•</span>
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Difficulty</h3>
                </div>
                <div className="flex items-center">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-1
                                ${i < (currentModule.difficulty === 'beginner' ? 1 : 
                                      currentModule.difficulty === 'intermediate' ? 2 : 3) 
                                  ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {knowledgeGaps.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-500 mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Knowledge Gaps Detected</h3>
                    <p className="text-yellow-700 mb-3">
                      Based on your progress, we've identified some concepts you might want to review:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {knowledgeGaps.slice(0, 3).map((gap, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          {gap.concept} ({gap.mastery}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Module Content</h3>
              </div>
              <div className="p-6 prose max-w-none">
                <p>{currentModule.content.substring(0, 500)}...</p>
                <button
                  onClick={() => setViewMode('flashcards')}
                  className="mt-4 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 
                           text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Start Learning with Flashcards</span>
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'flashcards':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FlashCardComponent
              cards={currentModule.flashCards}
              courseId={currentCourse.id}
              moduleId={currentModule.id}
              onCompletion={() => {
                handleModuleComplete(true);
                setViewMode('quiz');
              }}
            />
          </motion.div>
        );

      case 'quiz':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <QuizComponent
              questions={currentModule.quiz}
              onComplete={(score) => {
                // If score is high enough, mark module as completed
                if (score >= 70) {
                  handleModuleComplete(true);
                }
                setViewMode('overview');
              }}
            />
          </motion.div>
        );

      case 'knowledge-map':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <KnowledgeMap 
              courseId={currentCourse.id} 
              moduleId={currentModule.id}
              onConceptSelect={(concept) => {
                // Could navigate to specific content related to the concept
                console.log('Selected concept:', concept);
              }}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Module Navigation */}
          <div 
            ref={sidebarRef}
            className="lg:w-80 flex-shrink-0 space-y-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
                <span className="text-sm text-gray-500">
                  {completedModules}/{totalModules}
                </span>
              </div>
              
              <div className="space-y-2">
                {currentCourse.modules.map((module, index) => {
                  const isCurrent = index === selectedModuleIndex;
                  const isCompleted = module.completed;
                  const isLocked = index > completedModules;
                  
                  return (
                    <button
                      key={module.id}
                      onClick={() => !isLocked && handleModuleSelect(index)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden
                                ${isCurrent 
                                  ? 'bg-blue-50 border border-blue-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.5)]' 
                                  : isCompleted
                                    ? 'bg-green-50 hover:bg-green-100'
                                    : isLocked
                                      ? 'bg-gray-50 hover:bg-gray-100 cursor-not-allowed opacity-50'
                                      : 'hover:bg-gray-50'}`}
                    >
                      {isCompleted && (
                        <div className="absolute top-3 right-3 text-green-500">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                      ${isCompleted 
                                        ? 'bg-green-100 text-green-600' 
                                        : isCurrent
                                          ? 'bg-blue-100 text-blue-600'
                                          : isLocked
                                            ? 'bg-gray-200 text-gray-400'
                                            : 'bg-purple-100 text-purple-600'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{module.title}</h3>
                          <div className="flex items-center mt-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500 mr-2">
                              {module.estimatedTime} min
                            </span>
                            {module.difficulty && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs
                                            ${module.difficulty === 'beginner' 
                                              ? 'bg-green-100 text-green-800' 
                                              : module.difficulty === 'intermediate'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'}`}>
                                {module.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Course Progress Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
                <span className="text-sm font-semibold text-blue-600">
                  {courseProgress}%
                </span>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${courseProgress}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {completedModules}
                  </div>
                  <div className="text-sm text-gray-600">Modules</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {currentCourse.modules.reduce((sum, m) => sum + m.flashCards.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Flashcards</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 
                         hover:border-blue-500 text-gray-700 px-4 py-2.5 rounded-lg font-medium 
                         transition-colors shadow-sm"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Course</span>
              </button>
              
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 
                         hover:border-blue-500 text-gray-700 px-4 py-2.5 rounded-lg font-medium 
                         transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export Course</span>
              </button>
              
              {recommendations.length > 0 && (
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r 
                           from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium 
                           transition-colors shadow-sm hover:from-blue-600 hover:to-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Recommended Next Steps</span>
                </button>
              )}
            </div>

            {/* Share Options */}
            {showShareOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10"
              >
                <button
                  onClick={() => handleShare('public')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Share Publicly (Read-Only)</span>
                </button>
                <button
                  onClick={() => handleShare('private')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Share Privately (With Progress)</span>
                </button>
                <button
                  onClick={() => handleShare('collaborative')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Collaborative Learning Group</span>
                </button>
              </motion.div>
            )}

            {/* Export Options */}
            {showExportOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10"
              >
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={() => handleExport('notion')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <NotionLogo className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export to Notion</span>
                </button>
                <button
                  onClick={() => handleExport('slides')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center"
                >
                  <Presentation className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Export as Slides</span>
                </button>
              </motion.div>
            )}

            {/* Recommendations */}
            {showRecommendations && recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10 max-h-96 overflow-y-auto"
              >
                {recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {rec.originalDocument}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Main Content Area */}
          <div ref={contentRef} className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Course Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <button
                      onClick={() => navigate(-1)}
                      className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span>Back to Dashboard</span>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{currentCourse.title}</h1>
                    <p className="text-gray-600 mt-1">{currentCourse.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-5 w-5 ${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">(4.7/5 • 248 reviews)</span>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="flex border-b border-gray-200 mt-4 -mx-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: BookOpen },
                    { id: 'flashcards', label: 'Flashcards', icon: Sparkles },
                    { id: 'quiz', label: 'Quiz', icon: Target },
                    { id: 'knowledge-map', label: 'Knowledge Map', icon: Brain }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id as ViewMode)}
                      className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors
                                ${viewMode === tab.id 
                                  ? 'border-blue-600 text-blue-600' 
                                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {renderModuleContent()}
                </AnimatePresence>
              </div>
            </div>

            {/* Module Navigation Controls */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={selectedModuleIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 disabled:text-gray-400 
                         hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Module</span>
              </button>
              
              <button
                onClick={handleNext}
                disabled={selectedModuleIndex >= totalModules - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white rounded-lg font-medium transition-colors"
              >
                <span>Next Module</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for icons not in lucide-react
const Globe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20z" />
    <path d="M2 12h20M12 2v20" />
  </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const NotionLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.8 2.4H4.8C3.7 2.4 2.8 3.3 2.8 4.4V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3.2h3.6c1.1 0 2-.9 2-2v-6.4c0-1.1-.9-2-2-2H10.8V4.4c0-1.1-.9-2-2-2z"/>
  </svg>
);

const Presentation = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export default CoursePage;
```

## 3. Advanced Styling (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom animations for flashcard flipping */
@keyframes flipInY {
  from {
    transform: rotateY(0deg);
    opacity: 1;
  }
  to {
    transform: rotateY(180deg);
    opacity: 1;
  }
}

.animate__flipInY {
  animation-name: flipInY;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Confetti animation */
@keyframes fall {
  to {
    transform: translateY(100vh);
  }
}

/* MathJax styling */
.mjx-chtml {
  @apply inline-block;
}

.mjx-char {
  @apply text-gray-900;
}

/* Code block styling */
code[class*="language-"],
pre[class*="language-"] {
  @apply font-mono text-sm rounded-lg p-4 my-2 overflow-x-auto;
  line-height: 1.5;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  @apply text-gray-500 italic;
}

.token.punctuation {
  @apply text-gray-700;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  @apply text-blue-600;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  @apply text-green-600;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  @apply text-orange-500;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  @apply text-purple-600;
}

.token.function,
.token.class-name {
  @apply text-indigo-600;
}

.token.regex,
.token.important,
.token.variable {
  @apply text-red-600;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}

/* Progress bar animation */
@keyframes progress-bar-stripes {
  0% { background-position: 40px 0; }
  100% { background-position: 0 0; }
}

.progress-striped {
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
  background-size: 40px 40px;
}

/* Spaced repetition indicators */
.mastery-low {
  @apply border-2 border-red-500;
}

.mastery-medium {
  @apply border-2 border-yellow-500;
}

.mastery-high {
  @apply border-2 border-green-500;
}

/* 3D card flip effect */
.perspective-1000 {
  perspective: 1000px;
}

.backface-hidden {
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* Enhanced button effects */
.button-glow {
  transition: all 0.3s ease;
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
}

.button-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Knowledge map styling */
.knowledge-node {
  transition: all 0.3s ease;
  cursor: pointer;
}

.knowledge-node:hover {
  transform: scale(1.1);
  z-index: 10;
}

.knowledge-link {
  stroke: #94a3b8;
  stroke-width: 1.5;
  transition: stroke 0.3s ease;
}

.knowledge-link:hover {
  stroke: #3b82f6;
  stroke-width: 2.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .mobile-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    border-top: 1px solid #e2e8f0;
    background: white;
    padding: 0.75rem;
  }
  
  .mobile-content {
    padding-bottom: 5rem;
  }
  
  .mobile-tab {
    flex: 1;
    text-align: center;
    padding: 0.5rem;
    font-size: 0.875rem;
  }
  
  .mobile-tab.active {
    color: #3b82f6;
    font-weight: 500;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dark .prose {
    color: #e2e8f0;
  }
  
  .dark .prose a {
    color: #60a5fa;
  }
  
  .dark .prose strong {
    color: #f1f5f9;
  }
  
  .dark .prose code {
    background-color: #334155;
    color: #e2e8f0;
  }
  
  .dark .knowledge-link {
    stroke: #475569;
  }
  
  .dark .knowledge-link:hover {
    stroke: #93c5fd;
  }
}



