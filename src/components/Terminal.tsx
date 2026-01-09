import { useEffect, useRef } from 'react'
import { Terminal as XTerminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

interface TerminalProps {
    id: string
    onInput: (data: string) => void
    onMount?: () => void
    onSized?: (rows: number, cols: number) => void
}

export function Terminal({ id, onInput, onMount, onSized }: TerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const hasSizedRef = useRef(false)
    const onSizedRef = useRef(onSized)

    // Keep ref in sync
    useEffect(() => {
        onSizedRef.current = onSized
    }, [onSized])

    useEffect(() => {
        if (!containerRef.current) return

        const term = new XTerminal({
            cursorBlink: true,
            fontSize: 13,
            lineHeight: 1.4,
            fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#09090b', // Matches --bg-app
                foreground: '#f4f4f5', // Matches --text-primary
                cursor: '#3b82f6', // Matches --accent-primary
                selectionBackground: 'rgba(59, 130, 246, 0.3)',
                black: '#27272a',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#f4f4f5',
                brightBlack: '#52525b',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff',
            },
        })

        // @ts-ignore: FitAddon types
        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        term.open(containerRef.current)

        // Initial fit with a small delay to allow React layout to settle
        const initialFit = setTimeout(() => {
            if (hasSizedRef.current) return
            fitAddon.fit()
            if (term.rows > 0 && term.cols > 0) {
                if (onSizedRef.current && !hasSizedRef.current) {
                    hasSizedRef.current = true
                    onSizedRef.current(term.rows, term.cols)
                } else {
                    window.ipcRenderer.resizeSSH(id, term.rows, term.cols)
                }
            }
        }, 100)

        // Use ResizeObserver for accurate layout-based resizing
        let resizeTimeout: any
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
                if (!containerRef.current) return
                fitAddon.fit()
                if (term.rows > 0 && term.cols > 0) {
                    window.ipcRenderer.resizeSSH(id, term.rows, term.cols)
                }
            }, 100) // Debounce to allow grid settling
        })

        resizeObserver.observe(containerRef.current)

        term.onData(data => {
            onInput(data)
        })

        // Listen for incoming data from Main process
        const cleanupData = window.ipcRenderer.onSSHData((_, { id: eventId, data }) => {
            if (eventId === id) {
                term.write(data)
            }
        })

        if (onMount) onMount()

        return () => {
            clearTimeout(initialFit)
            clearTimeout(resizeTimeout)
            resizeObserver.disconnect()
            cleanupData()
            term.dispose()
        }
    }, [id])

    return <div className="terminal-container" ref={containerRef} />
}
