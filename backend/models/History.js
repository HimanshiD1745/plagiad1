const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'pdf'],
    required: true
  },
  // For text detection
  textSnippet: {
    type: String,
    maxlength: 500
  },
  // For image/pdf
  fileName: String,
  fileUrl: String,
  // Detection results
  result: {
    isAI: Boolean,
    confidence: Number,          // 0-100 percentage
    aiModel: String,             // e.g., "GPT-4", "Midjourney", "DALL-E"
    aiScore: Number,
    humanScore: Number,
    // Text-specific
    sentences: [
      {
        text: String,
        aiScore: Number,
        isAI: Boolean
      }
    ],
    // PDF-specific
    totalPages: Number,
    aiPageCount: Number,
    reportUrl: String,
    // Image-specific
    generatorDetails: Object
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete history older than 90 days
historySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('History', historySchema);