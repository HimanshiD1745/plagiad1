import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import API from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const PDFDetector = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(accepted => {
    setFile(accepted[0]);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024
  });

  const detect = async () => {
    if (!file) return toast.error('Upload a PDF first');
    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await API.post('/detect/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.result);
      toast.success('PDF analyzed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'PDF detection failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const doc = new jsPDF();
    const primary = [99, 102, 241];
    const danger = [239, 68, 68];
    const success = [16, 185, 129];

    // Header
    doc.setFillColor(...primary);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Detection Report', 20, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);
    doc.text(`File: ${file?.name}`, 20, 35);

    // Verdict
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(result.isAI ? danger : success));
    doc.text(result.isAI ? '⚠ AI CONTENT DETECTED' : '✓ HUMAN CONTENT', 20, 58);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`AI Score: ${result.aiScore}%`, 20, 70);
    doc.text(`Human Score: ${result.humanScore}%`, 20, 78);
    doc.text(`Detected Model: ${result.aiModel}`, 20, 86);
    doc.text(`Total Pages: ${result.totalPages}`, 20, 94);
    doc.text(`AI-Heavy Pages: ${result.aiPageCount}`, 20, 102);
    doc.text(`Word Count: ${result.wordCount?.toLocaleString()}`, 20, 110);

    // Page breakdown
    if (result.pageResults?.length > 0) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Page-by-Page Analysis', 20, 125);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      let y = 135;
      result.pageResults.forEach((p, i) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setTextColor(...(p.isAI ? danger : success));
        doc.text(`Page ${i + 1}: ${p.isAI ? `AI ${p.aiScore}%` : `Human ${p.humanScore}%`}`, 20, y);
        doc.setTextColor(0, 0, 0);
        if (p.snippet) {
          const lines = doc.splitTextToSize(p.snippet.substring(0, 120) + '...', 170);
          doc.setTextColor(80, 80, 80);
          doc.text(lines, 30, y + 5);
          doc.setTextColor(0, 0, 0);
        }
        y += 22;
      });
    }

    // AI sentences
    if (result.sentences?.length > 0) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('AI-Generated Sentences (Highlighted)', 20, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let y = 32;
      result.sentences.filter(s => s.isAI).slice(0, 30).forEach(s => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFillColor(255, 230, 230);
        const lines = doc.splitTextToSize(s.text, 165);
        doc.rect(15, y - 4, 178, lines.length * 5 + 6, 'F');
        doc.setTextColor(...danger);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 10;
      });
    }

    doc.save(`AI-Detection-Report-${file.name.replace('.pdf', '')}.pdf`);
    toast.success('Report downloaded!');
  };

  return (
    <div className="page">
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📄 AI PDF Detector</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>Full PDF analysis with highlighted AI sections and downloadable reports</p>

      <div className="card" style={{ maxWidth: 640, marginBottom: 24 }}>
        <div {...getRootProps()} style={{
          border: `2px dashed ${isDragActive ? '#6366f1' : '#2d2d5e'}`,
          borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer',
          background: isDragActive ? 'rgba(99,102,241,0.05)' : 'transparent',
          transition: 'all 0.2s', marginBottom: 16
        }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          {file ? (
            <p style={{ color: '#e2e8f0', fontWeight: 600 }}>📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
          ) : (
            <>
              <p style={{ color: '#94a3b8' }}>Drag & drop PDF here, or click to browse</p>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>PDF up to 20MB</p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {file && <button className="btn btn-outline" onClick={() => { setFile(null); setResult(null); }}>Clear</button>}
          <button className="btn btn-primary" onClick={detect} disabled={!file || loading}>
            {loading ? '⏳ Analyzing PDF...' : '🔍 Analyze PDF'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Summary Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Analysis Summary</h3>
              <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={downloadReport}>
                ⬇️ Download Report
              </button>
            </div>

            <div style={{
              textAlign: 'center', padding: '20px',
              background: result.isAI ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              borderRadius: 10, marginBottom: 20,
              border: `1px solid ${result.isAI ? '#ef444440' : '#10b98140'}`
            }}>
              <div style={{ fontSize: 36 }}>{result.isAI ? '🤖' : '👤'}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: result.isAI ? '#ef4444' : '#10b981', marginTop: 8 }}>
                {result.isAI ? 'AI Content Detected' : 'Primarily Human Written'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'AI Score', value: `${result.aiScore}%`, color: '#ef4444' },
                { label: 'Human Score', value: `${result.humanScore}%`, color: '#10b981' },
                { label: 'Total Pages', value: result.totalPages, color: '#6366f1' },
                { label: 'AI Pages', value: result.aiPageCount, color: '#f59e0b' },
                { label: 'Word Count', value: result.wordCount?.toLocaleString(), color: '#8b5cf6' },
                { label: 'Confidence', value: `${result.confidence}%`, color: '#ec4899' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0f0f1a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f0f1a', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>DETECTED AI MODEL</div>
              <div style={{ fontWeight: 700, color: '#6366f1' }}>🤖 {result.aiModel}</div>
            </div>
          </div>

          {/* AI Sentences */}
          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>AI-Generated Passages</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Red highlight = AI generated, Green = Human written
            </p>
            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.sentences?.slice(0, 20).map((s, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: s.isAI ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.05)',
                  borderLeft: `3px solid ${s.isAI ? '#ef4444' : '#10b981'}`,
                  borderRadius: '0 6px 6px 0',
                  fontSize: 13
                }}>
                  <div style={{ marginBottom: 5, lineHeight: 1.5 }}>{s.text}</div>
                  <span className={`badge ${s.isAI ? 'badge-ai' : 'badge-human'}`} style={{ fontSize: 11 }}>
                    {s.isAI ? `🤖 AI ${s.aiScore}%` : `👤 Human`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFDetector;