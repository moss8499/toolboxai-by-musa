const freeTools = [
  { id: 'words', name: 'Word counter' },
  { id: 'case', name: 'Case converter' },
  { id: 'json', name: 'JSON formatter' },
  { id: 'units', name: 'Unit converter' },
  { id: 'password', name: 'Password maker' }
];

const plusTools = [
  { id: 'csv', name: 'CSV to JSON' },
  { id: 'url', name: 'URL encoder' },
  { id: 'base64', name: 'Base64 codec' },
  { id: 'uuid', name: 'UUID maker' },
  { id: 'markdown', name: 'Markdown preview' }
];

const allTools = [...freeTools, ...plusTools];
const freeList = document.querySelector('#free-tools');
const plusList = document.querySelector('#plus-tools');
const content = document.querySelector('#tool-content');
const status = document.querySelector('#checkout-status');
let activeTool = 'words';
let hasPlus = false;
let isAdmin = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function makeToolButton(tool, index, locked = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tool-link';
  button.dataset.tool = tool.id;
  button.innerHTML = `<span class="tool-number">${String(index + 1).padStart(2, '0')}</span><span>${tool.name}</span>${locked ? '<span class="locked-tag">PLUS</span>' : ''}`;
  return button;
}

freeTools.forEach((tool, index) => freeList.append(makeToolButton(tool, index)));
plusTools.forEach((tool, index) => plusList.append(makeToolButton(tool, index, true)));

function textarea(label, placeholder, id = 'tool-input') {
  return `<label class="field-label" for="${id}">${label}</label><textarea class="text-area" id="${id}" placeholder="${placeholder}" spellcheck="false"></textarea>`;
}

