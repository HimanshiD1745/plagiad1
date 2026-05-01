import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/history?page=${page}&limit=10${filter ? `&type=${filter}` : ''}`);
      setHistory(res.data.history);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [page, filter]);

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this scan?')) return;
    try {
      await API.delete(`/history/${id}`);
      toast.success('Deleted');
      fetchHistory();
    } catch {
      toast.error('Delete failed');
    }
  };

  const typeIcon = { text: '📝', image: '🖼️', pdf: '📄' };

  return (
    <div className="page">
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🕓 Scan History</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>All your previous AI detection scans</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {['', 'text', 'image', 'pdf'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
            style={{ padding: '8px 16px', fontSize: 13 }}>
            {f === '' ? 'All' : f === 'text' ? '📝 Text' : f === 'image' ? '🖼️ Image' : '📄 PDF'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3>No scans yet</h3>
          <p style={{ color: '#94a3b8', marginTop: 8 }}>Run your first detection to see history here</p>
        </div>
      ) : (
        <div className="card">
          {history.map((item, i) => (
            <div key={item._id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
              borderBottom: i < history.length - 1 ? '1px solid #2d2d5e' : 'none'
            }}>
              <div style={{ fontSize: 28 }}>{typeIcon[item.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.type === 'text' ? (item.textSnippet?.substring(0, 80) + '...') : item.fileName}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                  {item.type.toUpperCase()} • {new Date(item.createdAt).toLocaleString()}
                  {item.result?.aiModel && ` • ${item.result.aiModel}`}
                </div>
              </div>
              <span className={`badge ${item.result?.isAI ? 'badge-ai' : 'badge-human'}`}>
                {item.result?.isAI ? `🤖 AI ${item.result.aiScore}%` : `👤 Human ${item.result.humanScore}%`}
              </span>
              <button onClick={() => deleteItem(item._id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}
                title="Delete">🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} className={`btn ${page === i + 1 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPage(i + 1)} style={{ padding: '8px 14px', minWidth: 40 }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;