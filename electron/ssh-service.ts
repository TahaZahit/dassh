import { Client } from 'ssh2'
import { readFile } from 'node:fs/promises'
import { ipcMain, WebContents } from 'electron'

export class SshService {
    private connections: Map<string, Client> = new Map()
    private sftpSessions: Map<string, any> = new Map()

    constructor() {
        this.setupIpcHandlers()
    }

    private setupIpcHandlers() {
        ipcMain.handle('ssh-connect', async (event, { id, config, dimensions }) => {
            return this.createConnection(id, config, event.sender, dimensions)
        })

        ipcMain.handle('sftp:list-files', async (_, { id, path }) => {
            const sftp = this.sftpSessions.get(id)
            if (!sftp) throw new Error('SFTP session not found')

            return new Promise((resolve, reject) => {
                sftp.readdir(path, (err: any, list: any[]) => {
                    if (err) return reject(err)
                    resolve(list.map(item => ({
                        name: item.filename,
                        size: item.attrs.size,
                        type: item.longname.startsWith('d') ? 'directory' : 'file',
                        permissions: item.attrs.permissions,
                        mtime: item.attrs.mtime
                    })))
                })
            })
        })

        ipcMain.handle('sftp:mkdir', async (_, { id, path }) => {
            const sftp = this.sftpSessions.get(id)
            if (!sftp) throw new Error('SFTP session not found')

            return new Promise((resolve, reject) => {
                sftp.mkdir(path, (err: any) => {
                    if (err) return reject(err)
                    resolve(true)
                })
            })
        })

        ipcMain.handle('sftp:delete', async (_, { id, path, isDirectory }) => {
            const sftp = this.sftpSessions.get(id)
            if (!sftp) throw new Error('SFTP session not found')

            return new Promise((resolve, reject) => {
                const callback = (err: any) => {
                    if (err) return reject(err)
                    resolve(true)
                }
                if (isDirectory) {
                    sftp.rmdir(path, callback)
                } else {
                    sftp.unlink(path, callback)
                }
            })
        })

        ipcMain.handle('sftp:download', async (_, { id, remotePath, localPath }) => {
            const sftp = this.sftpSessions.get(id)
            if (!sftp) throw new Error('SFTP session not found')

            return new Promise((resolve, reject) => {
                sftp.fastGet(remotePath, localPath, (err: any) => {
                    if (err) return reject(err)
                    resolve(true)
                })
            })
        })

        ipcMain.handle('sftp:upload', async (_, { id, localPath, remotePath }) => {
            const sftp = this.sftpSessions.get(id)
            if (!sftp) throw new Error('SFTP session not found')

            return new Promise((resolve, reject) => {
                sftp.fastPut(localPath, remotePath, (err: any) => {
                    if (err) return reject(err)
                    resolve(true)
                })
            })
        })

        ipcMain.on('ssh-input', (event, { id, data }) => {
            const conn = this.connections.get(id)
            if (conn) {
                // @ts-ignore: Custom property stream attached to client for simplicity, or we store streams separately
                conn.stream?.write(data)
            }
        })

        ipcMain.on('ssh-resize', (event, { id, rows, cols }) => {
            const conn = this.connections.get(id)
            if (conn) {
                // @ts-ignore
                conn.stream?.setWindow(rows, cols, 0, 0)
            }
        })

        ipcMain.on('ssh-disconnect', (event, { id }) => {
            this.closeConnection(id)
        })
    }

    private createConnection(id: string, config: any, sender: WebContents, dimensions?: { rows: number, cols: number }): Promise<boolean> {
        // Prevent duplicate connection attempts for the same ID
        if (this.connections.has(id)) {
            return Promise.resolve(true)
        }

        return new Promise(async (resolve, reject) => {
            const conn = new Client()
            // Store immediately to prevent race conditions during async connection setup
            this.connections.set(id, conn)

            const sendLog = (msg: string) => {
                sender.send('ssh-data', { id, data: `\x1b[1;34m[dassh]\x1b[0m ${msg}\r\n` })
            }

            conn.on('ready', () => {
                sendLog('Authenticated successfully. Requesting shell...')
                conn.shell({
                    term: 'xterm-256color',
                    rows: dimensions?.rows || 24,
                    cols: dimensions?.cols || 80
                }, (err, stream) => {
                    if (err) {
                        sendLog(`\x1b[1;31mError:\x1b[0m Failed to open shell: ${err.message}`)
                        this.connections.delete(id)
                        conn.end()
                        reject(err)
                        return
                    }

                    // @ts-ignore
                    conn.stream = stream

                    stream.on('close', () => {
                        sendLog('\x1b[1;33mDisconnected from server.\x1b[0m')
                        sender.send('ssh-closed', { id })
                        this.connections.delete(id)
                        conn.end()
                    })

                    stream.on('data', (data: Buffer) => {
                        sender.send('ssh-data', { id, data: data.toString('utf-8') })
                    })

                    resolve(true)

                    // Automatically start SFTP session
                    conn.sftp((err, sftp) => {
                        if (err) {
                            sendLog(`\x1b[1;31mError:\x1b[0m Failed to start SFTP: ${err.message}`)
                            return
                        }
                        this.sftpSessions.set(id, sftp)
                        sendLog('SFTP session initialized.')
                    })
                })
            })

            conn.on('end', () => {
                sendLog('Connection ended.')
                this.connections.delete(id)
            })

            conn.on('error', (err) => {
                sendLog(`\x1b[1;31mError:\x1b[0m ${err.message}`)
                sender.send('ssh-error', { id, error: err.message })
                this.connections.delete(id)
                reject(err)
            })

            conn.on('banner', (message) => {
                sender.send('ssh-data', { id, data: message.replace(/\n/g, '\r\n') })
            })

            try {
                sendLog(`Connecting to ${config.host}...`)

                const connectionConfig: any = {
                    host: config.host,
                    port: config.port || 22,
                    username: config.username,
                }

                if (config.privateKeyPath) {
                    try {
                        connectionConfig.privateKey = await readFile(config.privateKeyPath)
                        sendLog(`Using private key: ${config.privateKeyPath}`)
                    } catch (err: any) {
                        sendLog(`\x1b[1;31mError reading key:\x1b[0m ${err.message}`)
                        this.connections.delete(id)
                        reject(err)
                        return
                    }
                } else if (config.password) {
                    connectionConfig.password = config.password
                }

                conn.connect(connectionConfig)
            } catch (err: any) {
                sendLog(`\x1b[1;31mError:\x1b[0m ${err.message}`)
                this.connections.delete(id)
                reject(err)
            }
        })
    }

    private closeConnection(id: string) {
        const conn = this.connections.get(id)
        if (conn) {
            conn.end()
            this.connections.delete(id)
        }
        this.sftpSessions.delete(id)
    }
}
