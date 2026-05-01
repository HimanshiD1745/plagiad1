import React, { useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const TextDetector = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const detect = async () => {
    if (text.trim().length < 50) return toast.error('Enter at least 50 characters');
    setLoading(true);
    try {
      const res = await API.post('/detect/text', { text });
      setResult(res.data.result);
      toast.success('Detection complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const ScoreBar = ({ label, value, color }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#2d2d5e', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );

  return (
    <div className="page">
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📝 AI Text Detector</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>Detect ChatGPT, Claude, Gemini and more with 95%+ accuracy</p>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="card">
            <label className="form-label" style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
              Paste your text below
            </label>
            <textarea
              className="form-input"
              placeholder="Paste any text here — article, essay, email, report... (minimum 50 characters)"
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ minHeight: 280, marginTop: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{text.length.toLocaleString()} characters</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {text && <button className="btn btn-outline" onClick={() => { setText(''); setResult(null); }}>Clear</button>}
                <button className="btn btn-primary" onClick={detect} disabled={loading || text.length < 50}>
                  {loading ? '⏳ Analyzing...' : '🔍 Detect AI'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {result && (
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Detection Results</h3>

              {/* Main verdict */}
              <div style={{
                textAlign: 'center', padding: '20px',
                background: result.isAI ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                borderRadius: 10, marginBottom: 20,
                border: `1px solid ${result.isAI ? '#ef444440' : '#10b98140'}`
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{result.isAI ? '🤖' : '👤'}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.isAI ? '#ef4444' : '#10b981' }}>
                  {result.isAI ? 'AI Generated' : 'Human Written'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
                  {result.confidence}% confidence
                </div>
              </div>

              {/* AI Model */}
              <div style={{ background: '#0f0f1a', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>DETECTED MODEL</div>
                <div style={{ fontWeight: 700, color: '#6366f1' }}>🤖 {result.aiModel}</div>
              </div>

              <ScoreBar label="AI Score" value={result.aiScore} color="#ef4444" />
              <ScoreBar label="Human Score" value={result.humanScore} color="#10b981" />
            </div>

            {/* Sentence-level breakdown */}
            {result.sentences?.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: 16, fontWeight: 700 }}>Sentence Analysis</h4>
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.sentences.slice(0, 15).map((s, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: s.isAI ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                      borderLeft: `3px solid ${s.isAI ? '#ef4444' : '#10b981'}`,
                      borderRadius: '0 6px 6px 0',
                      fontSize: 13
                    }}>
                      <div style={{ marginBottom: 4 }}>{s.text}</div>
                      <span className={`badge ${s.isAI ? 'badge-ai' : 'badge-human'}`} style={{ fontSize: 11 }}>
                        {s.isAI ? `AI ${s.aiScore}%` : `Human ${100 - s.aiScore}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* API Breakdown — add this after ScoreBar components */}
{result.breakdown && (
  <div style={{ marginTop: 20, background: '#0f0f1a', borderRadius: 8, padding: 14 }}>
    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 600 }}>
      DETECTION SOURCES
    </div>
    {Object.entries(result.breakdown).map(([key, val]) => (
      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>{key}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: val === 'unavailable' ? '#64748b' : val >= 50 ? '#ef4444' : '#10b981' }}>
          {val === 'unavailable' ? '—' : `${val}% AI`}
        </span>
      </div>
    ))}
  </div>
)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextDetector;