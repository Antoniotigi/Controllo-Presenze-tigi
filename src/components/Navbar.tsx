import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  ChevronDown,
  LogOut,
  RotateCcw,
  Eraser,
} from 'lucide-react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update clock every second, formatted as HH:MM to match the image
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 h-[72px] flex items-center shadow-xs">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        {/* Left Section: Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div 
            id="app-logo-badge"
            className="w-8 h-8 rounded-lg bg-[#00A77B] flex items-center justify-center text-white font-extrabold text-lg select-none"
          >
            T
          </div>
          <span className="text-xl font-bold text-[#101B32] tracking-tight">
            TigiBadge
          </span>
        </div>

        {/* Center Section: Navigation Links */}
        <nav className="flex items-center h-full space-x-8">
          <button
            id="nav-presenze"
            onClick={() => setActiveView('cards')}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'cards' ? 'text-[#00A77B]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Presenze</span>
            {activeView === 'cards' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A77B] rounded-t-full" />
            )}
          </button>

          <button
            id="nav-leaves"
            onClick={() => {
              onOpenLeaves();
              setActiveView('leaves');
            }}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'leaves' ? 'text-[#00A77B]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Ferie e permessi</span>
            {activeView === 'leaves' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A77B] rounded-t-full" />
            )}
          </button>

          <button
            id="nav-report"
            onClick={() => {
              onOpenReport();
              setActiveView('report');
            }}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'report' ? 'text-[#00A77B]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Report</span>
            {activeView === 'report' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A77B] rounded-t-full" />
            )}
          </button>
        </nav>

        {/* Right Section: Sync, Time, Profile */}
        <div className="flex items-center gap-5">
          {/* Real-time Cloud Sync state */}
          <div
            id="cloud-sync-badge"
            className="flex items-center gap-2 text-xs font-semibold text-[#64748B] select-none"
            title={
              isCloudConnected
                ? 'Sincronizzazione cloud attiva: dati in tempo reale'
                : 'Connessione al database cloud...'
            }
          >
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-[#00A77B]' : 'bg-amber-500 animate-pulse'}`} />
            <span>{isCloudConnected ? 'Sincronizzato' : 'Connessione...'}</span>
          </div>

          {/* Clock: HH:MM format */}
          <div className="text-sm font-mono font-semibold text-[#101B32] select-none">
            {systemTime || '--:--'}
          </div>

          {/* User Profile menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-menu-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 hover:opacity-85 transition-opacity cursor-pointer focus:outline-hidden"
            >
              <div className="w-8 h-8 rounded-full bg-[#E2E8F0] border border-slate-300 flex items-center justify-center text-xs font-bold text-[#101B32]">
                TG
              </div>
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E2E8F0] rounded-2xl shadow-lg py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-[#E2E8F0] mb-1">
                  <p className="font-bold text-[#101B32]">Amministratore</p>
                  <p className="text-[10px] text-[#64748B] truncate">TigiBadge System</p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onResetData();
                  }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-[#F4F7FA] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ripristina dati demo</span>
                </button>

                {onClearAll && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onClearAll();
                    }}
                    className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5 text-rose-500" />
                    <span>Svuota cartellini</span>
                  </button>
                )}

                <div className="border-t border-[#E2E8F0] my-1" />

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-[#101B32] hover:bg-[#F4F7FA] font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Esci</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
