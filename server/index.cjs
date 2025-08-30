
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
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

// Database initialization (using file storage for now)
let db = null;

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

