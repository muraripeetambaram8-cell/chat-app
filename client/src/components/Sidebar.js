import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
const API = 'https://chat-app-lc2w.onrender.com';

export default function Sidebar({ selectedRoom, setSelectedRoom }) {
  const [rooms, setRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [newRoom, setNewRoom] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(null);
  const socket = useSocket();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('online_users', setOnlineUsers);
    socket.on('room_deleted', (roomId) => {
      setRooms(prev => prev.filter(r => r._id !== roomId));
      if (selectedRoom?._id === roomId) setSelectedRoom(null);
    });
    socket.on('kicked', ({ roomId }) => {
      setRooms(prev => prev.filter(r => r._id !== roomId));
      if (selectedRoom?._id === roomId) {
        setSelectedRoom(null);
        alert('You have been kicked from this room!');
      }
    });
    return () => {
      socket.off('online_users');
      socket.off('room_deleted');
      socket.off('kicked');
    };
  }, [socket, selectedRoom]);

  const fetchRooms = async () => {
    const { data } = await axios.get('https://chat-app-lc2w.onrender.com/api/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setRooms(data);
  };

  const createRoom = async () => {
    if (!newRoom.trim()) return;
    try {
      const { data } = await axios.post('https://chat-app-lc2w.onrender.com/api/rooms',
        { name: newRoom, isPrivate, password: roomPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRooms(prev => [data, ...prev]);
      setNewRoom('');
      setRoomPassword('');
      setIsPrivate(false);
      setShowCreate(false);
      joinRoom(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating room');
    }
  };

  const joinRoom = async (room) => {
    try {
      // Try joining
      const { data } = await axios.post(
        `https://chat-app-lc2w.onrender.com/api/rooms/join/${room._id}`,
        { password: passwordInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        if (selectedRoom) socket?.emit('leave_room', selectedRoom._id);
        setSelectedRoom(room);
        socket?.emit('join_room', room._id);
        setJoiningRoom(null);
        setPasswordInput('');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === 'Wrong password!') {
        setJoiningRoom(room);
      } else {
        alert(msg || 'Cannot join room');
      }
    }
  };

  const submitPassword = async () => {
    if (!joiningRoom) return;
    try {
      const { data } = await axios.post(
        `https://chat-app-lc2w.onrender.com/api/rooms/join/${joiningRoom._id}`,
        { password: passwordInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        if (selectedRoom) socket?.emit('leave_room', selectedRoom._id);
        setSelectedRoom(joiningRoom);
        socket?.emit('join_room', joiningRoom._id);
        setJoiningRoom(null);
        setPasswordInput('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Wrong password!');
    }
  };

  return (
    <div style={styles.sidebar}>
      {/* Password Modal */}
      {joiningRoom && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>🔒 {joiningRoom.name}</h3>
            <p style={styles.modalSub}>This room requires a password</p>
            <input style={styles.modalInput} type="password"
              placeholder="Enter room password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPassword()} />
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setJoiningRoom(null)}>Cancel</button>
              <button style={styles.joinBtn} onClick={submitPassword}>Join</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.label}>ROOMS</p>
          <button style={styles.addBtn} onClick={() => setShowCreate(!showCreate)}>+</button>
        </div>

        {/* Create Room Form */}
        {showCreate && (
          <div style={styles.createForm}>
            <input style={styles.input} placeholder="Room name"
              value={newRoom} onChange={e => setNewRoom(e.target.value)} />
            <input style={styles.input} placeholder="Password (optional)" type="password"
              value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
            <label style={styles.checkLabel}>
              <input type="checkbox" checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)} />
              &nbsp;Private room
            </label>
            <button style={styles.createBtn} onClick={createRoom}>Create Room</button>
          </div>
        )}

        {/* Room List */}
        {rooms.map(room => (
          <div key={room._id}
            style={{ ...styles.item, background: selectedRoom?._id === room._id ? '#dce8f5' : 'transparent' }}
            onClick={() => joinRoom(room)}>
            <span>{room.password ? '🔒' : '#'} {room.name}</span>
            {room.createdBy === user.id && <span style={styles.adminBadge}>Admin</span>}
          </div>
        ))}
      </div>

      {/* Online Users */}
      <div style={styles.section}>
        <p style={styles.label}>ONLINE</p>
        {Object.values(onlineUsers).map((name, i) => (
          <div key={i} style={styles.user}>
            <span style={styles.dot}></span>{name}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: '220px', background: '#f8f9fa', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', padding: '1rem 0', overflowY: 'auto' },
  section: { marginBottom: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', marginBottom: '6px' },
  label: { fontSize: '11px', color: '#999', letterSpacing: '0.05em', margin: 0 },
  addBtn: { background: '#185FA5', color: '#fff', border: 'none', borderRadius: '4px', width: '20px', height: '20px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  createForm: { padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' },
  input: { padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
  checkLabel: { fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center' },
  createBtn: { padding: '6px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 1rem', fontSize: '14px', cursor: 'pointer', borderRadius: '6px', margin: '0 6px' },
  adminBadge: { fontSize: '10px', background: '#185FA5', color: '#fff', padding: '2px 6px', borderRadius: '10px' },
  user: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 1rem', fontSize: '13px', color: '#444' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#639922', display: 'inline-block' },
  modal: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', padding: '2rem', borderRadius: '12px', width: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 0.5rem', fontSize: '1.1rem' },
  modalSub: { color: '#888', fontSize: '13px', marginBottom: '1rem' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '1rem' },
  modalBtns: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: '#fff' },
  joinBtn: { padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
};