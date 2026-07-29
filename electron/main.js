const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nextServerProcess = null;
const PORT = 3000;
const LOCAL_URL = `http://localhost:${PORT}`;

// ═══════════════════════════════════════════════════════════
// CONFIGURATION : URL de production Vercel
// ═══════════════════════════════════════════════════════════
const VERCEL_URL = 'https://autopb2b.vercel.app';
const DASHBOARD_PATH = '/admin/dashbord';

// Mode : 'vercel' = charge le site Vercel déployé, 'local' = serveur local
const MODE = 'vercel';

const DASHBOARD_URL = MODE === 'vercel'
  ? `${VERCEL_URL}${DASHBOARD_PATH}`
  : `${LOCAL_URL}${DASHBOARD_PATH}`;

// Helper pour convertir du HTML brut en Data URL Base64
function htmlToDataUrl(html) {
  return 'data:text/html;base64,' + Buffer.from(html).toString('base64');
}

// Embellir le PATH sous Windows
function getEnhancedEnv() {
  const env = { ...process.env };
  if (process.platform === 'win32') {
    const candidatePaths = [
      'C:\\Program Files\\nodejs',
      path.join(process.env.APPDATA || '', 'npm'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs'),
    ];
    const existingPaths = candidatePaths.filter(p => p && fs.existsSync(p));
    if (existingPaths.length > 0) {
      env.PATH = `${existingPaths.join(';')};${env.PATH || env.Path || ''}`;
    }
  }
  return env;
}

// ═══════════════════════════════════════════════════════════
// ÉCRAN DE CHARGEMENT GLASSMORPHISM AUTOP
// ═══════════════════════════════════════════════════════════
const LOADING_HTML_RAW = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Démarrage - AUTOP Console Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
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
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 4px;
      margin-bottom: 6px;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .version-badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 20px;
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
    .spinner-inner {
      position: absolute;
      top: 8px; left: 8px; right: 8px; bottom: 8px;
      border: 3px solid rgba(129, 140, 248, 0.1);
      border-bottom-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite reverse;
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
    .cloud-badge {
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
    }
    .cloud-dot {
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
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
    <div class="version-badge">▲ Vercel Production</div>
    <div class="spinner-container">
      <div class="spinner"></div>
      <div class="spinner-inner"></div>
    </div>
    <div class="status">Connexion au serveur<span class="dots"></span></div>
    <div class="cloud-badge">
      <div class="cloud-dot"></div>
      autopb2b.vercel.app
    </div>
  </div>
</body>
</html>
`;

const LOADING_HTML = htmlToDataUrl(LOADING_HTML_RAW);

function getErrorHTML(errorMessage = 'Le serveur n\'a pas répondu.') {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>AUTOP Console Admin - Erreur</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
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
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 40px 50px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      text-align: center;
      max-width: 480px;
      width: 90%;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 2px;
      margin-bottom: 8px;
      color: #ef4444;
    }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .message {
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 24px;
      line-height: 1.6;
      background: rgba(15, 23, 42, 0.6);
      padding: 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .btn {
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
      margin: 4px;
    }
    .btn:hover { opacity: 0.85; }
    .btn-sec {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
    }
    .status { margin-top: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AUTOP</div>
    <div class="subtitle">Console d'Administration Desktop</div>
    <div class="message">${errorMessage}</div>
    <button class="btn" onclick="location.reload()">🔄 Réessayer</button>
    <button class="btn btn-sec" onclick="window.location.href='https://autopb2b.vercel.app/admin/dashbord'">☁️ Ouvrir en ligne</button>
    <div class="status">Tentative de reconnexion automatique en cours...</div>
  </div>
  <script>
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      fetch('https://autopb2b.vercel.app/admin/dashbord', { mode: 'no-cors' })
        .then(() => {
          clearInterval(interval);
          window.location.href = 'https://autopb2b.vercel.app/admin/dashbord';
        })
        .catch(() => {});
      if (attempts > 30) clearInterval(interval);
    }, 2000);
  </script>
</body>
</html>
  `;
  return htmlToDataUrl(html);
}

/**
 * Vérifie si un serveur HTTP est actif sur le port 3000
 */
function isLocalServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000', (res) => {
      resolve(true);
      req.destroy();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

/**
 * Démarre le serveur Next.js local en fallback
 */
async function startNextServerIfNeeded() {
  const running = await isLocalServerRunning();
  if (running) {
    console.log('[Electron] Serveur local déjà actif sur le port', PORT);
    return true;
  }

  console.log('[Electron] Tentative de démarrage du serveur local Next.js...');

  let appPath = app.getAppPath();
  if (app.isPackaged) {
    const unpackedDir = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(unpackedDir)) appPath = unpackedDir;
  }

  const hasNextBuild = fs.existsSync(path.join(appPath, '.next'));
  if (!hasNextBuild) {
    console.log('[Electron] Pas de build Next.js local — mode Vercel uniquement.');
    return false;
  }

  try {
    process.chdir(appPath);
  } catch (e) {}

  // Essayer d'embarquer le serveur Next.js directement via l'API Node
  try {
    const nextPkg = require.resolve('next', { paths: [appPath, path.join(appPath, 'node_modules'), process.cwd()] });
    const next = require(nextPkg);
    const nextApp = next({ dev: false, dir: appPath, port: PORT });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    const server = http.createServer((req, res) => handle(req, res));
    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => { if (err) reject(err); else resolve(); });
    });
    console.log(`[Electron] Serveur Next.js local démarré sur http://localhost:${PORT}`);
    return true;
  } catch (err) {
    console.warn('[Electron] Serveur embarqué non disponible:', err.message);
  }

  // Fallback : spawner next start
  try {
    const isWin = process.platform === 'win32';
    const env = getEnhancedEnv();
    const localNextCmd = path.join(appPath, 'node_modules', '.bin', 'next.cmd');
    const localNextJs = path.join(appPath, 'node_modules', 'next', 'dist', 'bin', 'next');

    let command = 'node';
    let args = [localNextJs, 'start', '-p', PORT.toString()];
    if (isWin && fs.existsSync(localNextCmd)) {
      command = localNextCmd;
      args = ['start', '-p', PORT.toString()];
    }

    nextServerProcess = spawn(command, args, {
      cwd: appPath,
      env: { ...env, PORT: PORT.toString(), NODE_ENV: 'production' },
      stdio: 'pipe',
      shell: true
    });

    nextServerProcess.on('exit', () => { nextServerProcess = null; });
    return true;
  } catch (error) {
    console.error('[Electron] Erreur spawn serveur local:', error);
    return false;
  }
}

