import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const StatCard = ({ label, value, icon, color }) => (
  <div className="card" style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{label}</div>
  </div>
);

const ToolCard = ({ icon, title, desc, path, color }) => (
  <Link to={path} style={{ textDecoration: 'none' }}>
    <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${color}22` }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}22`}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: '#94a3b8', fontSize: 14 }}>{desc}</p>
      <div style={{ marginTop: 16, color, fontSize: 14, fontWeight: 600 }}>Start Detection →</div>
    </div>
  </Link>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/history/stats/overview').then(r => setStats(r.data.stats)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#94a3b8', marginTop: 8 }}>Detect AI-generated content with industry-leading accuracy</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 40 }}>
        <StatCard label="Total Scans" value={stats?.total || 0} icon="🔬" color="#6366f1" />
        <StatCard label="AI Detected" value={stats?.aiDetected || 0} icon="🤖" color="#ef4444" />
        <StatCard label="Human Content" value={stats?.humanDetected || 0} icon="👤" color="#10b981" />
        <StatCard label="Text Scans" value={stats?.textCount || 0} icon="📝" color="#f59e0b" />
        <StatCard label="Image Scans" value={stats?.imageCount || 0} icon="🖼️" color="#8b5cf6" />
        <StatCard label="PDF Scans" value={stats?.pdfCount || 0} icon="📄" color="#ec4899" />
      </div>

      {/* Tool Cards */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Detection Tools</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
        <ToolCard icon="📝" title="AI Text Detector" color="#6366f1"
          desc="Detect ChatGPT, Claude, Gemini & more with 95%+ accuracy. Identify specific AI models used."
          path="/detect/text" />
        <ToolCard icon="🖼️" title="AI Image Detector" color="#ec4899"
          desc="Detect Midjourney, DALL-E, Stable Diffusion images with model identification."
          path="/detect/image" />
        <ToolCard icon="📄" title="AI PDF Detector" color="#10b981"
          desc="Analyze entire PDFs, highlight AI sections, and download detailed reports."
          path="/detect/pdf" />
      </div>

      {/* Recent History */}
      {stats?.recentScans?.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Recent Scans</h2>
            <Link to="/history" style={{ color: '#6366f1', fontSize: 14 }}>View all →</Link>
          </div>
          <div className="card">
            {stats.recentScans.map((scan, i) => (
              <div key={scan._id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 0',
                borderBottom: i < stats.recentScans.length - 1 ? '1px solid #2d2d5e' : 'none'
              }}>
                <div style={{ fontSize: 24 }}>
                  {scan.type === 'text' ? '📝' : scan.type === 'image' ? '🖼️' : '📄'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {scan.type === 'text' ? scan.textSnippet?.substring(0, 60) + '...' : scan.fileName}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${scan.result?.isAI ? 'badge-ai' : 'badge-human'}`}>
                  {scan.result?.isAI ? `🤖 AI ${scan.result.aiScore}%` : `👤 Human ${scan.result.humanScore}%`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;