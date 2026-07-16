import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface BootErrorProps {
  message: string;
  detail?: string;
}

/** Экран ошибки инициализации (WebGL / Game constructor). */
export default function BootError({ message, detail }: BootErrorProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#04060b] px-6 text-center text-white">
      <AlertTriangle size={40} className="text-red-400" />
      <h1 className="font-display text-2xl tracking-wider text-red-300">НЕ УДАЛОСЬ ЗАПУСТИТЬ</h1>
      <p className="max-w-md text-sm text-white/70">{message}</p>
      {detail && (
        <pre className="max-w-lg overflow-auto rounded border border-white/10 bg-black/50 p-3 text-left text-[11px] text-white/40">
          {detail}
        </pre>
      )}
      <p className="max-w-md text-xs text-white/40">
        Нужен современный браузер с поддержкой WebGL. Обновите GPU-драйверы или попробуйте Chrome / Edge / Firefox.
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
