import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  Search,
  Check,
} from 'lucide-react';
import { Employee, TimeRecord } from '../types';
import { getCurrentTimeHHMM, getRecordTimestamps } from '../utils/timeUtils';

interface KioskAttendanceViewProps {
  employees: Employee[];
  records: TimeRecord[];
  currentDate: string; // Guaranteed to be today
  onSaveRecord: (record: TimeRecord) => void;
  loggedInUsername?: string;
}

interface StampFeedback {
  employeeName: string;
  type: string;
  time: string;
  greeting: string;
}

export const KioskAttendanceView: React.FC<KioskAttendanceViewProps> = ({
  employees,
  records,
  currentDate,
  onSaveRecord,
}) => {
  // Live seconds clock
  const [liveTime, setLiveTime] = useState<string>('');
  const [liveDateFormatted, setLiveDateFormatted] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<StampFeedback | null>(null);
  const [feedbackCountdown, setFeedbackCountdown] = useState<number>(3);

  // Sound chime using Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio not permitted or supported, non-fatal
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setLiveDateFormatted(
        now.toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss countdown for stamp feedback
  useEffect(() => {
    if (!feedback) return;
    setFeedbackCountdown(3);
    const interval = setInterval(() => {
      setFeedbackCountdown((prev) => {
        if (prev <= 1) {
          setFeedback(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [feedback]);

  // Determine current active slot to stamp
  const getNextAction = (record?: TimeRecord) => {
    const times = getRecordTimestamps(record);
    if (!times.clockInMorning) {
      return {
        key: 'clockInMorning' as const,
        label: 'Timbra Entrata Mattina',
        shortLabel: 'Entrata Mattina',
        icon: LogIn,
        colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20',
        badge: 'Non ancora entrato',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        greeting: 'Buona giornata e buon lavoro!',
      };
    }
    if (!times.clockOutMorning) {
      return {
        key: 'clockOutMorning' as const,
        label: 'Timbra Pausa Pranzo',
        shortLabel: 'Pausa Pranzo',
        icon: Coffee,
        colorClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-600/20',
        badge: 'Al lavoro (Mattina)',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        greeting: 'Buona pausa pranzo!',
      };
    }
    if (!times.clockInAfternoon) {
      return {
        key: 'clockInAfternoon' as const,
        label: 'Timbra Rientro Pomeriggio',
        shortLabel: 'Rientro Pomeriggio',
        icon: LogIn,
        colorClass: 'bg-[#0b5cd5] hover:bg-blue-700 text-white shadow-blue-700/20',
        badge: 'In Pausa',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        greeting: 'Bentornato al lavoro!',
      };
    }
    if (!times.clockOutAfternoon) {
      return {
        key: 'clockOutAfternoon' as const,
        label: 'Timbra Uscita Fine Turno',
        shortLabel: 'Uscita Pomeriggio',
        icon: LogOut,
        colorClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-700/20',
        badge: 'Al lavoro (Pomeriggio)',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        greeting: 'Buona serata e buon riposo!',
      };
    }
    return {
      key: null,
      label: 'Turno Odierno Completato',
      shortLabel: 'Turno Completato',
      icon: CheckCircle2,
      colorClass: 'bg-slate-200 text-slate-600 cursor-default',
      badge: 'Turno Concluso',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      greeting: 'Turno già concluso per oggi.',
    };
  };

  const handleExecuteStamp = (employee: Employee) => {
    const currentRec = records.find(
      (r) => r.employeeId === employee.id && r.date === currentDate
    );
    const nextAction = getNextAction(currentRec);
    if (!nextAction.key) return;

    const currentTime = getCurrentTimeHHMM();
    const existingTimes = getRecordTimestamps(currentRec);

    const updatedRecord: TimeRecord = {
      id: currentRec?.id || `rec-${employee.id}-${currentDate}`,
      employeeId: employee.id,
      date: currentDate,
      clockInMorning:
        nextAction.key === 'clockInMorning' ? currentTime : existingTimes.clockInMorning,
      clockOutMorning:
        nextAction.key === 'clockOutMorning' ? currentTime : existingTimes.clockOutMorning,
      clockInAfternoon:
        nextAction.key === 'clockInAfternoon' ? currentTime : existingTimes.clockInAfternoon,
      clockOutAfternoon:
        nextAction.key === 'clockOutAfternoon' ? currentTime : existingTimes.clockOutAfternoon,
      clockIn:
        nextAction.key === 'clockInMorning' ? currentTime : currentRec?.clockIn || currentTime,
      clockOut:
        nextAction.key === 'clockOutAfternoon'
          ? currentTime
          : currentRec?.clockOut || existingTimes.clockOutMorning || currentTime,
      leaveType: currentRec?.leaveType || 'none',
      leaveHours: currentRec?.leaveHours || 0,
      notes: currentRec?.notes || '',
      updatedAt: new Date().toISOString(),
    };

    onSaveRecord(updatedRecord);
    playChime();

    setFeedback({
      employeeName: employee.name,
      type: nextAction.shortLabel,
      time: currentTime,
      greeting: nextAction.greeting,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const avatarThemes = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-sky-100 text-sky-700 border-sky-200',
  ];

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Kiosk Hero Tablet Banner */}
      <div className="bg-gradient-to-br from-[#101B32] via-[#1a2d52] to-[#101B32] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Heading and instructions */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Punto Timbrature Presenze
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Tocca il pulsante corrispondente al tuo nome per timbrare l'entrata o l'uscita in tempo reale.
            </p>
          </div>

          {/* Right: Real-time Digital Clock */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col items-center md:items-end justify-center min-w-[240px] text-center md:text-right shrink-0 shadow-inner">
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white flex items-center gap-2">
              <Clock className="w-7 h-7 text-[#38bdf8] animate-pulse" />
              <span>{liveTime || '--:--:--'}</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-200 capitalize mt-1">
              {liveDateFormatted || 'Oggi'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar for Tablet */}
      {employees.length > 3 && (
        <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca dipendente per nome..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#0b5cd5] transition-all"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancella filtro
            </button>
          )}
        </div>
      )}

      {/* Employee Cards Grid (Touch optimized for tablets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredEmployees.map((employee, idx) => {
          const record = records.find(
            (r) => r.employeeId === employee.id && r.date === currentDate
          );
          const times = getRecordTimestamps(record);
          const nextAction = getNextAction(record);
          const avatarTheme = avatarThemes[idx % avatarThemes.length];

          return (
            <div
              key={employee.id}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden"
            >
              {/* Employee Header */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-14 h-14 rounded-2xl font-black text-lg flex items-center justify-center border shadow-xs ${avatarTheme}`}
                    >
                      {getInitials(employee.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#101B32] tracking-tight">
                        {employee.name}
                      </h3>
                      <p className="text-xs text-[#64748B] font-medium">
                        {employee.role || 'Dipendente'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${nextAction.badgeColor}`}
                  >
                    {nextAction.badge}
                  </span>
                </div>

                {/* Today's 4 Punch Slots */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                  {/* Slot 1: Entrata Mattina */}
                  <div
                    className={`rounded-2xl p-2.5 border text-center transition-all ${
                      times.clockInMorning
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      1ª Entrata
                    </div>
                    <div
                      className={`text-base font-mono font-black mt-0.5 ${
                        times.clockInMorning ? 'text-emerald-700' : 'text-slate-300'
                      }`}
                    >
                      {times.clockInMorning || '—'}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">
                      Mattina
                    </div>
                  </div>

                  {/* Slot 2: Uscita Mattina (Pausa) */}
                  <div
                    className={`rounded-2xl p-2.5 border text-center transition-all ${
                      times.clockOutMorning
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      1ª Uscita
                    </div>
                    <div
                      className={`text-base font-mono font-black mt-0.5 ${
                        times.clockOutMorning ? 'text-amber-700' : 'text-slate-300'
                      }`}
                    >
                      {times.clockOutMorning || '—'}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">
                      Pausa pranzo
                    </div>
                  </div>

                  {/* Slot 3: Rientro Pomeriggio */}
                  <div
                    className={`rounded-2xl p-2.5 border text-center transition-all ${
                      times.clockInAfternoon
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      2ª Entrata
                    </div>
                    <div
                      className={`text-base font-mono font-black mt-0.5 ${
                        times.clockInAfternoon ? 'text-[#0b5cd5]' : 'text-slate-300'
                      }`}
                    >
                      {times.clockInAfternoon || '—'}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">
                      Rientro
                    </div>
                  </div>

                  {/* Slot 4: Uscita Fine Turno */}
                  <div
                    className={`rounded-2xl p-2.5 border text-center transition-all ${
                      times.clockOutAfternoon
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      2ª Uscita
                    </div>
                    <div
                      className={`text-base font-mono font-black mt-0.5 ${
                        times.clockOutAfternoon ? 'text-rose-700' : 'text-slate-300'
                      }`}
                    >
                      {times.clockOutAfternoon || '—'}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">
                      Fine turno
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t border-slate-100">
                {/* Big Primary Quick Stamp Action (Min 52px height for tablet finger tap) */}
                <button
                  type="button"
                  onClick={() => handleExecuteStamp(employee)}
                  disabled={!nextAction.key}
                  className={`w-full h-14 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] select-none ${
                    nextAction.key
                      ? `cursor-pointer ${nextAction.colorClass}`
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <nextAction.icon className="w-5 h-5" />
                  <span>{nextAction.label}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Stamp Confirmation Popup Overlay */}
      {feedback && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                Timbratura Registrata
              </span>
              <h2 className="text-2xl font-black text-[#101B32] pt-2">
                {feedback.employeeName}
              </h2>
              <p className="text-sm font-semibold text-[#0b5cd5]">
                {feedback.type} alle ore <span className="font-mono font-bold text-slate-900">{feedback.time}</span>
              </p>
            </div>

            <p className="text-sm text-slate-600 font-medium bg-slate-50 rounded-2xl p-3 border border-slate-100">
              {feedback.greeting}
            </p>

            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="w-full py-3.5 bg-[#101B32] hover:bg-[#1a2d52] text-white rounded-2xl font-bold text-sm transition-all shadow-sm cursor-pointer"
            >
              Fatto ({feedbackCountdown}s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
