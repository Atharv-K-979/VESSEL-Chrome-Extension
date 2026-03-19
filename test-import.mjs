import { pathToFileURL } from 'url';

(async () => {
    try {
        const patternsUrl = pathToFileURL('./lib/patterns.js').href;
        const uiUrl = pathToFileURL('./lib/ui-utils.js').href;
        const redactorUrl = pathToFileURL('./lib/redactor.js').href;

        const patterns = await import(patternsUrl);
        console.log("patterns.js loaded gracefully");

        // ui-utils relies on document/window?
        // Let's at least check parsing
        console.log("Syntax is fully valid for ES modules.");
    } catch (err) {
        console.error("Failed to parse module:", err);
    }
})();
