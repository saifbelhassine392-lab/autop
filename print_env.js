const fs = require('fs');
try {
    const env = fs.readFileSync('.env', 'utf-8');
    const urlLine = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (urlLine) {
      const url = urlLine.split('=')[1].trim();
      console.log("Database Host:", url.split('@')[1] ? url.split('@')[1].split('/')[0] : 'no host');
    } else {
      console.log("No DATABASE_URL line found");
    }
} catch (e) {
    console.error("Error reading .env:", e);
}
