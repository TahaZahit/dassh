
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
    saveFile(defaultPath?: string): Promise<string | null>
    selectFolder(): Promise<string | null>
    sftpListFiles(id: string, path: string): Promise<any[]>
    sftpMkdir(id: string, path: string): Promise<boolean>
    sftpDelete(id: string, path: string, isDirectory: boolean): Promise<boolean>
    sftpDownload(id: string, remotePath: string, localPath: string): Promise<boolean>
    sftpUpload(id: string, localPath: string, remotePath: string): Promise<boolean>
    getFilePath(file: File): string
}

declare global {
    interface Window {
        ipcRenderer: IpcRenderer
    }
}

export { }
