import { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';

export default function MessageInput({ selectedRoom }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socket = useSocket();
  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const token = localStorage.getItem('token');

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit('typing_start', { roomId: selectedRoom._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit('typing_stop', { roomId: selectedRoom._id });
    }, 1500);
  };

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const sendMessage = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', {
      roomId: selectedRoom._id,
      content: text,
      type: 'text'
    });
    socket.emit('typing_stop', { roomId: selectedRoom._id });
    setText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post('http://localhost:5000/api/upload',
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      const isImage = file.type.startsWith('image/');
      socket.emit('send_message', {
        roomId: selectedRoom._id,
        content: file.name,
        fileUrl: data.url,
        type: isImage ? 'image' : 'file'
      });
    } catch (err) {
      alert('File upload failed!');
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  return (
    <div style={styles.wrapper}>
      {/* Emoji Picker */}
      {showEmoji && (
        <div style={styles.pickerWrapper}>
          <EmojiPicker onEmojiClick={onEmojiClick} height={380} width={300} />
        </div>
      )}

      <div style={styles.container}>
        {/* Emoji Button */}
        <button style={styles.iconBtn} onClick={() => setShowEmoji(!showEmoji)}>
          😊
        </button>

        {/* File Upload Button */}
        <button style={styles.iconBtn} onClick={() => fileRef.current.click()}>
          {uploading ? '⏳' : '📎'}
        </button>
        <input type="file" ref={fileRef} style={{ display: 'none' }}
          onChange={handleFileUpload}
          accept="image/*,.pdf,.txt,.zip,.doc" />

        {/* Text Input */}
        <input
          style={styles.input}
          placeholder={`Message #${selectedRoom.name}...`}
          value={text}
          onChange={handleTyping}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />

        {/* Send Button */}
        <button style={styles.sendBtn} onClick={sendMessage}>
          Send ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' },
  pickerWrapper: { position: 'absolute', bottom: '70px', left: '10px', zIndex: 1000 },
  container: { display: 'flex', gap: '8px', padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0', background: '#fff', alignItems: 'center' },
  iconBtn: { fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' },
  input: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' },
  sendBtn: { padding: '10px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }
};