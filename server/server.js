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
    createdAt: new Date()
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
  if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
    console.warn('TMDB API key not configured, returning mock data');
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
      currentSpin: room.currentSpin
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
      addedBy: room.users.get(socket.id)?.name || 'Unknown'
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
    
    io.to(roomCode).emit('movie-removed', { movieId });
    
    console.log(`Movie removed from room ${roomCode}:`, movieId);
  });
  
  socket.on('start-spin', ({ duration }) => {
    const roomCode = userRooms.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.movies.length === 0) {
      socket.emit('error', { message: 'No movies in wheel' });
      return;
    }
    
    // Generate synchronized spin parameters on server
    const minSpins = 5;
    const maxSpins = 8;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const randomEndAngle = Math.random() * 2 * Math.PI;
    const totalRotation = (spins * 2 * Math.PI) + randomEndAngle;
    
    // Calculate winning movie based on final rotation
    const normalizedRotation = ((totalRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const anglePerSegment = (2 * Math.PI) / room.movies.length;
    const winningIndex = Math.floor(((2 * Math.PI - normalizedRotation) / anglePerSegment)) % room.movies.length;
    const selectedMovie = room.movies[winningIndex];
    
    // Create synchronized spin data with timestamp
    const spinData = {
      duration,
      totalRotation,
      selectedMovie,
      spinnedBy: room.users.get(socket.id)?.name || 'Unknown',
      startTime: Date.now(),
      timestamp: Date.now() // For client synchronization
    };
    
    // Store current spin in room for late joiners
    room.currentSpin = spinData;
    
    // Broadcast to all clients in room
    io.to(roomCode).emit('wheel-spinning', spinData);
    
    // Clear the spin data after it completes
    setTimeout(() => {
      if (room.currentSpin && room.currentSpin.timestamp === spinData.timestamp) {
        room.currentSpin = null;
      }
    }, duration * 1000 + 1000); // Add 1 second buffer
    
    console.log(`Wheel spun in room ${roomCode} by ${room.users.get(socket.id)?.name}, winner: ${selectedMovie.title}`);
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