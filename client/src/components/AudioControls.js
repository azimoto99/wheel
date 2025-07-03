import React, { useState, useRef, useEffect } from 'react';
import './AudioControls.css';

const AudioControls = ({ socket, roomCode }) => {
  const [musicUrl, setMusicUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [soundEffectsVolume, setSoundEffectsVolume] = useState(50);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  
  const audioRef = useRef(null);
  const spinSoundRef = useRef(null);
  const tickSoundRef = useRef(null);
  const victorySoundRef = useRef(null);
  
  useEffect(() => {
    const spinSound = new Audio('/sounds/wheel-spin.mp3');
    const tickSound = new Audio('/sounds/tick.mp3');
    const victorySound = new Audio('/sounds/victory.mp3');
    
    spinSoundRef.current = spinSound;
    tickSoundRef.current = tickSound;
    victorySoundRef.current = victorySound;
    
    return () => {
      spinSound.remove();
      tickSound.remove();
      victorySound.remove();
    };
  }, []);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);
  
  useEffect(() => {
    [spinSoundRef.current, tickSoundRef.current, victorySoundRef.current].forEach(sound => {
      if (sound) {
        sound.volume = soundEffectsVolume / 100;
      }
    });
  }, [soundEffectsVolume]);
  
  useEffect(() => {
    if (socket) {
      socket.on('music-updated', ({ musicUrl }) => {
        handleMusicChange(musicUrl);
      });
      
      socket.on('wheel-spinning', () => {
        playSpinSound();
      });
      
      socket.on('wheel-stopped', () => {
        playVictorySound();
      });
    }
    
    return () => {
      if (socket) {
        socket.off('music-updated');
        socket.off('wheel-spinning');
        socket.off('wheel-stopped');
      }
    };
  }, [socket]);
  
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  const handleMusicChange = (url) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    if (!url) {
      setCurrentTrack(null);
      setIsPlaying(false);
      return;
    }
    
    const youtubeId = extractYouTubeId(url);
    let finalUrl = url;
    
    if (youtubeId) {
      finalUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}`;
      setCurrentTrack({
        type: 'youtube',
        id: youtubeId,
        url: finalUrl
      });
    } else {
      setCurrentTrack({
        type: 'audio',
        url: finalUrl
      });
    }
    
    setMusicUrl(url);
  };
  
  const handlePlayPause = () => {
    if (currentTrack?.type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };
  
  const handleMusicSubmit = (e) => {
    e.preventDefault();
    handleMusicChange(musicUrl);
    
    if (socket && roomCode) {
      socket.emit('update-music', { musicUrl });
    }
  };
  
  const playSpinSound = () => {
    if (soundEffectsEnabled && spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };
  
  const playTickSound = () => {
    if (soundEffectsEnabled && tickSoundRef.current) {
      tickSoundRef.current.currentTime = 0;
      tickSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };
  
  const playVictorySound = () => {
    if (soundEffectsEnabled && victorySoundRef.current) {
      victorySoundRef.current.currentTime = 0;
      victorySoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };
  
  return (
    <div className="audio-controls">
      <h3>🎵 Audio Controls</h3>
      
      <form onSubmit={handleMusicSubmit} className="music-form">
        <div className="url-input">
          <input
            type="url"
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="Enter YouTube, Spotify, or audio URL..."
          />
          <button type="submit">Load</button>
        </div>
      </form>
      
      {currentTrack && (
        <div className="current-track">
          <h4>Current Track</h4>
          
          {currentTrack.type === 'youtube' ? (
            <div className="youtube-player">
              <iframe
                width="100%"
                height="200"
                src={currentTrack.url}
                title="YouTube player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="audio-player">
              <audio
                ref={audioRef}
                src={currentTrack.url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => console.error('Audio error:', e)}
              />
              
              <div className="audio-controls-buttons">
                <button onClick={handlePlayPause}>
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={handleStop}>⏹️</button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="volume-controls">
        <div className="volume-control">
          <label>Music Volume: {volume}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
        
        <div className="volume-control">
          <label>Sound Effects: {soundEffectsVolume}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={soundEffectsVolume}
            onChange={(e) => setSoundEffectsVolume(Number(e.target.value))}
          />
          <button
            className={`toggle-button ${soundEffectsEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
          >
            {soundEffectsEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
      
      <div className="sound-test">
        <h4>Test Sounds</h4>
        <div className="sound-test-buttons">
          <button onClick={playSpinSound}>🌪️ Spin</button>
          <button onClick={playTickSound}>⏰ Tick</button>
          <button onClick={playVictorySound}>🎉 Victory</button>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;