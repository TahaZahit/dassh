import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ipcMain, app, BrowserWindow, dialog, nativeImage } from 'electron'
import { SshService } from './ssh-service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Initialize SSH Service
new SshService()

function createWindow() {
    const preload = path.join(__dirname, 'preload.js')
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(process.env.VITE_PUBLIC as string, 'logo-black.png'),
        webPreferences: {
            preload,
        },
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
    })

    if (process.platform === 'darwin') {
        const iconPath = path.join(process.env.VITE_PUBLIC as string, 'logo-black.png')
        app.dock.setIcon(nativeImage.createFromPath(iconPath))
    }

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST as string, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Server Persistence IPC
const SERVERS_FILE = path.join(app.getAppPath(), 'servers.json')

ipcMain.handle('servers-load', async () => {
    try {
        const data = await fs.readFile(SERVERS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return []
        }
        throw err
    }
})

ipcMain.handle('select-file', async () => {
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        title: 'Select Private Key'
    })
    if (canceled) return null
    return filePaths[0]
})

ipcMain.handle('save-file', async (_, defaultPath) => {
    if (!win) return null
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath,
        title: 'Save File'
    })
    if (canceled) return null
    return filePath
})

ipcMain.handle('select-folder', async () => {
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        title: 'Select Folder'
    })
    if (canceled) return null
    return filePaths[0]
})

ipcMain.handle('servers-save', async (_, servers) => {
    await fs.writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf-8')
    return true
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    createWindow()
})
