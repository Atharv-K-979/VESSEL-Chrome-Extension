
export function createStatsBadge(blocksToday, avgRiskScore) {
  const container = document.createElement('div');
  const shadow = container.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .stats-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 20px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      min-width: 280px;
      z-index: 10000;
    }
    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: 600;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .stat-item {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .incidents-section {
      margin-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 16px;
    }
    .incidents-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    .incident-item {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .incident-site {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .incident-details {
      display: flex;
      justify-content: space-between;
      opacity: 0.8;
    }
    .incident-risk {
      color: #ff6b6b;
      font-weight: 600;
    }
  `;

  const html = `
    <div class="stats-container">
      <div class="stats-header">
        <span class="stats-title">Human Error Firewall</span>
        <span>🛡️</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${blocksToday}</div>
          <div class="stat-label">Blocks Today</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${avgRiskScore}</div>
          <div class="stat-label">Avg Risk Score</div>
        </div>
      </div>
      <div class="incidents-section">
        <div class="incidents-title">RECENT INCIDENTS</div>
        <div id="incidents-list"></div>
      </div>
    </div>
  `;

  shadow.appendChild(style);

  const template = document.createElement('div');
  template.innerHTML = html;
  shadow.appendChild(template);

  return container;
}

export function prependText(field, text) {
  if (!field) return;
  field.focus();

  const textToPrepend = text + "\n\n";

  if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
    const val = field.value || "";
    field.value = textToPrepend + val;
    field.selectionStart = field.selectionEnd = textToPrepend.length;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (field.isContentEditable) {
    const selection = window.getSelection();
    let range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(field);
    }

    range.selectNodeContents(field);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand('insertText', false, textToPrepend)) {
      const textNode = document.createTextNode(textToPrepend);
      field.insertBefore(textNode, field.firstChild);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

export function createRequirementsModal(requirements, onInject, onClose, isConfigured = true) {
  const container = document.createElement('div');
  const shadow = container.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .modal-content {
      background: white;
      border-radius: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .requirement-card {
      background: #f8f9fa;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      border-left: 4px solid;
    }
    .requirement-card.missing-auth { border-left-color: #f56565; }
    .requirement-card.missing-authz { border-left-color: #ed8936; }
    .requirement-card.missing-encryption { border-left-color: #48bb78; }
    .requirement-card.missing-validation { border-left-color: #4299e1; }
    .requirement-card.missing-audit { border-left-color: #9f7aea; }
    .requirement-card.missing-ratelimit { border-left-color: #ed64a6; }
    
    .requirement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .requirement-category {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
      color: #4a5568;
    }
    .requirement-confidence {
      font-size: 11px;
      background: rgba(0,0,0,0.05);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .requirement-description {
      font-size: 14px;
      line-height: 1.5;
      color: #2d3748;
      margin-bottom: 12px;
    }
    .inject-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .inject-button:hover {
      transform: translateY(-1px);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .accept-all-button {
      background: #48bb78;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 600;
      cursor: pointer;
    }
    .dismiss-button {
      background: transparent;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      padding: 10px 20px;
      cursor: pointer;
    }
  `;

  let parsedRequirements = [];
  requirements.forEach(req => {
    if (!req.description) return;
    const lines = req.description.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    lines.forEach(line => {
      const cleanedLine = line.replace(/^[-*•]\s*|^\d+\.\s*/, '').trim();
      if (cleanedLine) {
        parsedRequirements.push({
          ...req,
          description: cleanedLine
        });
      }
    });
  });

  let requirementsHtml = '';
  parsedRequirements.forEach((req, index) => {
    let categoryClass = 'missing-auth';
    if (req.category.toLowerCase().includes('authz')) categoryClass = 'missing-authz';
    else if (req.category.toLowerCase().includes('encrypt')) categoryClass = 'missing-encryption';
    else if (req.category.toLowerCase().includes('valid')) categoryClass = 'missing-validation';
    else if (req.category.toLowerCase().includes('audit')) categoryClass = 'missing-audit';
    else if (req.category.toLowerCase().includes('rate')) categoryClass = 'missing-ratelimit';

    requirementsHtml += `
      <div class="requirement-card ${categoryClass}">
        <div class="requirement-header">
          <span class="requirement-category">MISSING: ${req.category.toUpperCase()}</span>
          <span class="requirement-confidence">${Math.round(req.confidence * 100)}% match</span>
        </div>
        <div class="requirement-description">• ${req.description}</div>
        <button class="inject-button" data-index="${index}">+ Inject</button>
      </div>
    `;
  });

  let warningHtml = '';
  if (!isConfigured) {
    warningHtml = `
            <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
                <strong>⚠️ AI Not Configured</strong><br>
                Please set your Gemini API Key in the extension settings to generate specific requirements. Using generic defaults.
                <br><a href="#" id="open-settings-link" style="color: #B45309; text-decoration: underline;">Open Settings</a>
            </div>
        `;
  }

  const html = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-title">Security Requirements Assistant</div>
        ${warningHtml}
        <div class="requirements-list">
          ${requirementsHtml}
        </div>
        <div class="modal-actions">
          <button class="dismiss-button">Dismiss</button>
          <button class="accept-all-button">Accept All</button>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(style);

  const template = document.createElement('div');
  template.innerHTML = html;
  shadow.appendChild(template);

  const settingsLink = shadow.getElementById('open-settings-link');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
    });
  }

  shadow.querySelectorAll('.inject-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (parsedRequirements[index].injected) return;

      parsedRequirements[index].injected = true;
      onInject([parsedRequirements[index].description]);

      const card = e.target.closest('.requirement-card');
      if (card) card.remove();

      const remaining = parsedRequirements.filter(r => !r.injected);
      if (remaining.length === 0) {
        if (onClose) onClose();
        container.remove();
      }
    });
  });

  shadow.querySelector('.dismiss-button').addEventListener('click', () => {
    if (onClose) onClose();
    container.remove();
  });

  shadow.querySelector('.accept-all-button').addEventListener('click', () => {
    const remaining = parsedRequirements.filter(r => !r.injected);
    if (remaining.length > 0) {
      onInject(remaining.map(r => r.description));
    }
    if (onClose) onClose();
    container.remove();
  });

  return container;
}

