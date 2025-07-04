import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Wheel from './components/Wheel';
import MovieManager from './components/MovieManager';
import RoomControls from './components/RoomControls';
import AudioControls from './components/AudioControls';
import './App.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 
  (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001');

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [userName, setUserName] = useState('');
  const [theme, setTheme] = useState('rosebud');
  const [spinHistory, setSpinHistory] = useState([]);
  const [currentSpinData, setCurrentSpinData] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [tickSoundCallback, setTickSoundCallback] = useState(null);
  const [userVetos, setUserVetos] = useState({});
  const [eliminationRounds, setEliminationRounds] = useState(0);
  
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });
    
    newSocket.on('room-joined', (roomData) => {
      setRoom(roomData);
      setUsers(roomData.users);
      setMovies(roomData.movies);
      setWheelRotation(roomData.wheelRotation || 0);
      setUserVetos(roomData.userVetos || {});
      setEliminationRounds(roomData.eliminationRounds || 0);
      console.log('Joined room:', roomData);
    });
    
    newSocket.on('user-joined', (user) => {
      setUsers(prev => [...prev, user]);
      console.log('User joined:', user.name);
    });
    
    newSocket.on('user-left', (user) => {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      console.log('User left:', user.name);
    });
    
    newSocket.on('movie-added', (movie) => {
      setMovies(prev => [...prev, movie]);
      console.log('Movie added:', movie.title);
    });
    
    newSocket.on('movie-removed', ({ movieId }) => {
      setMovies(prev => prev.filter(m => m.id !== movieId));
      console.log('Movie removed:', movieId);
    });
    
    newSocket.on('movie-vetoed', ({ movieId, vetoedBy, userVetos: updatedVetos }) => {
      setMovies(prev => prev.map(movie => 
        movie.id === movieId ? { ...movie, vetoed: true } : movie
      ));
      setUserVetos(updatedVetos);
      console.log('Movie vetoed:', movieId, 'by', vetoedBy);
    });
    
    newSocket.on('movie-vote-updated', ({ movieId, votes }) => {
      setMovies(prev => prev.map(movie => 
        movie.id === movieId ? { ...movie, votes } : movie
      ));
    });
    
    newSocket.on('elimination-started', ({ round, startedBy, availableMovies }) => {
      setEliminationRounds(round);
      console.log('Elimination round', round, 'started by', startedBy, 'with', availableMovies, 'movies');
    });
    
    newSocket.on('elimination-spin', ({ round, eliminatingMovie, remainingMovies }) => {
      console.log('Elimination spin round', round, '- eliminating:', eliminatingMovie, 'remaining:', remainingMovies);
    });
    
    newSocket.on('movie-eliminated', ({ movieId, movieTitle, round }) => {
      setMovies(prev => prev.filter(m => m.id !== movieId));
      console.log('Movie eliminated in round', round, ':', movieTitle);
    });
    
    newSocket.on('elimination-complete', ({ finalMovies, round }) => {
      console.log('Elimination round', round, 'complete! Final movies:', finalMovies);
    });
    
    newSocket.on('wheel-spinning', (spinData) => {
      const { duration, selectedMovie: spinResult, spinnedBy, syncMode, totalRotation } = spinData;
      
      setIsSpinning(true);
      setCurrentSpinData({ ...spinData, timestamp: Date.now() }); // Add timestamp for React key
      setSelectedMovie(null); // Clear previous selection
      
      console.log(`Wheel spun by ${spinnedBy}, selected: ${spinResult.title}${syncMode ? ' (synced)' : ''}`);
      
      const actualDuration = syncMode && spinData.remainingTime ? 
        spinData.remainingTime : duration * 1000;
      
      setTimeout(() => {
        setIsSpinning(false);
        setSelectedMovie(spinResult);
        setCurrentSpinData(null);
        
        // Only add to history if this isn't a sync event
        if (!syncMode) {
          setSpinHistory(prev => [...prev, {
            movie: spinResult,
            timestamp: new Date(),
            spinnedBy
          }]);
        }
      }, actualDuration);
    });
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(error.message || 'An error occurred');
    });
    
    return () => newSocket.close();
  }, []);
  
  const handleCreateRoom = async (roomName, userName) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName, userName }),
      });
      
      const roomData = await response.json();
      
      if (response.ok) {
        socket.emit('join-room', { roomCode: roomData.code, userName });
      } else {
        throw new Error(roomData.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };
  
  const handleJoinRoom = (roomCode, userName) => {
    socket.emit('join-room', { roomCode, userName });
  };
  
  const handleLeaveRoom = () => {
    socket.emit('leave-room');
    setRoom(null);
    setUsers([]);
    setMovies([]);
    setSelectedMovie(null);
    setIsSpinning(false);
    setSpinHistory([]);
  };
  
  const handleAddMovie = (movie) => {
    socket.emit('add-movie', { movie });
  };
  
  const handleRemoveMovie = (movieId) => {
    socket.emit('remove-movie', { movieId });
  };
  
  const handleSpinWheel = (duration, selectedMovie, isSpinRequest = false) => {
    if (movies.length === 0) return;
    
    if (isSpinRequest) {
      // This is a request to start spinning - emit to server for coordination
      socket.emit('start-spin', { duration });
    } else {
      // This is the old behavior - keep for backward compatibility if needed
      socket.emit('spin-wheel', { duration, selectedMovie });
    }
  };
  
  const themes = [
    { value: 'rosebud', label: 'Rosebud' },
    { value: 'godfather', label: 'Make It an Offer' },
    { value: 'mermaid', label: 'Under the Sea' },
    { value: 'impossible', label: 'Mission Accepted' },
    { value: 'avengers', label: 'Assemble!' }
  ];
  
  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <h1>The Wheel</h1>
        <div className="header-controls">
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="theme-selector"
          >
            {themes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </header>
      
      <main className="app-main">
        <div className="sidebar">
          <RoomControls
            room={room}
            users={users}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={handleLeaveRoom}
            isConnected={isConnected}
            userName={userName}
            onUserNameChange={setUserName}
          />
          
          {room && (
            <>
              <MovieManager
                movies={movies}
                onAddMovie={handleAddMovie}
                onRemoveMovie={handleRemoveMovie}
                disabled={isSpinning}
                socket={socket}
                userVetos={userVetos}
                currentUserId={socket?.id}
                eliminationRounds={eliminationRounds}
              />
              
              <AudioControls
                socket={socket}
                roomCode={room?.code}
                onRegisterTickSound={setTickSoundCallback}
              />
            </>
          )}
        </div>
        
        <div className="main-content">
          {room ? (
            <Wheel
              movies={movies}
              onSpin={handleSpinWheel}
              isSpinning={isSpinning}
              selectedMovie={selectedMovie}
              theme={theme}
              spinData={currentSpinData}
              initialRotation={wheelRotation}
              onTickSound={tickSoundCallback}
            />
          ) : (
            <div className="welcome-screen">
              <h2>Welcome to The Wheel!</h2>
              <p>Create a room or join an existing one to start selecting movies with friends.</p>
              <div className="features">
                <div className="feature">
                  <h3>🎲 Interactive Wheel</h3>
                  <p>Spin the wheel to randomly select a movie</p>
                </div>
                <div className="feature">
                  <h3>👥 Multiplayer</h3>
                  <p>Join rooms with friends using 4-digit codes</p>
                </div>
                <div className="feature">
                  <h3>🎭 Movie Database</h3>
                  <p>Search and add movies with autocomplete</p>
                </div>
                <div className="feature">
                  <h3>🎨 Themes</h3>
                  <p>Choose from multiple visual themes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {room && spinHistory.length > 0 && (
        <div className="spin-history">
          <h3>Recent Selections</h3>
          <div className="history-list">
            {spinHistory.slice(-3).reverse().map((entry, index) => (
              <div key={index} className="history-item">
                <span className="movie-title">{entry.movie.title}</span>
                <span className="spinner">by {entry.spinnedBy}</span>
                <span className="timestamp">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;