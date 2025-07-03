import React, { useState } from 'react';
import './RoomControls.css';

const RoomControls = ({ 
  room, 
  users, 
  onCreateRoom, 
  onJoinRoom, 
  onLeaveRoom, 
  isConnected,
  userName,
  onUserNameChange 
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    setIsCreating(true);
    try {
      await onCreateRoom(roomName || 'New Room', userName);
      setRoomName('');
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    if (!joinCode.trim() || joinCode.length !== 4) {
      alert('Please enter a valid 4-digit room code');
      return;
    }
    
    setIsJoining(true);
    try {
      await onJoinRoom(joinCode, userName);
      setJoinCode('');
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };
  
  const handleJoinCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setJoinCode(value);
  };
  
  const copyRoomCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      alert('Room code copied to clipboard!');
    }
  };
  
  if (!isConnected) {
    return (
      <div className="room-controls">
        <div className="connection-status">
          <div className="status-indicator disconnected"></div>
          <span>Connecting to server...</span>
        </div>
      </div>
    );
  }
  
  if (room) {
    return (
      <div className="room-controls">
        <div className="room-info">
          <h3>{room.name}</h3>
          <div className="room-code">
            <span>Room Code: <strong>{room.code}</strong></span>
            <button onClick={copyRoomCode} className="copy-button">
              Copy
            </button>
          </div>
          <div className="connection-status">
            <div className="status-indicator connected"></div>
            <span>Connected</span>
          </div>
        </div>
        
        <div className="users-section">
          <h4>Connected Users ({users.length})</h4>
          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <button onClick={onLeaveRoom} className="leave-button">
          Leave Room
        </button>
      </div>
    );
  }
  
  return (
    <div className="room-controls">
      <h3>The Wheel</h3>
      
      <div className="user-name-section">
        <label htmlFor="userName">Your Name:</label>
        <input
          id="userName"
          type="text"
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
        />
      </div>
      
      <div className="room-actions">
        <div className="action-section">
          <h4>Create New Room</h4>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name (optional)"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={isCreating || !userName.trim()}
              className="create-button"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <div className="action-section">
          <h4>Join Existing Room</h4>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={joinCode}
              onChange={handleJoinCodeChange}
              placeholder="Enter 4-digit code"
              maxLength={4}
            />
            <button
              type="submit"
              disabled={isJoining || !userName.trim() || joinCode.length !== 4}
              className="join-button"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="connection-status">
        <div className="status-indicator connected"></div>
        <span>Connected to server</span>
      </div>
    </div>
  );
};

export default RoomControls;