import React, { useState } from 'react';
import { ShieldAlert, X, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ClearAllConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

const REQUIRED_PASSWORD = 'tigicongress';

export const ClearAllConfirmModal: React.FC<ClearAllConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== REQUIRED_PASSWORD) {
      setError('Password di sicurezza errata. Inserisci la password corretta per procedere.');
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm();
      setPassword('');
      setError(null);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Si è verificato un errore durante lo svuotamento degli orari. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div
      id="clear-all-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        id="clear-all-modal-card"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Svuota Orari Cartellini
              </h3>
              <p className="text-xs text-slate-500">
                Richiesta autorizzazione di sicurezza
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-xs text-rose-900 leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              Operazione protetta da password
            </p>
            Questa azione cancellerà tutti gli orari delle timbrature dei cartellini su tutti i dispositivi sincronizzati.
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="clear-password-input"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
            >
              Password di Sicurezza
            </label>
            <div className="relative">
              <input
                id="clear-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoFocus
                disabled={isLoading}
                placeholder="Inserisci password..."
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full bg-slate-50 border ${
                  error
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-slate-900'
                } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:border-transparent outline-none transition-all shadow-2xs font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-600 pt-1 flex items-center gap-1">
                {error}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              id="confirm-clear-all-button"
              disabled={isLoading || !password.trim()}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Svuotamento in corso...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Conferma e Svuota</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