function renderTool() {
  const index = allTools.findIndex((tool) => tool.id === activeTool);
  const tool = allTools[index];
  const premium = index >= freeTools.length;
  document.querySelector('#tool-title').textContent = tool.name;
  document.querySelector('#tool-category').textContent = premium ? 'PLUS TOOL' : 'FREE TOOL';
  document.querySelector('#tool-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(allTools.length).padStart(2, '0')}`;
  document.querySelectorAll('.tool-link').forEach((button) => {
    const active = button.dataset.tool === activeTool;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  if (premium && !hasPlus) {
    content.innerHTML = `<div class="locked-view"><p class="eyebrow">A PLUS TOOL</p><h3>${escapeHtml(tool.name)} is part of QuidTools Plus.</h3><p class="subtle-note">Unlock all five extra tools for £1/month. No ad placements.</p><a class="action-button" href="#membership">Get Plus · £1/month ↗</a></div>`;
    return;
  }

  const views = {
    words: `${textarea('YOUR TEXT', 'Paste or type something here...')}<div class="stats-row"><span class="stat"><strong id="word-count">0</strong>words</span><span class="stat"><strong id="character-count">0</strong>characters</span><span class="stat"><strong id="reading-time">0</strong>min read</span></div>`,
    case: `${textarea('YOUR TEXT', 'Type or paste text to transform...')}<div class="button-row"><button class="secondary-button" data-case="upper">UPPERCASE</button><button class="secondary-button" data-case="lower">lowercase</button><button class="secondary-button" data-case="title">Title Case</button><button class="secondary-button" data-case="sentence">Sentence case</button></div>`,
    json: `${textarea('JSON INPUT', '{\n  "hello": "world"\n}')}<div class="button-row"><button class="action-button" data-json="pretty">Format JSON</button><button class="secondary-button" data-json="minify">Minify</button><button class="secondary-button" data-copy-output>Copy result</button></div><pre class="output-box" id="tool-output"></pre>`,
    units: `<div class="tool-grid"><div class="tool-field"><label class="field-label" for="unit-kind">MEASURE</label><select class="select-input" id="unit-kind"><option value="length">Length</option><option value="weight">Weight</option><option value="temperature">Temperature</option></select></div><div class="tool-field"><label class="field-label" for="unit-value">VALUE</label><input class="text-input" id="unit-value" type="number" value="1" step="any"></div><div class="tool-field"><label class="field-label" for="unit-from">FROM</label><select class="select-input" id="unit-from"></select></div><div class="tool-field"><label class="field-label" for="unit-to">TO</label><select class="select-input" id="unit-to"></select></div></div><div class="button-row"><button class="action-button" id="convert-units">Convert</button></div><div class="output-box" id="tool-output" aria-live="polite">1 metre = 100 centimetres</div>`,
    password: `<label class="field-label" for="password-length">LENGTH</label><div class="range-row"><input id="password-length" type="range" min="8" max="64" value="20"><output id="password-length-value">20</output></div><div class="check-row"><label><input type="checkbox" id="include-upper" checked> A-Z</label><label><input type="checkbox" id="include-lower" checked> a-z</label><label><input type="checkbox" id="include-numbers" checked> 0-9</label><label><input type="checkbox" id="include-symbols"> Symbols</label></div><button class="action-button" id="generate-password">Generate password</button><div class="password-display" id="password-output" aria-live="polite">Your password appears here</div><div class="button-row"><button class="secondary-button" data-copy-password>Copy password</button></div>`,
    csv: `${textarea('CSV INPUT', 'name,age\nAda,36\nGrace,85')}<div class="button-row"><button class="action-button" id="convert-csv">Convert to JSON</button><button class="secondary-button" data-copy-output>Copy result</button></div><pre class="output-box" id="tool-output"></pre>`,
    url: `${textarea('TEXT', 'Text to encode or a URL to decode...')}<div class="button-row"><button class="action-button" data-url="encode">Encode</button><button class="secondary-button" data-url="decode">Decode</button><button class="secondary-button" data-copy-output>Copy result</button></div><pre class="output-box" id="tool-output"></pre>`,
    base64: `${textarea('TEXT', 'Text to encode or Base64 to decode...')}<div class="button-row"><button class="action-button" data-base64="encode">Encode</button><button class="secondary-button" data-base64="decode">Decode</button><button class="secondary-button" data-copy-output>Copy result</button></div><pre class="output-box" id="tool-output"></pre>`,
    uuid: `<p class="subtle-note">Create random version 4 UUIDs in your browser.</p><div class="tool-grid"><div class="tool-field"><label class="field-label" for="uuid-count">HOW MANY</label><input class="text-input" id="uuid-count" type="number" min="1" max="50" value="1"></div><div class="tool-field"><label class="field-label">FORMAT</label><div class="text-input" style="display:flex;align-items:center;color:#748078">Version 4 · lowercase</div></div></div><div class="button-row"><button class="action-button" id="generate-uuid">Generate UUIDs</button><button class="secondary-button" data-copy-output>Copy result</button></div><pre class="output-box" id="tool-output"></pre>`,
    markdown: `${textarea('MARKDOWN', '# A good heading\n\nWrite **bold** text, a list, or a link.\n\n- One thing\n- Another thing')}<p class="field-label" style="margin-top:15px">PREVIEW</p><div class="markdown-preview" id="markdown-output"></div>`
  };
  content.innerHTML = views[activeTool];
  bindToolEvents();
}

function setTool(id) {
  const index = allTools.findIndex((tool) => tool.id === id);
  if (index < freeTools.length || hasPlus) {
    activeTool = id;
  } else {
    activeTool = id;
  }
  renderTool();
}

document.querySelector('#free-tools').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (button) setTool(button.dataset.tool);
});
document.querySelector('#plus-tools').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (button) setTool(button.dataset.tool);
});

