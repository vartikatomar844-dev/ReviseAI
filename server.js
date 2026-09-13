require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Configure Multer for in-memory file handling with a 15MB limit
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, me) => {
  me.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  });
});

// Main Core Endpoint: Upload PDF -> Extract Text -> Generate Structured Revision Notes via Gemini
app.post('/api/generate-notes', (req, res) => {
  upload.single('pdf')(req, res, async (err) => {
    // Multer error handling
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Only PDF files (.pdf) are allowed. Please select a valid lecture PDF.'
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds the 15 MB limit. Please upload a smaller PDF.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${err.message}`
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select a lecture PDF.'
      });
    }

    // Step 1: PDF Processing & Text Extraction
    let pdfText = '';
    let pdfInfo = {};
    try {
      // Ensure clean 0-indexed Buffer copy to prevent byteOffset issues with pdf.js
      const cleanPdfBuffer = Buffer.from(req.file.buffer);
      console.log('Received file:', req.file.originalname, 'mimetype:', req.file.mimetype, 'buffer length:', cleanPdfBuffer.length);
      const data = await pdfParse(cleanPdfBuffer);
      pdfText = data.text ? data.text.trim() : '';
      pdfInfo = {
        numpages: data.numpages,
        filename: req.file.originalname,
        size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB'
      };
    } catch (parseError) {
      console.error('PDF parsing error stack:', parseError);
      return res.status(422).json({
        success: false,
        error: `Could not extract text from the PDF: ${parseError.message || parseError}`
      });
    }

    if (!pdfText || pdfText.length < 30) {
      return res.status(422).json({
        success: false,
        error: 'The uploaded PDF contains no readable text. It may be a scanned image-only document or empty. Please provide a PDF with selectable text.'
      });
    }

    // Step 2: Gemini API Integration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment or .env file.'
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Prompt construction enforcing groundedness and strict JSON output schema
      const prompt = `You are ReviseAI, an expert academic assistant creating exam-ready revision notes for students.

CRITICAL GROUNDING RULES:
1. Base ALL facts, concepts, definitions, formulas, and examples STRICTLY on the provided lecture text below.
2. DO NOT invent or hallucinate information not present in the source.
3. If a section (such as formulas or examples) is not supported by the lecture text, return an empty array [] for that key.
4. Output MUST be valid JSON with NO outer markdown formatting (no \`\`\`json wrappers).

REQUIRED JSON SCHEMA:
{
  "title": "Main Topic or Title of the Lecture",
  "quickOverview": {
    "subject": "Identified Subject/Module Topic",
    "summary": "Short 2-3 sentence overview of what this lecture covers."
  },
  "keyConcepts": [
    {
      "concept": "Concept Name",
      "explanation": "Concise, clear explanation preserving technical terminology."
    }
  ],
  "importantDefinitions": [
    {
      "term": "Term Name",
      "definition": "Clear, precise definition based on the lecture."
    }
  ],
  "formulasAndRules": [
    {
      "name": "Formula or Rule Name",
      "content": "Formula, equation, or principle formatted clearly."
    }
  ],
  "examples": [
    {
      "title": "Example Scenario/Problem",
      "detail": "Explanation of example provided in lecture."
    }
  ],
  "mustRemember": [
    "5 to 8 high-priority points key for exam revision"
  ],
  "lastMinuteRevision": "Concise final recap paragraph summarizing essential takeaways."
}

LECTURE TEXT:
---
${pdfText.slice(0, 40000)}
---`;

      // Use Gemini 3.6 Flash for revision-note generation
      let model;
      let responseText = '';
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      } catch (primaryModelErr) {
        console.warn('Gemini model error:', primaryModelErr.message);
        model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      }

      // Clean JSON string if model included code fencing
      let cleanJsonStr = responseText.trim();
      if (cleanJsonStr.startsWith('```json')) {
        cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJsonStr.startsWith('```')) {
        cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const structuredNotes = JSON.parse(cleanJsonStr);

      return res.json({
        success: true,
        notes: structuredNotes,
        meta: pdfInfo
      });

    } catch (aiError) {
      console.error('Gemini API execution error:', aiError);
      return res.status(500).json({
        success: false,
        error: `AI Processing Error: ${aiError.message || 'Failed to generate revision notes from Gemini API.'}`
      });
    }
  });
});

// Fallback route to serve index.html for single page application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  ReviseAI is running on http://localhost:${PORT}`);
  console.log(`  PromptWars Community 2026: VIT Bhopal Edition`);
  console.log(`=================================================`);
});
