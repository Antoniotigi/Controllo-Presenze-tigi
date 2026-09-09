import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Save,
  Palmtree,
  Sun,
  Sunset,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Employee, TimeRecord, DayCalculation } from '../types';
import {
  calculateRecord,
  getCurrentTimeHHMM,
  getStandardMinutesForDay,
  formatMinutesToHM,
  getRecordTimestamps,
  getMinutesBetweenTimes,
} from '../utils/timeUtils';

interface EmployeeCardProps {
  employee: Employee;
  record?: TimeRecord;
  currentDate: string;
  isToday: boolean;
  systemTimeHHMM: string;
  onSave: (record: TimeRecord) => void;
  onOpenLeaveForEmployee: (employeeId: string) => void;
  index?: number;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  record,
  currentDate,
  isToday,
  systemTimeHHMM,
  onSave,
  onOpenLeaveForEmployee,
  index = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const initialTimes = getRecordTimestamps(record);

  // Local form state for the 4 timestamps
  const [clockInMorning, setClockInMorning] = useState<string>(initialTimes.clockInMorning);
  const [clockOutMorning, setClockOutMorning] = useState<string>(initialTimes.clockOutMorning);
  const [clockInAfternoon, setClockInAfternoon] = useState<string>(initialTimes.clockInAfternoon);
  const [clockOutAfternoon, setClockOutAfternoon] = useState<string>(initialTimes.clockOutAfternoon);

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
  const [showExitDuringTurn, setShowExitDuringTurn] = useState<boolean>(
    !!(record?.exitDuringTurnStart || record?.exitDuringTurnEnd)
  );
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Sync state whenever record ID or date changes (e.g. date switched or employee switched)
  useEffect(() => {
    const times = getRecordTimestamps(record);
    setClockInMorning(times.clockInMorning);
    setClockOutMorning(times.clockOutMorning);
    setClockInAfternoon(times.clockInAfternoon);
    setClockOutAfternoon(times.clockOutAfternoon);

    setNotes(record?.notes || '');
    setLeaveType(record?.leaveType || 'none');
    setPermessoStart(record?.permessoStart || '');
    setPermessoEnd(record?.permessoEnd || '');
    setExitDuringTurnStart(record?.exitDuringTurnStart || '');
    setExitDuringTurnEnd(record?.exitDuringTurnEnd || '');
    setShowExitDuringTurn(!!(record?.exitDuringTurnStart || record?.exitDuringTurnEnd));

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

  // 60 seconds auto-collapse timer on expansion
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 60000); // 60 seconds
      return () => clearTimeout(timer);
    }
  }, [isExpanded, clockInMorning, clockOutMorning, clockInAfternoon, clockOutAfternoon, notes, leaveType, permessoHours, permessoMinutes, permessoStart, permessoEnd, exitDuringTurnStart, exitDuringTurnEnd]);

  // Compute live calculation
  const currentWorkingRecord: TimeRecord = {
    id: record?.id || `rec-${employee.id}-${currentDate}`,
    employeeId: employee.id,
    date: currentDate,
    clockInMorning,
    clockOutMorning,
    clockInAfternoon,
    clockOutAfternoon,
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
    updatedAt: new Date().toISOString(),
  };

  const calculation: DayCalculation = calculateRecord(
    currentWorkingRecord,
    systemTimeHHMM,
    isToday,
    employee
  );

  // Pure attendance minutes from stamps only (without applied permesso)
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
  const standardMinutes = getStandardMinutesForDay(currentDate, employee);
  const rawDailyBalanceMinutes = pureAttendanceMinutes - standardMinutes;

  const hasAnyStamps = Boolean(
    clockInMorning || clockOutMorning || clockInAfternoon || clockOutAfternoon
  );

  const isFinished =
    clockOutAfternoon !== '' ||
    (!isToday && (clockInMorning !== '' || clockInAfternoon !== ''));

  const missingMinutes = Math.max(0, -rawDailyBalanceMinutes);
  const currentPermessoMinutes = (permessoHours || 0) * 60 + (permessoMinutes || 0);

  // Field is shown only if daily balance is negative (or active deficit / already filled permesso)
  const isSaldoNegativo =
    (hasAnyStamps && rawDailyBalanceMinutes < 0) ||
    calculation.isDeficit ||
    currentPermessoMinutes > 0 ||
    leaveType === 'permesso';

  // Helper to persist changes automatically without needing a manual save button
  const persistChanges = (partial: Partial<TimeRecord>) => {
    const nextInMorning = partial.clockInMorning !== undefined ? partial.clockInMorning : clockInMorning;
    const nextOutMorning = partial.clockOutMorning !== undefined ? partial.clockOutMorning : clockOutMorning;
    const nextInAfternoon = partial.clockInAfternoon !== undefined ? partial.clockInAfternoon : clockInAfternoon;
    const nextOutAfternoon = partial.clockOutAfternoon !== undefined ? partial.clockOutAfternoon : clockOutAfternoon;
    const nextNotes = partial.notes !== undefined ? partial.notes : notes;
    const nextLeaveType = partial.leaveType !== undefined ? partial.leaveType : leaveType;
    const nextLeaveHours = partial.leaveHours !== undefined ? partial.leaveHours : leaveHours;
    const nextPermessoHours = partial.permessoHours !== undefined ? partial.permessoHours : permessoHours;
    const nextPermessoMinutes = partial.permessoMinutes !== undefined ? partial.permessoMinutes : permessoMinutes;
    const nextPermessoStart = partial.permessoStart !== undefined ? partial.permessoStart : permessoStart;
    const nextPermessoEnd = partial.permessoEnd !== undefined ? partial.permessoEnd : permessoEnd;
    const nextExitDuringTurnStart = partial.exitDuringTurnStart !== undefined ? partial.exitDuringTurnStart : exitDuringTurnStart;
    const nextExitDuringTurnEnd = partial.exitDuringTurnEnd !== undefined ? partial.exitDuringTurnEnd : exitDuringTurnEnd;

    const updatedRecord: TimeRecord = {
      id: record?.id || `rec-${employee.id}-${currentDate}`,
      employeeId: employee.id,
      date: currentDate,
      clockInMorning: nextInMorning,
      clockOutMorning: nextOutMorning,
      clockInAfternoon: nextInAfternoon,
      clockOutAfternoon: nextOutAfternoon,
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
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedRecord);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 1500);
  };

  const handlePermessoStartChange = (start: string) => {
    setPermessoStart(start);
    const totalMins = getMinutesBetweenTimes(start, permessoEnd);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setPermessoHours(h);
    setPermessoMinutes(m);
    const isNone = totalMins === 0;
    const newLeaveType: TimeRecord['leaveType'] = isNone ? 'none' : 'permesso';
    const newLeaveHours = Number((totalMins / 60).toFixed(4));
    setLeaveType(newLeaveType);
    setLeaveHours(newLeaveHours);
    persistChanges({
      leaveType: newLeaveType,
      leaveHours: newLeaveHours,
      permessoHours: h,
      permessoMinutes: m,
      permessoStart: start,
      permessoEnd,
    });
  };

  const handlePermessoEndChange = (end: string) => {
    setPermessoEnd(end);
    const totalMins = getMinutesBetweenTimes(permessoStart, end);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setPermessoHours(h);
    setPermessoMinutes(m);
    const isNone = totalMins === 0;
    const newLeaveType: TimeRecord['leaveType'] = isNone ? 'none' : 'permesso';
    const newLeaveHours = Number((totalMins / 60).toFixed(4));
    setLeaveType(newLeaveType);
    setLeaveHours(newLeaveHours);
    persistChanges({
      leaveType: newLeaveType,
      leaveHours: newLeaveHours,
      permessoHours: h,
      permessoMinutes: m,
      permessoStart,
      permessoEnd: end,
    });
  };

  const handleExitDuringTurnStartChange = (start: string) => {
    setExitDuringTurnStart(start);
    persistChanges({
      exitDuringTurnStart: start,
    });
  };

  const handleExitDuringTurnEndChange = (end: string) => {
    setExitDuringTurnEnd(end);
    persistChanges({
      exitDuringTurnEnd: end,
    });
  };

  const handlePermessoHoursChange = (h: number) => {
    const validH = Math.max(0, Math.min(8, isNaN(h) ? 0 : h));
    setPermessoHours(validH);
    const totalMins = validH * 60 + permessoMinutes;
    const isNone = totalMins === 0;
    const newLeaveType: TimeRecord['leaveType'] = isNone ? 'none' : 'permesso';
    const newLeaveHours = Number((totalMins / 60).toFixed(4));
    setLeaveType(newLeaveType);
    setLeaveHours(newLeaveHours);
    persistChanges({
      leaveType: newLeaveType,
      leaveHours: newLeaveHours,
      permessoHours: validH,
      permessoMinutes,
    });
  };

  const handlePermessoMinutesChange = (m: number) => {
    const validM = Math.max(0, Math.min(59, isNaN(m) ? 0 : m));
    setPermessoMinutes(validM);
    const totalMins = permessoHours * 60 + validM;
    const isNone = totalMins === 0;
    const newLeaveType: TimeRecord['leaveType'] = isNone ? 'none' : 'permesso';
    const newLeaveHours = Number((totalMins / 60).toFixed(4));
    setLeaveType(newLeaveType);
    setLeaveHours(newLeaveHours);
    persistChanges({
      leaveType: newLeaveType,
      leaveHours: newLeaveHours,
      permessoHours,
      permessoMinutes: validM,
    });
  };

  const handleAutoCompensate = () => {
    const h = Math.floor(missingMinutes / 60);
    const m = missingMinutes % 60;
    setPermessoHours(h);
    setPermessoMinutes(m);
    setPermessoStart('');
    setPermessoEnd('');
    setLeaveType('permesso');
    setLeaveHours(Number((missingMinutes / 60).toFixed(4)));
    persistChanges({
      leaveType: 'permesso',
      leaveHours: Number((missingMinutes / 60).toFixed(4)),
      permessoHours: h,
      permessoMinutes: m,
      permessoStart: '',
      permessoEnd: '',
    });
  };

  const handleClearPermesso = () => {
    setPermessoHours(0);
    setPermessoMinutes(0);
    setPermessoStart('');
    setPermessoEnd('');
    setExitDuringTurnStart('');
    setExitDuringTurnEnd('');
    setLeaveType('none');
    setLeaveHours(0);
    persistChanges({
      leaveType: 'none',
      leaveHours: 0,
      permessoHours: 0,
      permessoMinutes: 0,
      permessoStart: '',
      permessoEnd: '',
      exitDuringTurnStart: '',
      exitDuringTurnEnd: '',
    });
  };

  const setInMorningNow = () => {
    const now = getCurrentTimeHHMM();
    setClockInMorning(now);
    if (leaveType !== 'none') setLeaveType('none');
    persistChanges({ clockInMorning: now, leaveType: 'none' });
  };

  const setOutMorningNow = () => {
    const now = getCurrentTimeHHMM();
    setClockOutMorning(now);
    persistChanges({ clockOutMorning: now });
  };

  const setInAfternoonNow = () => {
    const now = getCurrentTimeHHMM();
    setClockInAfternoon(now);
    if (leaveType !== 'none') setLeaveType('none');
    persistChanges({ clockInAfternoon: now, leaveType: 'none' });
  };

  const setOutAfternoonNow = () => {
    const now = getCurrentTimeHHMM();
    setClockOutAfternoon(now);
    persistChanges({ clockOutAfternoon: now });
  };

  const toggleFerie = () => {
    if (leaveType === 'ferie') {
      setLeaveType('none');
      persistChanges({ leaveType: 'none' });
    } else {
      setLeaveType('ferie');
      setClockInMorning('');
      setClockOutMorning('');
      setClockInAfternoon('');
      setClockOutAfternoon('');
      persistChanges({
        leaveType: 'ferie',
        leaveHours: 8,
        clockInMorning: '',
        clockOutMorning: '',
        clockInAfternoon: '',
        clockOutAfternoon: '',
      });
    }
  };

  const togglePermesso = () => {
    if (leaveType === 'permesso') {
      setLeaveType('none');
      setPermessoHours(0);
      setPermessoMinutes(0);
      persistChanges({
        leaveType: 'none',
        leaveHours: 0,
        permessoHours: 0,
        permessoMinutes: 0,
      });
    } else {
      setLeaveType('permesso');
      const defaultHours = Math.floor(missingMinutes / 60);
      const defaultMins = missingMinutes % 60;
      setPermessoHours(defaultHours);
      setPermessoMinutes(defaultMins);
      const leaveH = Number((missingMinutes / 60).toFixed(4));
      setLeaveHours(leaveH);
      persistChanges({
        leaveType: 'permesso',
        leaveHours: leaveH,
        permessoHours: defaultHours,
        permessoMinutes: defaultMins,
      });
    }
  };

  const toggleExitDuringTurn = () => {
    if (showExitDuringTurn) {
      setShowExitDuringTurn(false);
      setExitDuringTurnStart('');
      setExitDuringTurnEnd('');
      persistChanges({
        exitDuringTurnStart: '',
        exitDuringTurnEnd: '',
      });
    } else {
      setShowExitDuringTurn(true);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Avatar pastel styles from Sleek Interface design
  const avatarThemes = [
    'bg-indigo-100 text-indigo-600 border border-indigo-200/50',
    'bg-amber-100 text-amber-600 border border-amber-200/50',
    'bg-rose-100 text-rose-600 border border-rose-200/50',
    'bg-sky-100 text-sky-600 border border-sky-200/50',
  ];
  const avatarStyle = avatarThemes[index % avatarThemes.length];

  // Daily balance label logic
  const standardMinutesToday = getStandardMinutesForDay(currentDate, employee);
  const diffFromStandard = calculation.minutesWorked - standardMinutesToday;

  return (
    <div
      id={`employee-cell-${employee.id}`}
      onClick={() => {
        if (!isExpanded) {
          setIsExpanded(true);
        }
      }}
      className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm relative overflow-hidden flex flex-col ${
        isExpanded
          ? 'border-slate-200 p-6 ring-1 ring-slate-100'
          : 'border-slate-200 hover:border-slate-300/80 p-5 cursor-pointer hover:shadow-md bg-slate-50/10'
      }`}
    >
      {/* Top Section: Avatar, Name, Status, Live Ticker */}
      <div
        onClick={(e) => {
          if (isExpanded) {
            e.stopPropagation();
            setIsExpanded(false);
          }
        }}
        className={`flex items-start justify-between ${
          isExpanded ? 'mb-5 cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-13 h-13 ${avatarStyle} rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs`}
          >
            {getInitials(employee.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg leading-tight text-slate-900">
                {employee.name}
              </h3>
              {!isExpanded && (
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-md uppercase">
                  {employee.scheduleType === 'six_days' ? 'Su 6gg' : employee.scheduleType === 'standard_9h' ? '9h' : '8h'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {calculation.status === 'al_lavoro' && (
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  In Servizio
                </span>
              )}
              {calculation.status === 'pausa' && (
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Pausa Pranzo
                </span>
              )}
              {calculation.status === 'completato' && (
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fine Turno
                </span>
              )}
              {calculation.status === 'ferie' && (
                <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                  In Ferie
                </span>
              )}
              {calculation.status === 'permesso' && (
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                  In Permesso ({formatMinutesToHM(currentPermessoMinutes || (leaveHours * 60))})
                </span>
              )}
              {calculation.status === 'non_timbrato' && (
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Non Timbrato
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Big Top-Right Stat Counter & Expand/Collapse Icon */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className={`text-2xl font-mono font-bold ${
                calculation.status === 'ferie' || calculation.status === 'non_timbrato'
                  ? 'text-slate-300'
                  : 'text-slate-800'
              }`}
            >
              {calculation.status === 'ferie'
                ? '08h 00m'
                : calculation.status === 'non_timbrato'
                ? '--:--'
                : calculation.hoursWorkedFormatted}
            </div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              {calculation.status === 'al_lavoro'
                ? 'Tempo Reale'
                : calculation.status === 'pausa'
                ? 'Marr. Conclusa'
                : calculation.status === 'completato'
                ? 'Totale Giorno'
                : calculation.status === 'ferie'
                ? 'Ferie Retr.'
                : calculation.status === 'permesso'
                ? 'Permesso Retr.'
                : 'In Attesa'}
            </div>
          </div>
          <div className="p-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Synthetic View (when collapsed) */}
      {!isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Inquadramento</span>
              <span className="font-semibold text-slate-700 mt-0.5">
                {employee.scheduleType === 'six_days' 
                  ? '7h 12m (Lun-Ven) / 4h (Sab)' 
                  : employee.scheduleType === 'standard_9h' 
                    ? '9h (Lun-Ven)' 
                    : '8h (Lun-Ven)'}
              </span>
            </div>
            
            <div className="flex flex-col border-l border-slate-200 pl-4">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Timbrature</span>
              <span className="font-semibold text-slate-600 mt-0.5 font-mono">
                {hasAnyStamps ? (
                  <span className="flex gap-1">
                    {clockInMorning && <span>{clockInMorning}</span>}
                    {clockOutMorning && <span className="text-slate-300">|</span>}
                    {clockOutMorning && <span>{clockOutMorning}</span>}
                    {clockInAfternoon && <span className="text-slate-300">|</span>}
                    {clockInAfternoon && <span>{clockInAfternoon}</span>}
                    {clockOutAfternoon && <span className="text-slate-300">|</span>}
                    {clockOutAfternoon && <span>{clockOutAfternoon}</span>}
                  </span>
                ) : leaveType === 'ferie' ? (
                  <span className="text-rose-600 font-sans font-semibold">Ferie</span>
                ) : leaveType === 'permesso' ? (
                  <span className="text-purple-600 font-sans font-semibold">Permesso</span>
                ) : (
                  <span className="text-slate-400 font-sans">Nessuna timbratura</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            {calculation.isOvertime ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded-md font-mono text-[11px]">
                {calculation.overtimeFormatted} (Str.)
              </span>
            ) : calculation.isDeficit ? (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-bold rounded-md font-mono text-[11px]">
                {calculation.deficitFormatted} (Rec.)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 font-bold rounded-md font-mono text-[11px]">
                00h 00m
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded Main Content Area */}
      {isExpanded && (
        <div className="mt-4 space-y-4 flex-1 flex flex-col justify-between">
          {leaveType === 'ferie' ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 my-2 flex-1 flex flex-col justify-center items-center text-center">
              <Palmtree className="w-7 h-7 text-rose-500 mb-1" />
              <p className="text-rose-700 font-bold text-sm">Dipendente in FERIE</p>
              <p className="text-rose-600 text-xs mt-1">
                Computate 8 ore standard retribuite nel cartellino
              </p>
              <button
                type="button"
                onClick={() => {
                  setLeaveType('none');
                  setClockInMorning('08:30');
                  setClockOutMorning('12:30');
                  setClockInAfternoon('13:30');
                  setClockOutAfternoon('17:30');
                  persistChanges({
                    leaveType: 'none',
                    clockInMorning: '08:30',
                    clockOutMorning: '12:30',
                    clockInAfternoon: '13:30',
                    clockOutAfternoon: '17:30',
                  });
                }}
                className="mt-3 text-xs font-bold underline text-rose-800 hover:text-rose-900 cursor-pointer"
              >
                Modifica Stato o Timbra
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 mb-4">
              {/* Sezione 1: Mattina (2 entrate/uscite) */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Mattina
                  </span>
                  {clockInMorning && clockOutMorning && (
                    <span className="text-[11px] font-mono font-medium text-slate-500">
                      {formatMinutesToHM(
                        Math.max(
                          0,
                          (clockOutMorning.split(':').reduce((h, m) => Number(h) * 60 + Number(m), 0)) -
                          (clockInMorning.split(':').reduce((h, m) => Number(h) * 60 + Number(m), 0))
                        )
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Entrata Mattina */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between ml-1">
                      <label
                        htmlFor={`in-morn-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase"
                      >
                        1ª Entrata
                      </label>
                      {isToday && (
                        <button
                          type="button"
                          onClick={setInMorningNow}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Adesso
                        </button>
                      )}
                    </div>
                    <input
                      id={`in-morn-${employee.id}`}
                      type="time"
                      value={clockInMorning}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClockInMorning(val);
                        persistChanges({ clockInMorning: val });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* Uscita Mattina */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between ml-1">
                      <label
                        htmlFor={`out-morn-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase"
                      >
                        1ª Uscita
                      </label>
                      {isToday && (
                        <button
                          type="button"
                          onClick={setOutMorningNow}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Adesso
                        </button>
                      )}
                    </div>
                    <input
                      id={`out-morn-${employee.id}`}
                      type="time"
                      value={clockOutMorning}
                      placeholder="--:--"
                      onChange={(e) => {
                        const val = e.target.value;
                        setClockOutMorning(val);
                        persistChanges({ clockOutMorning: val });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sezione 2: Pomeriggio (2 entrate/uscite) */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                    Pomeriggio
                  </span>
                  {clockInAfternoon && clockOutAfternoon && (
                    <span className="text-[11px] font-mono font-medium text-slate-500">
                      {formatMinutesToHM(
                        Math.max(
                          0,
                          (clockOutAfternoon.split(':').reduce((h, m) => Number(h) * 60 + Number(m), 0)) -
                          (clockInAfternoon.split(':').reduce((h, m) => Number(h) * 60 + Number(m), 0))
                        )
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Entrata Pomeriggio */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between ml-1">
                      <label
                        htmlFor={`in-aft-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase"
                      >
                        2ª Entrata
                      </label>
                      {isToday && (
                        <button
                          type="button"
                          onClick={setInAfternoonNow}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Adesso
                        </button>
                      )}
                    </div>
                    <input
                      id={`in-aft-${employee.id}`}
                      type="time"
                      value={clockInAfternoon}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClockInAfternoon(val);
                        persistChanges({ clockInAfternoon: val });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* Uscita Pomeriggio */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between ml-1">
                      <label
                        htmlFor={`out-aft-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase"
                      >
                        2ª Uscita
                      </label>
                      {isToday && (
                        <button
                          type="button"
                          onClick={setOutAfternoonNow}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Adesso
                        </button>
                      )}
                    </div>
                    <input
                      id={`out-aft-${employee.id}`}
                      type="time"
                      value={clockOutAfternoon}
                      placeholder="--:--"
                      onChange={(e) => {
                        const val = e.target.value;
                        setClockOutAfternoon(val);
                        persistChanges({ clockOutAfternoon: val });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Uscita Temporanea durante il turno di lavoro - mostrato SOLO se abilitato dal tasto */}
              {leaveType !== 'ferie' && showExitDuringTurn && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-slate-500" />
                      Uscita temporanea durante il turno
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Uscita durante Turno */}
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`exit-start-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase ml-1"
                      >
                        Ora Uscita
                      </label>
                      <input
                        id={`exit-start-${employee.id}`}
                        type="time"
                        value={exitDuringTurnStart || ''}
                        onChange={(e) => handleExitDuringTurnStartChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                      />
                    </div>

                    {/* Rientro durante Turno */}
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`exit-end-${employee.id}`}
                        className="text-[10px] font-bold text-slate-500 uppercase ml-1"
                      >
                        Ora Rientro
                      </label>
                      <input
                        id={`exit-end-${employee.id}`}
                        type="time"
                        value={exitDuringTurnEnd || ''}
                        onChange={(e) => handleExitDuringTurnEndChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Permesso compensativo in Ore e Minuti - mostrato SOLO se l'utente clicca su "Segna Permesso" */}
              {leaveType === 'permesso' && (
                <div className="bg-purple-50/70 border border-purple-200/90 rounded-2xl p-3.5 space-y-2.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Giustificativo Permesso (Ore / Minuti)
                    </span>
                    {currentPermessoMinutes > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-mono">
                        Applicato: +{formatMinutesToHM(currentPermessoMinutes)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                        Mancano: -{formatMinutesToHM(missingMinutes)}
                      </span>
                    )}
                  </div>

                  {/* Ore and Minuti input */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Ore */}
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`perm-hours-${employee.id}`}
                        className="text-[10px] font-bold text-purple-700 uppercase ml-1"
                      >
                        Ore Permesso
                      </label>
                      <input
                        id={`perm-hours-${employee.id}`}
                        type="number"
                        min="0"
                        max="8"
                        value={permessoHours}
                        onChange={(e) => handlePermessoHoursChange(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all shadow-2xs"
                      />
                    </div>

                    {/* Minuti */}
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`perm-mins-${employee.id}`}
                        className="text-[10px] font-bold text-purple-700 uppercase ml-1"
                      >
                        Minuti Permesso
                      </label>
                      <input
                        id={`perm-mins-${employee.id}`}
                        type="number"
                        min="0"
                        max="59"
                        value={permessoMinutes}
                        onChange={(e) => handlePermessoMinutesChange(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Quick actions: Compensa deficit & Rimuovi */}
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    {missingMinutes > 0 && currentPermessoMinutes < missingMinutes ? (
                      <button
                        type="button"
                        onClick={handleAutoCompensate}
                        className="text-purple-700 hover:text-purple-900 font-semibold text-[11px] underline flex items-center gap-1 cursor-pointer"
                        title="Imposta automaticamente le ore e minuti per pareggiare a 8 ore"
                      >
                        Compensa saldo mancante ({formatMinutesToHM(missingMinutes)})
                      </button>
                    ) : (
                      <span className="text-[11px] text-purple-600 font-medium">
                        {currentPermessoMinutes > 0 ? 'Permesso applicato al calcolo' : ''}
                      </span>
                    )}

                    {currentPermessoMinutes > 0 && (
                      <button
                        type="button"
                        onClick={handleClearPermesso}
                        className="text-slate-400 hover:text-rose-600 font-medium text-[11px] ml-auto cursor-pointer"
                      >
                        Rimuovi permesso
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Note / Causale */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Nota / Causale (Opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Fuori sede, trasferta..."
                  value={notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    persistChanges({ notes: val });
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          {/* Action & Auto-save Status Bar: Salvataggio automatico + Ferie toggle */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600 shadow-2xs">
              <CheckCircle2
                className={`w-4 h-4 transition-all duration-200 ${
                  isSavedFeedback ? 'text-emerald-500 scale-110' : 'text-emerald-600'
                }`}
              />
              <span className="text-slate-700 font-medium">
                {isSavedFeedback ? 'Salvato!' : 'Salvataggio automatico'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleExitDuringTurn}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  showExitDuringTurn
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Segna o annulla Uscita temporanea"
              >
                {showExitDuringTurn ? 'In Uscita' : 'Uscita Turno'}
              </button>

              <button
                type="button"
                onClick={togglePermesso}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  leaveType === 'permesso'
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Segna o annulla Permesso"
              >
                {leaveType === 'permesso' ? 'In Permesso' : 'Segna Permesso'}
              </button>

              <button
                type="button"
                onClick={toggleFerie}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  leaveType === 'ferie'
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Segna o annulla Ferie"
              >
                {leaveType === 'ferie' ? 'In Ferie' : 'Segna Ferie'}
              </button>
            </div>
          </div>

          {/* Footer: Saldo Giornaliero (8h/9h Standard) */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium animate-fade-in">
              Saldo Giornaliero ({employee.scheduleType === 'six_days' ? '7h 12m/4h' : employee.scheduleType === 'standard_9h' ? '9h' : '8h'} Standard)
            </span>
            {calculation.isOvertime ? (
              <span className="text-xs font-bold text-emerald-600 font-mono">
                {calculation.overtimeFormatted} (Str.)
              </span>
            ) : calculation.isDeficit ? (
              <span className="text-xs font-bold text-amber-600 font-mono">
                {calculation.deficitFormatted} (Rec.)
              </span>
            ) : calculation.status === 'al_lavoro' ? (
              <span className="text-xs font-bold text-slate-500 font-mono">
                {diffFromStandard >= 0
                  ? `+${formatMinutesToHM(diffFromStandard)} (Str.)`
                  : `${formatMinutesToHM(diffFromStandard)} (in corso)`}
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 font-mono">
                00h 00m
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
