/* ==========================================================================
   ReviseAI — Frontend Logic & Application Controller
   PromptWars Community 2026: VIT Bhopal Edition
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const apiStatusPill = document.getElementById('api-status-pill');
  const apiStatusText = document.getElementById('api-status-text');
  
  const heroSection = document.getElementById('hero-section');
  const uploadSection = document.getElementById('upload-section');
  const dropzone = document.getElementById('dropzone');
  const pdfFileInput = document.getElementById('pdf-file-input');
  const browseBtn = document.getElementById('browse-btn');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const selectedFileCard = document.getElementById('selected-file-card');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const processBtn = document.getElementById('process-btn');
  
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const closeAlertBtn = document.getElementById('close-alert-btn');
  
  const loadingState = document.getElementById('loading-state');
  const loadingStepTitle = document.getElementById('loading-step-title');
  const loadingStepDesc = document.getElementById('loading-step-desc');
  
  const notesSection = document.getElementById('notes-section');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const printBtn = document.getElementById('print-btn');
  
  const docTitle = document.getElementById('doc-title');
  const docSourceMeta = document.getElementById('doc-source-meta');
  const docOverviewContainer = document.getElementById('doc-overview-container');
  const docNavChips = document.getElementById('doc-nav-chips');
  const docBody = document.getElementById('doc-body');

  let selectedFile = null;
  let loadingInterval = null;

  // Initialize System & Check Health
  checkSystemHealth();

  // ------------------------------------------------------------------------
  // 1. Health Check
  // ------------------------------------------------------------------------
  async function checkSystemHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      
      if (data.hasApiKey) {
        apiStatusPill.className = 'status-pill ready';
        apiStatusText.textContent = 'Gemini AI Ready';
      } else {
        apiStatusPill.className = 'status-pill warning';
        apiStatusText.textContent = 'API Key Missing';
        showError('Gemini API key is missing. Please configure GEMINI_API_KEY in your .env file.');
      }
    } catch (err) {
      apiStatusPill.className = 'status-pill warning';
      apiStatusText.textContent = 'Server Offline';
    }
  }

  // ------------------------------------------------------------------------
  // 2. Drag & Drop & File Selection Logic
  // ------------------------------------------------------------------------
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pdfFileInput.click();
  });

  dropzone.addEventListener('click', () => {
    if (!selectedFile) {
      pdfFileInput.click();
    }
  });

  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  // Drag events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      handleFileSelection(dt.files[0]);
    }
  });

  function handleFileSelection(file) {
    hideError();
    
    // File validation
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Selected file is not a PDF. Please upload a valid .pdf file.');
      return;
    }

    const maxSizeMB = 15;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxSizeMB} MB limit.`);
      return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    dropzonePrompt.classList.add('hidden');
    selectedFileCard.classList.remove('hidden');
    processBtn.disabled = false;
  }

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileSelection();
  });

  function resetFileSelection() {
    selectedFile = null;
    pdfFileInput.value = '';
    selectedFileCard.classList.add('hidden');
    dropzonePrompt.classList.remove('hidden');
    processBtn.disabled = true;
    hideError();
  }

  // ------------------------------------------------------------------------
  // 3. Process PDF Submission
  // ------------------------------------------------------------------------
  processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // UI state transitions
    hideError();
    uploadSection.classList.add('hidden');
    heroSection.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    startLoadingAnimation();

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      stopLoadingAnimation();
      loadingState.classList.add('hidden');

      if (response.ok && data.success) {
        renderRevisionNotes(data.notes, data.meta, selectedFile.name);
        notesSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        uploadSection.classList.remove('hidden');
        heroSection.classList.remove('hidden');
        showError(data.error || 'Failed to process lecture PDF. Please try again.');
      }
    } catch (err) {
      stopLoadingAnimation();
      loadingState.classList.add('hidden');
      uploadSection.classList.remove('hidden');
      heroSection.classList.remove('hidden');
      showError('Network error connecting to ReviseAI server. Please check your connection.');
    }
  });

  // Dynamic loading message indicator
  function startLoadingAnimation() {
    const steps = [
      { title: 'Reading Lecture PDF...', desc: 'Parsing pages and extracting text layer.' },
      { title: 'Analyzing Academic Content...', desc: 'Identifying key concepts, formulas, and definitions.' },
      { title: 'Generating Exam Revision Notes...', desc: 'Organizing material into structured study sections using Gemini AI.' },
      { title: 'Finalizing Study Document...', desc: 'Formatting formulas and last-minute revision summary.' }
    ];

    let currentStep = 0;
    loadingStepTitle.textContent = steps[0].title;
    loadingStepDesc.textContent = steps[0].desc;

    loadingInterval = setInterval(() => {
      currentStep = (currentStep + 1) % steps.length;
      loadingStepTitle.textContent = steps[currentStep].title;
      loadingStepDesc.textContent = steps[currentStep].desc;
    }, 2800);
  }

  function stopLoadingAnimation() {
    if (loadingInterval) clearInterval(loadingInterval);
  }

  // ------------------------------------------------------------------------
  // 4. Render Revision Notes Document
  // ------------------------------------------------------------------------
  function renderRevisionNotes(notes, meta, filename) {
    // Set Header Info
    docTitle.textContent = notes.title || filename.replace(/\.pdf$/i, '');
    docSourceMeta.textContent = `From: ${filename} ${meta && meta.numpages ? `(${meta.numpages} pages)` : ''}`;

    // Overview Section
    docOverviewContainer.innerHTML = '';
    if (notes.quickOverview) {
      const overviewHtml = `
        <div class="overview-card">
          <div class="overview-subject">${escapeHtml(notes.quickOverview.subject || 'Lecture Summary')}</div>
          <div class="overview-summary">${escapeHtml(notes.quickOverview.summary || '')}</div>
        </div>
      `;
      docOverviewContainer.innerHTML = overviewHtml;
    }

    // Reset Body & Chips
    docNavChips.innerHTML = '';
    docBody.innerHTML = '';

    const sections = [
      { id: 'sec-concepts', label: 'Key Concepts', key: 'keyConcepts', renderFn: renderConcepts },
      { id: 'sec-definitions', label: 'Definitions', key: 'importantDefinitions', renderFn: renderDefinitions },
      { id: 'sec-formulas', label: 'Formulas & Rules', key: 'formulasAndRules', renderFn: renderFormulas },
      { id: 'sec-examples', label: 'Examples', key: 'examples', renderFn: renderExamples },
      { id: 'sec-mustremember', label: 'Must Remember', key: 'mustRemember', renderFn: renderMustRemember },
      { id: 'sec-recap', label: 'Last-Minute Revision', key: 'lastMinuteRevision', renderFn: renderRecap }
    ];

    let sectionIndex = 1;

    sections.forEach(sec => {
      const dataContent = notes[sec.key];
      // Only render if content exists and is non-empty
      if (dataContent && (Array.isArray(dataContent) ? dataContent.length > 0 : Boolean(dataContent))) {
        // Create Navigation Chip
        const chip = document.createElement('a');
        chip.className = 'nav-chip';
        chip.href = `#${sec.id}`;
        chip.textContent = sec.label;
        docNavChips.appendChild(chip);

        // Create Section Element
        const secElem = document.createElement('section');
        secElem.className = 'note-section';
        secElem.id = sec.id;

        const headerHtml = `
          <div class="section-header">
            <span class="section-tag">${sectionIndex++}</span>
            <h2 class="section-title">${escapeHtml(sec.label)}</h2>
          </div>
        `;

        secElem.innerHTML = headerHtml + sec.renderFn(dataContent);
        docBody.appendChild(secElem);
      }
    });
  }

  // Section Renderers
  function renderConcepts(concepts) {
    const cards = concepts.map(c => `
      <div class="concept-card">
        <div class="concept-name">${escapeHtml(c.concept || '')}</div>
        <div class="concept-text">${escapeHtml(c.explanation || '')}</div>
      </div>
    `).join('');
    return `<div class="concept-grid">${cards}</div>`;
  }

  function renderDefinitions(defs) {
    const list = defs.map(d => `
      <div class="definition-item">
        <span class="def-term">${escapeHtml(d.term || '')}:</span>
        <span class="def-desc">${escapeHtml(d.definition || '')}</span>
      </div>
    `).join('');
    return `<div class="definition-list">${list}</div>`;
  }

  function renderFormulas(formulas) {
    return formulas.map(f => `
      <div class="formula-card">
        <div class="formula-title">${escapeHtml(f.name || 'Formula / Principle')}</div>
        <div class="formula-content">${escapeHtml(f.content || '')}</div>
      </div>
    `).join('');
  }

  function renderExamples(examples) {
    return examples.map(ex => `
      <div class="example-box">
        <div class="example-header">${escapeHtml(ex.title || 'Example')}</div>
        <div class="example-detail">${escapeHtml(ex.detail || '')}</div>
      </div>
    `).join('');
  }

  function renderMustRemember(items) {
    const list = items.map((item, idx) => `
      <li class="must-remember-item">
        <span class="must-remember-bullet">${idx + 1}</span>
        <span>${escapeHtml(item)}</span>
      </li>
    `).join('');
    return `<ul class="must-remember-list">${list}</ul>`;
  }

  function renderRecap(recapText) {
    return `
      <div class="last-minute-card">
        ${escapeHtml(recapText)}
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // 5. Actions (Print, Copy, Reset)
  // ------------------------------------------------------------------------
  printBtn.addEventListener('click', () => {
    window.print();
  });

  copyBtn.addEventListener('click', () => {
    const textToCopy = docBody.innerText || '';
    const titleText = docTitle.innerText || 'ReviseAI Notes';
    
    navigator.clipboard.writeText(`${titleText}\n\n${textToCopy}`).then(() => {
      copyBtnText.textContent = 'Copied!';
      setTimeout(() => {
        copyBtnText.textContent = 'Copy Notes';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy notes:', err);
    });
  });

  resetBtn.addEventListener('click', () => {
    notesSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    resetFileSelection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ------------------------------------------------------------------------
  // 6. Error Alert Helpers
  // ------------------------------------------------------------------------
  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function hideError() {
    errorAlert.classList.add('hidden');
  }

  closeAlertBtn.addEventListener('click', hideError);

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
});
