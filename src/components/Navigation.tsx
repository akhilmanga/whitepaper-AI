import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useProgress as useGlobalProgress } from '../context/ProgressContext';
import ServerStatus from './ServerStatus';
import { 
  BookOpen, 
  Home, 
  Upload, 
  BarChart3, 
  User, 
  LogOut,
  ChevronDown,
  Bell,
  Settings,
  Sparkles,
  Target,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const { courses } = useCourse();
  const { stats } = useGlobalProgress();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Check for dark mode preference
  useEffect(() => {
    const darkMode = localStorage.getItem('darkMode') === 'true' || 
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  // Navigation items
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    ...(user ? [
      { path: '/dashboard', icon: BookOpen, label: 'Dashboard' },
      { path: '/upload', icon: Upload, label: 'Create Course' },
      { path: '/progress', icon: BarChart3, label: 'Progress' }
    ] : [])
  ];
  
  // User menu items
  const userMenuItems = user ? [
    { icon: User, label: 'Profile', action: () => navigate('/profile') },
    { icon: Settings, label: 'Settings', action: () => navigate('/settings') },
    { icon: Moon, label: isDarkMode ? 'Light Mode' : 'Dark Mode', action: toggleDarkMode },
    { icon: LogOut, label: 'Logout', action: logout }
  ] : [
    { icon: User, label: 'Login', action: () => navigate('/login') },
    { icon: Sparkles, label: 'Sign Up', action: () => navigate('/signup') }
  ];
  
  // Calculate course progress
  const totalModules = courses.reduce((sum, course) => sum + course.modules.length, 0);
  const completedModules = courses.reduce((sum, course) => 
    sum + course.modules.filter(m => m.completed).length, 0);
  const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  
  // Get recent achievements
  const recentAchievements = stats.achievements
    .filter(a => a.unlockedAt)
    .slice(0, 3);
  
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">WhitepaperAI</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                             ${isActive 
                               ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                               : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Right Side - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="relative group">
                <button 
                  onClick={() => setUnreadNotifications(0)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
                <div className="absolute right-0 mt-2 w-80 hidden group-hover:block bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notifications</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-lg">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">New course ready</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Your Bitcoin whitepaper course is ready to explore</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-1 rounded-lg">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Achievement unlocked</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">You've mastered 10 flashcards today!</p>
                        </div>
                      </div>
                    </div>
                    <button className="w-full mt-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1">
                      View all notifications
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <ServerStatus />
            
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden md:block font-medium">{user.name}</span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </button>
                
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    >
                      {userMenuItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            item.action();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all transform hover:scale-[1.02]"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <ServerStatus />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium
                             ${isActive 
                               ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                               : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {user && (
                <>
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Progress</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        style={{ width: `${overallProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{overallProgress}% complete</div>
                  </div>
                  
                  {recentAchievements.length > 0 && (
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent Achievements</div>
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {recentAchievements.map((achievement, index) => (
                          <div 
                            key={index}
                            className="flex-shrink-0 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center">
                              <Sparkles className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                {achievement.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                {userMenuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-5 py-2 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setShowMobileSidebar(true);
                }}
                className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-colors
                         ${isActive 
                           ? 'text-blue-600 dark:text-blue-400' 
                           : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {user && (
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Account</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 md:hidden"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              {user && (
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">Overall Progress</span>
                      <span className="font-medium">{overallProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        style={{ width: `${overallProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                               ${isActive 
                                 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                 : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {user && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        navigate('/upload');
                        setShowMobileSidebar(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Create New Course</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/progress');
                        setShowMobileSidebar(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>View Progress</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;