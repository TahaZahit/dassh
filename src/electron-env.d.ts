
interface IpcRenderer {
    on(channel: string, listener: (event: any, ...args: any[]) => void): this
    off(channel: string, listener: (event: any, ...args: any[]) => void): this
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
    connectSSH(id: string, config: any, dimensions?: { rows: number, cols: number }): Promise<boolean>
    sendSSHInput(id: string, data: string): void
    resizeSSH(id: string, rows: number, cols: number): void
    disconnectSSH(id: string): void
    onSSHData(callback: (event: any, data: { id: string, data: string }) => void): () => void
    onSSHClosed(callback: (event: any, data: { id: string }) => void): () => void
    loadServers(): Promise<any[]>
    saveServers(servers: any[]): Promise<boolean>
    selectFile(): Promise<string | null>
}

declare global {
    interface Window {
        ipcRenderer: IpcRenderer
    }
}

export { }
