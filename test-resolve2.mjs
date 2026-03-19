import fs from 'fs';

const patternsContent = fs.readFileSync('./lib/patterns.js', 'utf8')
    .replace('export const patterns', 'const patterns')
    .replace('export function redact', 'function redact')
    .replace('export function resolveOverlaps', 'function resolveOverlaps');

eval(patternsContent + `
    const text = 'test@example.com';
    let allMatches = [];
    patterns.forEach(pattern => {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            if (pattern.validate && !pattern.validate(match[0])) continue;
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
