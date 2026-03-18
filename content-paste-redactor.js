(function () {
    // Register synchronously to catch early paste events
    document.addEventListener('paste', handlePaste, true);

    let patternsModule = null;
    let uiModule = null;

    async function ensureModules() {
        if (!patternsModule || !uiModule) {
            const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
            const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');
            [patternsModule, uiModule] = await Promise.all([
                import(patternsSrc),
                import(uiSrc)
            ]);
        }
    }

    async function handlePaste(event) {
        try {
            const clipboardData = event.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            const pastedText = clipboardData.getData('text/plain');
            if (!pastedText) return;

            await ensureModules();

            const field = event.target;
            const matches = scanForSensitiveData(pastedText);

            if (matches && matches.length > 0) {
                event.preventDefault();
                event.stopImmediatePropagation();

                // Build a de-duplicated list of detected type names for logging/display
                const detectedTypes = [...new Set(matches.map(m => m.name))];
                console.log(`[VESSEL] Sensitive data detected in paste. Types: ${detectedTypes.join(', ')}`);

                // Log incident to service worker
                chrome.runtime.sendMessage({
                    action: 'logIncident',
                    data: {
                        type: 'sensitive_paste',
                        details: `Blocked pasting: ${detectedTypes.join(', ')}`,
                        score: 0.8,
                        timestamp: Date.now()
                    }
                });

                // Show the redaction modal — passes full matches with type info
                uiModule.showRedactionModal(field, pastedText, matches);
            }
        } catch (err) {
            console.error('[VESSEL] Paste handler error:', err);
        }
    }

    /**
     * scanForSensitiveData – Runs every pattern against the pasted text and
     * returns an array of match objects enriched with type metadata.
     *
     * @param {string} text
     * @returns {Array}
     */
    function scanForSensitiveData(text) {
        let allMatches = [];
        if (!patternsModule || !patternsModule.patterns) return allMatches;

        patternsModule.patterns.forEach(pattern => {
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                // Skip matches that fail the optional validate check
                if (pattern.validate && !pattern.validate(match[0])) continue;

                allMatches.push({
                    // Standard match fields
                    name:        pattern.name,
                    type:        pattern.name,
                    value:       match[0],
                    0:           match[0],
                    index:       match.index,
                    length:      match[0].length,
                    // Redaction metadata passed through to redactor.js
                    redactStyle: pattern.redactStyle || 'default',
                    priority:    pattern.priority    || 0,
                    // Keep a reference to the full pattern for redactor
                    patternObj:  pattern
                });
            }
        });

        return allMatches;
    }
})();
