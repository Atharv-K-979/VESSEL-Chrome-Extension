import './onnxruntime-web.min.js';
const ort = globalThis.ort;

class MLEngine {
    constructor() {
        this.session = null;
        this.featureExtractor = null;
        this.backend = null;

        ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/');
        ort.env.wasm.numThreads = 1;

        this.technicalKeywords = {
            'api': ['api', 'endpoint', 'rest', 'graphql', 'soap', 'route'],
            'database': ['db', 'database', 'sql', 'nosql', 'mongodb', 'postgres', 'mysql', 'store', 'query'],
            'auth': ['login', 'user', 'password', 'auth', 'credential', 'token', 'jwt', 'session', 'sign in', 'signup'],
            'payment': ['credit', 'card', 'payment', 'stripe', 'paypal', 'money', 'transaction', 'billing'],
            'file': ['upload', 'file', 'image', 'picture', 'document', 'pdf', 'csv', 'download'],
            'admin': ['admin', 'dashboard', 'settings', 'config', 'manage', 'delete', 'update', 'edit'],
            'data': ['data', 'analytics', 'report', 'stats', 'profile', 'email', 'phone', 'address']
        };
    }

    async initialize() {
        try {
            const modelUrl = chrome.runtime.getURL('models/requirement-model.onnx');
            const response = await fetch(modelUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error('ONNX model file not found.');
            }
            this.session = await ort.InferenceSession.create(modelUrl);
            this.backend = 'onnx';
            console.log('ML Engine ONNX classifier initialized');
        } catch (error) {
            console.warn('[VESSEL] Falling back to Mock Engine for classification', error);
            this.backend = 'mock';
        }

        // Initialize Local Generator (Transformers.js)
        // Disabled dynamic import as it throws TypeError in ServiceWorkerGlobalScope on MV3
        this.generator = null;
        return true;
    }

    async generateRequirements(specText) {
        if (this.generator) {
            try {
                console.log('Using local generator for specs...');
                const prompt = `Given this software specification, list missing security requirements:\n${specText}\nRequirements:\n- `;
                const result = await this.generator(prompt, {
                    max_new_tokens: 150,
                    temperature: 0.3,
                    do_sample: true
                });

                if (result && result.length > 0) {
                    const outputText = result[0].generated_text;
                    return this.parseBulletPoints(outputText);
                }
            } catch (error) {
                console.error('Local generator failed', error);
            }
        }

        // Ultimate fallback to classification logic if local generator fails or isn't loaded
        return this.fallbackClassifyToRequirements(specText);
    }

