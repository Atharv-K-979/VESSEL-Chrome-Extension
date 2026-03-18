(function () {
    document.addEventListener('paste', handlePaste, true);

    let patternsModule = null;
    let uiModule = null;

    /**
     * isContextValid – Returns false when the extension has been reloaded/
     * updated but this content script is still running on an old page.
     * In that case we must NOT intercept paste — just let it pass through.
     */
    function isContextValid() {
        try { return !!(chrome.runtime?.id); }
        catch (_) { return false; }
    }

    async function ensureModules() {
        if (!patternsModule || !uiModule) {
            const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
            const uiSrc       = chrome.runtime.getURL('lib/ui-utils.js');
            [patternsModule, uiModule] = await Promise.all([
                import(patternsSrc),
                import(uiSrc)
            ]);
        }
    }

    async function handlePaste(event) {
        // ── Guard: silently pass if extension context is gone ──────────────
        if (!isContextValid()) {
            // Remove listener so we stop intercepting on this page
            document.removeEventListener('paste', handlePaste, true);
            return; // let the browser handle paste normally
        }

        // Grab clipboard text synchronously BEFORE any async work,
        // because the event object is only live during the current tick.
        const clipboardData = event.clipboardData || window.clipboardData;
        if (!clipboardData) return;
        const pastedText = clipboardData.getData('text/plain');
        if (!pastedText) return;

        let modules_ok = false;
        try {
            await ensureModules();
            modules_ok = true;
        } catch (moduleErr) {
            // Module load failed (e.g., extension invalidated mid-request)
            console.warn('[VESSEL] Module load failed, allowing paste:', moduleErr.message);
            return; // allow paste naturally
        }

        if (!modules_ok) return;

        const field   = event.target;
        const matches = scanForSensitiveData(pastedText);

        if (!matches || matches.length === 0) return; // nothing sensitive – pass through

        // Only block paste AFTER we are confident about the matches AND modules
        event.preventDefault();
        event.stopImmediatePropagation();

        const detectedTypes = [...new Set(matches.map(m => m.name))];
        console.log(`[VESSEL] Sensitive data detected: ${detectedTypes.join(', ')}`);

        // Log to service worker — fire-and-forget, never allowed to break paste flow
        try {
            if (isContextValid()) {
                chrome.runtime.sendMessage({
                    action: 'logIncident',
                    data: {
                        type:      'sensitive_paste',
                        details:   `Blocked pasting: ${detectedTypes.join(', ')}`,
                        score:     0.8,
                        timestamp: Date.now()
                    }
                }).catch(() => {}); // swallow — background may be asleep
            }
        } catch (_) { /* extension context may have just died */ }

        // Show modal — if this also fails, fall back to inserting original text
        try {
            uiModule.showRedactionModal(field, pastedText, matches);
        } catch (modalErr) {
            console.error('[VESSEL] Modal display failed, inserting original text:', modalErr);
            // Re-insert the original text so user is not left with an empty paste
            try {
                uiModule.insertText(field, pastedText);
            } catch (_) {
                // Last resort: native execCommand
                document.execCommand('insertText', false, pastedText);
            }
        }
    }

    function scanForSensitiveData(text) {
        if (!patternsModule?.patterns) return [];

        const allMatches = [];
        patternsModule.patterns.forEach(pattern => {
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (pattern.validate && !pattern.validate(match[0])) continue;
                allMatches.push({
                    name:        pattern.name,
                    type:        pattern.name,
                    value:       match[0],
                    0:           match[0],
                    index:       match.index,
                    length:      match[0].length,
                    redactStyle: pattern.redactStyle || 'default',
                    priority:    pattern.priority    || 0,
                    patternObj:  pattern
                });
            }
        });
        return allMatches;
    }
})();
