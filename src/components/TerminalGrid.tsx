import { Terminal } from './Terminal'

export interface ConnectedTerminal {
    id: string
    title: string
    serverId?: string // To track unique server instances
    config?: any      // Store config to defer connection
    connected?: boolean // Track if backend connection started
}

interface TerminalGridProps {
    terminals: ConnectedTerminal[]
    activeTerminalId: string | null
    onActivate: (id: string) => void
    onInput: (data: string) => void
    onClose: (id: string) => void
    onSized: (id: string, rows: number, cols: number) => void
}

export function TerminalGrid({ terminals, activeTerminalId, onActivate, onInput, onClose, onSized }: TerminalGridProps) {
    // Basic CSS Grid layout logic
    return (
        <div className="terminal-grid-container"
            style={{
                gridTemplateColumns: terminals.length > 1 ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr',
                gridAutoRows: terminals.length > 1 ? 'minmax(300px, 1fr)' : '1fr'
            }}
        >
            {terminals.map(term => (
                <div
                    key={term.id}
                    className={`terminal-node ${activeTerminalId === term.id ? 'active' : ''}`}
                    onClick={() => onActivate(term.id)}
                >
                    {/* Header for identifying the terminal */}
                    <div
                        className={`terminal-header ${activeTerminalId === term.id ? 'active' : ''}`}
                        onAuxClick={(e) => {
                            if (e.button === 1) { // Middle click
                                e.preventDefault()
                                onClose(term.id)
                            }
                        }}
                    >
                        <span style={{ fontWeight: 500 }}>{term.title}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose(term.id)
                            }}
                            className="btn-icon btn-close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Terminal Content */}
                    <div className="terminal-content">
                        <Terminal
                            id={term.id}
                            onInput={(data) => {
                                onActivate(term.id) // Ensure we activate on input too
                                onInput(data)
                            }}
                            onSized={(rows, cols) => onSized(term.id, rows, cols)}
                        />
                    </div>
                </div>
            ))}

            {terminals.length === 0 && (
                <div className="empty-state-container">
                    <p className="empty-state-title">No active terminals</p>
                    <p className="empty-state-subtitle">Select a server from the explorer to connect</p>
                </div>
            )}
        </div>
    )
}
