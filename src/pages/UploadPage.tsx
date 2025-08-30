import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { 
  Upload, 
  Link as LinkIcon, 
  Type, 
  Loader, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  Brain,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Globe,
  BookOpen,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type UploadMethod = 'file' | 'url' | 'text';

const UploadPage: React.FC = () => {
  const { addCourse } = useCourse();
  const navigate = useNavigate();
  const [activeMethod, setActiveMethod] = useState<UploadMethod>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const processingStages = [
    { name: 'Initializing', duration: 300 },
    { name: 'Analyzing document structure', duration: 500 },
    { name: 'Extracting key concepts', duration: 700 },
    { name: 'Building learning modules', duration: 800 },
    { name: 'Generating interactive content', duration: 1000 },
    { name: 'Finalizing course structure', duration: 1200 }
  ];
  
  useEffect(() => {
    if (processing) {
      let currentStage = 0;
      let progress = 0;
      
      const processNextStage = () => {
        if (currentStage >= processingStages.length) {
          setProcessingProgress(100);
          return;
        }
        
        const stage = processingStages[currentStage];
        setProcessingStage(stage.name);
        
        // Simulate processing time for this stage
        const interval = setInterval(() => {
          progress += 100 / (stage.duration / 100);
          setProcessingProgress(Math.min(100, progress));
          
          if (progress >= 100) {
            clearInterval(interval);
            currentStage++;
            progress = 0;
            if (currentStage < processingStages.length) {
              setTimeout(processNextStage, 200);
            }
          }
        }, 100);
      };
      
      processNextStage();
    } else {
      setProcessingProgress(0);
      setProcessingStage('');
    }
  }, [processing]);
  
  const canSubmit = () => {
    switch (activeMethod) {
      case 'file':
        return file !== null;
      case 'url':
        return url.trim().length > 0 && isValidUrl(url);
      case 'text':
        return text.trim().length >= 100;
      default:
        return false;
    }
  };
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        setFile(null);
        return;
      }
      
      const validTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Only PDF, TXT, and DOC files are supported');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        return;
      }
      
      const validTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(droppedFile.type)) {
        setError('Invalid file type. Only PDF, TXT, and DOC files are supported');
        return;
      }
      
      setFile(droppedFile);
      setError('');
      setActiveMethod('file');
    }
  };
  
  const handlePreview = async () => {
    if (activeMethod === 'file' && file) {
      try {
        // In a real app, this would extract text from the file
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setPreviewContent(content.substring(0, 500) + '...');
          setShowPreview(true);
        };
        reader.readAsText(file);
      } catch {
        setError('Failed to preview file content');
      }
    } else if (activeMethod === 'url' && url) {
      try {
        // In a real app, this would fetch and extract content from the URL
        const response = await fetch('/api/preview-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (!response.ok) throw new Error('Failed to fetch URL content');
        
        const data = await response.json();
        setPreviewContent(data.content.substring(0, 500) + '...');
        setShowPreview(true);
      } catch {
        setError('Failed to preview URL content');
      }
    } else if (activeMethod === 'text') {
      setPreviewContent(text.substring(0, 500) + '...');
      setShowPreview(true);
    }
  };
  
  const handleSubmit = async () => {
    if (!canSubmit()) return;
    
    setProcessing(true);
    setError('');
    
    try {
      let processedCourse;
      
      switch (activeMethod) {
        case 'file':
          if (!file) throw new Error('No file selected');
          processedCourse = await documentAPI.processFile(file);
          break;
          
        case 'url':
          if (!url) throw new Error('URL is required');
          processedCourse = await documentAPI.processURL(url);
          break;
          
        case 'text':
          if (text.length < 100) throw new Error('Text must be at least 100 characters');
          processedCourse = await documentAPI.processText(text);
          break;
          
        default:
          throw new Error('Invalid upload method');
      }
      
      // Convert the processed course to match our context structure
      const courseForContext = {
        ...processedCourse,
        totalEstimatedTime: processedCourse.estimatedTime,
        createdAt: new Date(processedCourse.createdAt)
      };
      
      addCourse(courseForContext);
      navigate(`/course/${processedCourse.id}`);
    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };
  
  const renderFileUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          file 
            ? 'border-green-300 bg-green-50 dark:border-green-700/50 dark:bg-green-900/20' 
            : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
        />
        
        <div className="flex flex-col items-center">
          {file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">File Selected</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{file.name}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Change file
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Upload your document</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                PDF, TXT, or DOC files up to 50MB
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <Upload className="h-4 w-4" />
                <span>Select file</span>
              </button>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Or drag and drop your file here
              </p>
            </>
          )}
        </div>
      </div>
      
      {file && (
        <div className="flex justify-center">
          <button
            onClick={handlePreview}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Preview document content
          </button>
        </div>
      )}
    </motion.div>
  );
  
  const renderUrlInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Globe className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/whitepaper.pdf"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter a publicly accessible URL to a PDF or technical document
      </p>
      
      {url && (
        <div className="flex justify-center">
          <button
            onClick={handlePreview}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Preview document content
          </button>
        </div>
      )}
    </motion.div>
  );
  
  const renderTextInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Type className="h-5 w-5 text-gray-400" />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your technical content here..."
          rows={8}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter at least 100 characters of technical content
        </p>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {text.length} characters
        </span>
      </div>
      
      {text.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handlePreview}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Preview document content
          </button>
        </div>
      )}
    </motion.div>
  );
  
  const renderProcessingView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
            <Zap className="h-3 w-3 text-yellow-800" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Processing Your Document
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
          Our AI is transforming your document into an interactive learning course
        </p>
        
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{processingStage}</p>
        </div>
        
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">AI Analysis</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Content Structuring</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Interactive Content</p>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-blue-500 mt-1 mr-2 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            While processing, our AI analyzes the document structure, identifies key concepts, and creates a personalized learning path just for you.
          </p>
        </div>
      </div>
    </motion.div>
  );
  
  const renderPreviewModal = () => (
    <AnimatePresence>
      {showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Document Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4">
          <Upload className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create a Learning Course
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Transform any technical document into an interactive learning experience in minutes
        </p>
      </div>
      
      {/* Upload Method Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex justify-center space-x-8" aria-label="Upload methods">
          {['file', 'url', 'text'].map((method) => (
            <button
              key={method}
              onClick={() => setActiveMethod(method as UploadMethod)}
              className={`whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors ${
                activeMethod === method
                  ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-b-0 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {method === 'file' && <Upload className="h-4 w-4 mx-auto mb-1" />}
              {method === 'url' && <LinkIcon className="h-4 w-4 mx-auto mb-1" />}
              {method === 'text' && <Type className="h-4 w-4 mx-auto mb-1" />}
              <span className="mt-1 block">
                {method === 'file' ? 'File Upload' : method === 'url' ? 'URL' : 'Text Input'}
              </span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg"
        >
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-1 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </motion.div>
      )}
      
      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          {processing ? (
            renderProcessingView()
          ) : (
            <>
              {activeMethod === 'file' && renderFileUpload()}
              {activeMethod === 'url' && renderUrlInput()}
              {activeMethod === 'text' && renderTextInput()}
              
              {/* Advanced Options */}
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showAdvancedOptions ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      <span>Hide advanced options</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      <span>Show advanced options</span>
                    </>
                  )}
                </button>
                
                <AnimatePresence>
                  {showAdvancedOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Document Type
                        </label>
                        <select className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          <option>Research Paper</option>
                          <option>Technical Whitepaper</option>
                          <option>Academic Article</option>
                          <option>Technical Documentation</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Target Audience
                        </label>
                        <select className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="optimize-for-mobile"
                            type="checkbox"
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="optimize-for-mobile" className="font-medium text-gray-700 dark:text-gray-300">
                            Optimize course for mobile learning
                          </label>
                          <p className="text-gray-500 dark:text-gray-400">
                            Create shorter modules and more visual content
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            {activeMethod === 'file' && "PDF, TXT, or DOC files up to 50MB"}
            {activeMethod === 'url' && "Publicly accessible URL to a PDF or document"}
            {activeMethod === 'text' && "At least 100 characters of technical content"}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setFile(null);
                setUrl('');
                setText('');
                setError('');
              }}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || processing}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Create Course</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* How It Works */}
      <div className="mt-10">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            How Whitepaper AI Works
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Our AI transforms your document into a structured learning experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Document Analysis</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our AI analyzes the structure and content of your document to identify key concepts and learning objectives
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interactive Content</h3>
            <p className="text-gray-600 dark:text-gray-300">
              We generate flashcards, quizzes, and structured modules to help you learn effectively
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personalized Learning</h3>
            <p className="text-gray-600 dark:text-gray-300">
              The course adapts to your learning pace and style, with progress tracking and knowledge assessment
            </p>
          </div>
        </div>
      </div>
      
      {renderPreviewModal()}
    </div>
  );
};

export default UploadPage;