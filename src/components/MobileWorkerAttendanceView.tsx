import React, { useState, useEffect, useMemo } from 'react';
import {
  Sun,
  Sunset,
  Coffee,
  Moon,
  Clock,
  LogIn,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Palmtree,
  FileSpreadsheet,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Employee, TimeRecord, DayCalculation } from '../types';
import {
  calculateRecord,
  getCurrentTimeHHMM,
  getStandardMinutesForDay,
  formatMinutesToHM,
  getRecordTimestamps,
  formatDateIT,
  formatMonthIT,
  timeToMinutes,
  getMinutesBetweenTimes,
  isAfternoonShiftOvernight,
} from '../utils/timeUtils';
import { Logo } from './Logo';

interface MobileWorkerAttendanceViewProps {
  employee: Employee;
  record?: TimeRecord;
  records?: TimeRecord[];
  currentDate: string;
  isToday: boolean;
  systemTimeHHMM: string;
  todayDateStr: string;
  onSave: (record: TimeRecord) => void;
  onDateChange: (date: string) => void;
  onOpenLeaves: () => void;
  onOpenReport: () => void;
  onLogout?: () => void;
  isCloudConnected?: boolean;
  loggedInUsername?: string;
  yesterdayShiftPending?: { emp: Employee; rec: TimeRecord } | null;
}

