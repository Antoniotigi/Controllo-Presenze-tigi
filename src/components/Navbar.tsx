import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  ChevronDown,
  LogOut,
  Eraser,
  Menu,
  X,
  Users,
  Palmtree,
  FileSpreadsheet,
} from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenLeaves: () => void;
  onOpenReport: () => void;
  onSaveAll: () => void;
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
  onClearAll,
  activeView,
  setActiveView,
  isCloudConnected = true,
  onLogout,
}) => {
  const [systemTime, setSystemTime] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown and mobile menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('#mobile-menu-toggle')
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 h-[72px] flex items-center shadow-xs relative">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        {/* Left Section: Logo & Name */}
        <Logo showText={true} size={32} />

        {/* Center Section: Navigation Links (Desktop Only) */}
        <nav className="hidden md:flex items-center h-full space-x-8">
          <button
            id="nav-presenze"
            onClick={() => setActiveView('cards')}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'cards' ? 'text-[#0b5cd5]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Presenze</span>
            {activeView === 'cards' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0b5cd5] rounded-t-full" />
            )}
          </button>

          <button
            id="nav-leaves"
            onClick={() => {
              onOpenLeaves();
              setActiveView('leaves');
            }}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'leaves' ? 'text-[#0b5cd5]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Ferie e permessi</span>
            {activeView === 'leaves' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0b5cd5] rounded-t-full" />
            )}
          </button>

          <button
            id="nav-report"
            onClick={() => {
              onOpenReport();
              setActiveView('report');
            }}
            className={`relative flex items-center justify-center h-[72px] px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeView === 'report' ? 'text-[#0b5cd5]' : 'text-[#64748B] hover:text-[#101B32]'
            }`}
          >
            <span>Report</span>
            {activeView === 'report' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0b5cd5] rounded-t-full" />
            )}
          </button>
        </nav>

        {/* Right Section: Sync, Time, Profile (Desktop Only) */}
        <div className="hidden md:flex items-center gap-5">
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
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-[#0b5cd5]' : 'bg-amber-500 animate-pulse'}`} />
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
                  <p className="text-[10px] text-[#64748B] truncate">TIGi Presenze System</p>
                </div>

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

        {/* Mobile Section: Sync, Clock & Hamburger (Mobile Only) */}
        <div className="flex md:hidden items-center gap-3">
          {/* Mini Sync dot with pulse */}
          <div 
            className={`w-2.5 h-2.5 rounded-full ${isCloudConnected ? 'bg-[#0b5cd5]' : 'bg-amber-500 animate-pulse'}`}
            title={isCloudConnected ? 'Sincronizzato' : 'Connessione in corso...'}
          />
          
          {/* Compact Clock */}
          <div className="text-xs font-mono font-bold text-[#101B32] bg-[#F4F7FA] border border-[#E2E8F0] px-2 py-1 rounded-md select-none">
            {systemTime || '--:--'}
          </div>

          {/* Hamburger button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-1.5 text-[#64748B] hover:text-[#101B32] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus:outline-hidden"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 animate-in spin-in-180 duration-200" />
            ) : (
              <Menu className="w-6 h-6 animate-in fade-in duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer (Full-width, slide-down overlay) */}
      {isMobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="absolute top-[72px] left-0 right-0 w-full bg-white border-b border-[#E2E8F0] shadow-xl py-4 px-4 z-40 md:hidden flex flex-col space-y-3 animate-in slide-in-from-top-4 duration-200 ease-out"
        >
          {/* Section: Menu Title */}
          <div className="px-2 pb-1 border-b border-slate-100">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Navigazione Sezioni
            </span>
          </div>

          {/* Section: Links */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => {
                setActiveView('cards');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-sm cursor-pointer ${
                activeView === 'cards'
                  ? 'bg-[#e6f0fa] text-[#0b5cd5]'
                  : 'text-[#64748B] hover:bg-[#F4F7FA] hover:text-[#101B32]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>Presenze</span>
              </div>
              {activeView === 'cards' && <span className="w-2 h-2 rounded-full bg-[#0b5cd5]" />}
            </button>

            <button
              onClick={() => {
                onOpenLeaves();
                setActiveView('leaves');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-sm cursor-pointer ${
                activeView === 'leaves'
                  ? 'bg-[#e6f0fa] text-[#0b5cd5]'
                  : 'text-[#64748B] hover:bg-[#F4F7FA] hover:text-[#101B32]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Palmtree className="w-5 h-5" />
                <span>Ferie e permessi</span>
              </div>
              {activeView === 'leaves' && <span className="w-2 h-2 rounded-full bg-[#0b5cd5]" />}
            </button>

            <button
              onClick={() => {
                onOpenReport();
                setActiveView('report');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-sm cursor-pointer ${
                activeView === 'report'
                  ? 'bg-[#e6f0fa] text-[#0b5cd5]'
                  : 'text-[#64748B] hover:bg-[#F4F7FA] hover:text-[#101B32]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#16a34a]" />
                <span>Report</span>
              </div>
              {activeView === 'report' && <span className="w-2 h-2 rounded-full bg-[#0b5cd5]" />}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E2E8F0] my-1" />

          {/* Section: Admin Actions */}
          <div className="px-2 py-1">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 select-none">
              Azioni Amministratore
            </p>
            
            <div className="flex flex-col space-y-1">
              {onClearAll && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onClearAll();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Eraser className="w-4 h-4 text-rose-500" />
                  <span>Svuota cartellini</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-bold text-[#101B32] hover:bg-[#F4F7FA] transition-colors cursor-pointer border-t border-slate-100 mt-2 pt-2.5"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Esci (Disconnetti)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
