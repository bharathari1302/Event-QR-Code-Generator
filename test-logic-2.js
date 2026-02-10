
const row = {
    "Name": "BHARAT HARI S",
    "Roll No": "24ALR004",
    "E-mail(Kongu ID)": "bharatharis.24aim@kongu.edu",
    "Room NO": 310,
    "Veg or Non Veg": "Non Veg"
};

function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const keywords = ['Roll No', 'Roll Number', 'Reg No', 'Register Number'];
const excludeTerms = ['veg', 'food', 'preference', 'diet', 'meal'];

console.log("Start Search...");
const keys = Object.keys(row);

const foundKey = keys.find(k => {
    const normalizedKey = normalize(k);
    console.log(`Key: "${k}" -> norm: "${normalizedKey}"`);

    // Exclude
    for (const term of excludeTerms) {
        if (normalizedKey.includes(term.toLowerCase())) {
            console.log(`  Excluded by "${term}"`);
            return false;
        }
    }

    // Include
    for (const kw of keywords) {
        const normKw = normalize(kw);
        if (normalizedKey.includes(normKw)) {
            console.log(`  MATCH "${kw}" -> "${normKw}"`);
            return true;
        }
    }
    return false;
});

console.log("Found Key:", foundKey);
