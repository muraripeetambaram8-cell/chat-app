import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

export default function ChatWindow({ selectedRoom, setSelectedRoom }) {
  const [messages, setMessages] = useState([]);
  const [typers, setTypers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const socket = useSocket();
  const bottomRef = useRef();
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const isAdmin = selectedRoom?.admins?.includes(user.id) ||
                  selectedRoom?.createdBy === user.id;

  useEffect(() => {
    if (!socket || !selectedRoom) return;
    socket.emit('join_room', selectedRoom._id);

    socket.on('message_history', (history) => setMessages(history));
    socket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('typing_indicator', ({ username, typing }) => {
      setTypers(prev =>
        typing ? [...new Set([...prev, username])]
               : prev.filter(u => u !== username)
      );
    });
    socket.on('room_deleted', () => {
      alert('This room has been deleted!');
      setSelectedRoom(null);
    });
    socket.on('kicked', ({ userId: kickedId }) => {
      if (kickedId === user.id) {
        alert('You have been kicked from this room!');
        setSelectedRoom(null);
      }
    });
    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    });

    return () => {
      socket.off('message_history');
      socket.off('new_message');
      socket.off('typing_indicator');
      socket.off('room_deleted');
      socket.off('kicked');
      socket.off('reaction_updated');
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMembers = async () => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/rooms/members/${selectedRoom._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(data);
    } catch (err) {
      console.log(err);
    }
  };

  const kickUser = (targetUserId) => {
    if (window.confirm('Are you sure you want to kick this user?')) {
      socket.emit('kick_user', { roomId: selectedRoom._id, targetUserId });
    }
  };

  const deleteRoom = () => {
    if (window.confirm('Are you sure you want to DELETE this room?')) {
      socket.emit('delete_room', { roomId: selectedRoom._id });
    }
  };

  const toggleAdmin = () => {
    setShowAdmin(!showAdmin);
    if (!showAdmin) fetchMembers();
  };

  const addReaction = (messageId, emoji) => {
    socket.emit('add_reaction', { messageId, emoji });
  };

  return (
    <div style={styles.container}>
      {/* Room Header */}
      <div style={styles.roomHeader}>
        <span># {selectedRoom.name}</span>
        <div style={styles.headerRight}>
          {selectedRoom.password && <span style={styles.locked}>🔒 Password Protected</span>}
          {selectedRoom.isPrivate && <span style={styles.private}>🔐 Private</span>}
          {isAdmin && (
            <button style={styles.adminBtn} onClick={toggleAdmin}>
              ⚙️ Admin
            </button>
          )}
        </div>
      </div>

      {/* Admin Panel */}
      {showAdmin && isAdmin && (
        <div style={styles.adminPanel}>
          <h4 style={styles.adminTitle}>⚙️ Admin Controls</h4>
          <p style={styles.adminSub}>Members in this room:</p>
          {members.length === 0 && <p style={styles.adminSub}>Loading members...</p>}
          {members.map(member => (
            <div key={member._id} style={styles.memberRow}>
              <span style={styles.memberName}>
                {member.username}
                {member._id === user.id && ' (You)'}
                {selectedRoom.createdBy === member._id && ' 👑'}
              </span>
              {member._id !== user.id && (
                <button style={styles.kickBtn}
                  onClick={() => kickUser(member._id)}>
                  Kick
                </button>
              )}
            </div>
          ))}
          <button style={styles.deleteBtn} onClick={deleteRoom}>
            🗑️ Delete Room
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => {
          const isMe = msg.sender._id === user.id || msg.sender === user.id;
          return (
            <div key={i}
              style={{ ...styles.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}
              onMouseEnter={() => setHoveredMsg(msg._id)}
              onMouseLeave={() => setHoveredMsg(null)}>
              {!isMe && (
                <div style={styles.avatar}>
                  {msg.sender.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                {!isMe && <div style={styles.senderName}>{msg.sender.username}</div>}
                <div style={{ ...styles.bubble, background: isMe ? '#185FA5' : '#f0f0f0', color: isMe ? '#fff' : '#222' }}>
                  {msg.content}

                  {/* File/Image display */}
                  {msg.fileUrl && (
                    msg.type === 'image' ? (
                      <img src={msg.fileUrl} alt="shared"
                        style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '6px', display: 'block' }} />
                    ) : (
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                        style={{ display: 'block', color: isMe ? '#cce' : '#185FA5', fontSize: '12px', marginTop: '4px' }}>
                        📎 {msg.content}
                      </a>
                    )
                  )}
                </div>

                {/* Reaction Picker - shows on hover */}
                {hoveredMsg === msg._id && (
                  <div style={{ ...styles.reactionBar, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                      <span key={emoji} style={styles.emojiBtn}
                        onClick={() => addReaction(msg._id, emoji)}>
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Show reaction counts */}
                {msg.reactions?.length > 0 && (
                  <div style={{ ...styles.reactions, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {Object.entries(
                      msg.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <span key={emoji} style={styles.reactionBubble}
                        onClick={() => addReaction(msg._id, emoji)}>
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ ...styles.time, textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {isMe && (
                <div style={{ ...styles.avatar, background: '#185FA5', color: '#fff' }}>
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
        {typers.length > 0 && (
          <div style={styles.typing}>
            {typers.join(', ')} {typers.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  roomHeader: { padding: '12px 1.5rem', borderBottom: '1px solid #e0e0e0', fontWeight: 600, fontSize: '15px', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  locked: { fontSize: '11px', background: '#fff3cd', color: '#856404', padding: '3px 8px', borderRadius: '10px' },
  private: { fontSize: '11px', background: '#f8d7da', color: '#721c24', padding: '3px 8px', borderRadius: '10px' },
  adminBtn: { fontSize: '12px', background: '#185FA5', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  adminPanel: { background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', padding: '1rem 1.5rem' },
  adminTitle: { margin: '0 0 0.5rem', fontSize: '14px' },
  adminSub: { fontSize: '12px', color: '#888', marginBottom: '8px' },
  memberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' },
  memberName: { fontSize: '13px', color: '#333' },
  kickBtn: { fontSize: '12px', background: '#dc3545', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { marginTop: '12px', width: '100%', padding: '8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  messages: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px', flexShrink: 0 },
  senderName: { fontSize: '11px', color: '#888', marginBottom: '3px', paddingLeft: '2px' },
  bubble: { padding: '8px 14px', borderRadius: '16px', fontSize: '14px', maxWidth: '320px', lineHeight: 1.5, wordBreak: 'break-word' },
  time: { fontSize: '11px', color: '#aaa', marginTop: '3px' },
  typing: { fontSize: '12px', color: '#888', fontStyle: 'italic', padding: '4px 0' },
  reactionBar: { display: 'flex', gap: '4px', marginTop: '4px' },
  emojiBtn: { cursor: 'pointer', fontSize: '14px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)' },
  reactions: { display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' },
  reactionBubble: { fontSize: '12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '10px', padding: '2px 8px', cursor: 'pointer' }
};
