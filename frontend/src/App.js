import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TextDetector from './pages/TextDetector';
import ImageDetector from './pages/ImageDetector';
import PDFDetector from './pages/PDFDetector';
import History from './pages/History';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/detect/text" element={<ProtectedRoute><TextDetector /></ProtectedRoute>} />
        <Route path="/detect/image" element={<ProtectedRoute><ImageDetector /></ProtectedRoute>} />
        <Route path="/detect/pdf" element={<ProtectedRoute><PDFDetector /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;