function bindToolEvents() {
  const input = document.querySelector('#tool-input');
  if (activeTool === 'words' && input) {
    input.addEventListener('input', () => {
      const text = input.value;
      document.querySelector('#word-count').textContent = (text.trim().match(/\S+/g) || []).length;
      document.querySelector('#character-count').textContent = text.length;
      document.querySelector('#reading-time').textContent = text.trim() ? Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200)) : 0;
    });
  }
  if (activeTool === 'case' && input) {
    content.querySelectorAll('[data-case]').forEach((button) => button.addEventListener('click', () => {
      const value = input.value;
      const transformations = {
        upper: value.toLocaleUpperCase(),
        lower: value.toLocaleLowerCase(),
        title: value.toLocaleLowerCase().replace(/\b[\p{L}]/gu, (letter) => letter.toLocaleUpperCase()),
        sentence: value.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)([\p{L}])/gu, (_, start, letter) => `${start}${letter.toLocaleUpperCase()}`)
      };
      input.value = transformations[button.dataset.case];
    }));
  }
  content.querySelectorAll('[data-json]').forEach((button) => button.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(input.value);
      document.querySelector('#tool-output').textContent = button.dataset.json === 'pretty' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    } catch (error) {
      document.querySelector('#tool-output').textContent = `Invalid JSON: ${error.message}`;
    }
  }));
  content.querySelectorAll('[data-url]').forEach((button) => button.addEventListener('click', () => {
    try {
      document.querySelector('#tool-output').textContent = button.dataset.url === 'encode' ? encodeURIComponent(input.value) : decodeURIComponent(input.value);
    } catch {
      document.querySelector('#tool-output').textContent = 'That text could not be decoded.';
    }
  }));
  content.querySelectorAll('[data-base64]').forEach((button) => button.addEventListener('click', () => {
    try {
      document.querySelector('#tool-output').textContent = button.dataset.base64 === 'encode'
        ? btoa(String.fromCharCode(...new TextEncoder().encode(input.value)))
        : new TextDecoder().decode(Uint8Array.from(atob(input.value), (character) => character.charCodeAt(0)));
    } catch {
      document.querySelector('#tool-output').textContent = 'That text could not be decoded.';
    }
  }));
  content.querySelectorAll('[data-copy-output]').forEach((button) => button.addEventListener('click', () => copyText(document.querySelector('#tool-output')?.textContent || '')));

  if (activeTool === 'units') setupUnits();
  if (activeTool === 'password') setupPassword();
  if (activeTool === 'csv') {
    document.querySelector('#convert-csv').addEventListener('click', () => {
      try {
        const rows = parseCsv(input.value);
        const [headers, ...records] = rows;
        if (!headers?.length || records.some((row) => row.length !== headers.length)) throw new Error('Each row needs the same number of columns.');
        document.querySelector('#tool-output').textContent = JSON.stringify(records.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]]))), null, 2);
      } catch (error) {
        document.querySelector('#tool-output').textContent = error.message;
      }
    });
  }
  if (activeTool === 'uuid') {
    document.querySelector('#generate-uuid').addEventListener('click', () => {
      const count = Math.max(1, Math.min(50, Number(document.querySelector('#uuid-count').value) || 1));
      document.querySelector('#tool-output').textContent = Array.from({ length: count }, () => crypto.randomUUID()).join('\n');
    });
  }
  if (activeTool === 'markdown') {
    const preview = document.querySelector('#markdown-output');
    const updatePreview = () => { preview.innerHTML = markdownToHtml(input.value); };
    input.addEventListener('input', updatePreview);
    updatePreview();
  }
  document.querySelector('[data-copy-password]')?.addEventListener('click', () => copyText(document.querySelector('#password-output').textContent));
}

async function copyText(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    setStatus('Copied to clipboard.');
  } catch {
    setStatus('Clipboard access is unavailable in this browser.');
  }
}

function setupUnits() {
  const kind = document.querySelector('#unit-kind');
  const from = document.querySelector('#unit-from');
  const to = document.querySelector('#unit-to');
  const units = {
    length: { metres: 1, kilometres: 1000, centimetres: 0.01, millimetres: 0.001, miles: 1609.344, feet: 0.3048, inches: 0.0254 },
    weight: { kilograms: 1, grams: 0.001, milligrams: 0.000001, pounds: 0.45359237, ounces: 0.028349523125, stones: 6.35029318 },
    temperature: { Celsius: 'c', Fahrenheit: 'f', Kelvin: 'k' }
  };
  const populate = () => {
    const options = Object.keys(units[kind.value]);
    const defaultTargets = { length: 'centimetres', weight: 'grams', temperature: 'Fahrenheit' };
    from.innerHTML = options.map((unit) => `<option>${unit}</option>`).join('');
    to.innerHTML = options.map((unit) => `<option ${unit === defaultTargets[kind.value] ? 'selected' : ''}>${unit}</option>`).join('');
  };
  populate();
  const convert = () => {
    const value = Number(document.querySelector('#unit-value').value);
    const fromUnit = from.value;
    const toUnit = to.value;
    let result;
    if (kind.value === 'temperature') {
      let celsius = value;
      if (fromUnit === 'Fahrenheit') celsius = (value - 32) * 5 / 9;
      if (fromUnit === 'Kelvin') celsius = value - 273.15;
      result = toUnit === 'Fahrenheit' ? celsius * 9 / 5 + 32 : toUnit === 'Kelvin' ? celsius + 273.15 : celsius;
    } else {
      result = value * units[kind.value][fromUnit] / units[kind.value][toUnit];
    }
    const formatted = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 9 }).format(result);
    document.querySelector('#tool-output').textContent = `${value} ${fromUnit} = ${formatted} ${toUnit}`;
  };
  document.querySelector('#convert-units').addEventListener('click', convert);
  kind.addEventListener('change', () => { populate(); convert(); });
  convert();
}

