const patterns = [
    {
        name: 'Email Address',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    }
];

const text = "when i paste any text in chat gpt";
patterns.forEach(pattern => {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
        console.log("Matched:", match[0], "at", match.index);
        if (pattern.regex.lastIndex === match.index) {
            pattern.regex.lastIndex++; // Prevent infinite loops
        }
    }
});
