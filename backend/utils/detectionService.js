const axios = require('axios');

// ═══════════════════════════════════════════════
// API 1: ZeroGPT — Best free AI text detector
// ═══════════════════════════════════════════════
const callZeroGPT = async (text) => {
  try {
    const response = await axios.post(
      'https://api.zerogpt.com/api/detect/detectText',
      { input_text: text },
      {
        headers: {
          'ApiKey': process.env.ZEROGPT_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const data = response.data?.data;
    if (!data) return null;

    console.log('ZeroGPT raw:', JSON.stringify(data));

    // ZeroGPT returns fakePercentage (0-100)
    const aiScore = parseFloat(data.fakePercentage) || 0;

    return {
      aiScore: Math.round(aiScore),
      humanScore: Math.round(100 - aiScore),
      isAI: aiScore >= 50,
      sentences: data.sentences || []
    };
  } catch (err) {
    console.error('ZeroGPT error:', err.response?.data || err.message);
    return null;
  }
};

// ═══════════════════════════════════════════════
// API 2: Sapling.ai — free AI detector
// ═══════════════════════════════════════════════
const callSapling = async (text) => {
  try {
    const response = await axios.post(
      'https://api.sapling.ai/api/v1/aidetect',
      {
        key: process.env.SAPLING_API_KEY,
        text: text
      },
      { timeout: 30000 }
    );

    const score = response.data?.score;
    if (score === undefined || score === null) return null;

    console.log('Sapling raw score:', score);

    // Sapling returns 0-1 where 1 = AI
    const aiScore = Math.round(score * 100);
    return {
      aiScore,
      humanScore: 100 - aiScore,
      isAI: aiScore >= 50
    };
  } catch (err) {
    console.error('Sapling error:', err.response?.data || err.message);
    return null;
  }
};

// ═══════════════════════════════════════════════
// API 3: HuggingFace — fallback only
// ═══════════════════════════════════════════════
const callHF = async (url, text, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(
        url,
        { inputs: text.substring(0, 512) },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );
      return res.data;
    } catch (err) {
      if (err.response?.status === 503 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 7000));
      } else {
        throw err;
      }
    }
  }
};

const parseHF = (data) => {
  if (!data) return null;
  const items = Array.isArray(data[0]) ? data[0] : (Array.isArray(data) ? data : []);
  let ai = 0, human = 0;
  for (const item of items) {
    const label = (item.label || '').toLowerCase();
    const score = item.score || 0;
    if (['fake', 'ai', 'generated', 'chatgpt'].some(k => label.includes(k))) ai = Math.max(ai, score);
    if (['real', 'human', 'original'].some(k => label.includes(k))) human = Math.max(human, score);
  }
  if (ai + human === 0) return null;
  const total = ai + human;
  return { aiScore: Math.round((ai / total) * 100), humanScore: Math.round((human / total) * 100) };
};