function setupPassword() {
  const slider = document.querySelector('#password-length');
  const output = document.querySelector('#password-output');
  slider.addEventListener('input', () => { document.querySelector('#password-length-value').value = slider.value; });
  document.querySelector('#generate-password').addEventListener('click', () => {
    let alphabet = '';
    if (document.querySelector('#include-upper').checked) alphabet += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (document.querySelector('#include-lower').checked) alphabet += 'abcdefghijkmnopqrstuvwxyz';
    if (document.querySelector('#include-numbers').checked) alphabet += '23456789';
    if (document.querySelector('#include-symbols').checked) alphabet += '!@#$%^&*_-+=';
    if (!alphabet) {
      output.textContent = 'Select at least one character set.';
      return;
    }
    const random = new Uint32Array(Number(slider.value));
    crypto.getRandomValues(random);
    output.textContent = Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function markdownToHtml(markdown) {
  const safe = escapeHtml(markdown);
  return safe.split('\n').map((line) => {
    if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('- ')) return `<p>• ${line.slice(2)}</p>`;
    if (!line) return '';
    return `<p>${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`;
  }).join('');
}

function setStatus(message) {
  status.textContent = message;
  window.setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 5000);
}

function setPremium(isPremium) {
  hasPlus = isPremium;
  document.body.classList.toggle('is-premium', isPremium);
  const badge = document.querySelector('#member-status');
  badge.textContent = isPremium ? 'PLUS' : 'FREE';
  badge.classList.toggle('is-plus', isPremium);
  if (plusTools.some((tool) => tool.id === activeTool)) renderTool();
}

async function loadAdminStatus() {
  let adminState = {};
  try {
    adminState = await fetch('/api/admin/status').then((response) => response.json());
  } catch {
    adminState = {};
  }
  const adminEntry = document.querySelector('#admin-entry');
  adminEntry.hidden = !adminState.configured;
  isAdmin = Boolean(adminState.authenticated);
  adminEntry.textContent = isAdmin ? 'Admin · sign out' : 'Admin sign in';
  if (isAdmin) setPremium(true);
}

document.querySelector('#admin-entry').addEventListener('click', async () => {
  if (!isAdmin) {
    document.querySelector('#admin-error').textContent = '';
    document.querySelector('#admin-dialog').showModal();
    document.querySelector('#admin-password').focus();
    return;
  }

  try {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Could not sign out. Please try again.');
    isAdmin = false;
    document.querySelector('#admin-entry').textContent = 'Admin sign in';
    setPremium(false);
    loadAdminStatus();
    setStatus('Signed out of admin access.');
  } catch (error) {
    setStatus(error.message);
  }
});

document.querySelector('#admin-dialog-close').addEventListener('click', () => {
  document.querySelector('#admin-dialog').close();
});

document.querySelector('#admin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  const errorMessage = document.querySelector('#admin-error');
  submit.disabled = true;
  errorMessage.textContent = '';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.querySelector('#admin-password').value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Admin sign in failed.');
    isAdmin = true;
    document.querySelector('#admin-entry').textContent = 'Admin · sign out';
    document.querySelector('#admin-dialog').close();
    form.reset();
    setPremium(true);
    setStatus('Admin access enabled. Plus tools are unlocked.');
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

renderTool();
loadAdminStatus();