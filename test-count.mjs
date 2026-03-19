import fs from 'fs';

const code = fs.readFileSync('./lib/patterns.js', 'utf8');
const script = code.replace(/export const patterns =/, 'const patterns =').replace(/export function redact/, 'function redact');

eval(script + `
const pattern = patterns.find(p => p.name === 'Email Address');
const text = "test@example.com";
let count = 0;
pattern.regex.lastIndex = 0;
while (pattern.regex.exec(text) !== null) {
    count++;
}
console.log("Count for one email:", count);

const text2 = "test@example.com test2@example.com test3@example.com test4@example.com";
count = 0;
pattern.regex.lastIndex = 0;
while (pattern.regex.exec(text2) !== null) {
    count++;
}
console.log("Count for four emails:", count);
`);
