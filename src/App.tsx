import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ServerList, type ServerGroup, type ServerItem } from './components/ServerList'
import { TerminalGrid, type ConnectedTerminal } from './components/TerminalGrid'
import { ConnectionModal } from './components/Modal'
import { ServerManager } from './components/ServerManager'
import logo from './assets/logo-black.png'
import './App.css'

function App() {
  // State for Servers
  const [servers, setServers] = useState<ServerItem[]>([])

  // Load servers on mount
  useEffect(() => {
    window.ipcRenderer.loadServers().then((loaded: ServerItem[]) => {
      setServers(loaded)
    })
  }, [])

  const handleUpdateServers = useCallback((newServers: ServerItem[] | ((prev: ServerItem[]) => ServerItem[])) => {
    setServers(prev => {
      const updated = typeof newServers === 'function' ? newServers(prev) : newServers
      window.ipcRenderer.saveServers(updated)
      return updated
    })
  }, [])


  // State for Terminals
  const [terminals, setTerminals] = useState<ConnectedTerminal[]>([])
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null)
  const connectingIdsRef = useRef<Set<string>>(new Set())

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [view, setView] = useState<'terminal' | 'manage'>('terminal')
  // const [targetGroupIdForNewServer, setTargetGroupIdForNewServer] = useState<string | null>(null)

  // Global Command Input State
  const [globalCommand, setGlobalCommand] = useState('')

  // Derive groups for Sidebar/UI
  const groups: ServerGroup[] = useMemo(() => {
    const groupMap: Record<string, ServerItem[]> = {}

    servers.forEach(server => {
      if (!server.groups || server.groups.length === 0) {
        if (!groupMap['Ungrouped']) groupMap['Ungrouped'] = []
        groupMap['Ungrouped'].push(server)
      } else {
        server.groups.forEach(groupName => {
          if (!groupMap[groupName]) groupMap[groupName] = []
          groupMap[groupName].push(server)
        })
      }
    })

    return Object.entries(groupMap).map(([name, items]) => ({
      id: name,
      name,
      servers: items
    }))
  }, [servers])

  // Handlers
  const handleConnect = async (config: any, serverId?: string) => {
    // Prevent duplicate connections if serverId is provided
    if (serverId && terminals.some(t => t.serverId === serverId)) {
      // Already connected, just activate it
      const existing = terminals.find(t => t.serverId === serverId)
      if (existing) {
        setActiveTerminalId(existing.id)
      }
      return
    }

    const id = uuidv4()
    // Determine title: use config alias or fallback to user@host
    const title = config.name || `${config.username}@${config.host}`

    let effectiveServerId = serverId
    if (!effectiveServerId) {
      // Create a persistent server item for this new connection
      effectiveServerId = uuidv4()
      const newServer: ServerItem = {
        id: effectiveServerId,
        name: title,
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKeyPath: config.privateKeyPath,
        groups: [] // Ungrouped by default
      }
      handleUpdateServers(prev => [...prev, newServer])
    }

    try {
      // Add to state IMMEDIATELY so component mounts and sets up listeners
      // but we wait for dimensions to connect
      setTerminals(prev => [...prev, { id, title, serverId: effectiveServerId, config, connected: false }])
      setActiveTerminalId(id)
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to connect:', err)
      // We don't necessarily need to alert here if we print errors to the terminal
    }
  }

  const handleConnectToServerItem = (server: ServerItem) => {
    // Pass server.id to track uniqueness
    handleConnect(server, server.id)
  }

  const handleCloseTerminal = (id: string) => {
    window.ipcRenderer.disconnectSSH(id)
    connectingIdsRef.current.delete(id)
    setTerminals(prev => {
      const newTerminals = prev.filter(t => t.id !== id)
      // If we closed the active one, activate the last one
      if (activeTerminalId === id) {
        setActiveTerminalId(newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null)
      }
      return newTerminals
    })
  }

  const handleInput = useCallback((data: string) => {
    if (activeTerminalId) {
      window.ipcRenderer.sendSSHInput(activeTerminalId, data)
    }
  }, [activeTerminalId])

  const handleGlobalCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!globalCommand.trim()) return

    // Broadcast to ALL connected terminals
    // Send command + newline
    const cmd = globalCommand + '\n'
    terminals.forEach(t => {
      window.ipcRenderer.sendSSHInput(t.id, cmd)
    })

    setGlobalCommand('')
  }

  // Group Management (Modified for server-first)

  const handleConnectGroup = (group: ServerGroup) => {
    group.servers.forEach(server => {
      handleConnectToServerItem(server)
    })
  }

  const handleAddServerToGroup = (_groupId: string) => {
    setIsModalOpen(true)
  }

  const handleTerminalSized = useCallback(async (id: string, rows: number, cols: number) => {
    // Atomic check using Ref to prevent multiple connection attempts before state settles
    if (connectingIdsRef.current.has(id)) return

    setTerminals(prev => {
      const term = prev.find(t => t.id === id)
      if (term && !term.connected && term.config) {
        connectingIdsRef.current.add(id)

        // Trigger connection in a separate microtask
        setTimeout(async () => {
          try {
            await window.ipcRenderer.connectSSH(id, term.config, { rows, cols })
          } catch (err) {
            console.error('Failed to connect after sizing:', err)
            connectingIdsRef.current.delete(id)
          }
        }, 0)
        return prev.map(t => t.id === id ? { ...t, connected: true } : t)
      }
      return prev
    })
  }, [])

  return (
    <div className={`app-container ${window.navigator.userAgent.includes('Mac') ? 'is-mac' : 'is-not-mac'}`}>
      {/* Header / Toolbar */}
      <header className="app-header draggable">
        <div className="header-left">
          <img
            src={logo}
            alt="DASSH"
            className="brand-logo-img"
            onClick={() => setView('terminal')}
            style={{ cursor: 'pointer' }}
          />
        </div>

        {/* Right side toolbar items if needed */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {activeTerminalId ? 'Terminal Active' : 'No Active Terminal'}
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="app-content">
        {/* Left Panel: Server List */}
        {view === 'terminal' && (
          <ServerList
            groups={groups}
            activeConnectionIds={terminals.map(t => t.serverId || '')} // Using serverId to highlight connected servers
            onConnect={handleConnectToServerItem}
            onConnectGroup={handleConnectGroup}
            onAddServer={handleAddServerToGroup}
            onManageServers={() => setView('manage')}
          />
        )}

        {view === 'manage' ? (
          <ServerManager
            servers={servers}
            onUpdateServers={handleUpdateServers}
            onClose={() => setView('terminal')}
          />
        ) : (
          /* Right Panel: Terminal Grid */
          <div className="main-panel">
            <TerminalGrid
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              onActivate={setActiveTerminalId}
              onInput={handleInput}
              onClose={handleCloseTerminal}
              onSized={handleTerminalSized}
            />

            {/* Global Command Bar */}
            <div className="global-command-bar">
              <form onSubmit={handleGlobalCommandSubmit} className="command-form">
                <span className="command-prompt">$</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder="Broadcast command to all terminals..."
                  value={globalCommand}
                  onChange={e => setGlobalCommand(e.target.value)}
                  onFocus={() => setActiveTerminalId(null)}
                />
                <button type="submit" className="btn-send">
                  Send All
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
      />
    </div>
  )
}


export default App
