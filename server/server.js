require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const rooms = new Map();
const userRooms = new Map();

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function selectWeightedMovie(availableMovies, finalWheelRotation, totalMovieCount) {
  // Calculate base probability for each movie
  const baseWeight = 1;
  const voteMultiplier = 0.3; // Each vote adds 30% to base probability
  
  // Calculate weights for all available movies
  const weightedMovies = availableMovies.map(movie => ({
    ...movie,
    weight: Math.max(0.1, baseWeight + ((movie.votes || 0) * voteMultiplier)) // Minimum 10% chance
  }));
  
  // Total weight for normalization
  const totalWeight = weightedMovies.reduce((sum, movie) => sum + movie.weight, 0);
  
  // Calculate segment boundaries based on weights (same as client)
  let currentAngle = 0;
  const movieSegments = weightedMovies.map(movie => {
    const segmentAngle = (movie.weight / totalWeight) * (2 * Math.PI);
    const segment = {
      ...movie,
      startAngle: currentAngle,
      endAngle: currentAngle + segmentAngle
    };
    currentAngle += segmentAngle;
    return segment;
  });
  
  // Normalize the wheel rotation
  const normalizedRotation = ((finalWheelRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  
  // Find which segment the pointer lands on
  // Pointer points up, so we need to account for that
  const pointerAngle = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
  
  for (const segment of movieSegments) {
    if (pointerAngle >= segment.startAngle && pointerAngle < segment.endAngle) {
      return segment;
    }
  }
  
  // Fallback to last segment (should rarely happen)
  return movieSegments[movieSegments.length - 1];
}

app.get('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    code: room.code,
    name: room.name,
    users: Array.from(room.users.values()),
    movies: room.movies,
    currentMusic: room.currentMusic
  });
});

app.post('/api/rooms/create', (req, res) => {
  const { name, userName } = req.body;
  let code;
  
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  
  const room = {
    code,
    name: name || `Room ${code}`,
    users: new Map(),
    movies: [],
    currentMusic: null,
    currentSpin: null,
    wheelRotation: 0,
    createdAt: new Date(),
    userVetos: new Map(), // Track vetos per user
    movieVotes: new Map(), // Track votes per movie
    eliminationRounds: 0
  };
  
  rooms.set(code, room);
  
  res.json({
    code,
    name: room.name,
    users: [],
    movies: [],
    currentMusic: null
  });
});

app.get('/api/movies/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  // Check if TMDB API key is available
  console.log('TMDB_API_KEY present:', !!process.env.TMDB_API_KEY);
  console.log('TMDB_API_KEY length:', process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.length : 0);
  
  if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY.trim() === '' || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
    console.warn('TMDB API key not configured properly, returning mock data');
    // Return mock movie data for development
    const mockMovies = [
      { id: 1, title: q + ' (Mock Movie)', year: 2023, poster: null },
      { id: 2, title: q + ' 2: The Sequel', year: 2024, poster: null },
      { id: 3, title: 'The ' + q + ' Chronicles', year: 2022, poster: null }
    ];
    return res.json(mockMovies);
  }
  
  try {
    const axios = require('axios');
    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        query: q,
        page: 1
      }
    });
    
    const movies = response.data.results.slice(0, 10).map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null
    }));
    
    res.json(movies);
  } catch (error) {
    console.error('TMDB API Error:', error.message);
    console.error('Full error:', error.response?.data || error);
    
    // Fallback to mock data if API fails
    const mockMovies = [
      { id: Date.now() + 1, title: q + ' (Search Result)', year: 2023, poster: null },
      { id: Date.now() + 2, title: q + ': The Movie', year: 2024, poster: null }
    ];
    res.json(mockMovies);
  }
});

// Helper function to perform a single spin
function performSingleSpin(room, roomCode, socket, duration, availableMovies) {
  // Generate synchronized spin parameters on server
  const baseSpins = 3;
  const extraSpins = Math.min(duration / 2, 10);
  const totalSpins = baseSpins + extraSpins + Math.random() * 3;
  const randomEndAngle = Math.random() * 2 * Math.PI;
  const totalRotation = (totalSpins * 2 * Math.PI) + randomEndAngle;
  
  // Calculate winning movie with weighted probability based on votes
  const selectedMovie = selectWeightedMovie(availableMovies, room.wheelRotation + totalRotation, room.movies.length);
  
  // Create synchronized spin data with timestamp
  const spinData = {
    duration,
    totalRotation,
    selectedMovie,
    spinnedBy: room.users.get(socket.id)?.name || 'Unknown',
    startTime: Date.now(),
    timestamp: Date.now(),
    isFinalSpin: true
  };
  
  // Store current spin in room for late joiners
  room.currentSpin = spinData;
  
  // Broadcast to all clients in room
  io.to(roomCode).emit('wheel-spinning', spinData);
  
  // Clear the spin data after it completes
  setTimeout(() => {
    if (room.currentSpin && room.currentSpin.timestamp === spinData.timestamp) {
      room.currentSpin = null;
      room.wheelRotation = (room.wheelRotation + totalRotation) % (2 * Math.PI);
      io.to(roomCode).emit('wheel-stopped', { selectedMovie });
    }
  }, duration * 1000 + 1000);
}

