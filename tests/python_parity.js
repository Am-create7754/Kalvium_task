/* Optional check (needs Python 3):  node tests/python_parity.js
   Extracts the Python that the Lab's "{ } Python code" button generates,
   runs it on several documents/settings, and verifies it produces exactly
   the same chunks as PRISM's JavaScript engine. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const E = require('../js/chunking.js');
const C = require('../js/content.js');

const src = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const m = src.match(/function pythonFor\(s\) \{[\s\S]*?\n  \}\n/);
if (!m) throw new Error('pythonFor() not found in app.js');
const pythonFor = new Function('return (' + m[0] + ')')();

const docs = {
  lab: C.LAB_SAMPLE,
  handbook: C.HANDBOOK,
  challenge: C.CHALLENGE_DOC,
  hindi: fs.readFileSync(path.join(__dirname, '../samples/hostel_notice_hindi.txt'), 'utf8'),
  longSentence: 'Short one. ' + Array.from({ length: 30 }, (_, i) => 'w' + i).join(' ') + '. End here.'
};
const configs = [
  { strategy: 'fixed', size: 20, overlap: 4 }, { strategy: 'fixed', size: 7, overlap: 0 }, { strategy: 'fixed', size: 5, overlap: 9 },
  { strategy: 'sentence', size: 40, overlap: 0 }, { strategy: 'sentence', size: 12, overlap: 5 }, { strategy: 'sentence', size: 8, overlap: 3 }
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-py-'));
let pass = 0, fail = 0;
for (const [name, text] of Object.entries(docs)) {
  fs.writeFileSync(path.join(dir, 'document.txt'), text, 'utf8');
  for (const cfg of configs) {
    const code = pythonFor(cfg).split('\n').filter((l) => !/^print\(/.test(l)).join('\n') +
      '\nimport json, sys\nsys.stdout.reconfigure(encoding="utf-8")\nprint(json.dumps(chunks, ensure_ascii=False))\n';
    fs.writeFileSync(path.join(dir, 'run.py'), code, 'utf8');
    const py = JSON.parse(execFileSync('python', ['run.py'], { cwd: dir, encoding: 'utf8' }));
    const js = E.chunkText(text, { strategy: cfg.strategy, size: cfg.size, overlap: cfg.overlap }).chunks.map((c) => c.text);
    const ok = JSON.stringify(py) === JSON.stringify(js);
    ok ? pass++ : fail++;
    if (!ok) console.error('✗ ' + name + ' ' + JSON.stringify(cfg) + '\n  py: ' + py.length + ' chunks, js: ' + js.length +
      '\n  first diff: ' + JSON.stringify(py.find((p, i) => p !== js[i])) + ' vs ' + JSON.stringify(js.find((p, i) => p !== py[i])));
  }
}
console.log('Python parity: ' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
