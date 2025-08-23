# Whitepaper AI - Interactive Learning Platform

Transform any whitepaper into an interactive learning course in minutes using Azure AI GPT-4o.

## Features

- **Document Processing**: Upload PDFs, paste URLs, or input text directly
- **AI-Powered Analysis**: Uses Azure AI GPT-4o to analyze and structure content
- **Interactive Learning**: Auto-generated flashcards with spaced repetition
- **Smart Quizzes**: Multiple choice, fill-in-the-blank, and short answer questions
- **Progress Tracking**: Comprehensive learning analytics and achievements
- **Export Options**: PDF and slide deck export capabilities

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Azure AI API access with GPT-4o model

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the root directory:
```env
AZURE_AI_TOKEN=your_azure_ai_token_here
AZURE_AI_ENDPOINT=https://models.inference.ai.azure.com
AZURE_AI_MODEL_NAME=gpt-4o
PORT=3001
```

3. **Start the application:**
```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
# Backend server
npm run server

# Frontend (in another terminal)
npm run dev
```

4. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage

### Document Upload
1. Navigate to the Upload page
2. Choose your input method:
   - **PDF Upload**: Drag and drop or select PDF files (up to 50MB)
   - **URL Input**: Paste a direct link to a PDF document
   - **Text Input**: Copy and paste document content directly

### Learning Experience
1. After processing, access your generated course
2. Navigate through structured learning modules
3. Use interactive flashcards with spaced repetition
4. Take quizzes to test your understanding
5. Track your progress and achievements

### API Endpoints

- `POST /api/process-document` - Upload and process PDF file
- `POST /api/process-url` - Process document from URL
- `POST /api/process-text` - Process raw text input
- `GET /api/health` - Server health check

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router DOM
- **HTTP Client**: Axios

### Backend (Node.js + Express)
- **Framework**: Express.js
- **File Processing**: PDF-parse for text extraction
- **AI Integration**: Azure AI GPT-4o API
- **File Upload**: Multer middleware
- **CORS**: Enabled for cross-origin requests

### AI Processing Pipeline
1. **Document Ingestion**: Extract text from PDF or process raw text
2. **Content Analysis**: Send to Azure AI for structure analysis
3. **Course Generation**: Create modules with learning objectives
4. **Interactive Content**: Generate flashcards and quiz questions
5. **Quality Validation**: Ensure educational content accuracy

## Development

### Project Structure
```
whitepaper-ai/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── context/           # React Context providers
│   ├── services/          # API service layer
│   └── App.tsx            # Main application component
├── server/                # Backend Express server
│   └── index.js           # Main server file
├── uploads/               # Temporary file storage
└── package.json           # Dependencies and scripts
```

### Key Components
- **UploadPage**: Document upload and processing interface
- **CoursePage**: Interactive learning experience
- **FlashCardComponent**: Spaced repetition flashcard system
- **QuizComponent**: Interactive quiz engine
- **ProgressPage**: Learning analytics dashboard

### Environment Configuration
The application requires the following environment variables:

- `AZURE_AI_TOKEN`: Your Azure AI API token
- `AZURE_AI_ENDPOINT`: Azure AI API endpoint URL
- `AZURE_AI_MODEL_NAME`: AI model name (gpt-4o)
- `PORT`: Backend server port (default: 3001)

## Deployment

### Production Build
```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm run server
```

### Environment Setup
Ensure all environment variables are properly configured in your production environment.

## Troubleshooting

### Common Issues

1. **Server Connection Failed**
   - Check if backend server is running on port 3001
   - Verify environment variables are set correctly

2. **PDF Processing Errors**
   - Ensure PDF files are text-based (not scanned images)
   - Check file size is under 50MB limit

3. **Azure AI API Errors**
   - Verify API token is valid and has proper permissions
   - Check API endpoint URL is correct
   - Ensure sufficient API quota/credits

### Debug Mode
Set `NODE_ENV=development` to enable detailed error logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs for error details
3. Verify Azure AI API configuration
4. Ensure all dependencies are properly installed