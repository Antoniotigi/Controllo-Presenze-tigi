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
  Coffee,
  ChevronRight,
  Calendar,
  Clock,
  Moon,
} from 'lucide-react';
import { Employee, TimeRecord, DayCalculation } from '../types';
import {
  calculateRecord,
  getCurrentTimeHHMM,
  getStandardMinutesForDay,
  formatMinutesToHM,
  getRecordTimestamps,
  getMinutesBetweenTimes,
  isAfternoonShiftOvernight,
  timeToMinutes,
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
  const [showExitDuringTurn, setShowExitDuringTurn] = useState<boolean>(
    !!(record?.exitDuringTurnStart || record?.exitDuringTurnEnd)
  );
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Admin password lock states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Sync state whenever record ID or date changes (e.g. date switched or employee switched)
  useEffect(() => {
    const times = getRecordTimestamps(record);
    setClockInMorning(times.clockInMorning);
    setClockOutMorning(times.clockOutMorning);
    setClockInAfternoon(times.clockInAfternoon);
    setClockOutAfternoon(times.clockOutAfternoon);
    setClockOutAfternoonNextDay(Boolean(times.clockOutAfternoonNextDay));

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

    // Reset lock when switching employee or date
    setIsAdminUnlocked(false);
    setShowPasswordInput(false);
    setPasswordValue('');
    setPasswordError(false);
  }, [record?.id, currentDate]);

  // Lock back when card is collapsed
  useEffect(() => {
    if (!isExpanded) {
      setIsAdminUnlocked(false);
      setShowPasswordInput(false);
      setPasswordValue('');
      setPasswordError(false);
    }
  }, [isExpanded]);

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
    const nextOutAfternoonNextDay = partial.clockOutAfternoonNextDay !== undefined ? partial.clockOutAfternoonNextDay : clockOutAfternoonNextDay;
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
    const isOvernight = clockInAfternoon
      ? timeToMinutes(now) <= timeToMinutes(clockInAfternoon)
      : false;
    setClockOutAfternoon(now);
    setClockOutAfternoonNextDay(isOvernight);
    persistChanges({ clockOutAfternoon: now, clockOutAfternoonNextDay: isOvernight });
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

  // Next logical slot for system-time clock-in/out
  const nextSlot = (() => {
    if (leaveType === 'ferie') return null;
    if (!clockInMorning) {
      return { key: 'clockInMorning', label: 'Timbra Ingresso', type: 'entrata' as const };
    }
    if (!clockOutMorning) {
      return { key: 'clockOutMorning', label: 'Timbra Uscita', type: 'uscita' as const };
    }
    if (!clockInAfternoon) {
      return { key: 'clockInAfternoon', label: 'Timbra Rientro', type: 'entrata' as const };
    }
    if (!clockOutAfternoon) {
      return { key: 'clockOutAfternoon', label: 'Timbra Uscita', type: 'uscita' as const };
    }
    return null;
  })();

  const handleQuickStamp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextSlot) return;

    if (nextSlot.key === 'clockInMorning') {
      setInMorningNow();
    } else if (nextSlot.key === 'clockOutMorning') {
      setOutMorningNow();
    } else if (nextSlot.key === 'clockInAfternoon') {
      setInAfternoonNow();
    } else if (nextSlot.key === 'clockOutAfternoon') {
      setOutAfternoonNow();
    }
  };

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
      className={`bg-white rounded-2xl border border-[#E2E8F0] transition-all duration-200 shadow-xs relative overflow-hidden flex flex-col ${
        isExpanded
          ? 'p-6 ring-1 ring-[#0b5cd5]/10'
          : 'p-5 cursor-pointer hover:border-slate-300/80 hover:shadow-sm'
      }`}
    >
      {/* Top Section: Avatar, Name, Status, Hours Worked, Chevron Toggle */}
      <div
        onClick={(e) => {
          if (isExpanded) {
            e.stopPropagation();
            setIsExpanded(false);
          }
        }}
        className={`flex items-start justify-between ${
          isExpanded ? 'mb-5 cursor-pointer hover:opacity-90 transition-opacity' : ''
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 ${avatarStyle} rounded-full flex items-center justify-center font-bold text-sm tracking-tight`}
          >
            {getInitials(employee.name)}
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight text-[#101B32] font-sans">
              {employee.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {calculation.status === 'al_lavoro' && (
                <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
                  In servizio
                </span>
              )}
              {calculation.status === 'pausa' && (
                <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  In pausa
                </span>
              )}
              {calculation.status === 'completato' && (
                <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#64748B]"></span>
                  Fine turno
                </span>
              )}
              {calculation.status === 'ferie' && (
                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  In ferie
                </span>
              )}
              {calculation.status === 'permesso' && (
                <span className="text-xs font-semibold text-purple-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  In permesso ({formatMinutesToHM(currentPermessoMinutes || (leaveHours * 60))})
                </span>
              )}
              {calculation.status === 'non_timbrato' && (
                <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Assente
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Worked Hours and Expand/Collapse arrow */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-2xl font-bold text-[#101B32] font-sans">
              {calculation.status === 'ferie'
                ? '8h 00m'
                : calculation.status === 'non_timbrato'
                ? '0h 00m'
                : calculation.hoursWorkedFormatted}
            </div>
          </div>
          <div className="p-1 text-[#64748B] hover:text-[#101B32] transition-colors shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Progress & Target Section */}
      {(() => {
        const progressPct =
          standardMinutesToday > 0
            ? Math.min(100, Math.round((calculation.minutesWorked / standardMinutesToday) * 100))
            : calculation.minutesWorked > 0
            ? 100
            : 0;

        const formatMinutesLeft = (mins: number) => {
          const absMins = Math.abs(mins);
          const h = Math.floor(absMins / 60);
          const m = absMins % 60;
          if (h > 0) {
            return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
          }
          return `${m} min`;
        };

        const minutesLeft = standardMinutesToday - calculation.minutesWorked;

        return (
          <div className="space-y-1.5 my-3">
            {/* Target & Pct row */}
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Su {formatMinutesToHM(standardMinutesToday)} previste</span>
              <span className="text-[#101B32] font-bold">{progressPct}%</span>
            </div>

            {/* Progress bar */}
            {(() => {
              const progressBarColor = (() => {
                if (calculation.status === 'al_lavoro') return 'bg-[#16a34a]';
                if (calculation.status === 'pausa') return 'bg-amber-400';
                // completato, non_timbrato (assente), ferie, permesso are all gray
                return 'bg-[#64748B]';
              })();
              return (
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className={`${progressBarColor} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              );
            })()}

            {/* Time deficit or surplus */}
            <div className="flex items-center justify-between h-5 pt-0.5">
              <div>
                {standardMinutesToday > 0 ? (
                  minutesLeft > 0 ? (
                    isToday ? (
                      <span className="text-xs font-semibold text-[#64748B]">
                        Mancano {formatMinutesLeft(minutesLeft)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">
                        Deficit: {formatMinutesLeft(minutesLeft)}
                      </span>
                    )
                  ) : minutesLeft < 0 ? (
                    <span className="px-2 py-0.5 bg-[#e6f0fa] text-[#0b5cd5] rounded-md text-[10px] font-bold">
                      + {formatMinutesLeft(minutesLeft)} straordinario
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#0b5cd5]">
                      Completato
                    </span>
                  )
                ) : calculation.minutesWorked > 0 ? (
                  <span className="px-2 py-0.5 bg-[#e6f0fa] text-[#0b5cd5] rounded-md text-[10px] font-bold">
                    + {formatMinutesLeft(calculation.minutesWorked)} straordinario
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#64748B]">
                    Nessun orario previsto
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dividere e Timbrature (Visible by default) */}
      <div className="border-t border-[#E2E8F0] mt-3.5 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[44px]">
        <div className="flex-1">
          {(() => {
            const isOvernight = isAfternoonShiftOvernight(
              clockInAfternoon,
              clockOutAfternoon,
              clockOutAfternoonNextDay
            );

            const stampsList = [
              { label: 'Ingresso', value: clockInMorning, icon: LogIn, iconColor: 'text-[#0b5cd5]', badge: null },
              { label: 'Pausa', value: clockOutMorning, icon: Coffee, iconColor: 'text-amber-500', badge: null },
              { label: 'Rientro', value: clockInAfternoon, icon: LogIn, iconColor: 'text-blue-500', badge: null },
              {
                label: 'Uscita',
                value: clockOutAfternoon,
                icon: LogOut,
                iconColor: isOvernight ? 'text-indigo-600' : 'text-slate-500',
                badge: isOvernight ? '+1 gg 🌙' : null,
              },
            ].filter((s) => s.value);

            if (stampsList.length === 0) {
              return (
                <span className="text-xs text-[#64748B] italic">
                  {leaveType === 'ferie'
                    ? 'Ferie registrate per la giornata'
                    : leaveType === 'permesso'
                    ? 'Permesso registrato per la giornata'
                    : 'Nessuna timbratura registrata oggi'}
                </span>
              );
            }

            return (
              <div className="flex flex-wrap items-center gap-y-2 text-xs text-[#64748B]">
                {stampsList.map((stamp, sIdx) => (
                  <React.Fragment key={stamp.label}>
                    {sIdx > 0 && <div className="w-[1px] bg-[#E2E8F0] h-3.5 mx-3" />}
                    <div className="flex items-center gap-1.5">
                      <stamp.icon className={`w-3.5 h-3.5 ${stamp.iconColor}`} />
                      <span className="font-semibold text-[#64748B]">{stamp.label}</span>
                      <span className="font-mono font-bold text-[#101B32]">{stamp.value}</span>
                      {stamp.badge && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-[10px] font-bold rounded flex items-center gap-0.5">
                          {stamp.badge}
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          })()}
        </div>

        {!isExpanded && isToday && (
          <button
            type="button"
            onClick={handleQuickStamp}
            disabled={!nextSlot}
            className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 select-none shrink-0 ${
              !nextSlot
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : nextSlot.type === 'entrata'
                ? 'bg-[#16a34a] hover:bg-green-700 text-white active:scale-[0.98] cursor-pointer'
                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] cursor-pointer'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{nextSlot ? nextSlot.label : 'Turno completo'}</span>
          </button>
        )}
      </div>

      {/* Expanded Interactive Control Area */}
      {isExpanded && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="mt-5 pt-5 border-t border-[#E2E8F0] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {leaveType === 'ferie' ? (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col items-center text-center">
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
                Annulla Ferie e ripristina timbrature standard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Admin Unlock Panel */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs">
                {isAdminUnlocked ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
                      Modifica manuale sbloccata (Amministratore)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAdminUnlocked(false)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      Blocca modifiche
                    </button>
                  </div>
                ) : !showPasswordInput ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#64748B]">
                      L'inserimento orari manuale è disattivato.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInput(true)}
                      className="text-xs font-bold text-[#0b5cd5] hover:underline cursor-pointer"
                    >
                      Sblocca manuale
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (passwordValue === 'Mappescio2026@') {
                        setIsAdminUnlocked(true);
                        setPasswordError(false);
                        setShowPasswordInput(false);
                        setPasswordValue('');
                      } else {
                        setPasswordError(true);
                      }
                    }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#101B32]">Password Amministratore:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordInput(false);
                          setPasswordValue('');
                          setPasswordError(false);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                      >
                        Annulla
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Mappescio2026@..."
                        value={passwordValue}
                        onChange={(e) => {
                          setPasswordValue(e.target.value);
                          if (passwordError) setPasswordError(false);
                        }}
                        className={`flex-1 bg-white border ${
                          passwordError ? 'border-rose-500' : 'border-slate-200'
                        } rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#0b5cd5] focus:outline-none`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Sblocca
                      </button>
                    </div>
                    {passwordError && (
                      <span className="text-[10px] font-semibold text-rose-600">
                        Password errata. Riprova.
                      </span>
                    )}
                  </form>
                )}
              </div>

              {/* Timestamps inputs Grid */}
              <div className="grid grid-cols-1 gap-4">
                {/* Mattina Block */}
                <div className="bg-slate-50/50 border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Turno Mattina
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Entrata Mattina */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between ml-1">
                        <label
                          htmlFor={`in-morn-${employee.id}`}
                          className="text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          1ª Entrata
                        </label>
                        {isToday && clockInMorning ? (
                          <button
                            type="button"
                            onClick={() => {
                              setClockInMorning('');
                              persistChanges({ clockInMorning: '' });
                            }}
                            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancella
                          </button>
                        ) : isToday ? (
                          <button
                            type="button"
                            onClick={setInMorningNow}
                            className="text-[10px] font-bold text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                          >
                            Ora
                          </button>
                        ) : null}
                      </div>
                      {isAdminUnlocked ? (
                        <input
                          id={`in-morn-${employee.id}`}
                          type="time"
                          value={clockInMorning}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClockInMorning(val);
                            persistChanges({ clockInMorning: val });
                          }}
                          className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0b5cd5] focus:border-transparent outline-none transition-all shadow-2xs"
                        />
                      ) : (
                        <input
                          id={`in-morn-${employee.id}`}
                          type="time"
                          value={clockInMorning}
                          readOnly
                          className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-500 cursor-not-allowed outline-none shadow-2xs"
                        />
                      )}
                    </div>

                    {/* Uscita Mattina */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between ml-1">
                        <label
                          htmlFor={`out-morn-${employee.id}`}
                          className="text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          1ª Uscita
                        </label>
                        {isToday && clockOutMorning ? (
                          <button
                            type="button"
                            onClick={() => {
                              setClockOutMorning('');
                              persistChanges({ clockOutMorning: '' });
                            }}
                            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancella
                          </button>
                        ) : isToday ? (
                          <button
                            type="button"
                            onClick={setOutMorningNow}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          >
                            Ora
                          </button>
                        ) : null}
                      </div>
                      {isAdminUnlocked ? (
                        <input
                          id={`out-morn-${employee.id}`}
                          type="time"
                          value={clockOutMorning}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClockOutMorning(val);
                            persistChanges({ clockOutMorning: val });
                          }}
                          className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0b5cd5] focus:border-transparent outline-none transition-all shadow-2xs"
                        />
                      ) : (
                        <input
                          id={`out-morn-${employee.id}`}
                          type="time"
                          value={clockOutMorning}
                          readOnly
                          className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-500 cursor-not-allowed outline-none shadow-2xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Pomeriggio Block */}
                <div className="bg-slate-50/50 border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                      Turno Pomeriggio
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Entrata Pomeriggio */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between ml-1">
                        <label
                          htmlFor={`in-aft-${employee.id}`}
                          className="text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          2ª Entrata
                        </label>
                        {isToday && clockInAfternoon ? (
                          <button
                            type="button"
                            onClick={() => {
                              setClockInAfternoon('');
                              persistChanges({ clockInAfternoon: '' });
                            }}
                            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancella
                          </button>
                        ) : isToday ? (
                          <button
                            type="button"
                            onClick={setInAfternoonNow}
                            className="text-[10px] font-bold text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                          >
                            Ora
                          </button>
                        ) : null}
                      </div>
                      {isAdminUnlocked ? (
                        <input
                          id={`in-aft-${employee.id}`}
                          type="time"
                          value={clockInAfternoon}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClockInAfternoon(val);
                            persistChanges({ clockInAfternoon: val });
                          }}
                          className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0b5cd5] focus:border-transparent outline-none transition-all shadow-2xs"
                        />
                      ) : (
                        <input
                          id={`in-aft-${employee.id}`}
                          type="time"
                          value={clockInAfternoon}
                          readOnly
                          className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-500 cursor-not-allowed outline-none shadow-2xs"
                        />
                      )}
                    </div>

                    {/* Uscita Pomeriggio */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between ml-1">
                        <label
                          htmlFor={`out-aft-${employee.id}`}
                          className="text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          2ª Uscita
                        </label>
                        {isToday && clockOutAfternoon ? (
                          <button
                            type="button"
                            onClick={() => {
                              setClockOutAfternoon('');
                              persistChanges({ clockOutAfternoon: '' });
                            }}
                            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancella
                          </button>
                        ) : isToday ? (
                          <button
                            type="button"
                            onClick={setOutAfternoonNow}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          >
                            Ora
                          </button>
                        ) : null}
                      </div>
                      {isAdminUnlocked ? (
                        <input
                          id={`out-aft-${employee.id}`}
                          type="time"
                          value={clockOutAfternoon}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClockOutAfternoon(val);
                            const autoOvernight = clockInAfternoon && val ? timeToMinutes(val) <= timeToMinutes(clockInAfternoon) : false;
                            setClockOutAfternoonNextDay(autoOvernight);
                            persistChanges({ clockOutAfternoon: val, clockOutAfternoonNextDay: autoOvernight });
                          }}
                          className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0b5cd5] focus:border-transparent outline-none transition-all shadow-2xs"
                        />
                      ) : (
                        <input
                          id={`out-aft-${employee.id}`}
                          type="time"
                          value={clockOutAfternoon}
                          readOnly
                          className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-500 cursor-not-allowed outline-none shadow-2xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* Overnight shift notice & duration */}
                  {(() => {
                    const isOvernight = isAfternoonShiftOvernight(
                      clockInAfternoon,
                      clockOutAfternoon,
                      clockOutAfternoonNextDay
                    );

                    return (
                      <>
                        {clockInAfternoon && clockOutAfternoon && isOvernight && (
                          <div className="mt-3 p-2.5 bg-indigo-50/80 border border-indigo-200/80 rounded-lg flex items-center justify-between gap-2 text-xs text-indigo-900">
                            <div className="flex items-center gap-2">
                              <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>
                                <strong className="font-semibold">Turno notturno:</strong> uscita dopo la mezzanotte (+1 giorno).
                              </span>
                            </div>
                            <span className="font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                              Durata: {formatMinutesToHM(calculation.afternoonMinutes)}
                            </span>
                          </div>
                        )}

                        {isAdminUnlocked && clockInAfternoon && clockOutAfternoon && (
                          <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={clockOutAfternoonNextDay}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setClockOutAfternoonNextDay(checked);
                                persistChanges({ clockOutAfternoonNextDay: checked });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="flex items-center gap-1.5 font-medium">
                              <Moon className="w-3.5 h-3.5 text-indigo-600" />
                              Concluso dopo la mezzanotte (+1 giorno)
                            </span>
                          </label>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Exit During Turn (if enabled) */}
              {showExitDuringTurn && (
                <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3">
                  <span className="text-[11px] font-bold text-[#101B32] uppercase tracking-wider flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    Uscita temporanea durante il turno
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`exit-start-${employee.id}`} className="text-[10px] font-bold text-[#64748B] ml-1 uppercase">
                        Ora Uscita
                      </label>
                      <input
                        id={`exit-start-${employee.id}`}
                        type="time"
                        value={exitDuringTurnStart || ''}
                        onChange={(e) => handleExitDuringTurnStartChange(e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 outline-none shadow-2xs focus:ring-1 focus:ring-[#0b5cd5]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`exit-end-${employee.id}`} className="text-[10px] font-bold text-[#64748B] ml-1 uppercase">
                        Ora Rientro
                      </label>
                      <input
                        id={`exit-end-${employee.id}`}
                        type="time"
                        value={exitDuringTurnEnd || ''}
                        onChange={(e) => handleExitDuringTurnEndChange(e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-slate-800 outline-none shadow-2xs focus:ring-1 focus:ring-[#0b5cd5]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Permesso Giustificativo Block */}
              {leaveType === 'permesso' && (
                <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Giustificativo Permesso (Ore e Minuti)
                    </span>
                    {currentPermessoMinutes > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Applicato: +{formatMinutesToHM(currentPermessoMinutes)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Mancano: -{formatMinutesToHM(missingMinutes)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`perm-hours-${employee.id}`} className="text-[10px] font-bold text-purple-700 uppercase ml-1">
                        Ore
                      </label>
                      <input
                        id={`perm-hours-${employee.id}`}
                        type="number"
                        min="0"
                        max="8"
                        value={permessoHours}
                        onChange={(e) => handlePermessoHoursChange(parseInt(e.target.value) || 0)}
                        className="bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-purple-950 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`perm-mins-${employee.id}`} className="text-[10px] font-bold text-purple-700 uppercase ml-1">
                        Minuti
                      </label>
                      <input
                        id={`perm-mins-${employee.id}`}
                        type="number"
                        min="0"
                        max="59"
                        value={permessoMinutes}
                        onChange={(e) => handlePermessoMinutesChange(parseInt(e.target.value) || 0)}
                        className="bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold text-purple-950 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    {missingMinutes > 0 && currentPermessoMinutes < missingMinutes ? (
                      <button
                        type="button"
                        onClick={handleAutoCompensate}
                        className="text-purple-700 hover:text-purple-950 font-bold underline text-[11px] cursor-pointer"
                      >
                        Compensa saldo mancante ({formatMinutesToHM(missingMinutes)})
                      </button>
                    ) : (
                      <span />
                    )}

                    {currentPermessoMinutes > 0 && (
                      <button
                        type="button"
                        onClick={handleClearPermesso}
                        className="text-[#64748B] hover:text-rose-600 font-bold cursor-pointer text-[11px]"
                      >
                        Rimuovi permesso
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Note input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase ml-1">
                  Nota / Causale (Opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Trasferta, Smart working..."
                  value={notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    persistChanges({ notes: val });
                  }}
                  className="bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-[#64748B] focus:bg-white focus:ring-1 focus:ring-[#0b5cd5] outline-none"
                />
              </div>
            </div>
          )}

          {/* Contractual Inquadramento Info Box (Shifted to expanded view as per prompt) */}
          <div className="bg-[#F4F7FA] rounded-xl p-3.5 border border-[#E2E8F0] space-y-1 text-xs text-[#64748B]">
            <p className="font-bold text-[#101B32] uppercase tracking-wide text-[10px]">Inquadramento contrattuale</p>
            <p className="font-medium text-slate-700 mt-0.5">
              {employee.scheduleType === 'six_days'
                ? 'Orario: 7h 12m dal Lunedì al Venerdì, 4h il Sabato (36 ore settimanali)'
                : employee.scheduleType === 'standard_9h'
                ? 'Orario: 9h dal Lunedì al Venerdì (45 ore settimanali)'
                : 'Orario: 8h dal Lunedì al Venerdì (40 ore settimanali)'}
            </p>
          </div>

          {/* Action Footer: Auto-save feedback & triggers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F4F7FA] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]">
              <CheckCircle2
                className={`w-3.5 h-3.5 transition-all duration-200 ${
                  isSavedFeedback ? 'text-[#0b5cd5] scale-110' : 'text-[#64748B]'
                }`}
              />
              <span>{isSavedFeedback ? 'Salvato!' : 'Sincronizzazione cloud'}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleExitDuringTurn}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                  showExitDuringTurn
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F4F7FA]'
                }`}
              >
                {showExitDuringTurn ? 'In Uscita' : 'Uscita Turno'}
              </button>

              <button
                type="button"
                onClick={togglePermesso}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                  leaveType === 'permesso'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F4F7FA]'
                }`}
              >
                {leaveType === 'permesso' ? 'In Permesso' : 'Segna Permesso'}
              </button>

              <button
                type="button"
                onClick={toggleFerie}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                  leaveType === 'ferie'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F4F7FA]'
                }`}
              >
                {leaveType === 'ferie' ? 'In Ferie' : 'Segna Ferie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
