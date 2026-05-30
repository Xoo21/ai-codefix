/**
 * AI CodeFix — static/js/app.js
 * Main Application JavaScript
 * Handles: Monaco Editor, AI Analysis, UI State, History
 */

'use strict';

/* ============================================================
   1. CONSTANTS & STATE
   ============================================================ */

const APP = {
  version: '1.0.0',
  monacoEditor: null,
  currentLanguage: 'python',
  isAnalyzing: false,
  lastResult: null,
  history: [],
};

// Language configs for Monaco
const LANG_MAP = {
  python:     { monaco: 'python',     label: 'Python',     icon: '🐍', ext: '.py' },
  javascript: { monaco: 'javascript', label: 'JavaScript', icon: '⚡', ext: '.js' },
  java:       { monaco: 'java',       label: 'Java',       icon: '☕', ext: '.java' },
  cpp:        { monaco: 'cpp',        label: 'C++',        icon: '⚙️', ext: '.cpp' },
  html:       { monaco: 'html',       label: 'HTML',       icon: '🌐', ext: '.html' },
};

// Sample code snippets for each language (for demo/testing)
const SAMPLE_CODE = {
  python: `# ตัวอย่างโค้ด Python ที่มีข้อผิดพลาด
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total = total + num
    average = total / len(numbers)  # อาจเกิด ZeroDivisionError
    return average

# ลืม handle กรณี list ว่าง
result = calculate_average([10, 20, 30])
print("Average:", results)  # ชื่อตัวแปรผิด!

# ฟังก์ชันซ้ำซ้อน
def calculate_average(data):
    return sum(data) / len(data)`,

  javascript: `// ตัวอย่าง JavaScript ที่มีปัญหา
function fetchUserData(userId) {
  const response = fetch('/api/users/' + userId)
  const data = response.json()  // ลืม await!
  
  if (data.status = 'active') {  // ใช้ = แทน ===
    console.log('User is active: ' + data.name)
    return data
  }
}

// เรียกใช้งาน
var result = fetchUserData(123)
console.log(result.email)  // อาจเป็น undefined`,

  java: `// ตัวอย่าง Java ที่มีข้อผิดพลาด
public class Calculator {
    public static int divide(int a, int b) {
        return a / b;  // ไม่ handle ArithmeticException
    }
    
    public static void main(String[] args) {
        int result = divide(10, 0);  // จะ crash!
        System.out.println("Result: " + result)  // ลืม semicolon
    }
}`,

  cpp: `// ตัวอย่าง C++ ที่มีปัญหา
#include <iostream>
using namespace std;

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    
    // Array out of bounds!
    for (int i = 0; i <= 5; i++) {
        cout << arr[i] << endl;
    }
    
    int* ptr = new int(10);
    // ลืม delete ptr; - Memory leak!
    
    return 0
}`,

  html: `<!-- ตัวอย่าง HTML ที่มีปัญหา -->
<!DOCTYPE html>
<html>
<head>
  <title>My Page<title>  <!-- ปิด tag ผิด -->
</head>
<body>
  <h1>Welcome</h2>  <!-- tag ไม่ตรงกัน -->
  
  <img src="photo.jpg">  <!-- ขาด alt attribute -->
  
  <a href="#">คลิกที่นี่</a>
  
  <form>
    <input type="text" name="username">
    <input type="submit" value="Submit">
  <!-- ลืมปิด form tag -->
</body>
</html>`,
};


/* ============================================================
   2. DOM READY
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initPage();
});

function initPage() {
  const page = detectCurrentPage();

  // ทุกหน้า: sidebar toggle, tooltips
  initSidebar();
  initToasts();
  markActiveNavItem();

  if (page === 'dashboard') {
    initDashboard();
  } else if (page === 'history') {
    initHistoryPage();
  }
}

function detectCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('/history')) return 'history';
  if (path === '/dashboard' || path === '/') return 'dashboard';
  return 'other';
}


/* ============================================================
   3. SIDEBAR
   ============================================================ */

function initSidebar() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Close sidebar on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
}

function markActiveNavItem() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach((item) => {
    const href = item.getAttribute('href') || '';
    if (href && currentPath.startsWith(href) && href !== '/') {
      item.classList.add('active');
    } else if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) {
      item.classList.add('active');
    }
  });
}


/* ============================================================
   4. MONACO EDITOR
   ============================================================ */

