import { app, BrowserWindow } from "electron";
import * as path from "path";

function createWindow() {
  const isDev = !app.isPackaged;
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    title: "Pickle AI",
    icon: path.join(
      __dirname,
      isDev ? "../public/logo.png" : "../dist/logo.png",
    ),
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this basic setup; consider true + preload for security
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    // In production, load the index.html from the dist folder
    // Adjust the path to match where dist puts index.html relative to main.js
    // If main.js is in dist-electron/main.js, and index.html is in dist/index.html
    // Then it's ../dist/index.html
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
