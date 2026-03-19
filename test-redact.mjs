import fs from 'fs';

const patternsCode = fs.readFileSync('./lib/patterns.js', 'utf8').replace(/export const patterns =/, 'const patterns =').replace(/export function redact/, 'function redact');
const redactorCode = fs.readFileSync('./lib/redactor.js', 'utf8').replace(/export function redactText/, 'function redactText');

eval(patternsCode + '\n' + redactorCode + `
    const text = "Please contact test1@example.com, test2@example.com, test3@example.com, or test4@example.com";
    const allMatches = [];
    patterns.forEach(pattern => {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            if (pattern.validate && !pattern.validate(match[0])) continue;
            allMatches.push({
                name: pattern.name,
                type: pattern.name,
                value: match[0],
                0: match[0],
                index: match.index,
                length: match[0].length,
                redactStyle: pattern.redactStyle || 'default',
                priority: pattern.priority || 0,
                patternObj: pattern
            });
            if (pattern.regex.lastIndex === match.index) pattern.regex.lastIndex++;
        }
    });

    console.log("Found matches:", allMatches.length);
    const result = redactText(text, allMatches);
    console.log("Redacted Text:\\n" + result);
`);