function initMonacoEditor() {
  const container = document.getElementById('monaco-editor');
  if (!container) return;

  // Load Monaco from CDN
  require.config({
    paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' },
  });

  require(['vs/editor/editor.main'], function () {
    // Custom dark theme matching our design
    monaco.editor.defineTheme('codefix-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',  foreground: '4a5568', fontStyle: 'italic' },
        { token: 'keyword',  foreground: '7dd3fc' },
        { token: 'string',   foreground: '86efac' },
        { token: 'number',   foreground: 'fbbf24' },
        { token: 'operator', foreground: 'c084fc' },
        { token: 'type',     foreground: '67e8f9' },
        { token: 'function', foreground: '93c5fd' },
        { token: 'variable', foreground: 'e2e8f0' },
      ],
      colors: {
        'editor.background':           '#0a0f1e',
        'editor.foreground':           '#e2e8f0',
        'editor.lineHighlightBackground': '#1a2234',
        'editor.selectionBackground':  '#2d4a7a',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#64748b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editorCursor.foreground':     '#3b82f6',
        'scrollbarSlider.background':  '#1e293b',
        'scrollbarSlider.hoverBackground': '#334155',
        'editorWidget.background':     '#111827',
        'editorWidget.border':         '#1e293b',
        'editorSuggestWidget.background': '#111827',
        'editorSuggestWidget.border':  '#1e293b',
        'editorSuggestWidget.selectedBackground': '#1e3a5f',
        'input.background':            '#0d1424',
        'input.border':                '#1e293b',
      },
    });

    APP.monacoEditor = monaco.editor.create(container, {
      value: SAMPLE_CODE[APP.currentLanguage],
      language: LANG_MAP[APP.currentLanguage].monaco,
      theme: 'codefix-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: { enabled: window.innerWidth > 768 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      renderLineHighlight: 'line',
      bracketPairColorization: { enabled: true },
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      scrollbar: {
        verticalScrollbarSize: 4,
        horizontalScrollbarSize: 4,
      },
    });

    // Update line/col counter
    APP.monacoEditor.onDidChangeCursorPosition(updateEditorFooter);
    APP.monacoEditor.onDidChangeModelContent(updateEditorFooter);

    updateEditorFooter();

    // Keyboard shortcut: Ctrl+Enter to analyze
    APP.monacoEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => analyzeCode()
    );

    console.log('✅ Monaco Editor initialized');
  });
}

function updateEditorFooter() {
  if (!APP.monacoEditor) return;
  const pos = APP.monacoEditor.getPosition();
  const model = APP.monacoEditor.getModel();
  if (!pos || !model) return;

  const lineEl = document.getElementById('editor-line-col');
  const linesEl = document.getElementById('editor-total-lines');
  const charsEl = document.getElementById('editor-char-count');

  if (lineEl) lineEl.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
  if (linesEl) linesEl.textContent = `${model.getLineCount()} lines`;
  if (charsEl) charsEl.textContent = `${model.getValueLength()} chars`;
}


/* ============================================================
   5. LANGUAGE SELECTOR
   ============================================================ */

function changeLanguage(lang) {
  if (!LANG_MAP[lang]) return;

  APP.currentLanguage = lang;
  const langInfo = LANG_MAP[lang];

  // Update Monaco language
  if (APP.monacoEditor) {
    const model = APP.monacoEditor.getModel();
    monaco.editor.setModelLanguage(model, langInfo.monaco);
  }

  // Update UI labels
  const currentLangEl = document.getElementById('current-lang-label');
  if (currentLangEl) {
    currentLangEl.textContent = `${langInfo.icon} ${langInfo.label}`;
  }

  // Highlight active dropdown item
  document.querySelectorAll('[data-lang]').forEach((el) => {
    el.classList.toggle('active', el.dataset.lang === lang);
  });

  showToast(`เปลี่ยนเป็น ${langInfo.label}`, 'info');
}

function loadSampleCode() {
  if (!APP.monacoEditor) return;
  const sample = SAMPLE_CODE[APP.currentLanguage] || '';
  APP.monacoEditor.setValue(sample);
  APP.monacoEditor.setScrollPosition({ scrollTop: 0 });
  showToast('โหลดโค้ดตัวอย่างแล้ว', 'info');
}

