const regex = /@(okaxis|okhdfcbank|oksbi|okicici|okbiz|ybl|ibl|axl|paytm|upi|apl|yapl|abfspay)\b/gi;
const tests = [
    "@okaxis",
    "my handle is @okaxis",
    "user@okaxis",
    "this is an email test@example.com",
    "pay to @paytm"
];

tests.forEach(text => {
    regex.lastIndex = 0;
    const match = regex.exec(text);
    console.log(`"${text}" -> ${match ? match[0] : 'null'}`);
});
