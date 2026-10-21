import { Component, type ReactNode } from "react"

/**
 * Keeps one broken page from blanking the whole app: the tab bar stays, the page says what happened, and opening
 * another tab (a new `resetKey`) tries again. Reloading also picks up a freshly published version of the site.
 */
export class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean; msg: string }> {
  state = { failed: false, msg: "" }
  static getDerivedStateFromError(e: Error) { return { failed: true, msg: String(e?.message ?? e) } }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false, msg: "" })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-6">
        <p className="font-display text-xl font-bold">This page didn't load</p>
        <p className="text-muted-foreground">It usually means the site was just updated. Reloading fixes it.</p>
        <p className="text-xs text-muted-foreground">{this.state.msg}</p>
        <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
