import React, { useState, useEffect } from 'react';
import { 
  Server, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  CheckCircle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Database,
  Cloud
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';

interface ServerStatus {
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
}

const ServerStatus: React.FC = () => {
  const { currentCourse } = useCourse();
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const checkServerStatus = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      setServerStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check server status:', error);
      setServerStatus({
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
        }
      });
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };
  
  useEffect(() => {
    // Initial check
    checkServerStatus();
    
    // Set up periodic checks
    const interval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'loading':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <WifiOff className="h-4 w-4" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };
  
  const getStatusText = () => {
    if (!serverStatus) return 'Checking...';
    
    if (serverStatus.status === 'ok') {
      return 'All systems operational';
    } else if (serverStatus.status === 'warning') {
      return 'Service degradation';
    } else if (serverStatus.status === 'error') {
      return 'Service disruption';
    }
    return 'Checking status...';
  };
  
  const renderTooltip = () => {
    if (!serverStatus) return null;
    
    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Server Status</h4>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : '...'}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div className="flex items-center space-x-2">
              <Cloud className="h-4 w-4 text-blue-400" />
              <span>Azure AI</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              serverStatus.services.azure_ai === 'connected' 
                ? 'bg-green-800 text-green-100' 
                : 'bg-red-800 text-red-100'
            }`}>
              {serverStatus.services.azure_ai === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-purple-400" />
              <span>Database</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              serverStatus.services.database === 'connected' 
                ? 'bg-green-800 text-green-100' 
                : 'bg-red-800 text-red-100'
            }`}>
              {serverStatus.services.database === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span>Security</span>
            </div>
            <p className="text-gray-300 text-xs">
              All connections are encrypted with TLS 1.3. Your documents are processed securely and never stored long-term without your permission.
            </p>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-400">Max file size</div>
                <div className="font-medium">{serverStatus.limits.max_file_size}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Rate limit</div>
                <div className="font-medium">{serverStatus.limits.rate_limit}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    );
  };
  
  return (
    <div className="relative group">
      <button
        onClick={checkServerStatus}
        disabled={isChecking}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          serverStatus 
            ? `${getStatusColor(serverStatus.status)} hover:opacity-90`
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Click to refresh server status"
      >
        {isChecking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          getIcon(serverStatus ? serverStatus.status : 'loading')
        )}
        <span>{isChecking ? 'Checking...' : getStatusText()}</span>
        <RefreshCw className={`h-3.5 w-3.5 ml-1 transition-transform ${isChecking ? 'animate-spin' : 'group-hover:rotate-180'}`} />
      </button>
      
      {renderTooltip()}
    </div>
  );
};

export default ServerStatus;