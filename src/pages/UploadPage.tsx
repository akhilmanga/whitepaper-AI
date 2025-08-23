import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { documentAPI } from '../services/api';
import { Upload, Link as LinkIcon, Type, FileText, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

type UploadMethod = 'file' | 'url' | 'text';

const UploadPage: React.FC = () => {
  const [activeMethod, setActiveMethod] = useState<UploadMethod>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { addCourse } = useCourse();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        setError('File size must be less than 50MB');
        return;
      }
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleSubmit = async () => {
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
          if (!url.trim()) throw new Error('No URL provided');
          processedCourse = await documentAPI.processURL(url.trim());
          break;
        case 'text':
          if (!text.trim()) throw new Error('No text provided');
          processedCourse = await documentAPI.processText(text.trim());
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

  const canSubmit = () => {
    switch (activeMethod) {
      case 'file':
        return file !== null;
      case 'url':
        return url.trim() !== '';
      case 'text':
        return text.trim().length > 100;
      default:
        return false;
    }
  };

  if (processing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <Loader className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing Your Document</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Our AI is analyzing your document and creating an interactive learning experience. 
            This typically takes 2-3 minutes.
          </p>
          
          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700">Document uploaded and parsed</span>
            </div>
            <div className="flex items-center space-x-3">
              <Loader className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-sm text-gray-700">AI analyzing content structure...</span>
            </div>
            <div className="flex items-center space-x-3">
              <Loader className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-sm text-gray-700">Generating flashcards and quizzes...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Whitepaper</h1>
        <p className="text-gray-600">Transform any technical document into an interactive learning experience</p>
      </div>

      {/* Method Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveMethod('file')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeMethod === 'file'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload PDF</span>
          </button>
          <button
            onClick={() => setActiveMethod('url')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeMethod === 'url'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            <span>From URL</span>
          </button>
          <button
            onClick={() => setActiveMethod('text')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeMethod === 'text'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Type className="h-4 w-4" />
            <span>Paste Text</span>
          </button>
        </div>

        {/* File Upload */}
        {activeMethod === 'file' && (
          <div
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-12 text-center transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {file ? (
              <div>
                <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {Math.round(file.size / 1024 / 1024 * 100) / 100} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-700 mb-2">
                  Drag and drop your PDF here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: 50MB
                </p>
              </div>
            )}
          </div>
        )}

        {/* URL Input */}
        {activeMethod === 'url' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/whitepaper.pdf"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter a direct link to a PDF document
            </p>
          </div>
        )}

        {/* Text Input */}
        {activeMethod === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Document Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the content of your whitepaper here..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Minimum 100 characters required. {text.length}/100
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 mt-4 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit() || processing}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          <span>Create Learning Course</span>
          {processing && <Loader className="h-5 w-5 animate-spin ml-2" />}
        </button>
      </div>

      {/* Processing Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Our AI analyzes your document structure and content</li>
          <li>• Key concepts and terms are automatically identified</li>
          <li>• Interactive flashcards and quizzes are generated</li>
          <li>• A personalized learning path is created</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadPage;