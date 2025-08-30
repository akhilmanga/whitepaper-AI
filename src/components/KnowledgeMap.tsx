import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  BookOpen, 
  Search
} from 'lucide-react';

interface KnowledgeMapProps {
  courseId: string;
  moduleId?: string;
  onConceptSelect?: (concept: string) => void;
}

interface ConceptNode {
  id: string;
  name: string;
  mastery: number;
  connections: string[];
  category: 'fundamental' | 'intermediate' | 'advanced';
  x: number;
  y: number;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ 
  courseId, 
  moduleId, 
  onConceptSelect 
}) => {
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mastered' | 'learning' | 'needs-work'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    // Generate mock knowledge map data
    const mockConcepts: ConceptNode[] = [
      {
        id: 'blockchain',
        name: 'Blockchain',
        mastery: 85,
        connections: ['consensus', 'cryptography', 'distributed-systems'],
        category: 'fundamental',
        x: 200,
        y: 150
      },
      {
        id: 'consensus',
        name: 'Consensus Mechanisms',
        mastery: 72,
        connections: ['proof-of-work', 'proof-of-stake'],
        category: 'intermediate',
        x: 350,
        y: 100
      },
      {
        id: 'cryptography',
        name: 'Cryptography',
        mastery: 90,
        connections: ['hashing', 'digital-signatures'],
        category: 'fundamental',
        x: 150,
        y: 250
      },
      {
        id: 'distributed-systems',
        name: 'Distributed Systems',
        mastery: 45,
        connections: ['networking', 'fault-tolerance'],
        category: 'advanced',
        x: 300,
        y: 200
      },
      {
        id: 'proof-of-work',
        name: 'Proof of Work',
        mastery: 68,
        connections: ['mining', 'difficulty-adjustment'],
        category: 'intermediate',
        x: 450,
        y: 80
      },
      {
        id: 'proof-of-stake',
        name: 'Proof of Stake',
        mastery: 55,
        connections: ['validators', 'slashing'],
        category: 'intermediate',
        x: 400,
        y: 150
      },
      {
        id: 'hashing',
        name: 'Hash Functions',
        mastery: 88,
        connections: ['merkle-trees'],
        category: 'fundamental',
        x: 100,
        y: 300
      },
      {
        id: 'digital-signatures',
        name: 'Digital Signatures',
        mastery: 75,
        connections: ['public-key-crypto'],
        category: 'intermediate',
        x: 200,
        y: 320
      }
    ];
    
    setConcepts(mockConcepts);
  }, [courseId, moduleId]);
  
  const filteredConcepts = concepts.filter(concept => {
    // Apply mastery filter
    if (filter === 'mastered' && concept.mastery < 80) return false;
    if (filter === 'learning' && (concept.mastery < 50 || concept.mastery >= 80)) return false;
    if (filter === 'needs-work' && concept.mastery >= 50) return false;
    
    // Apply search filter
    if (searchTerm && !concept.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return '#10B981'; // Green
    if (mastery >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fundamental': return '#3B82F6'; // Blue
      case 'intermediate': return '#8B5CF6'; // Purple
      case 'advanced': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };
  
  const handleConceptClick = (concept: ConceptNode) => {
    setSelectedConcept(concept.id);
    if (onConceptSelect) {
      onConceptSelect(concept.name);
    }
  };
  
  const renderConnections = () => {
    return filteredConcepts.flatMap(concept => 
      concept.connections
        .filter(connectionId => filteredConcepts.some(c => c.id === connectionId))
        .map(connectionId => {
          const targetConcept = concepts.find(c => c.id === connectionId);
          if (!targetConcept) return null;
          
          return (
            <line
              key={`${concept.id}-${connectionId}`}
              x1={concept.x}
              y1={concept.y}
              x2={targetConcept.x}
              y2={targetConcept.y}
              stroke="#94A3B8"
              strokeWidth="2"
              strokeOpacity="0.6"
              className="knowledge-link"
            />
          );
        })
    ).filter(Boolean);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Knowledge Map</h2>
            <p className="text-gray-600 dark:text-gray-300">Visual representation of your learning progress</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'mastered' | 'learning' | 'struggling')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Concepts</option>
              <option value="mastered">Mastered (80%+)</option>
              <option value="learning">Learning (50-79%)</option>
              <option value="needs-work">Needs Work (&lt;50%)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Knowledge Map */}
      <div className="p-6">
        <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden" style={{ height: '500px' }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 600 400"
            className="absolute inset-0"
          >
            {/* Render connections */}
            <g className="connections">
              {renderConnections()}
            </g>
            
            {/* Render concept nodes */}
            <g className="nodes">
              {filteredConcepts.map(concept => (
                <g key={concept.id}>
                  <motion.circle
                    cx={concept.x}
                    cy={concept.y}
                    r={selectedConcept === concept.id ? 35 : 30}
                    fill={getMasteryColor(concept.mastery)}
                    stroke={getCategoryColor(concept.category)}
                    strokeWidth="3"
                    className="knowledge-node cursor-pointer"
                    onClick={() => handleConceptClick(concept)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                  <text
                    x={concept.x}
                    y={concept.y + 5}
                    textAnchor="middle"
                    className="text-xs font-medium fill-white pointer-events-none"
                  >
                    {concept.mastery}%
                  </text>
                  <text
                    x={concept.x}
                    y={concept.y + 50}
                    textAnchor="middle"
                    className="text-sm font-medium fill-gray-700 dark:fill-gray-300 pointer-events-none max-w-20"
                  >
                    {concept.name}
                  </text>
                </g>
              ))}
            </g>
          </svg>
          
          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-300">Mastered (80%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600 dark:text-gray-300">Learning (50-79%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-300">Needs Work (&lt;50%)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected Concept Details */}
        {selectedConcept && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700/50"
          >
            {(() => {
              const concept = concepts.find(c => c.id === selectedConcept);
              if (!concept) return null;
              
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{concept.name}</h3>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {concept.mastery}% mastery
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</div>
                      <div className="capitalize font-medium text-gray-900 dark:text-white">
                        {concept.category}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connections</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {concept.connections.length} related concepts
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors">
                      <BookOpen className="h-3 w-3" />
                      <span>Study</span>
                    </button>
                    <button className="flex items-center space-x-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors">
                      <Target className="h-3 w-3" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeMap;