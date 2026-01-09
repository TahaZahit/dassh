import React, { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ServerItem } from './ServerList'

interface ServerManagerProps {
    servers: ServerItem[]
    onUpdateServers: (servers: ServerItem[]) => void
    onClose: () => void
}

export const ServerManager: React.FC<ServerManagerProps> = ({ servers, onUpdateServers, onClose }) => {
    const [editingServerId, setEditingServerId] = useState<string | null>(null)

    // Derived list of all unique group names across all servers
    const allGroups = useMemo(() => {
        const groups = new Set<string>()
        servers.forEach(s => s.groups?.forEach(g => groups.add(g)))
        return Array.from(groups).sort()
    }, [servers])

    // Form States
    const [serverForm, setServerForm] = useState<Partial<ServerItem>>({
        name: '',
        host: '',
        port: 22,
        username: 'root',
        password: '',
        groups: []
    })
    const [newGroupInput, setNewGroupInput] = useState('')

    const handleSelectFile = async () => {
        const path = await window.ipcRenderer.selectFile()
        if (path) setServerForm({ ...serverForm, privateKeyPath: path })
    }

    const handleSaveServer = (e: React.FormEvent) => {
        e.preventDefault()
        if (!serverForm.name || !serverForm.host) return

        if (editingServerId) {
            // Update existing
            const updated = servers.map(s => {
                if (s.id === editingServerId) {
                    return { ...s, ...serverForm } as ServerItem
                }
                return s
            })
            onUpdateServers(updated)
            setEditingServerId(null)
        } else {
            // Add new
            const newServer: ServerItem = {
                id: uuidv4(),
                name: serverForm.name!,
                host: serverForm.host!,
                port: serverForm.port || 22,
                username: serverForm.username || 'root',
                password: serverForm.password,
                groups: serverForm.groups || []
            }
            onUpdateServers([...servers, newServer])
        }

        // Reset form
        setServerForm({ name: '', host: '', port: 22, username: 'root', password: '', groups: [] })
    }

    const handleDeleteServer = (id: string) => {
        if (confirm('Are you sure you want to delete this server?')) {
            onUpdateServers(servers.filter(s => s.id !== id))
        }
    }

    const toggleGroupForServer = (serverId: string, groupName: string) => {
        const updated = servers.map(s => {
            if (s.id === serverId) {
                const groups = s.groups.includes(groupName)
                    ? s.groups.filter(g => g !== groupName)
                    : [...s.groups, groupName]
                return { ...s, groups }
            }
            return s
        })
        onUpdateServers(updated)
    }

    const addNewGroupToForm = () => {
        if (!newGroupInput.trim()) return
        const currentGroups = serverForm.groups || []
        if (!currentGroups.includes(newGroupInput)) {
            setServerForm({ ...serverForm, groups: [...currentGroups, newGroupInput] })
        }
        setNewGroupInput('')
    }

    const startEditing = (server: ServerItem) => {
        setEditingServerId(server.id)
        setServerForm(server)
    }

    return (
        <div className="server-manager">
            <div className="manager-header">
                <h2>Server Management</h2>
                <button className="btn-close-manager" onClick={onClose}>Close</button>
            </div>

            <div className="manager-content">
                <div className="manager-grid">
                    {/* Left Column: Add/Edit Form */}
                    <div className="manager-section card">
                        <h3>{editingServerId ? 'Edit Server' : 'Add New Server'}</h3>
                        <form onSubmit={handleSaveServer} className="server-form-main">
                            <div className="form-group">
                                <label className="form-label">Display Name</label>
                                <input
                                    className="form-input"
                                    value={serverForm.name}
                                    onChange={e => setServerForm({ ...serverForm, name: e.target.value })}
                                    placeholder="e.g. Production DB"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 3 }}>
                                    <label className="form-label">Host / IP</label>
                                    <input
                                        className="form-input"
                                        value={serverForm.host}
                                        onChange={e => setServerForm({ ...serverForm, host: e.target.value })}
                                        placeholder="127.0.0.1"
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Port</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={serverForm.port}
                                        onChange={e => setServerForm({ ...serverForm, port: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Username</label>
                                    <input
                                        className="form-input"
                                        value={serverForm.username}
                                        onChange={e => setServerForm({ ...serverForm, username: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={serverForm.password}
                                        onChange={e => setServerForm({ ...serverForm, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Private Key (Optional)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        className="form-input"
                                        value={serverForm.privateKeyPath || ''}
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

                            <div className="form-group">
                                <label className="form-label">Assigned Groups</label>
                                <div className="group-tags-input">
                                    {serverForm.groups?.map(g => (
                                        <span key={g} className="group-tag">
                                            {g}
                                            <button type="button" onClick={() => setServerForm({ ...serverForm, groups: serverForm.groups?.filter(name => name !== g) })}>&times;</button>
                                        </span>
                                    ))}
                                </div>
                                <div className="inline-add">
                                    <input
                                        className="form-input-sm"
                                        value={newGroupInput}
                                        onChange={e => setNewGroupInput(e.target.value)}
                                        placeholder="New group..."
                                    />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addNewGroupToForm}>Add</button>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">{editingServerId ? 'Update' : 'Create'}</button>
                                {editingServerId && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setEditingServerId(null)
                                            setServerForm({ name: '', host: '', port: 22, username: 'root', password: '', groups: [] })
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Servers List */}
                    <div className="manager-section">
                        <h3>All Servers ({servers.length})</h3>
                        <div className="server-cards-list">
                            {servers.map(server => (
                                <div key={server.id} className="server-mgmt-card">
                                    <div className="mgmt-card-header">
                                        <div>
                                            <div className="mgmt-name">{server.name}</div>
                                            <div className="mgmt-host">{server.username}@{server.host}:{server.port}</div>
                                        </div>
                                        <div className="mgmt-actions">
                                            <button className="btn-icon" onClick={() => startEditing(server)} title="Edit">✎</button>
                                            <button className="btn-icon btn-close" onClick={() => handleDeleteServer(server.id)} title="Delete">&times;</button>
                                        </div>
                                    </div>
                                    <div className="mgmt-groups">
                                        {allGroups.map(groupName => (
                                            <label key={groupName} className="mgmt-group-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={server.groups?.includes(groupName)}
                                                    onChange={() => toggleGroupForServer(server.id, groupName)}
                                                />
                                                {groupName}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
