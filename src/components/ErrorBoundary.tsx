import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * Catches errors thrown by lazy-loaded route chunks (network failures, stale
 * chunk hashes after deploy) and all other render errors. Provides a recovery
 * path instead of a blank white screen.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      /Loading chunk \d+ failed/.test(error.message) ||
      /Failed to fetch dynamically imported module/.test(error.message);
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    // Hard reload clears the module cache and fetches fresh chunks
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, isChunkError: false });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {this.state.isChunkError ? "Page failed to load" : "Something went wrong"}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {this.state.isChunkError
            ? "A required file could not be fetched. This usually resolves with a reload."
            : "An unexpected error occurred. Try reloading or go back to the home page."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.handleReload}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reload page
          </button>
          <button
            onClick={this.handleGoHome}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
