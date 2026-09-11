const { app, safeStorage } = require('electron');
const fs = require('fs');

app.setPath('userData', "C:\\Users\\Utente\\AppData\\Roaming\\lezionify");

app.whenReady().then(() => {
    const settingsPath = "C:\\Users\\Utente\\AppData\\Roaming\\lezionify\\library\\settings.json";
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (safeStorage.isEncryptionAvailable()) {
        const keys = data.apiKeys.map(k => {
            try {
                return safeStorage.decryptString(Buffer.from(k, 'base64'));
            } catch (e) { return null; }
        });
        console.log("DECRYPTED_KEYS_START");
        console.log(JSON.stringify(keys.filter(k => k)));
        console.log("DECRYPTED_KEYS_END");
    } else {
        console.log("Encryption not available.");
    }
    app.quit();
});