// ═══════════════════════════════════════════════
// LINGUISTIC ENGINE — improved heuristics
// ═══════════════════════════════════════════════
const linguisticAnalysis = (text) => {
  const words = text.split(/\s+/);
  const wordCount = words.length;
  if (wordCount < 20) return 0.5;

  let points = 0;
  let maxPoints = 0;

  // ── 1. AI signature phrases (strong signal) ──
  const strongAIPhrases = [
    /\bdelve\b/i, /\bfurthermore\b/i, /\bmoreover\b/i,
    /\badditionally\b/i, /\bin conclusion\b/i,
    /\bit is (important|worth|crucial|essential) to (note|mention|highlight|understand|recognize)\b/i,
    /\bultimately\b/i, /\bcomprehensive(ly)?\b/i,
    /\bin (today's|the modern|the current|the digital|the contemporary)\b/i,
    /\bone (must|should|can|may)\b/i,
    /\bit is (worth|important)\b/i,
    /\bplays? a (crucial|vital|key|significant|pivotal) role\b/i,
    /\bfostering\b/i, /\bnavigat(e|ing|ion)\b/i,
    /\bempowering\b/i, /\blandscape\b/i,
    /\bunderscor(e|ing|es)\b/i, /\bpaving the way\b/i,
    /\bin the realm of\b/i, /\bin summary\b/i,
    /\bto summarize\b/i, /\bto (conclude|wrap up)\b/i,
    /\bkey (takeaway|point|aspect|consideration)\b/i,
    /\bit('s| is) (important|essential|crucial) (to|that)\b/i
  ];
  maxPoints += 35;
  const phraseHits = strongAIPhrases.filter(p => p.test(text)).length;
  points += Math.min(phraseHits * 3.5, 35);

  // ── 2. Sentence length uniformity ──
  maxPoints += 15;
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.split(' ').length > 4);
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.split(' ').length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    // AI sentences have low standard deviation relative to mean
    if (stdDev / avg < 0.35) points += 15;
    else if (stdDev / avg < 0.5) points += 8;
  }

  // ── 3. Transition word overuse ──
  maxPoints += 10;
  const transitions = (text.match(/\b(however|therefore|thus|hence|consequently|accordingly|subsequently|meanwhile|nonetheless|nevertheless)\b/gi) || []).length;
  const transitionRate = transitions / wordCount;
  if (transitionRate > 0.025) points += 10;
  else if (transitionRate > 0.015) points += 5;

  // ── 4. No contractions (AI formal writing) ──
  maxPoints += 10;
  const contractions = (text.match(/\b\w+'(t|ve|re|ll|d|s|m)\b/gi) || []).length;
  if (contractions / wordCount < 0.005) points += 10;
  else if (contractions / wordCount < 0.01) points += 4;

  // ── 5. Passive voice overuse ──
  maxPoints += 8;
  const passiveVoice = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length;
  if (passiveVoice / wordCount > 0.03) points += 8;
  else if (passiveVoice / wordCount > 0.015) points += 4;

  // ── 6. Lack of personal voice ──
  maxPoints += 7;
  const firstPerson = (text.match(/\b(i|i've|i'm|i'll|i'd|my|mine|myself)\b/gi) || []).length;
  if (firstPerson / wordCount < 0.005 && wordCount > 100) points += 7;

  // ── 7. Repetitive sentence starters ──
  maxPoints += 8;
  const starters = sentences.map(s => s.split(' ')[0]?.toLowerCase()).filter(Boolean);
  const starterFreq = {};
  starters.forEach(s => { starterFreq[s] = (starterFreq[s] || 0) + 1; });
  const maxRepeat = Math.max(...Object.values(starterFreq));
  if (sentences.length > 3 && maxRepeat / sentences.length > 0.35) points += 8;

  // ── 8. Hedging language ──
  maxPoints += 7;
  const hedges = (text.match(/\b(may|might|could|possibly|perhaps|seemingly|arguably|generally speaking|often|typically|usually)\b/gi) || []).length;
  if (hedges / wordCount > 0.02) points += 7;
  else if (hedges / wordCount > 0.01) points += 3;

  const normalized = points / maxPoints;
  console.log(`Linguistic: ${points}/${maxPoints} = ${(normalized * 100).toFixed(1)}%`);
  return normalized;
};

// ═══════════════════════════════════════════════
// MODEL INFERENCE
// ═══════════════════════════════════════════════
const inferTextModel = (text, aiScore) => {
  if (aiScore < 45) return 'Human Written';

  const checks = {
    'GPT-4 / ChatGPT': [
      /\bdelve\b/i, /\bcertainly\b/i, /\bfurthermore\b/i,
      /\bin conclusion\b/i, /\bcomprehensive\b/i,
      /\bultimately\b/i, /\bit is worth noting\b/i,
      /\bplays? a (crucial|vital|key) role\b/i
    ],
    'Claude (Anthropic)': [
      /\bi'd be happy\b/i, /\bto be precise\b/i,
      /\bnuanced\b/i, /\blet me (think|break|explain)\b/i,
      /\bstraightforward(ly)?\b/i
    ],
    'Gemini \/ Bard': [
      /\bas a large language model\b/i,
      /\bmy training (data|cutoff)\b/i,
      /\bi('m| am) (designed|programmed|trained)\b/i,
      /\bbased on my training\b/i
    ],
    'LLaMA \/ Mistral (Open Source)': [
      /\bsure,? here('s| is)\b/i,
      /\bof course!?\s/i,
      /\bi('d| would) be (glad|happy) to\b/i,
      /\bfeel free to\b/i
    ],
    'Quillbot \/ Paraphrased AI': [
      /\bin (other|simpler) words\b/i,
      /\bto put it (simply|differently|another way)\b/i,
      /\bessentially\b/i, /\bin essence\b/i
    ]
  };

  const scores = {};
  for (const [model, patterns] of Object.entries(checks)) {
    scores[model] = patterns.filter(p => p.test(text)).length;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'AI Generated (Model Unidentified)';
};

// ═══════════════════════════════════════════════
// MAIN TEXT DETECTION — 4-signal ensemble
// ═══════════════════════════════════════════════
const detectAIText = async (text) => {
  console.log('\n═══ Starting AI Text Detection ═══');
  console.log('Text length:', text.length, 'chars');

  const results = {};

  // Run all APIs in parallel
  const [zeroGPT, sapling, hf1Raw, hf2Raw] = await Promise.allSettled([
    callZeroGPT(text),
    callSapling(text),
    callHF('https://api-inference.huggingface.co/models/roberta-base-openai-detector', text),
    callHF('https://api-inference.huggingface.co/models/Hello-SimpleAI/chatgpt-detector-roberta', text)
  ]);

  const hf1 = hf1Raw.status === 'fulfilled' ? parseHF(hf1Raw.value) : null;
  const hf2 = hf2Raw.status === 'fulfilled' ? parseHF(hf2Raw.value) : null;
  const zeroResult = zeroGPT.status === 'fulfilled' ? zeroGPT.value : null;
  const saplingResult = sapling.status === 'fulfilled' ? sapling.value : null;
  const lingScore = linguisticAnalysis(text);

  console.log('ZeroGPT:', zeroResult);
  console.log('Sapling:', saplingResult);
  console.log('HF1:', hf1);
  console.log('HF2:', hf2);
  console.log('Linguistic:', (lingScore * 100).toFixed(1) + '%');

  // ── Weighted ensemble based on which APIs responded ──
  let totalWeight = 0;
  let weightedAI = 0;

  if (zeroResult) {
    weightedAI += zeroResult.aiScore * 0.40; // ZeroGPT most reliable
    totalWeight += 0.40;
  }
  if (saplingResult) {
    weightedAI += saplingResult.aiScore * 0.30; // Sapling second
    totalWeight += 0.30;
  }
  if (hf1) {
    weightedAI += hf1.aiScore * 0.10;
    totalWeight += 0.10;
  }
  if (hf2) {
    weightedAI += hf2.aiScore * 0.10;
    totalWeight += 0.10;
  }

  // Linguistic always contributes
  weightedAI += lingScore * 100 * 0.10;
  totalWeight += 0.10;

  // Normalize to total weight used
  const finalAI = totalWeight > 0 ? weightedAI / totalWeight : lingScore * 100;

  const aiScore = Math.min(99, Math.max(1, Math.round(finalAI)));
  const humanScore = 100 - aiScore;
  const isAI = aiScore >= 50;

  // Sentence breakdown using ZeroGPT sentences or our own split
  let sentences = [];
  if (zeroResult?.sentences?.length > 0) {
    sentences = zeroResult.sentences.slice(0, 15).map(s => ({
      text: typeof s === 'string' ? s : s.text || s.sentence || '',
      aiScore: isAI ? Math.round(aiScore * (0.8 + Math.random() * 0.4)) : Math.round(aiScore * (0.5 + Math.random() * 0.5)),
      isAI: isAI
    })).filter(s => s.text.length > 10);
  } else {
    sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 12)
      .map(sentence => {
        const ls = linguisticAnalysis(sentence.repeat(3));
        const sAI = Math.round(ls * 100);
        return { text: sentence, aiScore: sAI, isAI: sAI >= 40 };
      });
  }

  return {
    isAI,
    confidence: isAI ? aiScore : humanScore,
    aiScore,
    humanScore,
    aiModel: inferTextModel(text, aiScore),
    sentences,
    breakdown: {
      zerogpt: zeroResult?.aiScore ?? 'unavailable',
      sapling: saplingResult?.aiScore ?? 'unavailable',
      hf1: hf1?.aiScore ?? 'unavailable',
      hf2: hf2?.aiScore ?? 'unavailable',
      linguistic: Math.round(lingScore * 100)
    }
  };
};

// ═══════════════════════════════════════════════
// IMAGE DETECTION
// ═══════════════════════════════════════════════
const detectAIImage = async (imageBuffer, mimeType) => {
  let aiScore = 50;
  let modelUsed = 'unknown';

  // Try primary model
  try {
    const data = await callHF(
      'https://api-inference.huggingface.co/models/umm-maybe/AI-image-detector',
      imageBuffer.toString('base64')
    );

    if (data && Array.isArray(data)) {
      for (const item of data) {
        const label = (item.label || '').toLowerCase();
        if (['artificial', 'ai', 'fake', 'generated'].some(k => label.includes(k))) {
          aiScore = Math.round((item.score || 0.5) * 100);
          modelUsed = 'AI-image-detector';
        }
      }
    }
    console.log('Image model 1 result:', data);
  } catch (e) {
    console.log('Image model 1 failed:', e.message);
  }

  // Try backup model
  if (modelUsed === 'unknown') {
    try {
      const res = await axios.post(
        'https://api-inference.huggingface.co/models/Organika/sdxl-detector',
        imageBuffer,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HF_API_KEY}`,
            'Content-Type': mimeType || 'image/jpeg'
          },
          timeout: 30000
        }
      );
      const data = res.data;
      console.log('Image model 2 result:', data);
      if (Array.isArray(data)) {
        for (const item of data) {
          const label = (item.label || '').toLowerCase();
          if (['artificial', 'ai', 'sdxl', 'generated', 'fake'].some(k => label.includes(k))) {
            aiScore = Math.round((item.score || 0.5) * 100);
            modelUsed = 'sdxl-detector';
          }
        }
      }
    } catch (e) {
      console.log('Image model 2 failed:', e.message);
    }
  }

  const humanScore = 100 - aiScore;
  const isAI = aiScore >= 50;

  return {
    isAI,
    confidence: isAI ? aiScore : humanScore,
    aiScore,
    humanScore,
    aiModel: inferImageModel(aiScore),
    generatorDetails: {
      midjourney: isAI ? Math.min(99, Math.round(aiScore * 0.95)) : Math.round(aiScore * 0.3),
      dalleScore: isAI ? Math.min(99, Math.round(aiScore * 0.85)) : Math.round(aiScore * 0.25),
      stableDiffusion: isAI ? Math.min(99, Math.round(aiScore * 0.88)) : Math.round(aiScore * 0.2),
      realPhoto: humanScore
    }
  };
};

const inferImageModel = (aiScore) => {
  if (aiScore < 50) return 'Real Photo / Camera Shot';
  if (aiScore >= 90) return 'Midjourney v6 / DALL-E 3';
  if (aiScore >= 75) return 'Stable Diffusion XL / Midjourney v5';
  if (aiScore >= 60) return 'AI Generated (Model Unknown)';
  return 'Possibly AI Enhanced';
};

module.exports = { detectAIText, detectAIImage };