import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MovieManager.css';

const MovieManager = ({ movies, onAddMovie, onRemoveMovie, disabled = false, socket, userVetos, currentUserId, eliminationRounds }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [movieVotes, setMovieVotes] = useState({});
  const [userVoteHistory, setUserVoteHistory] = useState({});
  
  useEffect(() => {
    if (socket) {
      socket.on('movie-vote-updated', ({ movieId, votes, userVote }) => {
        setMovieVotes(prev => ({
          ...prev,
          [movieId]: votes
        }));
        
        if (userVote !== null) {
          setUserVoteHistory(prev => ({
            ...prev,
            [movieId]: userVote
          }));
        } else {
          setUserVoteHistory(prev => {
            const newHistory = { ...prev };
            delete newHistory[movieId];
            return newHistory;
          });
        }
      });
      
      socket.on('movie-vetoed', ({ movieId }) => {
        // Movie vetoed, no additional state needed as it's handled in movies array
      });
      
      return () => {
        socket.off('movie-vote-updated');
        socket.off('movie-vetoed');
      };
    }
  }, [socket]);
  
  const handleVoteMovie = (movieId, voteType) => {
    if (socket && !disabled) {
      socket.emit('vote-movie', { movieId, voteType });
    }
  };
  
  const handleVetoMovie = (movieId) => {
    if (socket && !disabled) {
      const userHasVeto = !userVetos[currentUserId];
      if (userHasVeto) {
        const confirmVeto = window.confirm('Are you sure you want to veto this movie? You can only veto once per session.');
        if (confirmVeto) {
          socket.emit('veto-movie', { movieId });
        }
      } else {
        alert('You have already used your veto for this session.');
      }
    }
  };
  
  const handleStartElimination = () => {
    if (socket && !disabled) {
      const availableMovies = movies.filter(movie => !movie.vetoed);
      if (availableMovies.length <= 3) {
        alert('Need at least 4 movies for elimination rounds');
        return;
      }
      
      const confirmElimination = window.confirm('Start elimination rounds? This will spin multiple times to narrow down the choices.');
      if (confirmElimination) {
        socket.emit('start-elimination');
      }
    }
  };
  
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

  const handleImportMovies = () => {
    if (!importText.trim()) return;
    
    // Parse the import text - support both newline and comma separated
    let movieTitles = [];
    
    // First try newline separation (wheelofnames.com format)
    if (importText.includes('\n')) {
      movieTitles = importText.split('\n').map(title => title.trim()).filter(title => title.length > 0);
    } else {
      // Fallback to comma separation
      movieTitles = importText.split(',').map(title => title.trim()).filter(title => title.length > 0);
    }
    
    // Add each movie to the wheel
    let addedCount = 0;
    let skippedCount = 0;
    
    movieTitles.forEach(title => {
      // Check if movie already exists
      const isDuplicate = movies.some(existingMovie => 
        existingMovie.title.toLowerCase() === title.toLowerCase()
      );
      
      if (!isDuplicate) {
        const movie = {
          id: Date.now() + Math.random(), // Ensure unique IDs
          title: title,
          year: null,
          poster: null
        };
        onAddMovie(movie);
        addedCount++;
      } else {
        skippedCount++;
      }
    });
    
    // Show feedback
    let message = `Added ${addedCount} movies to the wheel.`;
    if (skippedCount > 0) {
      message += ` Skipped ${skippedCount} duplicates.`;
    }
    alert(message);
    
    // Reset form
    setImportText('');
    setShowImportDialog(false);
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
        
        <div className="action-buttons">
          <button
            onClick={() => setShowImportDialog(true)}
            disabled={disabled}
            className="import-button"
          >
            Import List
          </button>
          
          {movies.filter(m => !m.vetoed).length > 3 && (
            <button
              onClick={handleStartElimination}
              disabled={disabled}
              className="elimination-button"
              title="Start elimination rounds to narrow down choices"
            >
              🎯 Elimination
            </button>
          )}
        </div>
      </div>
      
      <div className="movie-list">
        <h4>
          <span className="movie-count">
            Movies in Wheel
            <span className="count-badge">{movies.length}</span>
          </span>
        </h4>
        
        {(eliminationRounds > 0 || Object.keys(userVetos).length > 0) && (
          <div className="session-info">
            {eliminationRounds > 0 && (
              <div className="elimination-info">
                🎯 Elimination Rounds: {eliminationRounds}
              </div>
            )}
            
            <div className="veto-info">
              🚫 Veto Status: {userVetos[currentUserId] ? 'Used' : 'Available'}
            </div>
            
            {movies.filter(m => m.vetoed).length > 0 && (
              <div className="vetoed-count">
                ❌ Vetoed: {movies.filter(m => m.vetoed).length}
              </div>
            )}
            
            <div className="probability-info">
              📊 Wheel segments scale with votes
            </div>
          </div>
        )}
        
        {movies.length === 0 ? (
          <div className="no-movies">
            No movies added yet. Start by searching for movies above!
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map((movie) => (
              <div key={movie.id} className={`movie-item ${movie.vetoed ? 'vetoed' : ''}`}>
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
                  {movie.vetoed && (
                    <p className="vetoed-status">❌ VETOED</p>
                  )}
                </div>
                
                {!movie.vetoed && (
                  <div className="movie-actions">
                    <div className="vote-section">
                      <button
                        onClick={() => handleVoteMovie(movie.id, 'up')}
                        className={`vote-button up ${userVoteHistory[movie.id] === 'up' ? 'active' : ''}`}
                        disabled={disabled}
                        title="Vote up"
                      >
                        👍
                      </button>
                      <span className="vote-count">{movie.votes || 0}</span>
                      <button
                        onClick={() => handleVoteMovie(movie.id, 'down')}
                        className={`vote-button down ${userVoteHistory[movie.id] === 'down' ? 'active' : ''}`}
                        disabled={disabled}
                        title="Vote down"
                      >
                        👎
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleVetoMovie(movie.id)}
                      className="veto-button"
                      disabled={disabled || userVetos[currentUserId]}
                      title={userVetos[currentUserId] ? "Already used veto" : "Veto this movie"}
                    >
                      🚫
                    </button>
                  </div>
                )}
                
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
      
      {/* Import Dialog */}
      {showImportDialog && (
        <div className="import-modal-overlay">
          <div className="import-modal">
            <h3>Import Movie List</h3>
            <p>Paste your movie list here. Each movie should be on a new line (like wheelofnames.com) or separated by commas.</p>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`The Shawshank Redemption
The Godfather
The Dark Knight
Pulp Fiction
Forrest Gump

Or comma-separated:
Movie 1, Movie 2, Movie 3`}
              rows="10"
              className="import-textarea"
            />
            
            <div className="import-actions">
              <button
                onClick={handleImportMovies}
                disabled={!importText.trim()}
                className="import-confirm-button"
              >
                Import Movies
              </button>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportText('');
                }}
                className="import-cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieManager;