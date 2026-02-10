
const row = {
    "Name": "BHARAT HARI S",
    "Roll No": "24ALR004",
    "E-mail(Kongu ID)": "bharatharis.24aim@kongu.edu",
    "Room NO": 310,
    "Veg or Non Veg": "Non Veg"
};

const findKey = (keywords, excludeTerms = []) => Object.keys(row).find(k => {
    const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    console.log(`Checking key: '${k}' -> '${normalizedKey}'`);

    // Check exclusions
    if (excludeTerms.some(term => normalizedKey.includes(term.toLowerCase()))) {
        console.log(`  Excluded by term '${excludeTerms.find(term => normalizedKey.includes(term.toLowerCase()))}'`);
        return false;
    }

    // Check keywords
    return keywords.some(keyword => {
        const normKeyword = keyword.replace(/[^a-z0-9]/g, '').toLowerCase();
        const match = normalizedKey.includes(normKeyword);
        console.log(`  Matching against keyword '${keyword}' ('${normKeyword}') -> ${match}`);
        return match;
    });
});

const rollKey = findKey(
    ['Roll No', 'Roll Number', 'Reg No', 'Register Number'],
    ['veg', 'food', 'preference', 'diet', 'meal']
);

console.log('Resulting rollKey:', rollKey);
const rollNo = (rollKey && row[rollKey]) ? row[rollKey].toString().trim() : null;
console.log('Extracted rollNo:', rollNo);
