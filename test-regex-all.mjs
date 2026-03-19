import fs from 'fs';

const code = fs.readFileSync('./lib/patterns.js', 'utf8');
const script = code.replace(/export const patterns =/, 'const patterns =').replace(/export function redact/, 'function redact');

eval(script + `
const texts = [
    "when i paste any text in chat gpt",
    "hello world",
    "some generic text 1234 without email",
    "Testing 4 emails detected all correct logic",
    "hello@world"
];

texts.forEach(text => {
    console.log("\\nTesting text: '" + text + "'");
    const allMatches = [];
    patterns.forEach(pattern => {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            if (pattern.validate && !pattern.validate(match[0])) continue;
            allMatches.push(pattern.name);
            if (match.index === pattern.regex.lastIndex) pattern.regex.lastIndex++;
        }
    });
    console.log("Detected:", allMatches.length > 0 ? allMatches : 'None');
});
`);
