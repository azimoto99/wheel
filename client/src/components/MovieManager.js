import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MovieManager.css';

const MovieManager = ({ movies, onAddMovie, onRemoveMovie, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchMovies(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);
  
  const searchMovies = async (query) => {
    setIsLoading(true);
    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 
        (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001');
      
      const response = await axios.get(`${SERVER_URL}/api/movies/search?q=${encodeURIComponent(query)}`);
      console.log('TMDB Search Response:', response.data);
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching movies:', error.response?.data || error.message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddMovie = (movie) => {
    const isDuplicate = movies.some(existingMovie => 
      existingMovie.title.toLowerCase() === movie.title.toLowerCase()
    );
    
    if (isDuplicate) {
      alert('This movie is already in the wheel!');
      return;
    }
    
    onAddMovie(movie);
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestion(null);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setSearchTerm(suggestion.title);
    setShowSuggestions(false);
  };
  
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedSuggestion(null);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedSuggestion) {
      handleAddMovie(selectedSuggestion);
    } else if (searchTerm.trim()) {
      const customMovie = {
        id: Date.now(),
        title: searchTerm.trim(),
        year: null,
        poster: null
      };
      handleAddMovie(customMovie);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  
  return (
    <div className="movie-manager">
      <h3>Movie Manager</h3>
      
      <div className="add-movie-form">
        <h4>Add New Movie</h4>
        <form onSubmit={handleSubmit}>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search for movies..."
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled}
            className="search-input"
          />
          
          {isLoading && <div className="loading-indicator">Searching...</div>}
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="suggestion-item"
                  onClick={() => handleAddMovie(suggestion)}
                >
                  {suggestion.poster && (
                    <img
                      src={suggestion.poster}
                      alt={suggestion.title}
                      className="suggestion-poster"
                    />
                  )}
                  <div className="suggestion-info">
                    <div className="suggestion-title">{suggestion.title}</div>
                    {suggestion.year && (
                      <div className="suggestion-year">({suggestion.year})</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!searchTerm.trim() || disabled}
          className="add-button"
        >
          Add Movie
        </button>
        </form>
      </div>
      
      <div className="movie-list">
        <h4>
          <span className="movie-count">
            Movies in Wheel
            <span className="count-badge">{movies.length}</span>
          </span>
        </h4>
        
        {movies.length === 0 ? (
          <div className="no-movies">
            No movies added yet. Start by searching for movies above!
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map((movie) => (
              <div key={movie.id} className="movie-item">
                {movie.poster && (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="movie-poster"
                  />
                )}
                <div className="movie-info">
                  <h5>{movie.title}</h5>
                  {movie.year && <p>({movie.year})</p>}
                  {movie.addedBy && (
                    <p className="added-by">Added by {movie.addedBy}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveMovie(movie.id)}
                  className="remove-button"
                  disabled={disabled}
                  title="Remove movie"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieManager;