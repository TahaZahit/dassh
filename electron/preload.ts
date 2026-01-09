import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args
        return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },
    connectSSH(id: string, config: any, dimensions?: { rows: number, cols: number }) {
        return ipcRenderer.invoke('ssh-connect', { id, config, dimensions })
    },
    sendSSHInput(id: string, data: string) {
        ipcRenderer.send('ssh-input', { id, data })
    },
    resizeSSH(id: string, rows: number, cols: number) {
        ipcRenderer.send('ssh-resize', { id, rows, cols })
    },
    disconnectSSH(id: string) {
        ipcRenderer.send('ssh-disconnect', { id })
    },
    onSSHData(callback: (event: any, data: { id: string, data: string }) => void) {
        const subscription = (event: any, args: any) => callback(event, args)
        ipcRenderer.on('ssh-data', subscription)
        return () => ipcRenderer.off('ssh-data', subscription)
    },
    onSSHClosed(callback: (event: any, data: { id: string }) => void) {
        const subscription = (event: any, args: any) => callback(event, args)
        ipcRenderer.on('ssh-closed', subscription)
        return () => ipcRenderer.off('ssh-closed', subscription)
    },
    loadServers() {
        return ipcRenderer.invoke('servers-load')
    },
    saveServers(servers: any[]) {
        return ipcRenderer.invoke('servers-save', servers)
    },
    selectFile() {
        return ipcRenderer.invoke('select-file')
    }
})
