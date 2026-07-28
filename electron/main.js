const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'AUTOP Console Admin Desktop',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: true
    }
  });

  // Chargement direct du dashboard admin
  const dashboardUrl = 'http://localhost:3000/admin/dashbord';
  mainWindow.loadURL(dashboardUrl);

  // Injection automatique de la session admin dès que la page est prête
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    console.log('Page chargée:', currentUrl);

    // Injecter localStorage adminAuth = SAIF automatiquement
    mainWindow.webContents.executeJavaScript(`
      localStorage.setItem('adminAuth', 'SAIF');
      console.log('[Electron] Session admin injectée: SAIF');
    `).then(() => {
      // Si on est sur la page de login ou une page non-dashboard, rediriger
      if (!currentUrl.includes('/admin/dashbord')) {
        mainWindow.loadURL('http://localhost:3000/admin/dashbord');
      }
    }).catch(console.error);
  });

  // Garder les catalogues (partslink, partsnumber, partsouq) dans la fenêtre Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('partsnumber.com') ||
      url.includes('partslink24.com') ||
      url.includes('partsouq.com') ||
      url.includes('localhost')
    ) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
