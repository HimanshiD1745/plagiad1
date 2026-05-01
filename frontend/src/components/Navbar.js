import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const links = [
    { path: '/dashboard', label: '🏠 Dashboard' },
    { path: '/detect/text', label: '📝 Text' },
    { path: '/detect/image', label: '🖼️ Image' },
    { path: '/detect/pdf', label: '📄 PDF' },
    { path: '/history', label: '🕓 History' },
  ];

  return (
    <nav style={{
      background: '#1a1a2e',
      borderBottom: '1px solid #2d2d5e',
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18
        }}>🔍</div>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>DetectAI</span>
      </Link>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {links.map(link => (
          <Link key={link.path} to={link.path} style={{
            padding: '8px 14px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
            background: pathname === link.path ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: pathname === link.path ? '#6366f1' : '#94a3b8',
            transition: 'all 0.2s'
          }}>
            {link.label}
          </Link>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, paddingLeft: 16, borderLeft: '1px solid #2d2d5e' }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Hi, {user.name?.split(' ')[0]}</span>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;