import React, { useRef, useEffect, useState } from 'react';
import './Wheel.css';

const Wheel = ({ movies, onSpin, isSpinning, selectedMovie, theme = 'modern', spinData }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get theme colors for Canvas (CSS variables don't work in Canvas)
  const getThemeColors = () => {
    switch(theme) {
      case 'dark':
        return { primary: '#38bdf8', hover: '#7dd3fc', empty: '#334155', border: '#475569' };
      case 'neon':
        return { primary: '#00ffff', hover: '#ff00ff', empty: '#1a0033', border: '#00ffff' };
      case 'ocean':
        return { primary: '#00aaff', hover: '#33bbff', empty: '#003355', border: '#66ccff' };
      case 'sunset':
        return { primary: '#e65100', hover: '#cc4500', empty: '#ffa726', border: '#ff8c42' };
      default: // modern
        return { primary: '#0ea5e9', hover: '#0284c7', empty: '#f8fafc', border: '#e2e8f0' };
    }
  };
  
  const colors = {
    modern: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'],
    dark: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#84cc16'],
    neon: ['#00ffff', '#ff00ff', '#ffff00', '#ff0066', '#00ff00', '#ff6600', '#6600ff', '#ff0099'],
    ocean: ['#00aaff', '#0088cc', '#66ccff', '#003366', '#0066aa', '#3399dd', '#004488', '#77ddff'],
    sunset: ['#ff6b35', '#f7931e', '#ffd23f', '#e65100', '#ff8c42', '#ffa726', '#ff7043', '#ffab40']
  };
  
  useEffect(() => {
    drawWheel();
  }, [movies, theme, selectedMovie]);
  
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
    
    if (movies.length === 0) {
      const themeColors = getThemeColors();
      ctx.fillStyle = themeColors.empty;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = themeColors.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    
    const anglePerSegment = (2 * Math.PI) / movies.length;
    const themeColors = colors[theme] || colors.classic;
    
    movies.forEach((movie, index) => {
      const startAngle = index * anglePerSegment;
      const endAngle = (index + 1) * anglePerSegment;
      
      ctx.fillStyle = themeColors[index % themeColors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      
      const text = movie.title.length > 20 ? movie.title.substring(0, 20) + '...' : movie.title;
      ctx.fillText(text, radius * 0.7, 5);
      
      if (movie.year) {
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`(${movie.year})`, radius * 0.7, 18);
      }
      
      ctx.restore();
    });
    
    drawPointer(ctx, centerX, centerY, radius);
    drawWinningIndicator(ctx, centerX, centerY, radius);
    
    if (selectedMovie) {
      highlightSelectedSegment(ctx, centerX, centerY, radius);
    }
  };
  
  const drawPointer = (ctx, centerX, centerY, radius) => {
    const themeColors = getThemeColors();
    
    // Draw pointer at 3 o'clock position (right side)
    const gradient = ctx.createLinearGradient(centerX + radius + 5, centerY - 15, centerX + radius + 20, centerY + 15);
    gradient.addColorStop(0, themeColors.primary);
    gradient.addColorStop(1, themeColors.hover);
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX + radius + 25, centerY);
    ctx.lineTo(centerX + radius + 8, centerY - 15);
    ctx.lineTo(centerX + radius + 8, centerY + 15);
    ctx.closePath();
    ctx.fill();
    
    // Add a small circle at the base of the pointer
    ctx.beginPath();
    ctx.arc(centerX + radius + 8, centerY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
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
  
  const highlightSelectedSegment = (ctx, centerX, centerY, radius) => {
    if (!selectedMovie) return;
    
    const selectedIndex = movies.findIndex(movie => movie.id === selectedMovie.id);
    if (selectedIndex === -1) return;
    
    const anglePerSegment = (2 * Math.PI) / movies.length;
    const startAngle = selectedIndex * anglePerSegment;
    const endAngle = (selectedIndex + 1) * anglePerSegment;
    
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
    
    // Complete the spin
    setTimeout(() => {
      canvas.style.transition = 'none';
      setRotation(finalRotation);
      setIsAnimating(false);
      
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
            max="10"
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
            <canvas
              ref={canvasRef}
              width="400"
              height="400"
              onClick={handleCanvasClick}
              className={`wheel-canvas ${isSpinning ? 'spinning' : ''}`}
            />
            
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