import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Ловит падения React-дерева и показывает fallback вместо белого экрана. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ArmorStrike]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#04060b] px-6 text-center text-white">
        <AlertTriangle size={40} className="text-amber-400" />
        <h1 className="font-display text-2xl tracking-wider text-amber-300">СБОЙ ПРИЛОЖЕНИЯ</h1>
        <p className="max-w-md text-sm text-white/60">
          {this.state.error.message || 'Неизвестная ошибка'}
        </p>
        <button
          type="button"
          className="btn-game btn-primary px-8 py-3 text-sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCcw size={16} className="bicon" />
          <span>ПЕРЕЗАГРУЗИТЬ</span>
        </button>
      </div>
    );
  }
}
