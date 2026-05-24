import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const url = isRegister
        ? 'http://localhost:5000/api/auth/register'
        : 'http://localhost:5000/api/auth/login';
      const { data } = await axios.post(url, form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>💬 ChatApp</h2>
        <h3 style={styles.subtitle}>{isRegister ? 'Create Account' : 'Welcome Back'}</h3>
        {error && <p style={styles.error}>{error}</p>}
        {isRegister && (
          <input style={styles.input} placeholder="Username"
            onChange={e => setForm({ ...form, username: e.target.value })} />
        )}
        <input style={styles.input} placeholder="Email"
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input style={styles.input} placeholder="Password" type="password"
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <button style={styles.button} onClick={handleSubmit}>
          {isRegister ? 'Register' : 'Login'}
        </button>
        <p style={styles.toggle} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  box: { background: '#fff', padding: '2rem', borderRadius: '12px', width: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.8rem' },
  subtitle: { textAlign: 'center', marginBottom: '1.5rem', color: '#555', fontWeight: 400 },
  input: { width: '100%', padding: '10px 14px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
  error: { color: 'red', fontSize: '13px', marginBottom: '1rem', textAlign: 'center' },
  toggle: { textAlign: 'center', marginTop: '1rem', color: '#185FA5', cursor: 'pointer', fontSize: '13px' }
};