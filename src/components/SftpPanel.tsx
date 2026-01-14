import { useState, useEffect, useCallback } from 'react'

interface SftpFile {
    name: string
    size: number
    type: 'file' | 'directory'
    permissions: number
    mtime: number
}

interface SftpPanelProps {
    terminalId: string
    onClose: () => void
}

export function SftpPanel({ terminalId, onClose }: SftpPanelProps) {
    const [path, setPath] = useState('.')
    const [files, setFiles] = useState<SftpFile[]>([])
    const [loading, setLoading] = useState(false)
    const [transferring, setTransferring] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: SftpFile } | null>(null)

    const loadFiles = useCallback(async (targetPath: string) => {
        setLoading(true)
        setError(null)
        try {
            const list = await window.ipcRenderer.sftpListFiles(terminalId, targetPath)
            // Sort: directories first, then alphabetically
            const sortedList = (list as SftpFile[]).sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name)
                return a.type === 'directory' ? -1 : 1
            })
            setFiles(sortedList)
            setPath(targetPath)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [terminalId])

    useEffect(() => {
        loadFiles('.')
    }, [loadFiles])

    const handleNavigate = (file: SftpFile) => {
        if (file.type === 'directory') {
            const newPath = path === '.' ? file.name : `${path}/${file.name}`
            loadFiles(newPath)
        }
    }

    const handleBack = () => {
        if (path === '.') return
        const parts = path.split('/')
        parts.pop()
        const newPath = parts.length === 0 ? '.' : parts.join('/')
        loadFiles(newPath)
    }

    const handleDownload = async (file: SftpFile) => {
        setContextMenu(null)
        const localPath = await window.ipcRenderer.saveFile(file.name)
        if (!localPath) return

        const remotePath = path === '.' ? file.name : `${path}/${file.name}`
        try {
            await window.ipcRenderer.sftpDownload(terminalId, remotePath, localPath)
            alert(`Downloaded ${file.name} successfully`)
        } catch (err: any) {
            alert(`Download failed: ${err.message}`)
        }
    }

    const handleDelete = async (file: SftpFile) => {
        setContextMenu(null)
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return

        const remotePath = path === '.' ? file.name : `${path}/${file.name}`
        try {
            await window.ipcRenderer.sftpDelete(terminalId, remotePath, file.type === 'directory')
            loadFiles(path)
        } catch (err: any) {
            alert(`Delete failed: ${err.message}`)
        }
    }

    const handleMkdir = async () => {
        const folderName = prompt('Enter folder name:')
        if (!folderName) return

        const remotePath = path === '.' ? folderName : `${path}/${folderName}`
        try {
            await window.ipcRenderer.sftpMkdir(terminalId, remotePath)
            loadFiles(path)
        } catch (err: any) {
            alert(`Failed to create directory: ${err.message}`)
        }
    }

    const handleUpload = async (file: File) => {
        const localPath = window.ipcRenderer.getFilePath(file)
        const remotePath = path === '.' ? file.name : `${path}/${file.name}`

        try {
            setLoading(true)
            await window.ipcRenderer.sftpUpload(terminalId, localPath, remotePath)
            loadFiles(path)
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleCrossServerTransfer = async (sourceId: string, sourcePath: string, fileName: string) => {
        if (sourceId === terminalId) return // Don't transfer to self

        setTransferring(true)
        setError(null)
        const remotePath = path === '.' ? fileName : `${path}/${fileName}`

        try {
            await window.ipcRenderer.sftpTransfer(sourceId, sourcePath, terminalId, remotePath)
            await loadFiles(path)
        } catch (err: any) {
            setError(`Transfer failed: ${err.message}`)
        } finally {
            setTransferring(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()

        // Check for cross-server transfer first
        const sftpData = e.dataTransfer.getData('application/dassh-sftp-item')
        if (sftpData) {
            try {
                const { sourceConnectionId, filePath, fileName } = JSON.parse(sftpData)
                handleCrossServerTransfer(sourceConnectionId, filePath, fileName)
                return
            } catch (err) {
                console.error('Failed to parse SFTP drag data', err)
            }
        }

        const files = Array.from(e.dataTransfer.files)
        files.forEach(handleUpload)
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="sftp-panel"
            onContextMenu={(e) => e.preventDefault()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <div className="sftp-header">
                <div className="sftp-title">
                    <span onClick={handleBack} style={{ cursor: 'pointer', opacity: path === '.' ? 0.3 : 1 }}>
                        ←
                    </span>
                    <span className="sftp-path">{path}</span>
                </div>
                <div className="sftp-actions">
                    <button className="btn-icon" onClick={handleMkdir} title="New Folder">+</button>
                    <button className="btn-icon" onClick={() => loadFiles(path)} title="Refresh">↻</button>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
            </div>

            <div className="sftp-content">
                {loading && <div className="sftp-loading">Loading...</div>}
                {error && <div className="sftp-error">{error}</div>}

                <div className="sftp-file-list">
                    {files.map(file => (
                        <div
                            key={file.name}
                            className={`sftp-file-item ${file.type}`}
                            onDoubleClick={() => handleNavigate(file)}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                setContextMenu({ x: e.clientX, y: e.clientY, file })
                            }}
                            draggable={file.type === 'file'}
                            onDragStart={(e) => {
                                const filePath = path === '.' ? file.name : `${path}/${file.name}`
                                e.dataTransfer.setData('application/dassh-sftp-item', JSON.stringify({
                                    sourceConnectionId: terminalId,
                                    filePath,
                                    fileName: file.name
                                }))
                                e.dataTransfer.effectAllowed = 'copy'
                            }}
                        >
                            <span className="file-icon">
                                {file.type === 'directory' ? '📁' : '📄'}
                            </span>
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{file.type === 'file' ? formatSize(file.size) : '--'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {transferring && (
                <div className="sftp-transfer-overlay">
                    <div className="sftp-transfer-spinner"></div>
                    <span>Transferring...</span>
                </div>
            )}

            {contextMenu && (
                <div
                    className="sftp-context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={() => setContextMenu(null)}
                >
                    <div className="menu-item" onClick={() => handleDownload(contextMenu.file)}>Download</div>
                    <div className="menu-item delete" onClick={() => handleDelete(contextMenu.file)}>Delete</div>
                </div>
            )}
        </div>
    )
}