export function createBadge(count, onClick) {
  const badge = document.createElement('div');
  badge.className = 'vessel-badge'; // Added per instructions to prevent specific hide logic
  Object.assign(badge.style, {
    position: 'absolute',
    background: '#DC2626', // Red color
    color: 'white',
    borderRadius: '50%', // Perfect circle
    width: '26px',
    height: '26px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: '1000',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3), 0 0 0 2px white', // Adds depth and a visible border
    transition: 'transform 0.2s',
    userSelect: 'none'
  });

  badge.onmouseenter = () => badge.style.transform = 'scale(1.1)';
  badge.onmouseleave = () => badge.style.transform = 'scale(1)';

  badge.textContent = count;
  badge.title = `${count} missing security requirements / threats detected. Click to view.`;
  badge.addEventListener('click', onClick);
  return badge;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createShadowModal() {
  const container = document.createElement('div');
  const shadow = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex; justify-content: center; align-items: center;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%; max-width: 450px;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            color: #1f2937;
        }
        h3 { margin-top: 0; font-size: 20px; font-weight: 600; }
        p { margin-bottom: 12px; font-size: 14px; }
        ul { background: #FEF2F2; padding: 12px 12px 12px 24px; border-radius: 8px; border: 1px solid #FCA5A5; margin: 0 0 20px 0; }
        li { color: #991B1B; font-size: 14px; margin-bottom: 4px; }
        .buttons { display: flex; justify-content: flex-end; gap: 12px; }
        button {
            padding: 8px 16px; border: none; border-radius: 8px;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }
        #redact-btn { background: #DC2626; color: white; }
        #original-btn { background: #F3F4F6; color: #374151; }
        #cancel-btn { background: transparent; color: #6B7280; border: 1px solid #D1D5DB; }
    `;

  shadow.appendChild(style);
  return { container, shadow };
}

export function insertText(field, text) {
  if (!field) return;
  // Make sure we bring focus back to the field before inserting text
  // since the modal interaction might have caused blur
  field.focus();

  if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    const val = field.value || "";
    field.value = val.substring(0, start) + text + val.substring(end);
    field.selectionStart = field.selectionEnd = start + text.length;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (field.isContentEditable) {
    // If the standard execCommand fails, inject text via selection
    if (!document.execCommand('insertText', false, text)) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        field.innerText += text;
      }
    }
  }
}

export function showRedactionModal(field, originalText, matches) {
  const { container, shadow } = createShadowModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Group matches by detected type, counting occurrences
  const typeCounts = {};
  matches.forEach(m => {
    const label = m.name || m.type || 'Sensitive Data';
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });

  // Emoji per known pattern type
  const patternEmoji = {
    'Credit Card Number':           '💳',
    'AWS Access Key':               '🔑',
    'Private Key Header':           '🗝️',
    'Email Address':                '📧',
    'Phone Number':                 '📞',
    'Aadhaar Number (India)':       '🇮🇳',
    'PAN Card (India)':             '🇮🇳',
    'Indian Passport':              '🛂',
    'UPI ID':                       '💸',
    'Bank Account Number (India)':  '🏦',
    'Voter ID / EPIC (India)':      '🗳️',
    'Driving Licence (India)':      '🚗',
    'Social Security Number (US)':  '🇺🇸',
    'Generic Credential / Password':'🔐',
    'IP Address (IPv4)':            '🌐'
  };

  const listItems = Object.entries(typeCounts).map(([name, count]) => {
    const emoji = patternEmoji[name] || '🔴';
    const countTag = count > 1 ? ` <em style="opacity:0.7;">(x${count})</em>` : '';
    return `<li style="margin-bottom:6px;">${emoji} ${escapeHtml(name)}${countTag}</li>`;
  }).join('');

  overlay.innerHTML = `
        <div class="modal-content">
            <h3>Sensitive Data Detected</h3>
            <p>VESSEL found <strong>${matches.length}</strong> sensitive item(s) in your clipboard:</p>
            <ul style="list-style:none; padding:12px; margin:0 0 12px 0; background:#FEF2F2; border:1px solid #FCA5A5; border-radius:8px;">
                ${listItems}
            </ul>
            <p style="font-size:12px; color:#6B7280; margin-bottom:16px;">
                Redact &amp; Paste replaces sensitive characters with X while preserving format separators.
            </p>
            <div class="buttons">
                <button id="redact-btn">Redact &amp; Paste</button>
                <button id="original-btn">Paste Original</button>
                <button id="cancel-btn">Cancel</button>
            </div>
        </div>
    `;

  shadow.appendChild(overlay);

  overlay.querySelector('#redact-btn').addEventListener('click', async () => {
    try {
      const { redactText } = await import(chrome.runtime.getURL('lib/redactor.js'));
      const redacted = redactText(originalText, matches);
      insertText(field, redacted);
    } catch (e) {
      console.error('[VESSEL] Redaction failed', e);
    }
    container.remove();
  });

  overlay.querySelector('#original-btn').addEventListener('click', () => {
    insertText(field, originalText);
    container.remove();
  });

  overlay.querySelector('#cancel-btn').addEventListener('click', () => {
    container.remove();
  });

  document.body.appendChild(container);
}

export function createModal(title, content, buttons) {
  const { container, shadow } = createShadowModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const buttonsHtml = buttons.map((btn, i) => `
    <button id="modal-btn-${i}" style="
      background: ${btn.primary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
      color: ${btn.primary ? 'white' : '#6B7280'};
      border: ${btn.primary ? 'none' : '1px solid #D1D5DB'};
    ">${escapeHtml(btn.text)}</button>
  `).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${escapeHtml(title)}</h3>
      <div style="margin-bottom: 20px;">${content}</div>
      <div class="buttons">
        ${buttonsHtml}
      </div>
    </div>
  `;

  shadow.appendChild(overlay);

  buttons.forEach((btn, i) => {
    overlay.querySelector(`#modal-btn-${i}`).addEventListener('click', btn.onClick);
  });

  return {
    show: () => document.body.appendChild(container),
    hide: () => container.remove()
  };
}

export function showThreatModal(score, originalText, sanitizedText, threats, onProceed, onSendSanitized, onCancel) {
  // Support legacy 6-arg call (no threats) by shifting arguments
  if (typeof threats === 'function') {
    onCancel = onSendSanitized;
    onSendSanitized = onProceed;
    onProceed = threats;
    threats = [];
  }

  const { container, shadow } = createShadowModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const safeOriginal = escapeHtml(originalText);
  const safeSanitized = escapeHtml(sanitizedText);
  const confidencePct = Math.round(score * 100);

  // Color for confidence bar
  const barColor = confidencePct >= 80 ? '#DC2626' : confidencePct >= 50 ? '#F59E0B' : '#10B981';

  // Threat type labels for display
  const threatTypeLabels = {
    base64:        '🔐 Base64-encoded payload',
    html_entities: '🔡 HTML entity-encoded text',
    event_handler: '⚡ JavaScript event handler on hidden element',
    split_payload: '🔀 Split payload across hidden elements'
  };

  // Build threats list HTML
  let threatsHtml = '';
  if (threats && threats.length > 0) {
    const grouped = {};
    threats.forEach(t => { grouped[t.type] = (grouped[t.type] || 0) + 1; });
    const items = Object.entries(grouped).map(([type, count]) => {
      const label = threatTypeLabels[type] || `🚨 ${type}`;
      return `<li style="margin-bottom:6px;">${label}${count > 1 ? ` <em>(×${count})</em>` : ''}</li>`;
    }).join('');
    threatsHtml = `
      <div style="margin-bottom:16px;">
        <strong style="font-size:13px; color:#374151;">Detected Obfuscation Techniques:</strong>
        <ul style="margin:8px 0 0 0; padding-left:20px; font-size:13px; color:#991B1B;">
          ${items}
        </ul>
      </div>`;
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 600px; width: 90%;">
      <h3 style="color: #DC2626; display: flex; align-items: center; gap: 8px;">
        ⚠️ Security Risk Detected
      </h3>

      <!-- Confidence Meter -->
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:13px; color:#4B5563; font-weight:600;">Threat Confidence</span>
          <span style="font-size:18px; font-weight:800; color:${barColor};">${confidencePct}%</span>
        </div>
        <div style="background:#E5E7EB; border-radius:8px; height:10px; overflow:hidden;">
          <div style="background:${barColor}; width:${confidencePct}%; height:100%; border-radius:8px; transition:width 0.5s ease;"></div>
        </div>
      </div>

      ${threatsHtml}

      <p style="color: #4B5563; margin-bottom: 16px; font-size:13px;">This page contains hidden text or instructions that may manipulate the AI assistant.</p>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong id="view-title" style="color: #DC2626; font-size: 14px;">Raw Payload (Warning)</strong>
        <button id="toggle-view-btn" style="background: #F3F4F6; color: #374151; font-size: 12px; padding: 6px 12px; border: 1px solid #D1D5DB; border-radius: 4px; cursor: pointer;">View Sanitized Version</button>
      </div>

      <div id="text-container" style="
        border: 2px solid #DC2626;
        border-radius: 8px;
        padding: 12px;
        height: 160px;
        overflow-y: auto;
        white-space: pre-wrap;
        font-family: monospace;
        font-size: 12px;
        background: #FEF2F2;
        color: #991B1B;
        word-break: break-all;
      ">${safeOriginal}</div>

      <div class="buttons" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
        <button id="send-sanitized-btn" style="background: #10B981; color: white; display: none;">Send Sanitized</button>
        <button id="proceed-btn" style="background: transparent; color: #DC2626; border: 1px solid #FCA5A5;">Proceed Anyway</button>
        <button id="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  shadow.appendChild(overlay);

  const textContainer = overlay.querySelector('#text-container');
  const viewTitle = overlay.querySelector('#view-title');
  const toggleBtn = overlay.querySelector('#toggle-view-btn');
  const sendSanitizedBtn = overlay.querySelector('#send-sanitized-btn');

  let viewingSanitized = false;

  toggleBtn.addEventListener('click', () => {
    viewingSanitized = !viewingSanitized;
    if (viewingSanitized) {
      viewTitle.textContent = "Sanitized Output (Clean)";
      viewTitle.style.color = "#10B981";
      textContainer.style.borderColor = "#10B981";
      textContainer.style.background = "#F0FDF4";
      textContainer.style.color = "#065F46";
      textContainer.innerHTML = safeSanitized;
      toggleBtn.textContent = "View Raw Payload";
      sendSanitizedBtn.style.display = 'block';
    } else {
      viewTitle.textContent = "Raw Payload (Warning)";
      viewTitle.style.color = "#DC2626";
      textContainer.style.borderColor = "#DC2626";
      textContainer.style.background = "#FEF2F2";
      textContainer.style.color = "#991B1B";
      textContainer.innerHTML = safeOriginal;
      toggleBtn.textContent = "View Sanitized Version";
      sendSanitizedBtn.style.display = 'none';
    }
  });

  sendSanitizedBtn.addEventListener('click', () => {
    onSendSanitized();
    container.remove();
  });

  overlay.querySelector('#proceed-btn').addEventListener('click', () => {
    onProceed();
    container.remove();
  });

  overlay.querySelector('#cancel-btn').addEventListener('click', () => {
    if (onCancel) onCancel();
    container.remove();
  });

  document.body.appendChild(container);

  return {
    hide: () => container.remove()
  };
}

