import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Signup = () => {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (form.password.length < 6) return toast.error('Password must be 6+ characters');
  setLoading(true);
  try {
    await signup(form.name, form.email, form.password);
    toast.success('Account created!');
  } catch (err) {
    console.error('Signup error full:', err.response); // open browser console to see this
    toast.error(err.response?.data?.message || err.message || 'Signup failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg,#6366f1,#ec4899)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 16px'
          }}>🔍</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>Create account</h1>
          <p style={{ color: '#94a3b8', marginTop: 8 }}>Start detecting AI content for free</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input type="text" className="form-input" placeholder="John Doe"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ color: '#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;