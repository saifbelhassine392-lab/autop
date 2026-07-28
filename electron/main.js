const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nextServerProcess = null;
const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;
const DASHBOARD_URL = `${SERVER_URL}/admin/dashbord`;

// HTML de démarrage avec animation glassmorphism aux couleurs d'AUTOP
const LOADING_HTML = `data:text/html;charset=UTF-8,` + encodeURIComponent(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Démarrage - AUTOP Console Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 40px 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 440px;
      width: 90%;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 2px;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .spinner-container {
      position: relative;
      width: 60px;
      height: 60px;
      margin: 0 auto 24px auto;
    }
    .spinner {
      width: 100%;
      height: 100%;
      border: 4px solid rgba(56, 189, 248, 0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      font-size: 14px;
      color: #cbd5e1;
      font-weight: 500;
    }
    .dots::after {
      content: '';
      animation: dots 1.5s steps(4, end) infinite;
    }
    @keyframes dots {
      0%, 20% { content: ''; }
      40% { content: '.'; }
      60% { content: '..'; }
      80%, 100% { content: '...'; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AUTOP</div>
    <div class="subtitle">Console d'Administration Desktop</div>
    <div class="spinner-container">
      <div class="spinner"></div>
    </div>
    <div class="status">Démarrage des services<span class="dots"></span></div>
  </div>
</body>
</html>
`);

/**
 * Vérifie si un serveur HTTP est actif sur le port 3000
 */
function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      resolve(true);
      req.destroy();
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Démarre le serveur Next.js en arrière-plan s'il n'est pas déjà actif
 */
async function startNextServerIfNeeded() {
  const running = await isServerRunning();
  if (running) {
    console.log('[Electron] Serveur Next.js déjà actif sur le port', PORT);
    return;
  }

  console.log('[Electron] Serveur non détecté. Lancement du serveur Next.js en arrière-plan...');

  const appPath = app.getAppPath();
  const hasNextBuild = fs.existsSync(path.join(appPath, '.next'));
  const nextBin = path.join(appPath, 'node_modules', 'next', 'dist', 'bin', 'next');

  let command;
  let args;

  if (fs.existsSync(nextBin)) {
    command = process.execPath; // Binaire Electron utilisé comme runtime Node
    const mode = hasNextBuild ? 'start' : 'dev';
    args = [nextBin, mode, '-p', PORT.toString()];
  } else {
    command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const mode = hasNextBuild ? 'start' : 'dev';
    args = ['next', mode, '-p', PORT.toString()];
  }

  try {
    nextServerProcess = spawn(command, args, {
      cwd: appPath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: PORT.toString() },
      stdio: 'pipe',
      detached: false
    });

    if (nextServerProcess.stdout) {
      nextServerProcess.stdout.on('data', (data) => console.log(`[Next.js] ${data.toString().trim()}`));
    }
    if (nextServerProcess.stderr) {
      nextServerProcess.stderr.on('data', (data) => console.error(`[Next.js Error] ${data.toString().trim()}`));
    }

    nextServerProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Processus Next.js terminé (code ${code}, signal ${signal})`);
      nextServerProcess = null;
    });

    nextServerProcess.on('error', (err) => {
      console.error('[Electron] Échec du lancement de Next.js:', err);
    });

  } catch (error) {
    console.error('[Electron] Erreur lors du spawn du serveur:', error);
  }
}

/**
 * Attend que le serveur soit prêt et charge le Dashboard
 */
async function waitForServerAndLoad() {
  const maxAttempts = 60; // 30 secondes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const ready = await isServerRunning();
    if (ready) {
      console.log('[Electron] Serveur prêt ! Chargement du dashboard...');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(DASHBOARD_URL);
      }
      return;
    }
    attempts++;
    await new Promise((res) => setTimeout(res, 500));
  }

  console.error('[Electron] Le serveur Next.js n\'a pas répondu dans le délai imparti.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(DASHBOARD_URL);
  }
}

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

  // Affichage immédiat de l'écran de chargement
  mainWindow.loadURL(LOADING_HTML);

  // Démarrer le serveur et attendre qu'il soit prêt
  startNextServerIfNeeded().then(() => {
    waitForServerAndLoad();
  });

  // Injection automatique de la session admin si nécessaire
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    console.log('[Electron] Page chargée:', currentUrl);

    if (currentUrl.startsWith(SERVER_URL)) {
      mainWindow.webContents.executeJavaScript(`
        if (!localStorage.getItem('adminAuth')) {
          localStorage.setItem('adminAuth', 'SAIF');
        }
      `).catch(() => {});
    }
  });

  // Gestion des erreurs de chargement réseau
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignorer les annulations de navigation normales (ex: redirections HTTP / ERR_ABORTED -3)
    if (errorCode === -3) return;

    if (validatedURL && validatedURL.startsWith(SERVER_URL)) {
      console.warn(`[Electron] Échec du chargement de ${validatedURL} (${errorCode}: ${errorDescription}). Nouvel essai...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(DASHBOARD_URL);
        }
      }, 3000);
    }
  });

  // Gestion des ouvertures de fenêtres et popups (évite l'ouverture/fermeture en boucle de fenêtres)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Si ce n'est pas le serveur local, ouvrir dans le navigateur par défaut de l'utilisateur
      if (!url.startsWith(SERVER_URL)) {
        shell.openExternal(url);
      }
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function stopNextServer() {
  if (nextServerProcess) {
    console.log('[Electron] Arrêt du serveur Next.js en arrière-plan...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', nextServerProcess.pid, '/f', '/t']);
      } else {
        nextServerProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Electron] Erreur lors de la fermeture du serveur:', e);
    }
    nextServerProcess = null;
  }
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopNextServer();
});
