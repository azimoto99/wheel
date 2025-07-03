import React, { useRef, useEffect, useState } from 'react';
import './Wheel.css';

const Wheel = ({ movies, onSpin, isSpinning, selectedMovie, theme = 'classic' }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(5);
  
  const colors = {
    classic: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
    dark: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'],
    neon: ['#FF073A', '#39FF14', '#FF9F00', '#BF00FF', '#00FFFF', '#FF1493', '#FFFF00', '#FF4500'],
    theater: ['#8B0000', '#FFD700', '#DC143C', '#B8860B', '#A0522D', '#8B4513', '#CD853F', '#DAA520'],
    retro: ['#FF6B9D', '#C44569', '#F8B500', '#78E08F', '#546DE5', '#E15759', '#F5A623', '#7ED6DF']
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
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#666';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Add movies to get started!', centerX, centerY);
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
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      
      const text = movie.title.length > 20 ? movie.title.substring(0, 20) + '...' : movie.title;
      ctx.fillText(text, radius * 0.7, 5);
      
      if (movie.year) {
        ctx.font = '12px Arial';
        ctx.fillText(`(${movie.year})`, radius * 0.7, 20);
      }
      
      ctx.restore();
    });
    
    drawPointer(ctx, centerX, centerY, radius);
    
    if (selectedMovie) {
      highlightSelectedSegment(ctx, centerX, centerY, radius);
    }
  };
  
  const drawPointer = (ctx, centerX, centerY, radius) => {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 20);
    ctx.lineTo(centerX - 15, centerY - radius - 5);
    ctx.lineTo(centerX + 15, centerY - radius - 5);
    ctx.closePath();
    ctx.fill();
  };
  
  const highlightSelectedSegment = (ctx, centerX, centerY, radius) => {
    const selectedIndex = movies.findIndex(movie => movie.id === selectedMovie.id);
    if (selectedIndex === -1) return;
    
    const anglePerSegment = (2 * Math.PI) / movies.length;
    const startAngle = selectedIndex * anglePerSegment;
    const endAngle = (selectedIndex + 1) * anglePerSegment;
    
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.stroke();
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
      <div className="wheel-controls">
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
        <canvas
          ref={canvasRef}
          width="400"
          height="400"
          onClick={handleCanvasClick}
          className={`wheel-canvas ${isSpinning ? 'spinning' : ''}`}
        />
        
        {movies.length > 0 && (
          <button
            className={`spin-button ${isSpinning ? 'spinning' : ''}`}
            onClick={handleCanvasClick}
            disabled={isSpinning}
          >
            {isSpinning ? 'Spinning...' : 'SPIN'}
          </button>
        )}
      </div>
      
      {selectedMovie && (
        <div className="selected-movie">
          <h3>Selected Movie:</h3>
          <div className="movie-info">
            {selectedMovie.poster && (
              <img src={selectedMovie.poster} alt={selectedMovie.title} />
            )}
            <div>
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