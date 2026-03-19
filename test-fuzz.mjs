import fs from 'fs';

const code = fs.readFileSync('./lib/patterns.js', 'utf8');
const script = code.replace(/export const patterns =/, 'const patterns =').replace(/export function redact/, 'function redact');

eval(script + `
const pattern = patterns.find(p => p.name === 'Email Address');
const upiPattern = patterns.find(p => p.name === 'UPI ID');

const words = ["hello", "world", "this", "is", "any", "text", "in", "chat", "gpt", "what", "if", "some", "random", "characters", "like", "a|b", "c.d", "@", "a@b.c", "test@test", "123", "456", "test@example.com"];

const combinations = [];
for (let i = 0; i < 1000; i++) {
    // Generate random sentence
    const len = Math.floor(Math.random() * 20) + 1;
    let sentence = [];
    for (let j = 0; j < len; j++) {
        sentence.push(words[Math.floor(Math.random() * words.length)]);
    }
    combinations.push(sentence.join(' '));
}

let falsePositives = 0;
for (const text of combinations) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.exec(text) !== null && !text.includes('@')) {
        console.log("Email False positive:", text);
        falsePositives++;
    }
    upiPattern.regex.lastIndex = 0;
    if (upiPattern.regex.exec(text) !== null && !text.includes('@')) {
        console.log("UPI False positive:", text);
        falsePositives++;
    }
}
console.log("False positives without @:", falsePositives);
`);