// Helper function to perform elimination rounds
function performEliminationRounds(room, roomCode, socket, duration, eliminationRounds, availableMovies) {
  if (!room.eliminationState) {
    room.eliminationState = {
      currentRound: 0,
      totalRounds: eliminationRounds,
      eliminatedMovies: []
    };
  }

  function performNextEliminationRound() {
    const currentRound = room.eliminationState.currentRound + 1;
    const remainingMovies = room.movies.filter(movie => 
      !movie.vetoed && !movie.eliminated && !room.eliminationState.eliminatedMovies.includes(movie.id)
    );
    
    if (remainingMovies.length <= 1) {
      // Only one movie left or none, declare winner or error
      if (remainingMovies.length === 1) {
        io.to(roomCode).emit('wheel-stopped', { selectedMovie: remainingMovies[0] });
      }
      room.eliminationState = null;
      return;
    }
    
    if (currentRound > eliminationRounds) {
      // All elimination rounds complete, do final spin
      performSingleSpin(room, roomCode, socket, duration, remainingMovies);
      room.eliminationState = null;
      return;
    }
    
    // Calculate how many movies to eliminate this round
    const totalMoviesLeft = remainingMovies.length;
    const remainingRounds = eliminationRounds - currentRound + 1;
    const moviesPerRound = Math.max(1, Math.floor((totalMoviesLeft - 1) / remainingRounds));
    
    // Generate spin parameters
    const baseSpins = 2;
    const extraSpins = Math.min(duration / 3, 5);
    const totalSpins = baseSpins + extraSpins + Math.random() * 2;
    const randomEndAngle = Math.random() * 2 * Math.PI;
    const totalRotation = (totalSpins * 2 * Math.PI) + randomEndAngle;
    
    // Select movie to eliminate (one per spin for better user experience)
    const movieToEliminate = selectWeightedMovie(remainingMovies, room.wheelRotation + totalRotation, room.movies.length);
    
    // Update elimination state
    room.eliminationState.currentRound = currentRound;
    room.eliminationState.eliminatedMovies.push(movieToEliminate.id);
    
    // Create elimination spin data
    const spinData = {
      duration,
      totalRotation,
      selectedMovie: movieToEliminate,
      eliminatedMovies: [movieToEliminate.id],
      spinnedBy: room.users.get(socket.id)?.name || 'Unknown',
      startTime: Date.now(),
      timestamp: Date.now(),
      isEliminationRound: true,
      currentRound,
      totalRounds: eliminationRounds,
      moviesRemaining: totalMoviesLeft - 1
    };
    
    room.currentSpin = spinData;
    io.to(roomCode).emit('wheel-spinning', spinData);
    
    // Handle spin completion
    setTimeout(() => {
      if (room.currentSpin && room.currentSpin.timestamp === spinData.timestamp) {
        room.currentSpin = null;
        room.wheelRotation = (room.wheelRotation + totalRotation) % (2 * Math.PI);
        
        // Mark movie as eliminated
        const movie = room.movies.find(m => m.id === movieToEliminate.id);
        if (movie) {
          movie.eliminated = true;
        }
        
        io.to(roomCode).emit('elimination-complete', {
          eliminatedMovies: [movieToEliminate.id],
          currentRound,
          totalRounds: eliminationRounds,
          moviesRemaining: totalMoviesLeft - 1
        });
        
        // Continue with next round after a delay
        setTimeout(() => {
          performNextEliminationRound();
        }, 2000);
      }
    }, duration * 1000 + 1000);
  }
  
  // Start the first elimination round
  performNextEliminationRound();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', ({ roomCode, userName }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    socket.join(roomCode);
    userRooms.set(socket.id, roomCode);
    
    const user = {
      id: socket.id,
      name: userName,
      joinedAt: new Date()
    };
    
    room.users.set(socket.id, user);
    
    socket.emit('room-joined', {
      code: roomCode,
      name: room.name,
      users: Array.from(room.users.values()),
      movies: room.movies,
      currentMusic: room.currentMusic,
      currentSpin: room.currentSpin,
      wheelRotation: room.wheelRotation,
      userVetos: Object.fromEntries(room.userVetos),
      movieVotes: Object.fromEntries(room.movieVotes),
      eliminationRounds: room.eliminationRounds
    });
    
    // If there's an ongoing spin, sync the new user with it
    if (room.currentSpin) {
      const timeElapsed = Date.now() - room.currentSpin.startTime;
      const remainingTime = Math.max(0, (room.currentSpin.duration * 1000) - timeElapsed);
      
      if (remainingTime > 100) { // Only sync if there's meaningful time left
        socket.emit('wheel-spinning', {
          ...room.currentSpin,
          syncMode: true,
          timeElapsed,
          remainingTime
        });
      }
    }
    
    socket.to(roomCode).emit('user-joined', user);
    
    console.log(`User ${userName} joined room ${roomCode}`);
  });
  
  socket.on('leave-room', () => {
    const roomCode = userRooms.get(socket.id);
    if (roomCode) {
      leaveRoom(socket, roomCode);
    }
  });
  
  socket.on('add-movie', ({ movie }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const newMovie = {
      id: Date.now(),
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
      addedBy: room.users.get(socket.id)?.name || 'Unknown',
      votes: 0,
      vetoed: false
    };
    
    room.movies.push(newMovie);
    
    io.to(roomCode).emit('movie-added', newMovie);
    
    console.log(`Movie added to room ${roomCode}:`, newMovie.title);
  });
  
  socket.on('remove-movie', ({ movieId }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    room.movies = room.movies.filter(movie => movie.id !== movieId);
    
    // Clean up votes for removed movie
    room.movieVotes.delete(movieId);
    
    io.to(roomCode).emit('movie-removed', { movieId });
    
    console.log(`Movie removed from room ${roomCode}:`, movieId);
  });
  
  socket.on('start-spin', ({ duration, eliminationRounds = 0 }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const availableMovies = room.movies.filter(movie => !movie.vetoed);
    
    if (availableMovies.length === 0) {
      socket.emit('error', { message: 'No available movies in wheel (all may be vetoed)' });
      return;
    }
    
    // If no elimination rounds, do normal spin
    if (eliminationRounds === 0) {
      performSingleSpin(room, roomCode, socket, duration, availableMovies);
    } else {
      // Start elimination rounds
      performEliminationRounds(room, roomCode, socket, duration, eliminationRounds, availableMovies);
    }
    
    console.log(`Wheel spun in room ${roomCode} by ${room.users.get(socket.id)?.name} with ${eliminationRounds} elimination rounds`);
  });
  
  socket.on('update-music', ({ musicUrl }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    room.currentMusic = musicUrl;
    
    socket.to(roomCode).emit('music-updated', { musicUrl });
    
    console.log(`Music updated in room ${roomCode}`);
  });

  socket.on('veto-movie', ({ movieId }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const userId = socket.id;
    const hasVetoLeft = !room.userVetos.get(userId);
    
    if (!hasVetoLeft) {
      socket.emit('error', { message: 'You have already used your veto for this session' });
      return;
    }
    
    const movie = room.movies.find(m => m.id === movieId);
    if (!movie) {
      socket.emit('error', { message: 'Movie not found' });
      return;
    }
    
    if (movie.vetoed) {
      socket.emit('error', { message: 'Movie has already been vetoed' });
      return;
    }
    
    // Use the veto
    room.userVetos.set(userId, true);
    movie.vetoed = true;
    
    const userName = room.users.get(userId)?.name || 'Unknown';
    
    io.to(roomCode).emit('movie-vetoed', { 
      movieId, 
      vetoedBy: userName,
      userVetos: Object.fromEntries(room.userVetos)
    });
    
    console.log(`Movie vetoed in room ${roomCode} by ${userName}: ${movie.title}`);
  });

  socket.on('vote-movie', ({ movieId, voteType }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const userId = socket.id;
    const movie = room.movies.find(m => m.id === movieId);
    
    if (!movie) {
      socket.emit('error', { message: 'Movie not found' });
      return;
    }
    
    if (movie.vetoed) {
      socket.emit('error', { message: 'Cannot vote on vetoed movie' });
      return;
    }
    
    // Get or create vote map for this movie
    if (!room.movieVotes.has(movieId)) {
      room.movieVotes.set(movieId, new Map());
    }
    
    const movieVotes = room.movieVotes.get(movieId);
    const currentVote = movieVotes.get(userId);
    
    // Remove previous vote if exists
    if (currentVote) {
      movie.votes += (currentVote === 'up' ? -1 : 1);
    }
    
    // Add new vote if different from current
    if (voteType !== currentVote) {
      movieVotes.set(userId, voteType);
      movie.votes += (voteType === 'up' ? 1 : -1);
    } else {
      // Remove vote if clicking same button
      movieVotes.delete(userId);
    }
    
    const userName = room.users.get(userId)?.name || 'Unknown';
    
    io.to(roomCode).emit('movie-vote-updated', { 
      movieId, 
      votes: movie.votes,
      userVote: movieVotes.get(userId) || null,
      votedBy: userName
    });
    
    console.log(`Movie vote updated in room ${roomCode} by ${userName}: ${movie.title} (${movie.votes} votes)`);
  });

  
  socket.on('disconnect', () => {
    const roomCode = userRooms.get(socket.id);
    if (roomCode) {
      leaveRoom(socket, roomCode);
    }
    console.log('User disconnected:', socket.id);
  });
  
  function leaveRoom(socket, roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      const user = room.users.get(socket.id);
      room.users.delete(socket.id);
      
      if (user) {
        socket.to(roomCode).emit('user-left', user);
      }
      
      if (room.users.size === 0) {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted - no users remaining`);
      }
    }
    
    userRooms.delete(socket.id);
    socket.leave(roomCode);
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});