import React, { useState } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    onConnect: (config: any) => void
}

export function ConnectionModal({ isOpen, onClose, onConnect }: ModalProps) {
    const [host, setHost] = useState('localhost')
    const [port, setPort] = useState(22)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [privateKeyPath, setPrivateKeyPath] = useState('')
    const [loading, setLoading] = useState(false)
    const submittedRef = React.useRef(false)

    const handleSelectFile = async () => {
        const path = await window.ipcRenderer.selectFile()
        if (path) setPrivateKeyPath(path)
    }

    if (!isOpen) {
        // Reset ref when modal is closed/reopened
        if (submittedRef.current) submittedRef.current = false
        return null
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (submittedRef.current) return
        submittedRef.current = true
        setLoading(true)
        onConnect({ host, port, username, password, privateKeyPath })
        setLoading(false)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className="modal-title">New Connection</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="host" className="form-label">Host</label>
                        <input
                            id="host"
                            type="text"
                            className="form-input"
                            value={host}
                            onChange={e => setHost(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="port" className="form-label">Port</label>
                        <input
                            id="port"
                            type="number"
                            className="form-input"
                            value={port}
                            onChange={e => setPort(Number(e.target.value))}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Private Key (Optional)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="form-input"
                                value={privateKeyPath}
                                readOnly
                                placeholder="Select private key file..."
                            />
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleSelectFile}
                            >
                                Browse
                            </button>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            Connect
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