/**
 * Attend que le serveur Vercel soit accessible et charge le Dashboard
 */
async function loadDashboard() {
  if (MODE === 'vercel') {
    // En mode Vercel : charger directement l'URL de production
    console.log('[Electron] Mode Vercel — chargement direct de', DASHBOARD_URL);
    
    // Petit délai pour que la fenêtre soit prête (500ms)
    await new Promise(res => setTimeout(res, 500));
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(DASHBOARD_URL);
    }
    return;
  }

  // Mode local : attendre que le serveur soit prêt
  const maxAttempts = 120; // 60 secondes max
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await isLocalServerRunning();
    if (ready) {
      console.log('[Electron] Serveur local prêt ! Chargement du dashboard...');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(DASHBOARD_URL);
      }
      return;
    }
    await new Promise(res => setTimeout(res, 500));
  }

  console.error('[Electron] Serveur local non disponible — basculement sur Vercel.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`${VERCEL_URL}${DASHBOARD_PATH}`);
  }
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'AUTOP Console Admin',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Nécessaire pour accéder aux ressources cross-origin
      webviewTag: true,
      allowRunningInsecureContent: false,
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Affichage immédiat de l'écran de chargement
  mainWindow.loadURL(LOADING_HTML);

  // Démarrer et charger
  if (MODE === 'vercel') {
    // Mode Vercel : pas besoin de serveur local
    loadDashboard();
  } else {
    startNextServerIfNeeded().then(() => {
      loadDashboard();
    });
  }

  // Injection automatique de la session admin
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    console.log('[Electron] Page chargée:', currentUrl);

    const isAdminPage = currentUrl.includes('/admin') ||
      currentUrl.includes(VERCEL_URL) ||
      currentUrl.includes('localhost:3000');

    if (isAdminPage && !currentUrl.includes('login')) {
      mainWindow.webContents.executeJavaScript(`
        try {
          if (!localStorage.getItem('adminAuth')) {
            localStorage.setItem('adminAuth', 'SAIF');
          }
          if (!localStorage.getItem('activeAdminProfile')) {
            localStorage.setItem('activeAdminProfile', 'SAIF');
          }
        } catch(e) {}
      `).catch(() => {});
    }
  });

  // Gestion des erreurs réseau
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Ignore les annulations normales

    console.warn(`[Electron] Erreur chargement ${validatedURL} (${errorCode}: ${errorDescription})`);

    setTimeout(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      // Réessayer dans tous les cas
      mainWindow.loadURL(DASHBOARD_URL);
    }, 3000);
  });

  // Liens externes → navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const isInternal = url.includes('localhost:3000') || url.includes('autopb2b.vercel.app');
      if (!isInternal) {
        shell.openExternal(url);
        return { action: 'deny' };
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
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', nextServerProcess.pid, '/f', '/t']);
      } else {
        nextServerProcess.kill('SIGTERM');
      }
    } catch (e) {}
    nextServerProcess = null;
  }
}

app.whenReady().then(() => {
  // Intercepter les requêtes pour permettre CORS depuis Vercel
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*']
      }
    });
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopNextServer();
    app.quit();
  }
});

app.on('will-quit', () => {
  stopNextServer();
});
