// Processus principal de l'application de bureau Movaé.
//
// Ce que la version bureau apporte par rapport au navigateur :
//  - détection d'inactivité SYSTÈME (powerMonitor) : le moteur sait si vous
//    travaillez, quelle que soit l'application au premier plan ;
//  - l'app vit dans la zone de notification (tray) : fermer la fenêtre ne
//    tue pas le moteur, les rappels continuent ;
//  - pas de limitation d'onglet en arrière-plan (backgroundThrottling off) ;
//  - notifications natives Windows fiables.

const { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, shell, nativeImage } = require("electron");
const path = require("path");

let mainWindow = null;
let tray = null;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const iconPath = path.join(__dirname, "..", "build-assets", "icon-256.png");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 830,
    minWidth: 920,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#F7F7F2",
    icon: iconPath,
    title: "Movaé",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // le moteur continue de tourner fenêtre cachée
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "dist-desktop", "index.html"), {
    hash: "/app",
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Fermer = réduire dans la zone de notification (le moteur continue).
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Les liens externes s'ouvrent dans le navigateur par défaut.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
}

function createTray() {
  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(image);
  tray.setToolTip("Movaé — pauses actives");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Ouvrir Movaé", click: () => { mainWindow.show(); mainWindow.focus(); } },
      { type: "separator" },
      {
        label: "Quitter complètement",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  // Inactivité système : cœur de l'intelligence de la version bureau.
  ipcMain.handle("movae:idle-seconds", () => powerMonitor.getSystemIdleTime());
  ipcMain.handle("movae:show-window", () => {
    mainWindow.show();
    mainWindow.focus();
  });
  ipcMain.handle("movae:version", () => app.getVersion());

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // Ne rien faire : l'app vit dans le tray. Quitter passe par le menu du tray.
});
