// Build timestamp: 2024-06-06-v3
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';

function App() {
  const user = JSON.parse(localStorage.getItem('user'));
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;