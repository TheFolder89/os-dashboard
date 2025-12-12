console.log('Running test.js');
try {
    const electron = require('electron');
    console.log('Type:', typeof electron);
    console.log('Keys:', Object.keys(electron));
} catch (e) {
    console.error('Error:', e);
}
console.log('Versions:', process.versions);
