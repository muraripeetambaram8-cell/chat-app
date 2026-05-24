import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketProvider } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';

export default function Chat() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user) navigate('/login');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <SocketProvider user={user}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.logo}>💬 ChatApp</h2>
          <span style={styles.username}>👤 {user?.username}</span>
          <button style={styles.logout} onClick={handleLogout}>Logout</button>
        </div>
        <div style={styles.body}>
          <Sidebar selectedRoom={selectedRoom} setSelectedRoom={setSelectedRoom} />
          <div style={styles.main}>
            {selectedRoom ? (
              <>
                <ChatWindow selectedRoom={selectedRoom} />
                <MessageInput selectedRoom={selectedRoom} />
              </>
            ) : (
              <div style={styles.placeholder}>
                <h3>👈 Select a room to start chatting!</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </SocketProvider>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '56px', background: '#185FA5', color: '#fff', gap: '1rem' },
  logo: { margin: 0, fontSize: '1.2rem' },
  username: { marginLeft: 'auto', fontSize: '14px' },
  logout: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  placeholder: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }
};