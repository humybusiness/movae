// Pont sécurisé entre l'application Movaé (renderer) et le système.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("movaeDesktop", {
  isDesktop: true,
  // Secondes d'inactivité clavier/souris à l'échelle du SYSTÈME entier.
  getIdleSeconds: () => ipcRenderer.invoke("movae:idle-seconds"),
  showWindow: () => ipcRenderer.invoke("movae:show-window"),
  getVersion: () => ipcRenderer.invoke("movae:version"),
});
