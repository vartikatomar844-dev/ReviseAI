# ReviseAI

> **"Turn lecture material into exam-ready revision notes."**

Built for **PromptWars Community 2026: VIT Bhopal Edition**.

---

## Problem
During exam preparation, students spend hours wading through lengthy 50+ page lecture PDFs, slide decks, and dense academic readings. Synthesizing these raw slides into organized, high-yield study material is tedious and time-consuming, leading to last-minute cramming and missed key concepts.

## Solution
**ReviseAI** solves this by accepting lecture PDFs and transforming them into clear, structured, exam-oriented revision notes powered by Google Gemini AI. The output is strictly grounded in the source PDF material to prevent hallucination, highlighting key definitions, concepts, formulas, examples, high-priority exam points, and a last-minute recap.

## Core Flow
```
Lecture PDF  ──>  Text Extraction  ──>  Gemini AI Analysis  ──>  Structured Revision Notes
```

---

## Key Features
- **Instant Lecture PDF Processing**: Drag and drop any lecture PDF (up to 15 MB) to start analysis.
- **Strict PDF Grounding**: All generated notes, definitions, formulas, and examples are strictly derived from the uploaded source text.
- **Structured Exam Note Layout**:
  - **Quick Overview**: Identified subject and concise topic summary.
  - **Key Concepts**: Important academic principles explained concisely while preserving technical terms.
  - **Important Definitions**: Key terminology and definitions extracted directly.
  - **Important Formulas / Rules**: Mathematical notation, equations, and principles formatted in monospace code blocks.
  - **Examples**: Lecture-provided problem statements and real-world applications.
  - **Must Remember**: 5 to 8 high-priority bullet points ideal for exam prep.
  - **Last-Minute Revision**: Ultra-concise final recap paragraph.
- **Zero-Dependency Native UI**: Custom dark mode UI built with lightweight Vanilla HTML, CSS, and JS.
- **One-Click Export / Print**: Built-in `@media print` print stylesheet allows instant PDF export or paper printing via `window.print()`.
- **Graceful Error Handling**: Detects empty or scanned image PDFs, missing API keys, oversized files, and network issues with clear student-friendly guidance.

---

## AI Integration
ReviseAI uses the official **Google Generative AI SDK** (`@google/generative-ai`) targeting Gemini models (`gemini-2.5-flash` / `gemini-1.5-flash`).

### Grounding & Prompt Engineering
- System instructions enforce strict grounding: Gemini is instructed never to invent facts or external examples.
- Schema Enforcement: Gemini returns a structured JSON payload mapping to the 7 note sections.
- Section Omission: If a PDF lacks specific elements (such as formulas), Gemini returns empty arrays so the UI omits empty headers naturally.

---

## Tech Stack
- **Backend**: Node.js, Express.js
- **PDF Extraction**: `pdf-parse` (in-memory buffer parsing via `multer`)
- **AI Engine**: `@google/generative-ai` (Google Gemini API)
- **Frontend**: Vanilla HTML5, Custom CSS3 Design System, Vanilla JavaScript (ES6+)
- **Environment Management**: `dotenv`

---

## Project Structure
```
ReviseAI/
├── .env.example        # Environment variable template
├── .gitignore          # Repository git ignore rules
├── package.json        # Node.js dependencies and scripts
├── server.js           # Express web server & Gemini API integration
├── README.md           # Project documentation
└── public/
    ├── index.html      # Main application SPA markup
    ├── css/
    │   └── style.css   # Custom design system & print stylesheet
    └── js/
        └── app.js      # Drag-and-drop, API controller & note renderer
```

---

## Setup & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ReviseAI.git
   cd ReviseAI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere
   PORT=3000
   ```

---

## How to Run

### Start Production Server
```bash
npm start
```

### Start Development Mode (Auto-reload)
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Usage Guide
1. Open **ReviseAI** in your web browser.
2. Drag and drop your lecture PDF into the upload container or click **"Upload Lecture PDF"** to select a file.
3. Review the selected PDF filename and file size.
4. Click **"Generate Revision Notes"**.
5. Watch the processing indicator while Gemini extracts and formats your lecture material.
6. Study your structured notes online, jump between sections using navigation chips, or click **"Print / Save as PDF"** to save a copy for offline study!

---

## Limitations
- **Text Layer Requirement**: The PDF must contain readable/selectable text. Scanned image-only PDFs without OCR cannot be parsed.
- **File Size**: Maximum PDF upload size is set to 15 MB.
- **API Key**: A valid `GEMINI_API_KEY` is required on the server for live AI note generation.

---

## Future Improvements
- Multi-PDF batch merging for entire subject modules.
- Automatic diagram and image extraction from PDF slides.
- Custom revision note length selector (Concise vs Detailed mode).

---

*Built with ❤️ for PromptWars Community 2026: VIT Bhopal Edition.*
