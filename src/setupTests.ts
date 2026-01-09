import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron IPC
window.ipcRenderer = {
    connectSSH: vi.fn(),
    disconnectSSH: vi.fn(),
    sendSSHInput: vi.fn(),
    onSSHData: vi.fn(() => vi.fn()), // Returns cleanup function
    resizeSSH: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeListener: vi.fn()
} as any

// Mock xterm
vi.mock('xterm', () => {
    return {
        Terminal: class {
            open = vi.fn()
            loadAddon = vi.fn()
            write = vi.fn()
            dispose = vi.fn()
            onData = vi.fn()
            rows = 24
            cols = 80
        }
    }
})

// Mock xterm-addon-fit
vi.mock('xterm-addon-fit', () => {
    return {
        FitAddon: class {
            fit = vi.fn()
        }
    }
})
