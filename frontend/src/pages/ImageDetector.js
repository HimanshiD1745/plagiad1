import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import API from '../api/axios';
import toast from 'react-hot-toast';

const ImageDetector = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(accepted => {
    const f = accepted[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const detect = async () => {
    if (!file) return toast.error('Please upload an image first');
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await API.post('/detect/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.result);
      toast.success('Image analyzed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const ModelBar = ({ label, score }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontWeight: 700, color: score > 60 ? '#ef4444' : '#94a3b8' }}>{score}%</span>
      </div>
      <div style={{ height: 6, background: '#2d2d5e', borderRadius: 3 }}>
        <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, #6366f1, #ec4899)`, borderRadius: 3 }} />
      </div>
    </div>
  );

  return (
    <div className="page">
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🖼️ AI Image Detector</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>Detect Midjourney, DALL-E, Stable Diffusion and more</p>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 24, maxWidth: result ? '100%' : 600 }}>
        <div>
          <div className="card">
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? '#6366f1' : '#2d2d5e'}`,
              borderRadius: 10, padding: 40, textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? 'rgba(99,102,241,0.05)' : 'transparent',
              transition: 'all 0.2s', marginBottom: 16
            }}>
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                  <p style={{ color: '#94a3b8' }}>Drag & drop image here, or click to browse</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>JPG, PNG, WEBP up to 10MB</p>
                </>
              )}
            </div>

            {file && <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>📎 {file.name}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {file && (
                <button className="btn btn-outline" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>
                  Clear
                </button>
              )}
              <button className="btn btn-primary" onClick={detect} disabled={!file || loading}>
                {loading ? '⏳ Analyzing...' : '🔍 Detect AI'}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Detection Results</h3>

            <div style={{
              textAlign: 'center', padding: '20px',
              background: result.isAI ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              borderRadius: 10, marginBottom: 20,
              border: `1px solid ${result.isAI ? '#ef444440' : '#10b98140'}`
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{result.isAI ? '🤖' : '📷'}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: result.isAI ? '#ef4444' : '#10b981' }}>
                {result.isAI ? 'AI Generated' : 'Real Photo'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{result.confidence}% confidence</div>
            </div>

            <div style={{ background: '#0f0f1a', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>LIKELY GENERATOR</div>
              <div style={{ fontWeight: 700, color: '#6366f1' }}>🎨 {result.aiModel}</div>
            </div>

            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Generator Probability</div>
            <ModelBar label="Midjourney" score={result.generatorDetails?.midjourney || 0} />
            <ModelBar label="DALL-E 3" score={result.generatorDetails?.dalleScore || 0} />
            <ModelBar label="Stable Diffusion" score={result.generatorDetails?.stableDiffusion || 0} />
            <ModelBar label="Human / Camera" score={result.humanScore} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDetector;