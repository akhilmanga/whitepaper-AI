import React from 'react';
import { useProgress } from '../context/ProgressContext';
import { useCourse } from '../context/CourseContext';
import { Trophy, Clock, Target, TrendingUp, Calendar, Zap, Award, Star } from 'lucide-react';

const ProgressPage: React.FC = () => {
  const { stats } = useProgress();
  const { courses } = useCourse();

  const recentSessions = stats.studySessions.slice(-5).reverse();
  const totalCards = courses.flatMap(c => c.modules.flatMap(m => m.flashCards)).length;
  const averageMastery = Math.round(
    courses
      .flatMap(c => c.modules.flatMap(m => m.flashCards))
      .reduce((sum, card) => sum + card.masteryLevel, 0) / Math.max(totalCards, 1)
  );

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-green-600 bg-green-100';
    if (streak >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Progress</h1>
        <p className="text-gray-600">Track your achievements and learning statistics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Study Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(stats.totalStudyTime / 60)}h {stats.totalStudyTime % 60}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Quiz Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageQuizScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getStreakColor(stats.currentStreak).replace('text-', 'bg-').replace('bg-', 'bg-').replace('-600', '-100')}`}>
              <Zap className={`h-6 w-6 ${getStreakColor(stats.currentStreak).split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{stats.currentStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Card Mastery</p>
              <p className="text-2xl font-bold text-gray-900">{averageMastery}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Achievements</h2>
            <div className="grid gap-4">
              {stats.achievements.map(achievement => (
                <div 
                  key={achievement.id} 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    achievement.unlockedAt 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`text-3xl ${achievement.unlockedAt ? 'grayscale-0' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold ${
                          achievement.unlockedAt ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {achievement.title}
                        </h3>
                        {achievement.unlockedAt && (
                          <Award className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className={`text-sm mb-3 ${
                        achievement.unlockedAt ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      {!achievement.unlockedAt && (
                        <div>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}%</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${achievement.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Study Sessions & Stats */}
        <div className="space-y-6">
          {/* Recent Sessions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
            <div className="space-y-3">
              {recentSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.duration} min study
                    </p>
                    <p className="text-sm text-gray-600">
                      {session.date.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {session.modulesCompleted} modules
                    </p>
                    {session.quizScore && (
                      <p className="text-sm text-green-600">
                        {session.quizScore}% quiz
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Best streak</span>
                <span className="font-semibold text-gray-900">{stats.longestStreak} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cards mastered</span>
                <span className="font-semibold text-gray-900">{stats.masteredCards}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Courses completed</span>
                <span className="font-semibold text-gray-900">{stats.totalCoursesCompleted}</span>
              </div>
            </div>
          </div>

          {/* Study Goal */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Today's Goal</h3>
            <p className="text-blue-100 mb-4">Complete 1 learning session</p>
            <div className="bg-white/20 rounded-full h-2 mb-2">
              <div className="bg-white h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-sm text-blue-100">75% complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;