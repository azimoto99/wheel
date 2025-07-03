import React, { useRef, useEffect, useState } from 'react';
import './Wheel.css';

const Wheel = ({ movies, onSpin, isSpinning, selectedMovie, theme = 'modern' }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(5);
  
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
  
  useEffect(() => {
    if (isSpinning && selectedMovie) {
      spinToMovie();
    }
  }, [isSpinning, selectedMovie]);
  
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (movies.length === 0) {
      ctx.fillStyle = 'var(--bg-tertiary)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = 'var(--border-color)';
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
    
    if (selectedMovie) {
      highlightSelectedSegment(ctx, centerX, centerY, radius);
    }
  };
  
  const drawPointer = (ctx, centerX, centerY, radius) => {
    const gradient = ctx.createLinearGradient(centerX - 15, centerY - radius - 20, centerX + 15, centerY - radius - 5);
    gradient.addColorStop(0, 'var(--accent-primary)');
    gradient.addColorStop(1, 'var(--accent-hover)');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 25);
    ctx.lineTo(centerX - 12, centerY - radius - 8);
    ctx.lineTo(centerX + 12, centerY - radius - 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };
  
  const highlightSelectedSegment = (ctx, centerX, centerY, radius) => {
    const selectedIndex = movies.findIndex(movie => movie.id === selectedMovie.id);
    if (selectedIndex === -1) return;
    
    const anglePerSegment = (2 * Math.PI) / movies.length;
    const startAngle = selectedIndex * anglePerSegment;
    const endAngle = (selectedIndex + 1) * anglePerSegment;
    
    ctx.strokeStyle = 'var(--accent-primary)';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'var(--accent-primary)';
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius + 2, startAngle, endAngle);
    ctx.closePath();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };
  
  const spinToMovie = () => {
    if (!selectedMovie || movies.length === 0) return;
    
    const selectedIndex = movies.findIndex(movie => movie.id === selectedMovie.id);
    if (selectedIndex === -1) return;
    
    const anglePerSegment = (2 * Math.PI) / movies.length;
    const targetAngle = (selectedIndex * anglePerSegment) + (anglePerSegment / 2);
    const spins = 5 + Math.random() * 3;
    const finalRotation = (spins * 2 * Math.PI) - targetAngle;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.style.transition = `transform ${spinDuration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    canvas.style.transform = `rotate(${finalRotation}rad)`;
    
    setTimeout(() => {
      canvas.style.transition = 'none';
      setRotation(finalRotation);
    }, spinDuration * 1000);
  };
  
  const handleCanvasClick = () => {
    if (movies.length === 0 || isSpinning) return;
    
    const selectedIndex = Math.floor(Math.random() * movies.length);
    const selectedMovie = movies[selectedIndex];
    
    onSpin(spinDuration, selectedMovie);
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
              disabled={isSpinning}
            >
              {isSpinning ? 'Spinning...' : 'SPIN'}
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