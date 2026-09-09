import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Palmtree,
  CheckCircle2,
  RotateCcw,
  Users,
  Cloud,
  Eraser,
  LogOut,
} from 'lucide-react';
import { formatDateIT, getTodayDateString } from '../utils/timeUtils';

interface NavbarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenLeaves: () => void;
  onOpenReport: () => void;
  onSaveAll: () => void;
  onResetData: () => void;
  onClearAll?: () => void;
  activeView: 'cards' | 'report' | 'leaves';
  setActiveView: (view: 'cards' | 'report' | 'leaves') => void;
  isCloudConnected?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onDateChange,
  onOpenLeaves,
  onOpenReport,
  onSaveAll,
  onResetData,
  onClearAll,
  activeView,
  setActiveView,
  isCloudConnected = true,
  onLogout,
}) => {
  const [systemTime, setSystemTime] = useState<string>('');
  const [systemSeconds, setSystemSeconds] = useState<string>('');
  const today = getTodayDateString();
  const isToday = currentDate === today;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    onDateChange(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    onDateChange(`${y}-${m}-${day}`);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Sleek Interface Brand & Actions */}
        <div className="py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                TigiBadge
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                4 Dipendenti • 8h Std
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Gestione Presenze & Straordinari • Rilevazione Cartellino
            </p>
          </div>

          {/* Real-time System Clock & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-3 shadow-md shadow-slate-200 border border-slate-800">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Tempo Reale
                </span>
                <span className="font-mono text-sm font-bold tracking-wider text-emerald-300">
                  {systemTime || '--:--:--'}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenReport}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100 cursor-pointer"
              title="Apri il resoconto mensile ed esporta in PDF"
            >
              <FileText className="w-4 h-4" />
              <span>Resoconto Mensile</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Disconnetti sessione"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation & Action Controls */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Giorno precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDateChange(today)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isToday
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              Oggi
            </button>

            <div className="flex items-center gap-2 px-2">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Giorno successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-medium text-slate-500 hidden lg:block">
            {formatDateIT(currentDate)}
            {isToday && (
              <span className="ml-2 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider text-[10px]">
                In Servizio
              </span>
            )}
          </div>

          {/* View tabs and Save Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveView('cards')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>4 Dipendenti</span>
              </button>

              <button
                onClick={() => setActiveView('leaves')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'leaves'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                <span>Ferie & Permessi</span>
              </button>

              <button
                onClick={() => setActiveView('report')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'report'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riepilogo Mese</span>
              </button>
            </div>

            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isCloudConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
              }`}
              title={
                isCloudConnected
                  ? 'Database Cloud attivo: ogni timbratura è sincronizzata in tempo reale su tutti i dispositivi'
                  : 'Connessione al database cloud in corso...'
              }
            >
              <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isCloudConnected ? 'Cloud Sincronizzato' : 'Connessione Cloud...'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
