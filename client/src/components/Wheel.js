import React, { useRef, useEffect, useState } from 'react';
import './Wheel.css';

const Wheel = ({ movies, onSpin, isSpinning, selectedMovie, theme = 'rosebud', spinData, initialRotation = 0, onTickSound }) => {
  const canvasRef = useRef(null);
  const arrowCanvasRef = useRef(null);
  const [rotation, setRotation] = useState(initialRotation);
  const [spinDuration, setSpinDuration] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const tickIntervalRef = useRef(null);
  
  // Get theme colors for Canvas (CSS variables don't work in Canvas)
  const getThemeColors = () => {
    switch(theme) {
      case 'godfather':
        return { primary: '#b8860b', hover: '#daa520', empty: '#4a2b1a', border: '#6b4423' };
      case 'mermaid':
        return { primary: '#ff7f50', hover: '#ff6347', empty: '#004080', border: '#20b2aa' };
      case 'impossible':
        return { primary: '#ff0040', hover: '#ff3366', empty: '#2a2a2a', border: '#00ff41' };
      case 'avengers':
        return { primary: '#dc2626', hover: '#ef4444', empty: '#1e40af', border: '#ffd700' };
      default: // rosebud
        return { primary: '#2c2c2c', hover: '#000000', empty: '#f8f8f8', border: '#e0e0e0' };
    }
  };
  
  const colors = {
    rosebud: ['#2c2c2c', '#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd', '#e0e0e0', '#eeeeee'],
    godfather: ['#b8860b', '#8b4513', '#daa520', '#cd853f', '#d2691e', '#f4a460', '#deb887', '#burlywood'],
    mermaid: ['#ff7f50', '#20b2aa', '#87ceeb', '#4682b4', '#5f9ea0', '#7fffd4', '#40e0d0', '#48d1cc'],
    impossible: ['#ff0040', '#00ff41', '#ffaa00', '#0080ff', '#ff8000', '#8000ff', '#00ff80', '#ff4080'],
    avengers: ['#dc2626', '#1d4ed8', '#ffd700', '#ffffff', '#374151', '#ef4444', '#3b82f6', '#f59e0b']
  };
  
  useEffect(() => {
    drawWheel();
    drawArrow();
  }, [movies, theme, selectedMovie]);
  
  // Update rotation when initialRotation changes (on room join)
  useEffect(() => {
    if (initialRotation !== rotation && !isAnimating) {
      setRotation(initialRotation);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transition = 'none';
        canvas.style.transform = `rotate(${initialRotation}rad)`;
      }
    }
  }, [initialRotation]);
  
  // Set initial rotation on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && rotation !== 0) {
      canvas.style.transition = 'none';
      canvas.style.transform = `rotate(${rotation}rad)`;
    }
  }, []);
  
  // Handle synchronized spin data from server
  useEffect(() => {
    if (spinData && !isAnimating) {
      performSynchronizedSpin(spinData);
    }
  }, [spinData]);
  
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Filter out vetoed movies for display
    const availableMovies = movies.filter(movie => !movie.vetoed);
    
    if (availableMovies.length === 0) {
      const themeColors = getThemeColors();
      ctx.fillStyle = themeColors.empty;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = themeColors.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Show message if all movies are vetoed
      if (movies.length > 0) {
        ctx.fillStyle = themeColors.border;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('All movies vetoed', centerX, centerY);
      }
      return;
    }
    
    // Calculate segment angles based on voting weights
    const baseWeight = 1;
    const voteMultiplier = 0.3;
    
    const weightedMovies = availableMovies.map(movie => ({
      ...movie,
      weight: Math.max(0.1, baseWeight + ((movie.votes || 0) * voteMultiplier))
    }));
    
    const totalWeight = weightedMovies.reduce((sum, movie) => sum + movie.weight, 0);
    
    // Calculate cumulative angles for each segment
    let currentAngle = 0;
    const movieSegments = weightedMovies.map(movie => {
      const segmentAngle = (movie.weight / totalWeight) * (2 * Math.PI);
      const segment = {
        ...movie,
        startAngle: currentAngle,
        endAngle: currentAngle + segmentAngle,
        segmentAngle
      };
      currentAngle += segmentAngle;
      return segment;
    });
    
    const themeColors = colors[theme] || colors.rosebud;
    
    movieSegments.forEach((movie, index) => {
      const { startAngle, endAngle } = movie;
      
      ctx.fillStyle = themeColors[index % themeColors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add subtle gradient effect for highly voted movies
      if (movie.votes && movie.votes > 0) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Use the center of this specific segment
      const segmentCenter = startAngle + (endAngle - startAngle) / 2;
      ctx.rotate(segmentCenter);
      
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      
      // Adjust font size based on segment size
      const segmentRatio = movie.segmentAngle / (2 * Math.PI / availableMovies.length);
      const baseFontSize = Math.min(12, Math.max(8, 12 * Math.sqrt(segmentRatio)));
      
      ctx.font = `bold ${baseFontSize}px Inter, sans-serif`;
      
      // Adjust text length based on segment size
      const maxTextLength = Math.max(8, Math.floor(20 * segmentRatio));
      const text = movie.title.length > maxTextLength ? movie.title.substring(0, maxTextLength) + '...' : movie.title;
      
      // Draw black outline for title text
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, radius * 0.7, -2);
      ctx.fillText(text, radius * 0.7, -2);
      
      if (movie.year && segmentRatio > 0.3) { // Only show year if segment is large enough
        ctx.font = `${Math.max(8, baseFontSize - 2)}px Inter, sans-serif`;
        
        // Draw black outline for year text
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(`(${movie.year})`, radius * 0.7, 12);
        ctx.fillText(`(${movie.year})`, radius * 0.7, 12);
      }
      
      // Show vote count if movie has votes and segment is large enough
      if (movie.votes && movie.votes !== 0 && segmentRatio > 0.2) {
        ctx.font = `bold ${Math.max(8, baseFontSize - 2)}px Inter, sans-serif`;
        ctx.fillStyle = movie.votes > 0 ? '#10b981' : '#dc2626';
        const voteText = movie.votes > 0 ? `+${movie.votes}` : `${movie.votes}`;
        
        // Draw black outline for vote text
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(voteText, radius * 0.7, segmentRatio > 0.3 ? 25 : 12);
        ctx.fillText(voteText, radius * 0.7, segmentRatio > 0.3 ? 25 : 12);
      }
      
      ctx.restore();
    });
    
    drawWinningIndicator(ctx, centerX, centerY, radius);
    
    if (selectedMovie && movieSegments) {
      highlightSelectedSegment(ctx, centerX, centerY, radius, movieSegments);
    }
  };
  
  const drawArrow = () => {
    const arrowCanvas = arrowCanvasRef.current;
    if (!arrowCanvas) return;
    
    const ctx = arrowCanvas.getContext('2d');
    const centerX = arrowCanvas.width / 2;
    const centerY = arrowCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
    
    const themeColors = getThemeColors();
    
    // Draw arrow at 3 o'clock position (right side)
    const gradient = ctx.createLinearGradient(centerX + radius + 5, centerY - 20, centerX + radius + 35, centerY + 20);
    gradient.addColorStop(0, '#FFD700'); // Gold color for visibility
    gradient.addColorStop(1, '#FFA500'); // Orange for gradient effect
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 2;
    
    // Draw the main arrow body - positioned to point at 3 o'clock from outside the wheel
    // Arrow tip should be just outside the wheel edge at 3 o'clock
    const arrowTipX = centerX + radius + 2;
    const arrowTipY = centerY;
    
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY); // Arrow tip (points to wheel edge)
    ctx.lineTo(arrowTipX + 20, arrowTipY - 15); // Top of arrow
    ctx.lineTo(arrowTipX + 20, arrowTipY - 5); // Top of shaft
    ctx.lineTo(arrowTipX + 35, arrowTipY - 5); // Right of shaft
    ctx.lineTo(arrowTipX + 35, arrowTipY + 5); // Right of shaft bottom
    ctx.lineTo(arrowTipX + 20, arrowTipY + 5); // Bottom of shaft
    ctx.lineTo(arrowTipX + 20, arrowTipY + 15); // Bottom of arrow
    ctx.closePath();
    ctx.fill();
    
    // Add a white outline for contrast
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add a small circle at the base of the arrow for attachment point
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(arrowTipX + 35, arrowTipY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };
  
  const drawWinningIndicator = (ctx, centerX, centerY, radius) => {
    // Draw a line from center to 3 o'clock position to show winning position
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset line dash
    
    // Add "WINNER" text near the pointer
    const themeColors = getThemeColors();
    ctx.fillStyle = themeColors.primary;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WINNER', centerX + radius + 35, centerY - 20);
  };
  
  const highlightSelectedSegment = (ctx, centerX, centerY, radius, movieSegments) => {
    if (!selectedMovie || !movieSegments) return;
    
    const selectedSegment = movieSegments.find(segment => segment.id === selectedMovie.id);
    if (!selectedSegment) return;
    
    const { startAngle, endAngle } = selectedSegment;
    
    // Highlight the winning segment with a glowing border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, startAngle, endAngle);
    ctx.stroke();
    
    // Add inner glow
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#FFF';
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, startAngle, endAngle);
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };
  
  const getWinningMovie = (finalRotation) => {
    if (movies.length === 0) return null;
    
    // Normalize rotation to 0-2π range
    const normalizedRotation = ((finalRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Calculate which segment is at 3 o'clock (0 radians) position
    // Since we want the segment that the pointer (at 3 o'clock) is pointing to
    const anglePerSegment = (2 * Math.PI) / movies.length;
    
    // The wheel rotates clockwise, so we need to account for that
    // The winning segment is the one that ends up at the pointer position
    const winningIndex = Math.floor(((2 * Math.PI - normalizedRotation) / anglePerSegment)) % movies.length;
    
    return movies[winningIndex];
  };
  
  const performSynchronizedSpin = (spinData, timeOffset = 0) => {
    if (!spinData || isAnimating) return;
    
    setIsAnimating(true);
    
    const { totalRotation, duration, selectedMovie, syncMode, remainingTime } = spinData;
    const finalRotation = rotation + totalRotation;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let actualDuration = duration;
    let startRotation = rotation;
    
    // Handle mid-spin synchronization for users who joined late
    if (syncMode && remainingTime) {
      actualDuration = remainingTime / 1000; // Convert to seconds
      // Calculate how much rotation should have already occurred
      const progressRatio = 1 - (remainingTime / (duration * 1000));
      startRotation = rotation + (totalRotation * progressRatio);
    }
    
    // Apply CSS animation
    canvas.style.transition = `transform ${actualDuration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    canvas.style.transform = `rotate(${finalRotation}rad)`;
    
    // Add tick sounds during spinning
    if (movies.length > 0 && onTickSound) {
      const anglePerSegment = (2 * Math.PI) / movies.length;
      const tickInterval = (actualDuration * 1000) / (totalRotation / anglePerSegment);
      const maxTickInterval = 200; // Don't tick too fast
      const finalTickInterval = Math.max(tickInterval, maxTickInterval);
      
      tickIntervalRef.current = setInterval(() => {
        onTickSound();
      }, finalTickInterval);
    }
    
    // Complete the spin
    setTimeout(() => {
      canvas.style.transition = 'none';
      setRotation(finalRotation);
      setIsAnimating(false);
      
      // Clear tick sounds
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      
      // The selected movie is already determined by the server
      // No need to call onSpin here since the App component handles the result
    }, actualDuration * 1000);
  };
  
  const startSpin = () => {
    if (movies.length === 0 || isAnimating) return;
    
    // Send spin request to server instead of spinning locally
    if (onSpin) {
      onSpin(spinDuration, null, true); // Third parameter indicates this is a spin start request
    }
  };
  
  const handleCanvasClick = () => {
    if (movies.length === 0 || isSpinning || isAnimating) return;
    startSpin();
  };
  
  return (
    <div className={`wheel-container ${theme}`}>
      {movies.length > 0 && (
        <div className="wheel-stats">
          <div className="stat-card">
            <div className="stat-value">{movies.length}</div>
            <div className="stat-label">Movies</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{spinDuration}s</div>
            <div className="stat-label">Duration</div>
          </div>
        </div>
      )}
      
      <div className="wheel-controls">
        <h4>Spin Controls</h4>
        <div className="spin-duration-control">
          <label>Spin Duration: {spinDuration}s</label>
          <input
            type="range"
            min="3"
            max="100"
            value={spinDuration}
            onChange={(e) => setSpinDuration(Number(e.target.value))}
            disabled={isSpinning}
          />
        </div>
      </div>
      
      <div className="wheel-wrapper">
        {movies.length === 0 ? (
          <div className="empty-wheel">
            <div className="empty-wheel-icon">🎬</div>
            <h3>Ready to Spin?</h3>
            <p>Add some movies to the wheel to get started!</p>
          </div>
        ) : (
          <>
            <div className="wheel-container" style={{ position: 'relative', display: 'inline-block' }}>
              <canvas
                ref={canvasRef}
                width="400"
                height="400"
                onClick={handleCanvasClick}
                className={`wheel-canvas ${isSpinning ? 'spinning' : ''}`}
              />
              <canvas
                ref={arrowCanvasRef}
                width="400"
                height="400"
                className="arrow-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            </div>
            
            <button
              className={`spin-button ${isSpinning ? 'spinning' : ''}`}
              onClick={handleCanvasClick}
              disabled={isSpinning || isAnimating}
            >
              {(isSpinning || isAnimating) ? 'Spinning...' : 'SPIN'}
            </button>
          </>
        )}
      </div>
      
      {selectedMovie && (
        <div className="selected-movie">
          <h3>Selected Movie</h3>
          <div className="movie-info">
            {selectedMovie.poster && (
              <img src={selectedMovie.poster} alt={selectedMovie.title} />
            )}
            <div className="movie-details">
              <h4>{selectedMovie.title}</h4>
              {selectedMovie.year && <p>({selectedMovie.year})</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wheel;