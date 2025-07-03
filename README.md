# 🎬 The Wheel - Movie Selection App

An interactive, multiplayer movie selection wheel that helps groups decide what to watch together!

## Features

### 🎲 Interactive Spinning Wheel
- Smooth canvas-based wheel with physics-based spinning
- Customizable spin duration (3-10 seconds)
- Visual feedback with pointer and selection highlighting
- Multiple color themes

### 👥 Real-time Multiplayer
- Create or join rooms with 4-digit codes
- Real-time synchronization across all users
- See connected users in each room
- Shared movie lists and synchronized wheel spins

### 🎭 Movie Management
- Search movies with TMDB API integration
- Autocomplete suggestions as you type
- Add custom movies or pick from database
- Remove movies from the wheel
- Visual movie posters and information

### 🎨 Multiple Themes
- **Classic**: Traditional blue/red wheel colors
- **Dark Mode**: Dark backgrounds with neon accents
- **Neon**: Cyberpunk style with glowing effects
- **Movie Theater**: Red curtains and gold accents
- **Retro**: Vintage colors and styling

### 🎵 Audio System
- Custom music support (YouTube, direct audio URLs)
- Sound effects for wheel spinning and selection
- Separate volume controls for music and effects
- Sound effect testing buttons

### 📱 Responsive Design
- Works on desktop and mobile devices
- Touch-friendly interface
- Optimized performance for all screen sizes

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- TMDB API key (free from https://www.themoviedb.org/settings/api)

### Installation

1. **Clone/Download the project**
   ```bash
   cd movie-wheel-app
   ```

2. **Install server dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   npm run install-client
   ```

4. **Set up environment variables**
   - Copy `.env` file and add your TMDB API key:
   ```
   PORT=3001
   TMDB_API_KEY=your_tmdb_api_key_here
   CLIENT_URL=http://localhost:3000
   ```

5. **Add sound effects (optional)**
   - Place MP3 files in `client/public/sounds/`:
     - `wheel-spin.mp3` - Wheel spinning sound
     - `tick.mp3` - Wheel ticking sound
     - `victory.mp3` - Selection announcement sound

### Running the Application

**Development Mode (Recommended):**
```bash
# Terminal 1 - Start the backend server
npm start

# Terminal 2 - Start the React development server
cd client
npm start
```

**Or use the concurrent dev command:**
```bash
npm run dev
```
This starts both the server (port 3001) and client (port 3000) concurrently.

**Production Mode:**
```bash
npm run build
npm start
```

The app will be available at:
- Development: `http://localhost:3000` (React dev server with proxy to backend)
- Production: `http://localhost:3001` (Express serves both frontend and backend)

### Development Notes

- **Backend server runs on port 3001** - handles Socket.io and API endpoints
- **Frontend dev server runs on port 3000** - React app with hot reloading
- **Proxy configured** - API calls from frontend automatically proxy to backend
- **Socket.io connection** - Automatically detects production vs development URLs

## How to Use

### Creating a Room
1. Enter your name
2. Click "Create Room" (optionally add a room name)
3. Share the 4-digit code with friends

### Joining a Room
1. Enter your name
2. Enter the 4-digit room code
3. Click "Join Room"

### Adding Movies
1. Use the search box to find movies
2. Select from autocomplete suggestions or add custom titles
3. Movies appear as segments on the wheel

### Spinning the Wheel
1. Click the wheel or the "SPIN" button
2. Adjust spin duration with the slider
3. Watch as the wheel selects a movie!

### Audio Controls
1. Add music by pasting YouTube or audio URLs
2. Control music and sound effect volumes separately
3. Test sound effects with the dedicated buttons

## Technical Details

### Architecture
- **Frontend**: React with Socket.io client
- **Backend**: Node.js/Express with Socket.io
- **Database**: In-memory storage (rooms are temporary)
- **APIs**: The Movie Database (TMDB) for movie data

### Key Technologies
- **Canvas API**: For smooth wheel rendering and animation
- **WebSockets**: For real-time multiplayer synchronization
- **CSS3 Animations**: For smooth transitions and themes
- **Responsive Design**: Mobile-first approach

### File Structure
```
movie-wheel-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js         # Main app component
│   │   └── App.css        # Global styles
│   └── public/
│       └── sounds/        # Sound effect files
├── server/                # Node.js backend
│   └── server.js         # Express server with Socket.io
├── package.json          # Server dependencies
└── README.md
```

## API Endpoints

### REST API
- `POST /api/rooms/create` - Create a new room
- `GET /api/rooms/:code` - Get room information
- `GET /api/movies/search?q=query` - Search movies

### Socket.io Events
- `join-room` - Join a room
- `leave-room` - Leave a room
- `add-movie` - Add movie to room
- `remove-movie` - Remove movie from room
- `spin-wheel` - Spin the wheel
- `update-music` - Update room music

## Customization

### Adding Themes
1. Add theme colors to `Wheel.js` colors object
2. Add theme styles to `App.css`
3. Update theme selector in `App.js`

### Sound Effects
- Add MP3 files to `client/public/sounds/`
- Update AudioControls component to reference new sounds
- Ensure sounds are optimized for web (short, compressed)

### Movie Sources
- Currently uses TMDB API
- Can be extended to support other movie databases
- Custom movie validation can be added

## Troubleshooting

### Common Issues

**"Room not found" error**
- Rooms are temporary and deleted when empty
- Check the 4-digit code for typos

**Movies not loading**
- Verify TMDB API key is correct
- Check internet connection
- API has rate limits (40 requests per 10 seconds)

**Audio not playing**
- Browser may block autoplay
- Check audio file paths and formats
- Some browsers require user interaction before playing audio

**Wheel not spinning**
- Ensure Canvas is supported in browser
- Check for JavaScript errors in console
- Try refreshing the page

### Performance Tips
- Limit rooms to 10-15 users for best performance
- Keep movie lists under 50 items for smooth wheel rendering
- Use compressed audio files for faster loading

## Contributing

Feel free to submit issues and enhancement requests!

### Development Setup
1. Follow installation instructions above
2. Make changes to components in `client/src/components/`
3. Server logic is in `server/server.js`
4. Test with multiple browser windows for multiplayer functionality

## License

This project is open source and available under the [MIT License](LICENSE).

## Credits

- **Movie data**: The Movie Database (TMDB)
- **Icons**: Emoji characters
- **Sound effects**: Add your own from freesound.org or similar

---

Enjoy deciding what movies to watch with The Wheel! 🎬🎲