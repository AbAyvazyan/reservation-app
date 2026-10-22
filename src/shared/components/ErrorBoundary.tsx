import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'

type FallbackArgs = {
  error: Error
  reset: () => void
}

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: (args: FallbackArgs) => ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error === null) return children
    if (fallback) return fallback({ error, reset: this.reset })

    return (
      <Alert variant="error" title="Something went wrong">
        <p>{error.message || 'An unexpected error occurred.'}</p>
        <Button onClick={this.reset}>Try again</Button>
      </Alert>
    )
  }
}