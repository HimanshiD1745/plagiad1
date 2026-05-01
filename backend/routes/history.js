const express = require('express');
const History = require('../models/History');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/history/stats/overview — MUST be before /:id
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, textCount, imageCount, pdfCount, recentScans] = await Promise.all([
      History.countDocuments({ user: userId }),
      History.countDocuments({ user: userId, type: 'text' }),
      History.countDocuments({ user: userId, type: 'image' }),
      History.countDocuments({ user: userId, type: 'pdf' }),
      History.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const aiDetected = await History.countDocuments({
      user: userId,
      'result.isAI': true
    });

    res.json({
      success: true,
      stats: {
        total,
        textCount,
        imageCount,
        pdfCount,
        aiDetected,
        humanDetected: total - aiDetected,
        recentScans
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/history
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (type) query.type = type;

    const [history, total] = await Promise.all([
      History.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      History.countDocuments(query)
    ]);

    res.json({
      success: true,
      history,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/history/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await History.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/history/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await History.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;