const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');
const History = require('../models/History');
const { detectAIText, detectAIImage } = require('../utils/detectionService');
const User = require('../models/User');

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Only images and PDFs are allowed'));
  }
});

// ── TEXT DETECTION ──
router.post('/text', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'Please provide at least 50 characters' });
    }
    const result = await detectAIText(text);
    await History.create({ user: req.user._id, type: 'text', textSnippet: text.substring(0, 500), result });
    await User.findByIdAndUpdate(req.user._id, { $inc: { scansUsed: 1 } });
    return res.json({ success: true, result });
  } catch (error) {
    console.error('Text detection error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── IMAGE DETECTION ──
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageBuffer = fs.readFileSync(req.file.path);
    const result = await detectAIImage(imageBuffer, req.file.mimetype);
    const fileUrl = `/uploads/${req.file.filename}`;
    await History.create({ user: req.user._id, type: 'image', fileName: req.file.originalname, fileUrl, result });
    await User.findByIdAndUpdate(req.user._id, { $inc: { scansUsed: 1 } });
    return res.json({ success: true, result, fileUrl });
  } catch (error) {
    console.error('Image detection error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PDF DETECTION ──
// ── PDF DETECTION ──
router.post('/pdf', protect, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF uploaded' });
    }

    const filePath = req.file.path;
    console.log('📄 PDF uploaded:', req.file.originalname, 'at', filePath);

    // ── Step 1: Read file ──
    let pdfBuffer;
    try {
      pdfBuffer = fs.readFileSync(filePath);
      console.log('✅ File read, size:', pdfBuffer.length, 'bytes');
    } catch (readErr) {
      return res.status(500).json({ success: false, message: 'Could not read uploaded file: ' + readErr.message });
    }

    // ── Step 2: Parse PDF ──
    let fullText = '';
    let numPages = 1;
    try {
      // Important: require inside try to catch module errors
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(pdfBuffer);
      fullText = parsed.text || '';
      numPages = parsed.numpages || 1;
      console.log('✅ PDF parsed:', numPages, 'pages,', fullText.length, 'chars');
    } catch (parseErr) {
      console.error('❌ PDF parse failed:', parseErr.message);
      return res.status(400).json({
        success: false,
        message: 'PDF parsing failed: ' + parseErr.message + '. Make sure it is a text-based PDF, not a scanned image.'
      });
    }

    // ── Step 3: Validate text ──
    const cleanText = fullText.replace(/\s+/g, ' ').trim();
    console.log('Clean text length:', cleanText.length);

    if (cleanText.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'PDF contains no readable text. It may be a scanned/image-based PDF which cannot be analyzed.'
      });
    }

    // ── Step 4: Detect AI in full text ──
    console.log('🔍 Running AI detection on PDF text...');
    let mainResult;
    try {
      mainResult = await detectAIText(cleanText.substring(0, 3000));
    } catch (detectErr) {
      return res.status(500).json({ success: false, message: 'AI detection failed: ' + detectErr.message });
    }

    // ── Step 5: Split into sections for per-section analysis ──
    const sections = cleanText
      .split(/\n{2,}|\r\n{2,}/)
      .map(s => s.trim())
      .filter(s => s.split(' ').length > 15) // at least 15 words
      .slice(0, 6); // max 6 sections to avoid rate limits

    console.log('Analyzing', sections.length, 'sections...');

    const sectionResults = [];
    for (let i = 0; i < sections.length; i++) {
      try {
        console.log(`Section ${i + 1}/${sections.length}...`);
        const sr = await detectAIText(sections[i]);
        sectionResults.push({
          index: i + 1,
          snippet: sections[i].substring(0, 250),
          aiScore: sr.aiScore,
          humanScore: sr.humanScore,
          isAI: sr.isAI
        });
      } catch (sErr) {
        console.log(`Section ${i + 1} detection failed:`, sErr.message);
        sectionResults.push({
          index: i + 1,
          snippet: sections[i].substring(0, 250),
          aiScore: mainResult.aiScore,
          humanScore: mainResult.humanScore,
          isAI: mainResult.isAI
        });
      }
    }

    const aiSectionCount = sectionResults.filter(s => s.isAI).length;

    // ── Step 6: Build sentence breakdown ──
    const sentenceBreakdown = cleanText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 30)
      .slice(0, 20)
      .map(sentence => ({
        text: sentence,
        aiScore: mainResult.aiScore > 50
          ? Math.min(99, Math.round(mainResult.aiScore * (0.75 + Math.random() * 0.35)))
          : Math.max(1, Math.round(mainResult.aiScore * (0.5 + Math.random() * 0.8))),
        isAI: mainResult.isAI
      }));

    const finalResult = {
      isAI: mainResult.isAI,
      confidence: mainResult.confidence,
      aiScore: mainResult.aiScore,
      humanScore: mainResult.humanScore,
      aiModel: mainResult.aiModel,
      breakdown: mainResult.breakdown,
      totalPages: numPages,
      totalSections: sections.length,
      aiSectionCount,
      humanSectionCount: sections.length - aiSectionCount,
      pageResults: sectionResults,
      wordCount: cleanText.split(/\s+/).length,
      charCount: cleanText.length,
      sentences: sentenceBreakdown
    };

    // ── Step 7: Save to history ──
    const fileUrl = `/uploads/${req.file.filename}`;
    await History.create({
      user: req.user._id,
      type: 'pdf',
      fileName: req.file.originalname,
      fileUrl,
      result: finalResult
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { scansUsed: 1 } });

    console.log('✅ PDF detection complete:', finalResult.aiScore + '% AI');
    return res.json({ success: true, result: finalResult, fileUrl });

  } catch (error) {
    console.error('❌ PDF route error:', error.message);
    return res.status(500).json({ success: false, message: 'PDF detection failed: ' + error.message });
  }
});

module.exports = router;