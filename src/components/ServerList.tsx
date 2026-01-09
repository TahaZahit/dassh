import React, { useState } from 'react'

export interface ServerItem {
    id: string
    name: string
    host: string
    port: number
    username: string
    password?: string
    privateKeyPath?: string
    groups: string[] // List of group names this server belongs to
}

export interface ServerGroup {
    id: string
    name: string
    servers: ServerItem[]
}

interface ServerListProps {
    groups: ServerGroup[]
    activeConnectionIds: string[]
    onConnect: (server: ServerItem) => void
    onConnectGroup: (group: ServerGroup) => void
    onAddServer: (groupId: string) => void
    onManageServers: () => void
}

export function ServerList({ groups, activeConnectionIds, onConnect, onConnectGroup, onAddServer, onManageServers }: ServerListProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groups.map(g => g.id)))

    // Auto-expand any new groups that appear
    React.useEffect(() => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            let changed = false
            groups.forEach(g => {
                if (!next.has(g.id)) {
                    next.add(g.id)
                    changed = true
                }
            })
            return changed ? next : prev
        })
    }, [groups])

    const toggleGroup = (groupId: string) => {
        const newExpanded = new Set(expandedGroups)
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId)
        } else {
            newExpanded.add(groupId)
        }
        setExpandedGroups(newExpanded)
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <span>EXPLORER</span>
                <button
                    onClick={() => onAddServer('root')}
                    className="btn-icon"
                    title="New Connection"
                >
                    +
                </button>
            </div>

            <div className="sidebar-scroll">
                {groups.map(group => (
                    <div key={group.id} className="group-item">
                        {/* ... existing group item code ... */}
                        <div
                            className="group-header"
                            onClick={() => toggleGroup(group.id)}
                        >
                            <span
                                className="group-icon"
                                style={{ transform: expandedGroups.has(group.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                                ▶
                            </span>
                            <span style={{ flex: 1 }}>{group.name}</span>
                            <div className="group-actions">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onConnectGroup(group)
                                    }}
                                    className="btn-icon"
                                    style={{ padding: '0 4px', fontSize: '12px', color: 'var(--accent-primary)' }}
                                    title="Connect All"
                                >
                                    ▶
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAddServer(group.id)
                                    }}
                                    className="btn-icon"
                                    style={{ padding: '0 4px', fontSize: '10px' }}
                                    title="Add Server"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {expandedGroups.has(group.id) && (
                            <div>
                                {group.servers.map(server => {
                                    const isActive = activeConnectionIds.includes(server.id)

                                    return (
                                        <div
                                            key={server.id}
                                            className={`server-item ${isActive ? 'active' : ''}`}
                                            onClick={() => onConnect(server)}
                                        >
                                            <span className="server-icon">&gt;_</span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {server.name || server.host}
                                            </span>
                                        </div>
                                    )
                                })}
                                {group.servers.length === 0 && (
                                    <div style={{ padding: '4px 0 4px 32px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                                        Empty group
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                <button
                    className="btn-sidebar-nav"
                    onClick={onManageServers}
                >
                    <span style={{ marginRight: '8px' }}>⚙</span>
                    Manage Servers
                </button>
            </div>
        </div>
    )
}