function clearEditor() {
  if (!APP.monacoEditor) return;
  APP.monacoEditor.setValue('');
  APP.monacoEditor.focus();
  clearResults();
}

function copyEditorCode() {
  if (!APP.monacoEditor) return;
  const code = APP.monacoEditor.getValue();
  copyToClipboard(code);
}


/* ============================================================
   6. ANALYZE CODE (Main feature)
   ============================================================ */

async function analyzeCode() {
  if (APP.isAnalyzing) return;

  const code = APP.monacoEditor?.getValue()?.trim();
  if (!code) {
    showToast('กรุณาใส่โค้ดก่อน', 'error');
    APP.monacoEditor?.focus();
    return;
  }

  APP.isAnalyzing = true;

  // Show loading state
  showLoadingOverlay(true);
  setAnalyzeButtonLoading(true);
  clearResults();

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        code: code,
        language: APP.currentLanguage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    if (data.success) {
      APP.lastResult = data;
      renderResults(data);
      showToast(
        data.has_errors ? 'ตรวจพบข้อผิดพลาด — ดูผลลัพธ์ด้านล่าง' : 'โค้ดถูกต้อง ไม่พบข้อผิดพลาด 🎉',
        data.has_errors ? 'error' : 'success'
      );
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else {
      throw new Error(data.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  } catch (err) {
    console.error('Analyze error:', err);
    showToast(`ผิดพลาด: ${err.message}`, 'error');
    showErrorBanner(err.message);
  } finally {
    APP.isAnalyzing = false;
    showLoadingOverlay(false);
    setAnalyzeButtonLoading(false);
  }
}

function setAnalyzeButtonLoading(loading) {
  const btn = document.getElementById('btn-analyze');
  if (!btn) return;

  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
      <span>กำลังวิเคราะห์...</span>
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>Analyze Code</span>
      <span style="opacity:0.5;font-size:0.7rem;margin-left:2px">⌘↵</span>
    `;
  }
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.classList.toggle('active', show);

  if (show) {
    // Cycle through loading messages
    const messages = [
      'กำลังส่งโค้ดไป Gemini AI...',
      'วิเคราะห์ Syntax และ Logic...',
      'สร้างโค้ดที่แก้ไขแล้ว...',
      'เตรียมผลลัพธ์ให้คุณ...',
    ];
    let i = 0;
    const msgEl = document.getElementById('loading-message');
    if (msgEl) {
      msgEl.textContent = messages[0];
      APP._loadingInterval = setInterval(() => {
        i = (i + 1) % messages.length;
        msgEl.textContent = messages[i];
      }, 1800);
    }
  } else {
    clearInterval(APP._loadingInterval);
  }
}


/* ============================================================
   7. RENDER RESULTS
   ============================================================ */

function renderResults(data) {
  const section = document.getElementById('results-section');
  if (!section) return;

  section.classList.remove('hidden');

  // ── 7.1 Status banner
  const statusEl = document.getElementById('result-status');
  if (statusEl) {
    if (data.has_errors) {
      const count = data.errors?.length || 0;
      statusEl.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-lg animate-fade-in" 
             style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2)">
          <div style="width:36px;height:36px;background:rgba(239,68,68,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p style="font-weight:700;color:#f8fafc;font-size:0.85rem">ตรวจพบ ${count} ปัญหา</p>
            <p style="color:#94a3b8;font-size:0.75rem;margin-top:2px">${escHtml(data.error_summary || '')}</p>
          </div>
        </div>`;
    } else {
      statusEl.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-lg animate-fade-in"
             style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2)">
          <div style="width:36px;height:36px;background:rgba(16,185,129,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p style="font-weight:700;color:#f8fafc;font-size:0.85rem">โค้ดถูกต้อง ✨</p>
            <p style="color:#94a3b8;font-size:0.75rem;margin-top:2px">ไม่พบข้อผิดพลาด โค้ดพร้อมใช้งาน</p>
          </div>
        </div>`;
    }
  }

  // ── 7.2 Error list
  const errorsEl = document.getElementById('result-errors');
  if (errorsEl) {
    if (data.errors && data.errors.length > 0) {
      errorsEl.innerHTML = data.errors.map((err, i) => `
        <div class="error-item ${err.severity || 'medium'} animate-fade-in delay-${Math.min(i + 1, 4)}">
          <div>
            <span class="error-severity-badge">${err.severity || 'medium'}</span>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-size:0.78rem;font-weight:600;color:#f8fafc;margin-bottom:3px">${escHtml(err.type || 'Error')}</p>
            <p style="font-size:0.8rem;color:#94a3b8;line-height:1.6">${escHtml(err.description || '')}</p>
            ${err.line ? `<p class="error-line">📍 ${escHtml(err.line)}</p>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      errorsEl.innerHTML = `<p style="color:#64748b;font-size:0.8rem;text-align:center;padding:16px">ไม่พบข้อผิดพลาด</p>`;
    }
  }

  // ── 7.3 Explanation
  const explainEl = document.getElementById('result-explanation');
  if (explainEl && data.explanation) {
    explainEl.innerHTML = `
      <p class="explanation-text animate-fade-in">${escHtml(data.explanation)}</p>
    `;
  }

  // ── 7.4 Fixed code
  const fixedEl = document.getElementById('result-fixed-code');
  if (fixedEl && data.fixed_code) {
    const lang = LANG_MAP[APP.currentLanguage];
    fixedEl.innerHTML = `
      <div class="code-block animate-fade-in">
        <div class="code-block-header">
          <span>${lang.icon} ${lang.label} — Fixed Version</span>
          <button class="btn btn-sm btn-ghost copy-btn" onclick="copyToClipboard(${JSON.stringify(data.fixed_code)})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
        </div>
        <pre><code>${escHtml(data.fixed_code)}</code></pre>
      </div>
    `;
  }

  // ── 7.5 Improvements
  const improveEl = document.getElementById('result-improvements');
  if (improveEl && data.improvements && data.improvements.length > 0) {
    improveEl.innerHTML = data.improvements.map((tip, i) => `
      <div class="improvement-item animate-fade-in delay-${Math.min(i + 1, 4)}">
        <span class="improvement-num">${i + 1}</span>
        <span>${escHtml(tip)}</span>
      </div>
    `).join('');
  }

  // ── 7.6 Show "Apply Fix" button if there's a fixed code
  const applyBtn = document.getElementById('btn-apply-fix');
  if (applyBtn && data.fixed_code) {
    applyBtn.classList.remove('hidden');
    applyBtn.onclick = () => applyFix(data.fixed_code);
  }
}

function applyFix(fixedCode) {
  if (!APP.monacoEditor || !fixedCode) return;

  APP.monacoEditor.setValue(fixedCode);
  APP.monacoEditor.setScrollPosition({ scrollTop: 0 });

  // Flash the editor border
  const container = document.querySelector('.editor-container');
  if (container) {
    container.style.borderColor = '#10b981';
    container.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
    setTimeout(() => {
      container.style.borderColor = '';
      container.style.boxShadow = '';
    }, 1500);
  }

  showToast('ใช้โค้ดที่แก้ไขแล้ว ✅', 'success');

  // Scroll back to editor
  document.getElementById('editor-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearResults() {
  const section = document.getElementById('results-section');
  if (section) section.classList.add('hidden');

  ['result-status', 'result-errors', 'result-explanation', 'result-fixed-code', 'result-improvements'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  document.getElementById('btn-apply-fix')?.classList.add('hidden');
}

function showErrorBanner(message) {
  const section = document.getElementById('results-section');
  const statusEl = document.getElementById('result-status');
  if (!section || !statusEl) return;

  section.classList.remove('hidden');
  statusEl.innerHTML = `
    <div class="flex items-center gap-3 p-4 rounded-lg"
         style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="flex-shrink:0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        <p style="font-weight:700;color:#f8fafc;font-size:0.85rem">เกิดข้อผิดพลาด</p>
        <p style="color:#94a3b8;font-size:0.75rem;margin-top:2px">${escHtml(message)}</p>
      </div>
    </div>`;
}


/* ============================================================
   8. DASHBOARD INIT
   ============================================================ */

function initDashboard() {
  initMonacoEditor();
  loadDashboardStats();
  initResultToggles();
}

async function loadDashboardStats() {
  // Try to load from history API
  try {
    const res = await fetch('/history/api/list');
    if (!res.ok) return;
    const data = await res.json();

    if (data.success) {
      const history = data.history || [];
      const total   = history.length;
      const errors  = history.filter(h => h.has_errors).length;
      const clean   = total - errors;

      setStatValue('stat-total',  total);
      setStatValue('stat-errors', errors);
      setStatValue('stat-clean',  clean);
    }
  } catch (e) {
    // Silently fail — stats are non-critical
  }
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  // Animated counter
  const target = Number(value);
  const duration = 800;
  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(startVal + eased * (target - startVal));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Result panel collapse toggles
function initResultToggles() {
  document.querySelectorAll('.result-header[data-toggle]').forEach((header) => {
    header.addEventListener('click', () => {
      const target = header.dataset.toggle;
      const body   = document.getElementById(target);
      const icon   = header.querySelector('.toggle-icon');

      if (!body) return;
      const isOpen = !body.classList.contains('hidden');
      body.classList.toggle('hidden', isOpen);
      if (icon) icon.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0)';
    });
  });
}


/* ============================================================
   9. HISTORY PAGE
   ============================================================ */

function initHistoryPage() {
  loadHistory();
}

async function loadHistory() {
  const tbody = document.getElementById('history-tbody');
  const emptyEl = document.getElementById('history-empty');
  if (!tbody) return;

  // Show skeleton
  tbody.innerHTML = Array(4).fill('').map(() => `
    <tr>
      <td><div class="skeleton" style="height:20px;width:80px;border-radius:4px"></div></td>
      <td class="hide-mobile"><div class="skeleton" style="height:14px;width:200px;border-radius:4px"></div></td>
      <td class="hide-mobile"><div class="skeleton" style="height:20px;width:60px;border-radius:4px"></div></td>
      <td><div class="skeleton" style="height:14px;width:100px;border-radius:4px"></div></td>
      <td></td>
    </tr>
  `).join('');

  try {
    const res  = await fetch('/history/api/list');
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    APP.history = data.history || [];

    if (APP.history.length === 0) {
      tbody.innerHTML = '';
      emptyEl?.classList.remove('hidden');
      return;
    }

    emptyEl?.classList.add('hidden');
    renderHistoryTable(APP.history);

  } catch (err) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="text-align:center;color:#64748b;padding:32px">
        ไม่สามารถโหลดประวัติได้: ${escHtml(err.message)}
      </td></tr>`;
  }
}

function renderHistoryTable(history) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  tbody.innerHTML = history.map((item, i) => {
    const lang    = LANG_MAP[item.language?.toLowerCase()] || { icon: '📄', label: item.language };
    const hasErr  = item.has_errors;
    const preview = (item.code_preview || '').replace(/\s+/g, ' ').trim();

    return `
      <tr class="animate-fade-in" style="animation-delay:${i * 0.04}s"
          onclick="showHistoryDetail(${item.id})">
        <td>
          <span class="lang-pill">
            ${lang.icon} ${lang.label}
          </span>
        </td>
        <td class="hide-mobile">
          <span class="code-preview">${escHtml(preview)}</span>
        </td>
        <td class="hide-mobile">
          ${hasErr
            ? `<span class="badge badge-danger">มีข้อผิดพลาด</span>`
            : `<span class="badge badge-success">ผ่าน</span>`
          }
        </td>
        <td style="color:var(--text-muted);font-size:0.75rem">${escHtml(item.created_at)}</td>
        <td>
          <div class="flex gap-2" onclick="event.stopPropagation()">
            <button class="btn btn-sm btn-ghost btn-icon" title="ดูรายละเอียด"
                    onclick="showHistoryDetail(${item.id})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-danger btn-icon" title="ลบ"
                    onclick="deleteHistory(${item.id}, this)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function showHistoryDetail(id) {
  try {
    const res  = await fetch(`/history/api/detail/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const d    = data.data;
    const lang = LANG_MAP[d.language?.toLowerCase()] || { icon: '📄', label: d.language };

    openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-3">
          <span class="lang-pill">${lang.icon} ${lang.label}</span>
          <div>
            <h3 style="font-size:0.9rem">รายละเอียดการวิเคราะห์</h3>
            <p style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${escHtml(d.created_at)}</p>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost btn-icon" onclick="closeModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      ${d.explanation ? `
        <div class="card" style="margin-bottom:14px">
          <div class="card-header">
            <span class="card-title">
              <div class="card-title-icon" style="background:rgba(59,130,246,0.1)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              คำอธิบาย
            </span>
          </div>
          <p class="explanation-text">${escHtml(d.explanation)}</p>
        </div>
      ` : ''}

      ${d.fixed_code ? `
        <div class="card-title" style="margin-bottom:8px">
          <div class="card-title-icon" style="background:rgba(16,185,129,0.1)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          โค้ดที่แก้ไขแล้ว
        </div>
        <div class="code-block">
          <div class="code-block-header">
            <span>${lang.label} — Fixed</span>
            <button class="btn btn-sm btn-ghost copy-btn" onclick="copyToClipboard(${JSON.stringify(d.fixed_code)})">Copy</button>
          </div>
          <pre><code>${escHtml(d.fixed_code)}</code></pre>
        </div>
      ` : ''}
    `);
  } catch (err) {
    showToast(`โหลดไม่ได้: ${err.message}`, 'error');
  }
}

async function deleteHistory(id, btn) {
  if (!confirm('ยืนยันการลบประวัตินี้?')) return;

  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:0.5">...</span>';

  try {
    const res  = await fetch(`/history/api/delete/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error('ลบไม่สำเร็จ');

    // Remove row with animation
    const row = btn.closest('tr');
    row.style.transition = 'opacity 0.25s, transform 0.25s';
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
    setTimeout(() => {
      row.remove();
      APP.history = APP.history.filter(h => h.id !== id);
      if (APP.history.length === 0) {
        document.getElementById('history-empty')?.classList.remove('hidden');
      }
    }, 250);

    showToast('ลบเรียบร้อยแล้ว', 'success');
  } catch (err) {
    btn.disabled = false;
    showToast(`ลบไม่สำเร็จ: ${err.message}`, 'error');
  }
}


/* ============================================================
   10. MODAL
   ============================================================ */

function openModal(html) {
  let backdrop = document.getElementById('modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal" id="modal-box"></div>`;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
    document.body.appendChild(backdrop);
  }

  const box = backdrop.querySelector('.modal') || backdrop.querySelector('#modal-box');
  if (box) box.innerHTML = html;

  requestAnimationFrame(() => backdrop.classList.add('active'));

  // Escape to close
  const onKey = (e) => {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('active');
  setTimeout(() => backdrop.remove(), 300);
}


/* ============================================================
   11. TOAST NOTIFICATIONS
   ============================================================ */

function initToasts() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || ''}<span class="toast-msg">${escHtml(message)}</span>`;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  };

  toast.addEventListener('click', remove);
  setTimeout(remove, duration);
}


/* ============================================================
   12. UTILITIES
   ============================================================ */

// Escape HTML to prevent XSS
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('คัดลอกแล้ว ✓', 'success', 2000);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('คัดลอกแล้ว ✓', 'success', 2000);
  }
}

// Format file size
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Debounce helper
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Throttle helper
function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


/* ============================================================
   13. LANGUAGE DROPDOWN TOGGLE (custom UI dropdown)
   ============================================================ */

function toggleLangDropdown() {
  const dropdown = document.getElementById('lang-dropdown');
  if (!dropdown) return;

  const isOpen = !dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden', isOpen);

  if (!isOpen) {
    // Close when clicking outside
    const handler = (e) => {
      if (!dropdown.contains(e.target) && !e.target.closest('[onclick="toggleLangDropdown()"]')) {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', handler);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 10);
  }
}

function selectLanguage(lang) {
  changeLanguage(lang);
  document.getElementById('lang-dropdown')?.classList.add('hidden');
}


/* ============================================================
   14. KEYBOARD SHORTCUTS
   ============================================================ */

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K → focus editor
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    APP.monacoEditor?.focus();
  }

  // Ctrl/Cmd + Shift + C → clear editor
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    clearEditor();
  }
});


/* ============================================================
   15. PAGE VISIBILITY (pause animations when hidden)
   ============================================================ */

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(APP._loadingInterval);
  }
});


/* ============================================================
   16. EXPORT (make key functions globally accessible)
   ============================================================ */

// These are called from inline onclick in HTML templates
Object.assign(window, {
  toggleSidebar,
  closeSidebar,
  changeLanguage,
  selectLanguage,
  toggleLangDropdown,
  loadSampleCode,
  clearEditor,
  copyEditorCode,
  analyzeCode,
  applyFix,
  clearResults,
  copyToClipboard,
  showHistoryDetail,
  deleteHistory,
  openModal,
  closeModal,
  showToast,
});

console.log(`🚀 AI CodeFix v${APP.version} initialized`);
