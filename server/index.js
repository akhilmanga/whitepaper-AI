const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Azure AI Configuration
const AZURE_CONFIG = {
  token: process.env.AZURE_AI_TOKEN,
  endpoint: process.env.AZURE_AI_ENDPOINT,
  modelName: process.env.AZURE_AI_MODEL_NAME
};

// Azure AI API call function
async function callAzureAI(prompt, temperature = 0.3, maxTokens = 2048) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AZURE_CONFIG.token}`
    };

    const payload = {
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens,
      model: AZURE_CONFIG.modelName
    };

    const response = await axios.post(
      `${AZURE_CONFIG.endpoint}/chat/completions`,
      payload,
      { headers }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Azure AI API Error:', error.response?.data || error.message);
    throw new Error('Failed to process with Azure AI');
  }
}

// Document processing functions
async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

function preprocessText(text) {
  // Remove excessive whitespace and normalize
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove common PDF artifacts
  cleaned = cleaned.replace(/Page \d+/gi, '');
  cleaned = cleaned.replace(/\d+\s*$/gm, ''); // Remove page numbers at end of lines
  
  // Split into meaningful chunks (paragraphs)
  const chunks = cleaned.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50);
  
  return {
    fullText: cleaned,
    chunks: chunks,
    wordCount: cleaned.split(' ').length
  };
}

async function generateCourseStructure(text) {
  const prompt = `
Analyze this whitepaper and create a structured learning course. Return a JSON object with the following structure:

{
  "title": "Course title based on the document",
  "description": "Brief description of what students will learn",
  "estimatedTime": "Total estimated time in minutes (number)",
  "modules": [
    {
      "title": "Module title",
      "description": "What this module covers",
      "estimatedTime": "Time in minutes (number)",
      "objectives": ["Learning objective 1", "Learning objective 2"],
      "content": "Detailed content summary for this module"
    }
  ]
}

Create 3-5 modules that logically break down the content. Each module should be 10-20 minutes of learning time.

Document text:
${text.substring(0, 8000)}...
`;

  const response = await callAzureAI(prompt, 0.3, 2048);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.error('Failed to parse course structure:', error);
    throw new Error('Failed to generate course structure');
  }
}

async function generateFlashcards(moduleContent, moduleTitle) {
  const prompt = `
Based on this module content, generate 5-8 flashcards for key concepts. Return a JSON array:

[
  {
    "term": "Key term or concept",
    "definition": "Clear, concise definition",
    "example": "Optional example or context",
    "difficulty": "easy|medium|hard"
  }
]

Module: ${moduleTitle}
Content: ${moduleContent.substring(0, 2000)}
`;

  const response = await callAzureAI(prompt, 0.2, 1024);
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const flashcards = JSON.parse(jsonMatch[0]);
      return flashcards.map((card, index) => ({
        id: `fc_${Date.now()}_${index}`,
        ...card,
        masteryLevel: 0,
        nextReview: new Date(Date.now() + 86400000) // 24 hours from now
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to parse flashcards:', error);
    return [];
  }
}

async function generateQuiz(moduleContent, moduleTitle) {
  const prompt = `
Create 3-5 quiz questions based on this module content. Return a JSON array:

[
  {
    "type": "multiple_choice|fill_blank|short_answer",
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // only for multiple_choice
    "correctAnswer": "The correct answer",
    "explanation": "Why this is correct and others are wrong",
    "difficulty": "easy|medium|hard"
  }
]

Module: ${moduleTitle}
Content: ${moduleContent.substring(0, 2000)}
`;

  const response = await callAzureAI(prompt, 0.2, 1024);
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      return questions.map((q, index) => ({
        id: `q_${Date.now()}_${index}`,
        ...q
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to parse quiz questions:', error);
    return [];
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Process document from file upload
app.post('/api/process-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.filename);

    // Extract text from PDF
    const text = await extractTextFromPDF(req.file.path);
    const processedText = preprocessText(text);

    // Generate course structure
    console.log('Generating course structure...');
    const courseStructure = await generateCourseStructure(processedText.fullText);

    // Generate interactive content for each module
    console.log('Generating interactive content...');
    const modulesWithContent = await Promise.all(
      courseStructure.modules.map(async (module, index) => {
        const [flashcards, quiz] = await Promise.all([
          generateFlashcards(module.content, module.title),
          generateQuiz(module.content, module.title)
        ]);

        return {
          id: `module_${Date.now()}_${index}`,
          ...module,
          flashCards: flashcards,
          quiz: quiz,
          completed: false
        };
      })
    );

    const completeCourse = {
      id: `course_${Date.now()}`,
      ...courseStructure,
      modules: modulesWithContent,
      originalDocument: req.file.originalname,
      createdAt: new Date(),
      progress: 0
    };

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(completeCourse);
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process document from URL
app.post('/api/process-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Processing URL:', url);

    // Download the document
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    // Save temporarily
    const tempPath = path.join('uploads', `temp_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);

    // Extract text
    const text = await extractTextFromPDF(tempPath);
    const processedText = preprocessText(text);

    // Generate course structure
    console.log('Generating course structure...');
    const courseStructure = await generateCourseStructure(processedText.fullText);

    // Generate interactive content
    console.log('Generating interactive content...');
    const modulesWithContent = await Promise.all(
      courseStructure.modules.map(async (module, index) => {
        const [flashcards, quiz] = await Promise.all([
          generateFlashcards(module.content, module.title),
          generateQuiz(module.content, module.title)
        ]);

        return {
          id: `module_${Date.now()}_${index}`,
          ...module,
          flashCards: flashcards,
          quiz: quiz,
          completed: false
        };
      })
    );

    const completeCourse = {
      id: `course_${Date.now()}`,
      ...courseStructure,
      modules: modulesWithContent,
      originalDocument: url,
      createdAt: new Date(),
      progress: 0
    };

    // Clean up temp file
    fs.unlinkSync(tempPath);

    res.json(completeCourse);
  } catch (error) {
    console.error('URL processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process document from text input
app.post('/api/process-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'Text must be at least 100 characters long' });
    }

    console.log('Processing text input...');

    const processedText = preprocessText(text);

    // Generate course structure
    console.log('Generating course structure...');
    const courseStructure = await generateCourseStructure(processedText.fullText);

    // Generate interactive content
    console.log('Generating interactive content...');
    const modulesWithContent = await Promise.all(
      courseStructure.modules.map(async (module, index) => {
        const [flashcards, quiz] = await Promise.all([
          generateFlashcards(module.content, module.title),
          generateQuiz(module.content, module.title)
        ]);

        return {
          id: `module_${Date.now()}_${index}`,
          ...module,
          flashCards: flashcards,
          quiz: quiz,
          completed: false
        };
      })
    );

    const completeCourse = {
      id: `course_${Date.now()}`,
      ...courseStructure,
      modules: modulesWithContent,
      originalDocument: 'Text Input',
      createdAt: new Date(),
      progress: 0
    };

    res.json(completeCourse);
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Azure AI Configuration:', {
    endpoint: AZURE_CONFIG.endpoint,
    model: AZURE_CONFIG.modelName,
    tokenPresent: !!AZURE_CONFIG.token
  });
});