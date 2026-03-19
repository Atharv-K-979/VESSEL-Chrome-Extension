import fs from 'fs';

const patternsContent = fs.readFileSync('./lib/patterns.js', 'utf8')
    .replace('export const patterns', 'const patterns')
    .replace('export function redact', 'function redact')
    .replace('export function resolveOverlaps', 'function resolveOverlaps');

eval(patternsContent + `
    const emailPattern = patterns.find(p => p.name === 'Email Address');
    
    const tests = [
        "atharv@gmail.com",
        " atharv@gmail.com ",
        "<atharv@gmail.com>",
        "mailto:atharv@gmail.com",
        "user_name.123@domain.co.in"
    ];

    tests.forEach(text => {
        emailPattern.regex.lastIndex = 0;
        const match = emailPattern.regex.exec(text);
        console.log(\`"\${text}" -> \${match ? 'Match: ' + match[0] : 'NO MATCH'}\`);
    });
`);
