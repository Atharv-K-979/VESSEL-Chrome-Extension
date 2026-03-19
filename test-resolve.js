import fs from 'fs';

const patternsContent = fs.readFileSync('./lib/patterns.js', 'utf8')
    .replace('export const patterns', 'const patterns')
    .replace('export function redact', 'function redact')
    .replace('export function resolveOverlaps', 'function resolveOverlaps');

const redactorContent = fs.readFileSync('./lib/redactor.js', 'utf8')
    .replace('import { resolveOverlaps } from \'./patterns.js\';', '')
    .replace('export function redactText', 'function redactText');

eval(patternsContent + '\n' + redactorContent + `
    const text = 'test@example.com';
    let allMatches = [];
    patterns.forEach(pattern => {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            allMatches.push({
                name: pattern.name,
                index: match.index,
                length: match[0].length,
                priority: pattern.priority || 0
            });
            if (pattern.regex.lastIndex === match.index) pattern.regex.lastIndex++;
        }
    });

    console.log("Before resolve:", allMatches);
    const resolved = resolveOverlaps(allMatches);
    console.log("After resolve:", resolved);
`);