export const MobileWorkerAttendanceView: React.FC<MobileWorkerAttendanceViewProps> = ({
  employee,
  record,
  records = [],
  currentDate,
  isToday,
  systemTimeHHMM,
  todayDateStr,
  onSave,
  onDateChange,
  onOpenLeaves,
  onOpenReport,
  onLogout,
  isCloudConnected = true,
  loggedInUsername = '',
  yesterdayShiftPending,
}) => {
  const initialTimes = getRecordTimestamps(record);

  // Form states
  const [clockInMorning, setClockInMorning] = useState<string>(initialTimes.clockInMorning);
  const [clockOutMorning, setClockOutMorning] = useState<string>(initialTimes.clockOutMorning);
  const [clockInAfternoon, setClockInAfternoon] = useState<string>(initialTimes.clockInAfternoon);
  const [clockOutAfternoon, setClockOutAfternoon] = useState<string>(initialTimes.clockOutAfternoon);
  const [clockOutAfternoonNextDay, setClockOutAfternoonNextDay] = useState<boolean>(
    Boolean(initialTimes.clockOutAfternoonNextDay)
  );

  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [leaveType, setLeaveType] = useState<TimeRecord['leaveType']>(record?.leaveType || 'none');
  const [leaveHours, setLeaveHours] = useState<number>(record?.leaveHours || 0);

  const initialPermessoH =
    record?.permessoHours !== undefined
      ? record.permessoHours
      : record?.leaveType === 'permesso' && record.leaveHours
      ? Math.floor(record.leaveHours)
      : 0;

  const initialPermessoM =
    record?.permessoMinutes !== undefined
      ? record.permessoMinutes
      : record?.leaveType === 'permesso' && record.leaveHours
      ? Math.round((record.leaveHours % 1) * 60)
      : 0;

  const [permessoHours, setPermessoHours] = useState<number>(initialPermessoH);
  const [permessoMinutes, setPermessoMinutes] = useState<number>(initialPermessoM);
  const [permessoStart, setPermessoStart] = useState<string>(record?.permessoStart || '');
  const [permessoEnd, setPermessoEnd] = useState<string>(record?.permessoEnd || '');
  const [exitDuringTurnStart, setExitDuringTurnStart] = useState<string>(record?.exitDuringTurnStart || '');
  const [exitDuringTurnEnd, setExitDuringTurnEnd] = useState<string>(record?.exitDuringTurnEnd || '');
  const [overtimeAuthorized, setOvertimeAuthorized] = useState<boolean>(Boolean(record?.overtimeAuthorized));
  const [overtimeEventName, setOvertimeEventName] = useState<string>(record?.overtimeEventName || '');

  // UI state for bottom sheets
  const [activeSheet, setActiveSheet] = useState<
    'none' | 'permesso' | 'uscita' | 'overtime' | 'notes' | 'info' | 'datePicker'
  >('none');
  const [feedbackToast, setFeedbackToast] = useState<string>('');

  // Sync state whenever record or date changes
  useEffect(() => {
    const times = getRecordTimestamps(record);
    setClockInMorning(times.clockInMorning);
    setClockOutMorning(times.clockOutMorning);
    setClockInAfternoon(times.clockInAfternoon);
    setClockOutAfternoon(times.clockOutAfternoon);
    setClockOutAfternoonNextDay(Boolean(times.clockOutAfternoonNextDay));

    setNotes(record?.notes || '');
    setLeaveType(record?.leaveType || 'none');
    setOvertimeAuthorized(Boolean(record?.overtimeAuthorized));
    setOvertimeEventName(record?.overtimeEventName || '');
    setPermessoStart(record?.permessoStart || '');
    setPermessoEnd(record?.permessoEnd || '');
    setExitDuringTurnStart(record?.exitDuringTurnStart || '');
    setExitDuringTurnEnd(record?.exitDuringTurnEnd || '');

    const pH =
      record?.permessoHours !== undefined
        ? record.permessoHours
        : record?.leaveType === 'permesso' && record?.leaveHours
        ? Math.floor(record.leaveHours)
        : 0;
    const pM =
      record?.permessoMinutes !== undefined
        ? record.permessoMinutes
        : record?.leaveType === 'permesso' && record?.leaveHours
        ? Math.round((record.leaveHours % 1) * 60)
        : 0;
    setPermessoHours(pH);
    setPermessoMinutes(pM);
    setLeaveHours(record?.leaveHours || 0);
  }, [record?.id, currentDate]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(''), 2500);
  };

  // Build working record and calculate
  const currentWorkingRecord: TimeRecord = {
    id: record?.id || `rec-${employee.id}-${currentDate}`,
    employeeId: employee.id,
    date: currentDate,
    clockInMorning,
    clockOutMorning,
    clockInAfternoon,
    clockOutAfternoon,
    clockOutAfternoonNextDay,
    clockIn: clockInMorning,
    clockOut: clockOutAfternoon || clockOutMorning,
    notes,
    leaveType,
    leaveHours,
    permessoHours,
    permessoMinutes,
    permessoStart,
    permessoEnd,
    exitDuringTurnStart,
    exitDuringTurnEnd,
    overtimeAuthorized,
    overtimeEventName,
    updatedAt: new Date().toISOString(),
  };

  const calculation: DayCalculation = calculateRecord(
    currentWorkingRecord,
    systemTimeHHMM,
    isToday,
    employee
  );

  const standardMinutesToday = getStandardMinutesForDay(currentDate, employee);
  const progressPct =
    standardMinutesToday > 0
      ? Math.min(100, Math.round((calculation.minutesWorked / standardMinutesToday) * 100))
      : calculation.minutesWorked > 0
      ? 100
      : 0;
  const minutesLeft = standardMinutesToday - calculation.minutesWorked;

  const stampedRecord: TimeRecord = {
    ...currentWorkingRecord,
    leaveType: 'none',
    leaveHours: 0,
    permessoHours: 0,
    permessoMinutes: 0,
    permessoStart: '',
    permessoEnd: '',
    exitDuringTurnStart: '',
    exitDuringTurnEnd: '',
  };
  const stampedCalc = calculateRecord(stampedRecord, systemTimeHHMM, isToday, employee);
  const pureAttendanceMinutes = stampedCalc.minutesWorked;
  const rawDailyBalanceMinutes = pureAttendanceMinutes - standardMinutesToday;
  const missingMinutes = Math.max(0, -rawDailyBalanceMinutes);

  // Persistence helper
  const persistChanges = (partial: Partial<TimeRecord>, successMsg?: string) => {
    const nextInMorning = partial.clockInMorning !== undefined ? partial.clockInMorning : clockInMorning;
    const nextOutMorning = partial.clockOutMorning !== undefined ? partial.clockOutMorning : clockOutMorning;
    const nextInAfternoon = partial.clockInAfternoon !== undefined ? partial.clockInAfternoon : clockInAfternoon;
    const nextOutAfternoon = partial.clockOutAfternoon !== undefined ? partial.clockOutAfternoon : clockOutAfternoon;
    const nextOutAfternoonNextDay =
      partial.clockOutAfternoonNextDay !== undefined ? partial.clockOutAfternoonNextDay : clockOutAfternoonNextDay;
    const nextNotes = partial.notes !== undefined ? partial.notes : notes;
    const nextLeaveType = partial.leaveType !== undefined ? partial.leaveType : leaveType;
    const nextLeaveHours = partial.leaveHours !== undefined ? partial.leaveHours : leaveHours;
    const nextPermessoHours = partial.permessoHours !== undefined ? partial.permessoHours : permessoHours;
    const nextPermessoMinutes = partial.permessoMinutes !== undefined ? partial.permessoMinutes : permessoMinutes;
    const nextPermessoStart = partial.permessoStart !== undefined ? partial.permessoStart : permessoStart;
    const nextPermessoEnd = partial.permessoEnd !== undefined ? partial.permessoEnd : permessoEnd;
    const nextExitDuringTurnStart =
      partial.exitDuringTurnStart !== undefined ? partial.exitDuringTurnStart : exitDuringTurnStart;
    const nextExitDuringTurnEnd =
      partial.exitDuringTurnEnd !== undefined ? partial.exitDuringTurnEnd : exitDuringTurnEnd;
    const nextOvertimeAuthorized =
      partial.overtimeAuthorized !== undefined ? partial.overtimeAuthorized : overtimeAuthorized;
    const nextOvertimeEventName =
      partial.overtimeEventName !== undefined ? partial.overtimeEventName : overtimeEventName;

    const updated: TimeRecord = {
      id: record?.id || `rec-${employee.id}-${currentDate}`,
      employeeId: employee.id,
      date: currentDate,
      clockInMorning: nextInMorning,
      clockOutMorning: nextOutMorning,
      clockInAfternoon: nextInAfternoon,
      clockOutAfternoon: nextOutAfternoon,
      clockOutAfternoonNextDay: nextOutAfternoonNextDay,
      clockIn: nextInMorning,
      clockOut: nextOutAfternoon || nextOutMorning,
      notes: nextNotes,
      leaveType: nextLeaveType,
      leaveHours: nextLeaveHours,
      permessoHours: nextPermessoHours,
      permessoMinutes: nextPermessoMinutes,
      permessoStart: nextPermessoStart,
      permessoEnd: nextPermessoEnd,
      exitDuringTurnStart: nextExitDuringTurnStart,
      exitDuringTurnEnd: nextExitDuringTurnEnd,
      overtimeAuthorized: nextOvertimeAuthorized,
      overtimeEventName: nextOvertimeEventName,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    if (successMsg) {
      showToast(successMsg);
    }
  };

  // Next slot logic for primary CTA
  const nextSlot = (() => {
    if (leaveType === 'ferie') return null;
    if (!clockInMorning) {
      return {
        key: 'clockInMorning' as const,
        label: 'Timbra Ingresso',
        subtitle: 'Inizia turno mattina',
        type: 'entrata' as const,
        action: () => {
          const now = getCurrentTimeHHMM();
          setClockInMorning(now);
          if (leaveType !== 'none') setLeaveType('none');
          persistChanges({ clockInMorning: now, leaveType: 'none' }, `Ingresso registrato alle ${now}`);
        },
      };
    }
    if (!clockOutMorning) {
      return {
        key: 'clockOutMorning' as const,
        label: 'Timbra Pausa',
        subtitle: 'Uscita pausa pranzo',
        type: 'pausa' as const,
        action: () => {
          const now = getCurrentTimeHHMM();
          setClockOutMorning(now);
          persistChanges({ clockOutMorning: now }, `Pausa registrata alle ${now}`);
        },
      };
    }
    if (!clockInAfternoon) {
      return {
        key: 'clockInAfternoon' as const,
        label: 'Timbra Rientro',
        subtitle: 'Inizia turno pomeriggio',
        type: 'rientro' as const,
        action: () => {
          const now = getCurrentTimeHHMM();
          setClockInAfternoon(now);
          if (leaveType !== 'none') setLeaveType('none');
          persistChanges({ clockInAfternoon: now, leaveType: 'none' }, `Rientro registrato alle ${now}`);
        },
      };
    }
    if (!clockOutAfternoon) {
      return {
        key: 'clockOutAfternoon' as const,
        label: 'Timbra Uscita',
        subtitle: 'Fine turno giornaliero',
        type: 'uscita' as const,
        action: () => {
          const now = getCurrentTimeHHMM();
          const isOvernight = clockInAfternoon
            ? timeToMinutes(now) <= timeToMinutes(clockInAfternoon)
            : false;
          setClockOutAfternoon(now);
          setClockOutAfternoonNextDay(isOvernight);
          persistChanges(
            { clockOutAfternoon: now, clockOutAfternoonNextDay: isOvernight },
            `Fine turno registrata alle ${now}${isOvernight ? ' (+1 gg 🌙)' : ''}`
          );
        },
      };
    }
    return null;
  })();

  const isOvernightRecorded = isAfternoonShiftOvernight(
    clockInAfternoon,
    clockOutAfternoon,
    clockOutAfternoonNextDay
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Permesso helpers
  const handleAutoCompensate = () => {
    const h = Math.floor(missingMinutes / 60);
    const m = missingMinutes % 60;
    setPermessoHours(h);
    setPermessoMinutes(m);
    setPermessoStart('');
    setPermessoEnd('');
    setLeaveType('permesso');
    const lH = Number((missingMinutes / 60).toFixed(4));
    setLeaveHours(lH);
    persistChanges(
      {
        leaveType: 'permesso',
        leaveHours: lH,
        permessoHours: h,
        permessoMinutes: m,
        permessoStart: '',
        permessoEnd: '',
      },
      `Permesso compensativo di ${formatMinutesToHM(missingMinutes)} applicato`
    );
  };

  const handleClearPermesso = () => {
    setPermessoHours(0);
    setPermessoMinutes(0);
    setPermessoStart('');
    setPermessoEnd('');
    setLeaveType('none');
    setLeaveHours(0);
    persistChanges(
      {
        leaveType: 'none',
        leaveHours: 0,
        permessoHours: 0,
        permessoMinutes: 0,
        permessoStart: '',
        permessoEnd: '',
      },
      'Permesso rimosso'
    );
  };

  const toggleFerie = () => {
    if (leaveType === 'ferie') {
      setLeaveType('none');
      persistChanges({ leaveType: 'none' }, 'Ferie annullate');
    } else {
      setLeaveType('ferie');
      setClockInMorning('');
      setClockOutMorning('');
      setClockInAfternoon('');
      setClockOutAfternoon('');
      persistChanges(
        {
          leaveType: 'ferie',
          leaveHours: 8,
          clockInMorning: '',
          clockOutMorning: '',
          clockInAfternoon: '',
          clockOutAfternoon: '',
        },
        'Ferie segnate per oggi (8h)'
      );
    }
  };

  const statusLabel =
    calculation.status === 'al_lavoro'
      ? 'In servizio'
      : calculation.status === 'pausa'
      ? 'In pausa'
      : calculation.status === 'completato'
      ? 'Turno completato'
      : calculation.status === 'ferie'
      ? 'In ferie'
      : calculation.status === 'permesso'
      ? 'In permesso'
      : 'Non timbrato';

  const statusColorClass =
    calculation.status === 'al_lavoro'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : calculation.status === 'pausa'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : calculation.status === 'completato'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : calculation.status === 'ferie'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : calculation.status === 'permesso'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  const statusDotClass =
    calculation.status === 'al_lavoro'
      ? 'bg-emerald-500 animate-pulse'
      : calculation.status === 'pausa'
      ? 'bg-amber-500'
      : calculation.status === 'completato'
      ? 'bg-indigo-500'
      : calculation.status === 'ferie'
      ? 'bg-rose-500'
      : calculation.status === 'permesso'
      ? 'bg-purple-500'
      : 'bg-slate-400';

  // Week days for modern 7-day strip
  const weekDays = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const dayOfWeek = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const list = [];

    for (let i = 0; i < 7; i++) {
      const dObj = new Date(monday);
      dObj.setDate(monday.getDate() + i);
      const yr = dObj.getFullYear();
      const mo = (dObj.getMonth() + 1).toString().padStart(2, '0');
      const da = dObj.getDate().toString().padStart(2, '0');
      const dateStr = `${yr}-${mo}-${da}`;

      // Check record status for this day
      const dayRec = (records || []).find(
        (r) => r.employeeId === employee.id && r.date === dateStr
      );
      let statusDot: string | null = null;
      if (dayRec) {
        if (dayRec.leaveType === 'ferie') {
          statusDot = 'bg-rose-500';
        } else if (
          dayRec.leaveType === 'permesso' ||
          Boolean(dayRec.permessoHours) ||
          Boolean(dayRec.permessoMinutes)
        ) {
          statusDot = 'bg-purple-500';
        } else if (dayRec.clockInMorning || dayRec.clockInAfternoon) {
          statusDot = 'bg-emerald-500';
        }
      }

      list.push({
        dateStr,
        dayNum: dObj.getDate(),
        dayLabel: dayLabels[i],
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === currentDate,
        statusDot,
      });
    }
    return list;
  }, [currentDate, todayDateStr, records, employee.id]);

  const currentMonthYear = formatMonthIT(currentDate.slice(0, 7));

  const currentFormattedDay = useMemo(() => {
    if (!currentDate) return '';
    const [y, m, d] = currentDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekday = dt.toLocaleDateString('it-IT', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday} ${d}`;
  }, [currentDate]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#F8FAFC] text-[#101B32] font-sans antialiased select-none px-3.5 pt-2 pb-2.5">
      {/* Toast popup */}
      {feedbackToast && (
        <div className="fixed top-3 left-4 right-4 z-50 bg-[#101B32] text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center justify-between gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-150">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast('')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ZONE 1: TOP APP BAR (~40px) */}
      <header className="flex items-center justify-between gap-2 shrink-0 h-10 border-b border-slate-200/80 pb-1.5">
        {/* Brand & User identity */}
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={26} showText={false} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 truncate tracking-tight">
                {employee.name}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotClass}`}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              {statusLabel} • <span className="font-mono font-semibold">{systemTimeHHMM}</span>
            </span>
          </div>
        </div>

        {/* Action icons: Views, Cloud Sync, Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenReport}
            className="w-7.5 h-7.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs active:bg-slate-50 cursor-pointer"
            title="Report mensile"
            aria-label="Report mensile"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          <button
            type="button"
            onClick={onOpenLeaves}
            className="w-7.5 h-7.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-rose-700 transition-colors shadow-2xs active:bg-slate-50 cursor-pointer"
            title="Ferie e permessi"
            aria-label="Ferie e permessi"
          >
            <Palmtree className="w-3.5 h-3.5 text-rose-500" />
          </button>

          <div
            className={`w-7.5 h-7.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs ${
              isCloudConnected ? 'text-emerald-600' : 'text-amber-500 animate-pulse'
            }`}
            title={isCloudConnected ? 'Cloud sincronizzato' : 'Connessione...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-7.5 h-7.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 transition-colors shadow-2xs active:bg-slate-50 cursor-pointer"
              title="Esci"
              aria-label="Esci"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ZONE 2: MODERN DATE NAVIGATION & 7-DAY STRIP (~72px) */}
      <div className="shrink-0 flex flex-col gap-1.5 py-0.5">
        {/* Top Control Bar: Month, Date Sheet Trigger, Today Pill, Navigation Arrows */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSheet('datePicker')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-left active:bg-slate-50 transition-colors group cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0b5cd5] shrink-0" />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                {currentFormattedDay}
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform" />
              </span>
              <span className="text-[10px] text-slate-400 font-medium capitalize">
                • {currentMonthYear}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(todayDateStr)}
                className="px-2 py-0.5 text-[10px] font-bold text-[#0b5cd5] bg-blue-50 border border-blue-200/90 rounded-xl active:bg-blue-100 flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0b5cd5] animate-pulse" />
                <span>Oggi</span>
              </button>
            )}

            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl shadow-2xs p-0.5">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(currentDate);
                  prev.setDate(prev.getDate() - 1);
                  const y = prev.getFullYear();
                  const m = (prev.getMonth() + 1).toString().padStart(2, '0');
                  const d = prev.getDate().toString().padStart(2, '0');
                  onDateChange(`${y}-${m}-${d}`);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors cursor-pointer"
                title="Giorno precedente"
                aria-label="Giorno precedente"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(currentDate);
                  next.setDate(next.getDate() + 1);
                  const y = next.getFullYear();
                  const m = (next.getMonth() + 1).toString().padStart(2, '0');
                  const d = next.getDate().toString().padStart(2, '0');
                  onDateChange(`${y}-${m}-${d}`);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors cursor-pointer"
                title="Giorno successivo"
                aria-label="Giorno successivo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Interactive Weekday Strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => onDateChange(day.dateStr)}
                className={`flex flex-col items-center justify-between py-1 px-0.5 rounded-xl transition-all cursor-pointer select-none ${
                  day.isSelected
                    ? 'bg-[#101B32] text-white shadow-xs ring-1 ring-slate-900'
                    : day.isToday
                    ? 'bg-blue-50/90 border border-blue-300 text-blue-900 font-semibold'
                    : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase leading-none ${
                    day.isSelected
                      ? 'text-slate-300'
                      : day.isToday
                      ? 'text-blue-700'
                      : 'text-slate-400'
                  }`}
                >
                  {day.dayLabel}
                </span>
                <span
                  className={`text-xs font-black font-mono leading-none my-0.5 ${
                    day.isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {day.dayNum}
                </span>
                <div className="h-1 flex items-center justify-center">
                  {day.statusDot ? (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        day.isSelected ? 'bg-white' : day.statusDot
                      }`}
                    />
                  ) : day.isToday ? (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        day.isSelected ? 'bg-blue-300' : 'bg-blue-500'
                      }`}
                    />
                  ) : (
                    <span className="w-1 h-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ZONE 3: OVERNIGHT ALERT BANNER (Only if pending from yesterday) */}
      {yesterdayShiftPending && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-2 shrink-0 flex items-center justify-between gap-2 shadow-xs border border-indigo-700/40">
          <div className="flex items-center gap-2 min-w-0">
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate">Turno notturno aperto ieri</p>
              <p className="text-[9px] text-indigo-200 font-mono truncate">
                Iniziato alle {yesterdayShiftPending.rec.clockInAfternoon}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const now = getCurrentTimeHHMM();
              const updatedRec: TimeRecord = {
                ...yesterdayShiftPending.rec,
                clockOutAfternoon: now,
                clockOutAfternoonNextDay: true,
                updatedAt: new Date().toISOString(),
              };
              onSave(updatedRec);
              showToast(`Turno di ieri chiuso alle ${now} (+1 gg 🌙)`);
            }}
            className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[10px] font-bold shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <Moon className="w-3 h-3" />
            <span>Chiudi Ora</span>
          </button>
        </div>
      )}

      {/* ZONE 4: HERO METRIC CARD (~64px) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs shrink-0 flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Ore Lavorate Oggi
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {leaveType === 'ferie'
                  ? '8h 00m'
                  : calculation.status === 'non_timbrato'
                  ? '0h 00m'
                  : calculation.hoursWorkedFormatted}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {formatMinutesToHM(standardMinutesToday)}
              </span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-0.5">
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusColorClass}`}
            >
              {statusLabel}
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                calculation.isOvertime
                  ? 'text-emerald-600'
                  : calculation.isDeficit
                  ? 'text-rose-600'
                  : 'text-slate-600'
              }`}
            >
              {calculation.isOvertime
                ? `+${calculation.overtimeFormatted} str.`
                : calculation.isDeficit
                ? `-${calculation.deficitFormatted} def.`
                : 'In orario'}
            </span>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              calculation.status === 'al_lavoro'
                ? 'bg-emerald-500'
                : calculation.status === 'pausa'
                ? 'bg-amber-400'
                : 'bg-[#0b5cd5]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ZONE 5: THE 4 TIMESTAMPS GRID (~104px) */}
      <div className="grid grid-cols-2 gap-1.5 shrink-0">
        {/* Slot 1: Mattina In */}
        <div
          onClick={() => {
            if (isToday && !clockInMorning) {
              const now = getCurrentTimeHHMM();
              setClockInMorning(now);
              if (leaveType !== 'none') setLeaveType('none');
              persistChanges({ clockInMorning: now, leaveType: 'none' }, `1ª Entrata: ${now}`);
            }
          }}
          className={`bg-white border rounded-2xl p-2 flex flex-col justify-between transition-all shadow-2xs relative ${
            clockInMorning
              ? 'border-emerald-200/80 bg-emerald-50/20'
              : isToday && !clockInMorning
              ? 'border-blue-300 ring-1 ring-blue-500/20 cursor-pointer active:bg-blue-50/30'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 uppercase">
              <Sun className="w-3 h-3 text-amber-500" />
              1ª Entrata
            </span>
            {isToday && !clockInMorning && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                Ora
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900">
              {clockInMorning || '--:--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Mattina</span>
          </div>
        </div>

        {/* Slot 2: Mattina Out / Pausa */}
        <div
          onClick={() => {
            if (isToday && clockInMorning && !clockOutMorning) {
              const now = getCurrentTimeHHMM();
              setClockOutMorning(now);
              persistChanges({ clockOutMorning: now }, `1ª Uscita (Pausa): ${now}`);
            }
          }}
          className={`bg-white border rounded-2xl p-2 flex flex-col justify-between transition-all shadow-2xs relative ${
            clockOutMorning
              ? 'border-amber-200/80 bg-amber-50/20'
              : isToday && clockInMorning && !clockOutMorning
              ? 'border-amber-300 ring-1 ring-amber-500/20 cursor-pointer active:bg-amber-50/30'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 uppercase">
              <Coffee className="w-3 h-3 text-amber-500" />
              1ª Uscita
            </span>
            {isToday && clockInMorning && !clockOutMorning && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                Ora
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900">
              {clockOutMorning || '--:--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Pausa</span>
          </div>
        </div>

        {/* Slot 3: Pomeriggio In / Rientro */}
        <div
          onClick={() => {
            if (isToday && clockOutMorning && !clockInAfternoon) {
              const now = getCurrentTimeHHMM();
              setClockInAfternoon(now);
              if (leaveType !== 'none') setLeaveType('none');
              persistChanges({ clockInAfternoon: now, leaveType: 'none' }, `2ª Entrata (Rientro): ${now}`);
            }
          }}
          className={`bg-white border rounded-2xl p-2 flex flex-col justify-between transition-all shadow-2xs relative ${
            clockInAfternoon
              ? 'border-blue-200/80 bg-blue-50/20'
              : isToday && clockOutMorning && !clockInAfternoon
              ? 'border-blue-300 ring-1 ring-blue-500/20 cursor-pointer active:bg-blue-50/30'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 uppercase">
              <Sunset className="w-3 h-3 text-blue-500" />
              2ª Entrata
            </span>
            {isToday && clockOutMorning && !clockInAfternoon && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">
                Ora
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900">
              {clockInAfternoon || '--:--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Rientro</span>
          </div>
        </div>

        {/* Slot 4: Pomeriggio Out / Uscita Fine Turno */}
        <div
          onClick={() => {
            if (isToday && clockInAfternoon && !clockOutAfternoon) {
              const now = getCurrentTimeHHMM();
              const isOvernight = timeToMinutes(now) <= timeToMinutes(clockInAfternoon);
              setClockOutAfternoon(now);
              setClockOutAfternoonNextDay(isOvernight);
              persistChanges(
                { clockOutAfternoon: now, clockOutAfternoonNextDay: isOvernight },
                `2ª Uscita: ${now}${isOvernight ? ' (+1 gg 🌙)' : ''}`
              );
            }
          }}
          className={`bg-white border rounded-2xl p-2 flex flex-col justify-between transition-all shadow-2xs relative ${
            clockOutAfternoon
              ? 'border-indigo-200/80 bg-indigo-50/20'
              : isToday && clockInAfternoon && !clockOutAfternoon
              ? 'border-rose-300 ring-1 ring-rose-500/20 cursor-pointer active:bg-rose-50/30'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 uppercase">
              <Moon className="w-3 h-3 text-indigo-500" />
              2ª Uscita
            </span>
            {isOvernightRecorded && (
              <span className="px-1 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded">
                +1gg 🌙
              </span>
            )}
            {isToday && clockInAfternoon && !clockOutAfternoon && !isOvernightRecorded && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-bold rounded">
                Ora
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900">
              {clockOutAfternoon || '--:--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Fine</span>
          </div>
        </div>
      </div>

      {/* ZONE 6: ERGONOMIC PRIMARY THUMB ACTION BUTTON (~44px) */}
      <div className="shrink-0">
        {nextSlot ? (
          <button
            type="button"
            onClick={nextSlot.action}
            className={`w-full py-3 px-4 rounded-2xl font-black text-sm text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer ${
              nextSlot.type === 'entrata'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : nextSlot.type === 'pausa'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : nextSlot.type === 'rientro'
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{nextSlot.label}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs opacity-90">
              <span>{systemTimeHHMM}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs bg-slate-100 text-slate-600 border border-slate-200/90 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Turno completato per questa giornata
            </span>
            <span className="font-mono text-slate-900 font-bold">
              {calculation.hoursWorkedFormatted}
            </span>
          </div>
        )}
      </div>

      {/* ZONE 7: QUICK OPTIONS TOOLBAR (4 Compact iOS Tabs, ~40px) */}
      <div className="grid grid-cols-4 gap-1.5 shrink-0">
        {/* Permesso */}
        <button
          type="button"
          onClick={() => setActiveSheet('permesso')}
          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs active:bg-slate-100 cursor-pointer ${
            (permessoHours > 0 || permessoMinutes > 0 || leaveType === 'permesso')
              ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold leading-tight truncate w-full">
            {permessoHours > 0 || permessoMinutes > 0
              ? `${permessoHours}h${permessoMinutes > 0 ? `${permessoMinutes}m` : ''}`
              : 'Permesso'}
          </span>
        </button>

        {/* Uscita Turno */}
        <button
          type="button"
          onClick={() => setActiveSheet('uscita')}
          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs active:bg-slate-100 cursor-pointer ${
            exitDuringTurnStart || exitDuringTurnEnd
              ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold leading-tight truncate w-full">
            {exitDuringTurnStart ? `${exitDuringTurnStart}` : 'Uscita'}
          </span>
        </button>

        {/* Straordinari & Note */}
        <button
          type="button"
          onClick={() => setActiveSheet('overtime')}
          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs active:bg-slate-100 cursor-pointer ${
            overtimeAuthorized || overtimeEventName || calculation.overtimeMinutes > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold leading-tight truncate w-full">
            {overtimeAuthorized ? 'Straord. ✓' : 'Straordin.'}
          </span>
        </button>

        {/* Note / Ferie */}
        <button
          type="button"
          onClick={() => setActiveSheet('notes')}
          className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs active:bg-slate-100 cursor-pointer ${
            notes || leaveType === 'ferie'
              ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold leading-tight truncate w-full">
            {leaveType === 'ferie' ? 'Ferie ✓' : notes ? 'Note ✓' : 'Note'}
          </span>
        </button>
      </div>

      {/* ZONE 8: FOOTER CONTACT & SAFE AREA (~20px) */}
      <footer className="shrink-0 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
        <button
          type="button"
          onClick={() => setActiveSheet('info')}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold truncate cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">Omessa timbratura? Contatta Giulia</span>
        </button>
        <span className="font-mono text-slate-400 shrink-0">TIGi Mobile</span>
      </footer>

      {/* ============================================================== */}
      {/* BOTTOM SHEET MODALS (Apple iOS Style, never breaks page scroll) */}
      {/* ============================================================== */}
      {activeSheet !== 'none' && (
        <div
          onClick={() => setActiveSheet('none')}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl border-t border-slate-200 p-5 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 shadow-2xl"
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-2" />

            {/* SHEET 1: PERMESSO */}
            {activeSheet === 'permesso' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Gestione Permesso Retribuito
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Registra le ore di permesso per compensare deficit di orario su questa giornata.
                </p>

                {/* Auto-compensate shortcut */}
                {missingMinutes > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoCompensate();
                      setActiveSheet('none');
                    }}
                    className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Auto-compensa Deficit ({formatMinutesToHM(missingMinutes)})</span>
                  </button>
                )}

                {/* Ore e Minuti Stepper / Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Ore Permesso
                    </label>
                    <select
                      value={permessoHours}
                      onChange={(e) => {
                        const h = parseInt(e.target.value, 10);
                        setPermessoHours(h);
                        const totalM = h * 60 + permessoMinutes;
                        const lType = totalM === 0 ? 'none' : 'permesso';
                        const lH = Number((totalM / 60).toFixed(4));
                        setLeaveType(lType);
                        setLeaveHours(lH);
                        persistChanges({
                          leaveType: lType,
                          leaveHours: lH,
                          permessoHours: h,
                          permessoMinutes,
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? 'ora' : 'ore'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Minuti Permesso
                    </label>
                    <select
                      value={permessoMinutes}
                      onChange={(e) => {
                        const m = parseInt(e.target.value, 10);
                        setPermessoMinutes(m);
                        const totalM = permessoHours * 60 + m;
                        const lType = totalM === 0 ? 'none' : 'permesso';
                        const lH = Number((totalM / 60).toFixed(4));
                        setLeaveType(lType);
                        setLeaveHours(lH);
                        persistChanges({
                          leaveType: lType,
                          leaveHours: lH,
                          permessoHours,
                          permessoMinutes: m,
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none"
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {m} minuti
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Orario Da / A opzionale */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Inizio (opzionale)
                    </label>
                    <input
                      type="time"
                      value={permessoStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPermessoStart(val);
                        persistChanges({ permessoStart: val });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Fine (opzionale)
                    </label>
                    <input
                      type="time"
                      value={permessoEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPermessoEnd(val);
                        persistChanges({ permessoEnd: val });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleClearPermesso();
                      setActiveSheet('none');
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    Azzera Permesso
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Salva & Chiudi
                  </button>
                </div>
              </div>
            )}

            {/* SHEET 2: USCITA DURANTE IL TURNO */}
            {activeSheet === 'uscita' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Uscita Durante il Turno
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Registra eventuali uscite intermedie durante l'orario di lavoro (es. commissioni, visita medica).
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Orario Uscita
                    </label>
                    <input
                      type="time"
                      value={exitDuringTurnStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExitDuringTurnStart(val);
                        persistChanges({ exitDuringTurnStart: val });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Orario Rientro
                    </label>
                    <input
                      type="time"
                      value={exitDuringTurnEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExitDuringTurnEnd(val);
                        persistChanges({ exitDuringTurnEnd: val });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExitDuringTurnStart('');
                      setExitDuringTurnEnd('');
                      persistChanges(
                        { exitDuringTurnStart: '', exitDuringTurnEnd: '' },
                        'Uscita durante il turno cancellata'
                      );
                      setActiveSheet('none');
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    Cancella Uscita
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Salva & Chiudi
                  </button>
                </div>
              </div>
            )}

            {/* SHEET 3: STRAORDINARI & BANCA ORE */}
            {activeSheet === 'overtime' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Straordinari & Banca Ore
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <span className="font-semibold text-slate-600 block">
                    Straordinario calcolato per oggi:
                  </span>
                  <span className="text-lg font-black font-mono text-indigo-700">
                    {formatMinutesToHM(calculation.overtimeMinutes)}
                  </span>
                </div>

                {/* Overtime authorized toggle */}
                <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overtimeAuthorized}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOvertimeAuthorized(checked);
                      persistChanges({ overtimeAuthorized: checked });
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Autorizza Straordinario Retribuito
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Se attivo, verrà retribuito in busta paga. Se disattivato, confluisce nella Banca Ore.
                    </span>
                  </div>
                </label>

                {/* Event Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Evento o Causale Straordinario
                  </label>
                  <input
                    type="text"
                    value={overtimeEventName}
                    placeholder="Es: Evento Fiera, Assemblea..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setOvertimeEventName(val);
                      persistChanges({ overtimeEventName: val });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheet('none')}
                  className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Salva & Chiudi
                </button>
              </div>
            )}

            {/* SHEET 4: NOTE & FERIE */}
            {activeSheet === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Note del Giorno & Ferie
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Ferie toggle button */}
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Palmtree className="w-5 h-5 text-rose-600" />
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">
                        Stato Ferie Giornaliero
                      </span>
                      <span className="text-[11px] text-rose-700 block">
                        {leaveType === 'ferie' ? 'Giornata segnata in FERIE (8h)' : 'Giornata lavorativa normale'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleFerie}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      leaveType === 'ferie'
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    {leaveType === 'ferie' ? 'Annulla Ferie' : 'Segna Ferie'}
                  </button>
                </div>

                {/* Notes textarea */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Note o Commenti Personali
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    placeholder="Aggiungi dettagli o note sulla giornata..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setNotes(val);
                      persistChanges({ notes: val });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheet('none')}
                  className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Salva & Chiudi
                </button>
              </div>
            )}

            {/* SHEET 5: INFO & ASSISTENZA */}
            {activeSheet === 'info' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#0b5cd5]" />
                    <h3 className="text-base font-bold text-slate-900">
                      Assistenza e Timbrature
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold mb-1">Hai dimenticato di timbrare o l'orario è errato?</p>
                  <p>
                    Contatta direttamente l'amministrazione (Giulia) per rettificare gli orari del cartellino.
                    I dati sono sincronizzati in tempo reale con il database aziendale.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Utente Connesso:</span>
                    <span className="font-bold text-slate-900">{employee.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Stato Sincronizzazione:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Attiva in tempo reale
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Orario Standard:</span>
                    <span className="font-bold text-slate-900">8 ore al giorno</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSheet('none')}
                  className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Ho Capito
                </button>
              </div>
            )}

            {/* SHEET 6: DATE PICKER */}
            {activeSheet === 'datePicker' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0b5cd5]" />
                    <h3 className="text-base font-bold text-slate-900">
                      Seleziona Data
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateChange(e.target.value);
                      setActiveSheet('none');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-900 outline-none"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDateChange(todayDateStr);
                      setActiveSheet('none');
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-[#0b5cd5] bg-blue-50 border border-blue-200 rounded-xl"
                  >
                    Vai a Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('none')}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
