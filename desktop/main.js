const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        // icon: path.join(__dirname, '../public/vite.svg')
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        // In dev mode, wait a bit or just load the URL
        // The wait-on in the script handles the waiting, so just load
        win.loadURL('http://localhost:3333');
    } else {
        // In production, load the built file
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