    parseBulletPoints(text) {
        return text
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    async fallbackClassifyToRequirements(text) {
        console.log('Falling back to classification templates');
        const labels = [
            "authentication",
            "authorization",
            "encryption",
            "input validation",
            "audit logging",
            "rate limiting"
        ];

        const classifyResult = await this.classify(text, labels);
        const defaults = {
            "authentication": "The system must enforce multi-factor authentication (MFA) for all administrative access and sensitive actions.",
            "authorization": "Access control lists (ACLs) must be checked at the API gateway level to ensure users can only access their own data.",
            "encryption": "All sensitive data at rest must be encrypted using AES-256. Data in transit must use TLS 1.3.",
            "input validation": "All user inputs must be validated against a strict allowlist of expected formats and types.",
            "audit logging": "All security-critical events (login flags, sensitive data access) must be logged with timestamp, user ID, and source IP.",
            "rate limiting": "API endpoints must implement rate limiting (e.g., 100 req/min) to prevent abuse and DoS attacks."
        };

        return classifyResult
            .filter(r => r.score < 0.5)
            .map(r => defaults[r.label] || `Missing security requirement for ${r.label}.`);
    }

    async classify(text, labels) {
        if (this.backend === 'mock' || !this.session) {
            console.warn('Model not loaded, using fallback');
            return this.fallbackClassify(text, labels);
        }

        try {
            const features = await this.extractFeatures(text);
            const inputTensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
            const outputs = await this.session.run({ input: inputTensor });
            const scores = outputs.output.data;
            const results = [];
            for (let i = 0; i < labels.length; i++) {
                results.push({
                    label: labels[i],
                    score: scores[i]
                });
            }

            return results;
        } catch (e) {
            console.error("Inference failed", e);
            return this.fallbackClassify(text, labels);
        }
    }

    async extractFeatures(text) {
        const technicalFeatures = this.extractTechnicalIndicators(text);
        return technicalFeatures;
    }

    /**
     * detectInjection – Computes a threat confidence score (0–1) for the given text.
     *
     * The score is built from two components:
     *   A) Keyword match strength – each matched phrase contributes a weighted amount.
     *   B) Obfuscation bonus – 0.2 per unique obfuscation type found (base64, entities, etc.)
     *      from a pre-computed threats array (optional, passed by background.js).
     *
     * @param {string} text   - Plain text / sanitized content to scan.
     * @param {Array}  [threats=[]] - Output of detectObfuscatedPayloads(); optional.
     * @returns {number} Score in [0, 1]. Values above 0.7 trigger a warning modal.
     */
    async detectInjection(text, threats = []) {
        const lower = text.toLowerCase();

        // Weighted keyword patterns – higher weights for more dangerous phrases
        const weightedPatterns = [
            { phrase: 'ignore previous',    weight: 0.35 },
            { phrase: 'ignore all previous',weight: 0.40 },
            { phrase: 'system prompt',      weight: 0.30 },
            { phrase: 'forget everything',  weight: 0.35 },
            { phrase: 'new instructions',   weight: 0.25 },
            { phrase: 'you are now',        weight: 0.25 },
            { phrase: 'bypass',             weight: 0.20 },
            { phrase: 'do not follow',      weight: 0.30 },
            { phrase: 'disregard',          weight: 0.20 },
            { phrase: 'act as',             weight: 0.15 },
            { phrase: 'jailbreak',          weight: 0.35 },
            { phrase: 'pretend you are',    weight: 0.25 },
            { phrase: 'override',           weight: 0.20 }
        ];

        // A) Keyword match score – sum matched weights (capped at 0.8 so obfuscation can add more)
        let keywordScore = 0;
        for (const { phrase, weight } of weightedPatterns) {
            if (lower.includes(phrase)) {
                keywordScore += weight;
            }
        }
        keywordScore = Math.min(keywordScore, 0.8);

        // B) Obfuscation bonus – 0.2 per unique threat type present
        const uniqueObfuscationTypes = new Set(threats.map(t => t.type));
        const obfuscationBonus = uniqueObfuscationTypes.size * 0.2;

        // Combined score, clamped to [0, 1]
        const score = Math.min(keywordScore + obfuscationBonus, 1.0);

        console.log(`[VESSEL] detectInjection score: ${score.toFixed(2)} (keyword=${keywordScore.toFixed(2)}, obfuscation=${obfuscationBonus.toFixed(2)})`);
        return score;
    }

    async summarize(text) {
        return "Content summary generated by VESSEL (Placeholder).";
    }

    extractTechnicalIndicators(text) {
        const lower = text.toLowerCase();
        const features = [];

        // 1. Keyword cnt
        for (let [category, keywords] of Object.entries(this.technicalKeywords)) {
            let count = 0;
            for (let kw of keywords) {
                if (lower.includes(kw)) count++;
            }
            features.push(count);
            features.push(count > 0 ? 1 : 0);
        }

        // 2. Text stats
        features.push(text.length / 1000);
        features.push(text.split(/\s+/).length / 100);

        // 3. Specific indicators
        features.push(lower.includes('http') ? 1 : 0);
        features.push((/\d/).test(text) ? 1 : 0);

        return features;
    }

    fallbackClassify(text, labels) {
        console.log("Using fallback classification");
        return labels.map(label => ({
            label: label,
            score: text.toLowerCase().includes(label) ? 0.8 : 0.1
        }));
    }
}

export const mlEngineInstance = new MLEngine();
export { mlEngineInstance as MLEngine };
