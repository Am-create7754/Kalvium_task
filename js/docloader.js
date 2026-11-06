/* =====================================================================
   ChunkLab — Document loader: TEXT EXTRACTION + PREPROCESSING
   ---------------------------------------------------------------------
   Lets learners bring their own document. Everything happens in the
   browser — the file is never uploaded to any server.

     .txt .md .csv .json  → read as plain text
     .html .htm           → tags removed, block elements become paragraphs
     .pdf                 → text extracted with pdf.js (loaded on demand)
     .docx                → text extracted with mammoth.js (loaded on demand)

   cleanText() is a pure function (unit-tested in Node) that performs the
   "document preprocessing" stage and reports what it changed.
   ===================================================================== */
(function (root) {
  'use strict';

  const MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
  const MAX_WORDS = 50000;              // keep the browser responsive
  const LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js'
  };

  /**
   * PREPROCESSING — turn raw extracted text into clean, chunkable text.
   * Returns { text, report } where report counts each fix applied.
   */
  function cleanText(raw) {
    const report = { invisibleChars: 0, pageNumbers: 0, hyphenBreaks: 0, lineBreaksJoined: 0, truncated: false, originalWords: 0 };
    let t = String(raw || '').replace(/\r\n?/g, '\n');

    // 1. Invisible characters (soft hyphens, zero-width spaces, BOM, NBSP→space)
    t = t.replace(/[­​-‍﻿]/g, () => { report.invisibleChars++; return ''; });
    t = t.replace(/ /g, ' ');

    // 2. Lines that are only a page number ("12", "Page 3", "4 of 20", "- 7 -")
    t = t.replace(/^[ \t]*(?:-\s*)?(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?(?:\s*-)?[ \t]*$/gim, () => { report.pageNumbers++; return ''; });

    // 3. Words broken across lines by hyphenation ("infor-\nmation" → "information")
    t = t.replace(/([A-Za-z])-\n[ \t]*([a-z])/g, (m, a, b) => { report.hyphenBreaks++; return a + b; });

    // 4. Collapse spaces/tabs, trim each line
    t = t.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');

    // 5. Paragraphs = blank-line separated. Single line breaks inside a
    //    paragraph are just wrapping, so join them with a space.
    t = t.replace(/\n{3,}/g, '\n\n');
    t = t.replace(/([^\n])\n(?!\n)/g, (m, a) => { report.lineBreaksJoined++; return a + ' '; });
    t = t.trim();

    // 6. Size guard
    const words = t ? t.split(/\s+/) : [];
    report.originalWords = words.length;
    if (words.length > MAX_WORDS) {
      report.truncated = true;
      let count = 0, cut = 0;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(t)) && count < MAX_WORDS) { count++; cut = m.index + m[0].length; }
      t = t.slice(0, cut);
    }
    return { text: t, report: report };
  }

  /** Human-readable summary of what preprocessing did. */
  function describeReport(r) {
    const bits = [];
    if (r.pageNumbers) bits.push(r.pageNumbers + ' page-number line' + (r.pageNumbers > 1 ? 's' : '') + ' removed');
    if (r.hyphenBreaks) bits.push(r.hyphenBreaks + ' hyphenated line break' + (r.hyphenBreaks > 1 ? 's' : '') + ' repaired');
    if (r.lineBreaksJoined) bits.push(r.lineBreaksJoined + ' wrapped line' + (r.lineBreaksJoined > 1 ? 's' : '') + ' joined');
    if (r.invisibleChars) bits.push(r.invisibleChars + ' invisible character' + (r.invisibleChars > 1 ? 's' : '') + ' removed');
    if (r.truncated) bits.push('trimmed to the first ' + MAX_WORDS.toLocaleString() + ' of ' + r.originalWords.toLocaleString() + ' words');
    return bits.length ? bits.join(' · ') : 'text was already clean';
  }

  // ---------------- Browser-only: reading files ----------------
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => { delete loaded[src]; reject(new Error('Could not load the extraction library. Check your internet connection, or upload a .txt file instead.')); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  function extOf(name) { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }

  async function extractPdf(file) {
    await loadScript(LIBS.pdf);
    const pdfjs = root.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // PDFs store positioned text runs, not paragraphs. Rebuild structure:
      // a new baseline = new line; a vertical gap much larger than the text
      // height = blank line = new paragraph.
      let text = '', lastY = null;
      content.items.forEach((it) => {
        const y = it.transform[5];
        const size = it.height || 10;
        if (it.str && lastY !== null) {
          if (lastY - y > size * 1.8) text = text.replace(/\n?$/, '\n\n');
          else if (Math.abs(lastY - y) > 1 && !text.endsWith('\n')) text += '\n';
        }
        text += it.str;
        if (it.hasEOL && !text.endsWith('\n')) text += '\n';
        if (it.str) lastY = y;
      });
      pages.push(text);
    }
    return { raw: pages.join('\n\n'), pages: pdf.numPages };
  }

  async function extractDocx(file) {
    await loadScript(LIBS.mammoth);
    const res = await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { raw: res.value };
  }

  function extractHtml(str) {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    doc.querySelectorAll('script, style, noscript, nav, footer, header, svg').forEach((n) => n.remove());
    const blocks = Array.from(doc.body ? doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,dt,dd') : [])
      .filter((el) => !el.querySelector('p,li'))          // innermost blocks only
      .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((t) => (/[.!?:]$/.test(t) ? t : t + '.'));    // headings/list items become sentences
    return blocks.length ? blocks.join('\n\n') : (doc.body ? doc.body.textContent : '');
  }

  /**
   * Read a File → { name, type, raw, text, report, pages? }
   * Throws a friendly Error for unsupported / empty / too-large files.
   */
  async function readFile(file) {
    if (!file) throw new Error('No file selected.');
    if (file.size > MAX_BYTES) throw new Error('That file is ' + (file.size / 1048576).toFixed(1) + ' MB. Please use a file under 10 MB.');
    const ext = extOf(file.name);
    let raw, pages, type;
    if (ext === 'pdf') { type = 'PDF'; const r = await extractPdf(file); raw = r.raw; pages = r.pages; }
    else if (ext === 'docx') { type = 'Word (.docx)'; raw = (await extractDocx(file)).raw; }
    else if (ext === 'html' || ext === 'htm') { type = 'HTML'; raw = extractHtml(await file.text()); }
    else if (['txt', 'md', 'markdown', 'csv', 'json', 'text', ''].includes(ext) || /^text\//.test(file.type)) { type = ext ? ext.toUpperCase() : 'Text'; raw = await file.text(); }
    else if (ext === 'doc') throw new Error('Old .doc files are not supported. Save it as .docx or .pdf and try again.');
    else throw new Error('Unsupported file type ".' + ext + '". Try .txt, .md, .pdf, .docx or .html.');

    const cleaned = cleanText(raw);
    if (!cleaned.text) {
      throw new Error(ext === 'pdf'
        ? 'No text could be extracted. This is probably a scanned PDF (pictures of pages). Real pipelines use OCR for these.'
        : 'The file contains no readable text.');
    }
    return { name: file.name, type: type, raw: raw, text: cleaned.text, report: cleaned.report, pages: pages };
  }

  /**
   * Wire an upload button + optional drop zone.
   * opts: { button, dropzone, status, onLoad(result) }
   */
  function attach(opts) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.markdown,.csv,.json,.pdf,.docx,.html,.htm,text/plain';
    input.hidden = true;
    document.body.appendChild(input);

    const setStatus = (html, kind) => {
      if (!opts.status) return;
      opts.status.innerHTML = html ? '<div class="fb' + (kind ? ' fb--' + kind : '') + '"><div>' + html + '</div></div>' : '';
    };
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    async function handle(file) {
      if (!file) return;
      setStatus('Extracting text from <b>' + esc(file.name) + '</b>…');
      if (opts.button) opts.button.disabled = true;
      try {
        const res = await readFile(file);
        const words = res.text.split(/\s+/).length;
        setStatus('<b>' + esc(res.name) + '</b> · ' + res.type + (res.pages ? ' · ' + res.pages + ' page' + (res.pages > 1 ? 's' : '') : '') +
          ' · ' + words.toLocaleString() + ' words extracted.<br><span class="small">Preprocessing: ' + describeReport(res.report) + '.</span>', 'good');
        opts.onLoad(res);
      } catch (err) {
        setStatus(esc(err.message || 'Could not read that file.'), 'warn');
      } finally {
        if (opts.button) opts.button.disabled = false;
        input.value = '';
      }
    }

    if (opts.button) opts.button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => handle(input.files[0]));

    const dz = opts.dropzone;
    if (dz) {
      ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => {
        if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
        e.preventDefault(); dz.classList.add('is-drop');
      }));
      ['dragleave', 'dragend'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('is-drop')));
      dz.addEventListener('drop', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        e.preventDefault(); dz.classList.remove('is-drop');
        handle(e.dataTransfer.files[0]);
      });
    }
    return { handle: handle, setStatus: setStatus };
  }

  const API = { cleanText: cleanText, describeReport: describeReport, readFile: readFile, attach: attach, MAX_WORDS: MAX_WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DocLoader = API;
})(typeof window !== 'undefined' ? window : this);
