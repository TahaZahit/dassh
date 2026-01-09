import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App Component', () => {
    it('renders initial empty state', () => {
        render(<App />)
        expect(screen.getByText('No active connections')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /new connection/i })).toBeInTheDocument()
    })

    it('opens connection modal when New Connection button is clicked', () => {
        render(<App />)
        fireEvent.click(screen.getByRole('button', { name: /new connection/i }))
        expect(screen.getByRole('heading', { name: 'New Connection' })).toBeInTheDocument()
    })

    it('adds a tab when connection is successful', async () => {
        render(<App />)

        // Open modal
        fireEvent.click(screen.getByRole('button', { name: /new connection/i }))

        // Fill form (assuming inputs exist in modal)
        fireEvent.change(screen.getByLabelText(/Host/i), { target: { value: 'example.com' } })
        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } })

        // Click connect
        const connectBtn = screen.getByRole('button', { name: /^connect$/i })
        fireEvent.click(connectBtn)

        // Wait for tab to appear
        await waitFor(() => {
            expect(screen.getByText('user@example.com')).toBeInTheDocument()
        })

        expect(window.ipcRenderer.connectSSH).toHaveBeenCalled()
    })
})
