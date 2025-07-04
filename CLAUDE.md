# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Application
```bash
# Development mode (both server and client)
npm run dev

# Or run separately:
npm start                    # Server only (port 3001)
cd client && npm start       # Client only (port 3000)
```

### Building and Testing
```bash
npm run build               # Build client for production
npm run install-client      # Install client dependencies
cd client && npm test       # Run React tests
```

### Environment Setup
- Copy `.env` file with TMDB_API_KEY, PORT (3001), CLIENT_URL (http://localhost:3000)
- Place sound files in `client/public/sounds/` (wheel-spin.mp3, tick.mp3, victory.mp3)

## Architecture Overview

### Project Structure
- **Root**: Node.js/Express server with Socket.io
- **client/**: React frontend with Socket.io client
- **server/**: Express server with real-time multiplayer logic

### Key Components
- **Wheel.js**: Canvas-based spinning wheel with physics and weighted selection
- **MovieManager.js**: Movie search (TMDB API) and room management
- **RoomControls.js**: Room creation/joining with 4-digit codes
- **AudioControls.js**: Music and sound effect management
- **server.js**: Socket.io events, room management, movie selection logic

### Real-time Features
- Rooms stored in memory (Map objects) - temporary, deleted when empty
- Socket.io events: join-room, add-movie, remove-movie, spin-wheel, update-music
- Synchronized wheel spins across all users in room
- Weighted movie selection based on votes

### API Integration
- TMDB API for movie search and data
- REST endpoints: `/api/rooms/create`, `/api/rooms/:code`, `/api/movies/search`
- Rate limit: 40 requests per 10 seconds

### Theme System
- Multiple themes: classic, dark, neon, movie-theater, retro
- Theme data in Wheel.js colors object
- CSS classes in App.css for theme styling

### Development Notes
- Client runs on port 3000 (dev) with proxy to server on port 3001
- Socket.io automatically detects production vs development URLs
- Canvas API used for smooth wheel rendering and animations
- Mobile-responsive design with touch support