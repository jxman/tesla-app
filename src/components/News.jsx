import React, { useState, useEffect } from "react";
import { FaNewspaper, FaSync, FaExclamationTriangle, FaClock } from "react-icons/fa";
import { BiRefresh } from "react-icons/bi";

const NEWS_API_KEY = process.env.REACT_APP_NEWS_API_KEY;
const NEWS_API_URL = process.env.REACT_APP_NEWS_API_URL;

function News() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('general');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Available news categories
  const categories = [
    { id: 'general', name: 'Headlines', icon: '📰' },
    { id: 'technology', name: 'Tech', icon: '💻' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'science', name: 'Science', icon: '🔬' }
  ];

  // Fetch news articles
  const fetchNews = async (selectedCategory = category) => {
    if (!NEWS_API_KEY) {
      setError('News API key not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${NEWS_API_URL}/top-headlines?country=us&category=${selectedCategory}&pageSize=8&apiKey=${NEWS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      if (data.status === 'ok') {
        setArticles(data.articles || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch news');
      }
    } catch (err) {
      console.error('News fetch error:', err);
      setError(err.message);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load news on component mount
  useEffect(() => {
    fetchNews();
  }, []);

  // Handle category change
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    fetchNews(newCategory);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchNews();
  };

  // Format time ago
  const timeAgo = (dateString) => {
    const now = new Date();
    const articleDate = new Date(dateString);
    const diffInHours = Math.floor((now - articleDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  // Truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FaNewspaper className="text-2xl text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Latest News</h2>
            {lastUpdated && (
              <p className="text-xs text-gray-400 flex items-center space-x-1">
                <FaClock className="w-3 h-3" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 group"
          title="Refresh News"
        >
          <BiRefresh className={`w-4 h-4 text-gray-300 group-hover:text-white transition-colors ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center space-x-1 ${
              category === cat.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FaExclamationTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">News Unavailable</h3>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FaSync className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading latest news...</p>
          </div>
        </div>
      )}

      {/* News Articles */}
      {!isLoading && !error && articles.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {articles.map((article, index) => (
            <div
              key={index}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              onClick={() => window.open(article.url, '_blank')}
            >
              <div className="flex space-x-3">
                {/* Article Image */}
                {article.urlToImage && (
                  <div className="w-20 h-16 flex-shrink-0">
                    <img
                      src={article.urlToImage}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Article Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {truncateText(article.title, 100)}
                  </h3>
                  
                  {article.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {truncateText(article.description, 120)}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">{article.source?.name || 'Unknown Source'}</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Articles State */}
      {!isLoading && !error && articles.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FaNewspaper className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">No News Available</h3>
            <p className="text-sm text-gray-400">Check back later for updates</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default News;
