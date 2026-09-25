import { TimeRecord, DayCalculation, Employee } from '../types';

export const STANDARD_MINUTES_PER_DAY = 8 * 60; // 480 minutes (8 hours)

/**
 * Parses "HH:mm" to minutes from midnight (0 - 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Formats minutes into "Xh Ym" or "0h 00m".
 */
export function formatMinutesToHM(minutes: number, showSign = false): string {
  const isNegative = minutes < 0;
  const absMin = Math.abs(Math.round(minutes));
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const sign = isNegative ? '-' : showSign && minutes > 0 ? '+' : '';
  const mFormatted = m.toString().padStart(2, '0');
  return `${sign}${h}h ${mFormatted}m`;
}

/**
 * Formats minutes into decimal hours string, e.g. "8.50".
 */
export function formatMinutesToDecimal(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(2);
}

/**
 * Get current system time as "HH:mm".
 */
export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Get current date as "YYYY-MM-DD" in local timezone.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats date "YYYY-MM-DD" into Italian localized format e.g. "Venerdì, 4 Settembre 2026"
 */
export function formatDateIT(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats month "YYYY-MM" into Italian format e.g. "Settembre 2026"
 */
export function formatMonthIT(yearMonthStr: string): string {
  if (!yearMonthStr) return '';
  const [y, m] = yearMonthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const monthName = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

/**
 * Calculates minutes between two "HH:mm" time strings.
 * Supports intervals that cross midnight if end < start.
 */
export function getMinutesBetweenTimes(start: string, end: string, allowOvernight = true): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins < startMins && allowOvernight) {
    return (24 * 60 - startMins) + endMins;
  }
  return Math.max(0, endMins - startMins);
}

/**
 * Checks whether the afternoon/evening shift concludes after midnight (overnight shift, +1 day).
 * Returns true if:
 * 1. record has clockOutAfternoonNextDay explicitly set to true, OR
 * 2. both clockInAfternoon and clockOutAfternoon are present and clockOutAfternoon <= clockInAfternoon
 *    (e.g., In: 18:00 (1080), Out: 01:30 (90) -> 01:30 is next calendar day after midnight).
 */
export function isAfternoonShiftOvernight(
  clockInAfternoon?: string,
  clockOutAfternoon?: string,
  clockOutAfternoonNextDay?: boolean,
  clockInMorning?: string,
  clockOutMorning?: string
): boolean {
  if (clockOutAfternoonNextDay === true) return true;
  if (clockOutAfternoonNextDay === false) return false;

  // Case 1: Standard afternoon shift
  if (clockInAfternoon && clockOutAfternoon) {
    const inMins = timeToMinutes(clockInAfternoon);
    const outMins = timeToMinutes(clockOutAfternoon);
    return outMins <= inMins;
  }

  // Case 2: Single shift from morning to afternoon (inMorning & outAfternoon, other two empty)
  if (clockInMorning && clockOutAfternoon && !clockOutMorning && !clockInAfternoon) {
    const inMins = timeToMinutes(clockInMorning);
    const outMins = timeToMinutes(clockOutAfternoon);
    return outMins <= inMins;
  }

  return false;
}

/**
 * Calculates total worked minutes for afternoon/evening shift,
 * taking into account shifts that cross midnight (+1 day).
 */
export function getAfternoonWorkedMinutes(
  clockInAfternoon?: string,
  clockOutAfternoon?: string,
  clockOutAfternoonNextDay?: boolean
): number {
  if (!clockInAfternoon || !clockOutAfternoon) return 0;
  const inMins = timeToMinutes(clockInAfternoon);
  const outMins = timeToMinutes(clockOutAfternoon);

  const isOvernight = isAfternoonShiftOvernight(
    clockInAfternoon,
    clockOutAfternoon,
    clockOutAfternoonNextDay
  );

  if (isOvernight) {
    return (24 * 60 - inMins) + outMins;
  }
  return Math.max(0, outMins - inMins);
}

/**
 * Get date string for yesterday "YYYY-MM-DD" based on a reference date (defaults to today).
 */
export function getYesterdayDateString(refDateStr?: string): string {
  const ref = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
  ref.setDate(ref.getDate() - 1);
  const y = ref.getFullYear();
  const m = (ref.getMonth() + 1).toString().padStart(2, '0');
  const d = ref.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Gets total permesso minutes from record (supporting start/end times, exit during turn, hours & minutes, or legacy leaveHours).
 */
export function getPermessoMinutes(record?: TimeRecord | null): number {
  if (!record || record.leaveType !== 'permesso') return 0;
  if (record.permessoStart && record.permessoEnd) {
    return getMinutesBetweenTimes(record.permessoStart, record.permessoEnd);
  }
  if (record.exitDuringTurnStart && record.exitDuringTurnEnd) {
    return getMinutesBetweenTimes(record.exitDuringTurnStart, record.exitDuringTurnEnd);
  }
  if (record.permessoHours !== undefined || record.permessoMinutes !== undefined) {
    return Math.max(0, (record.permessoHours || 0) * 60 + (record.permessoMinutes || 0));
  }
  if (record.leaveHours) {
    return Math.max(0, Math.round(record.leaveHours * 60));
  }
  return 0;
}

/**
 * Helper to extract safe 4 timestamps (Mattina In/Out, Pomeriggio In/Out)
 * supporting both new format and legacy records.
 */
export function getRecordTimestamps(record?: TimeRecord | null) {
  if (!record) {
    return {
      clockInMorning: '',
      clockOutMorning: '',
      clockInAfternoon: '',
      clockOutAfternoon: '',
      clockOutAfternoonNextDay: false,
    };
  }

  const hasNewFields =
    record.clockInMorning !== undefined ||
    record.clockOutMorning !== undefined ||
    record.clockInAfternoon !== undefined ||
    record.clockOutAfternoon !== undefined;

  const isOvernight = isAfternoonShiftOvernight(
    record.clockInAfternoon || '',
    record.clockOutAfternoon || record.clockOut || '',
    record.clockOutAfternoonNextDay,
    record.clockInMorning || record.clockIn || '',
    record.clockOutMorning || ''
  );

  if (hasNewFields) {
    return {
      clockInMorning: record.clockInMorning || '',
      clockOutMorning: record.clockOutMorning || '',
      clockInAfternoon: record.clockInAfternoon || '',
      clockOutAfternoon: record.clockOutAfternoon || '',
      clockOutAfternoonNextDay: isOvernight,
    };
  }

  // Fallback for legacy record
  if (record.clockIn && record.clockOut) {
    return {
      clockInMorning: record.clockIn,
      clockOutMorning: '12:30',
      clockInAfternoon: '13:30',
      clockOutAfternoon: record.clockOut,
      clockOutAfternoonNextDay: isOvernight,
    };
  }

  return {
    clockInMorning: record.clockIn || '',
    clockOutMorning: '',
    clockInAfternoon: '',
    clockOutAfternoon: record.clockOut || '',
    clockOutAfternoonNextDay: isOvernight,
  };
}

/**
 * Calculates Gregorian Easter date for a given year using the Meeus/Jones/Butcher algorithm.
 */
export function getEasterDate(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

/**
 * Checks if a given date string "YYYY-MM-DD" is a public holiday in Italy.
 */
export function isHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;

  const fixedHolidays = [
    '01-01', // Capodanno
    '01-06', // Epifania
    '04-25', // Liberazione
    '05-01', // Festa del Lavoro
    '06-02', // Festa della Repubblica
    '08-15', // Ferragosto
    '11-01', // Tutti i Santi
    '12-08', // Immacolata
    '12-25', // Natale
    '12-26', // Santo Stefano
  ];

  const md = `${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  if (fixedHolidays.includes(md)) {
    return true;
  }

  // Easter and Easter Monday
  const easter = getEasterDate(y);
  const easterMonth = easter.getMonth() + 1;
  const easterDay = easter.getDate();

  if (m === easterMonth && d === easterDay) {
    return true;
  }

  const easterMonday = new Date(easter.getTime() + 24 * 60 * 60 * 1000);
  const emMonth = easterMonday.getMonth() + 1;
  const emDay = easterMonday.getDate();

  if (m === emMonth && d === emDay) {
    return true;
  }

  return false;
}

/**
 * Gets day of week for a "YYYY-MM-DD" date string (0 = Sunday, 6 = Saturday).
 */
export function getDayOfWeek(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
  const date = new Date(y, m - 1, d);
  return date.getDay();
}

/**
 * Returns standard target minutes for an employee on a given date string "YYYY-MM-DD"
 */
export function getStandardMinutesForDay(dateStr: string, employee?: Employee | null): number {
  const isHolidayDay = isHoliday(dateStr);
  const dayOfWeek = getDayOfWeek(dateStr); // 0 = Sunday, 6 = Saturday

  // Sundays and Holidays are always non-working (0 target minutes)
  if (dayOfWeek === 0 || isHolidayDay) {
    return 0;
  }

  const schedule = employee?.scheduleType || 'standard_8h';

  if (schedule === 'six_days') {
    // 7h 12m Mon-Fri (432 mins), 4h Saturday (240 mins)
    if (dayOfWeek === 6) {
      return 4 * 60; // 240 minutes
    } else {
      return 7 * 60 + 12; // 432 minutes
    }
  } else if (schedule === 'standard_9h') {
    // 9h Mon-Fri (540 mins), Saturday 0 mins
    if (dayOfWeek === 6) {
      return 0;
    } else {
      return 9 * 60; // 540 minutes
    }
  } else {
    // standard_8h or default
    if (dayOfWeek === 6) {
      return 0;
    } else {
      return 8 * 60; // 480 minutes
    }
  }
}

/**
 * Calculates overlap in minutes between permission interval (pStart, pEnd) and a work shift (shiftStart, shiftEnd).
 */
export function getOverlapMinutes(
  pStart: string,
  pEnd: string,
  shiftStart: string,
  shiftEnd: string
): number {
  if (!pStart || !pEnd || !shiftStart || !shiftEnd) return 0;
  const ps = timeToMinutes(pStart);
  const pe = timeToMinutes(pEnd);
  const ss = timeToMinutes(shiftStart);
  const se = timeToMinutes(shiftEnd);

  const start = Math.max(ps, ss);
  const end = Math.min(pe, se);

  return Math.max(0, end - start);
}

/**
 * Calculates working time, overtime, and recovery for a given record
 * based on 4 daily stamps: 2 for morning (Entrata/Uscita), 2 for afternoon (Entrata/Uscita).
 * Supports live count during active morning or afternoon shifts.
 */
export function calculateRecord(
  record?: TimeRecord | null,
  currentSystemTimeHHMM?: string,
  isToday = false,
  employee?: Employee | null
): DayCalculation {
  if (!record) {
    return {
      minutesWorked: 0,
      hoursWorkedFormatted: '0h 00m',
      morningMinutes: 0,
      afternoonMinutes: 0,
      isOvertime: false,
      overtimeMinutes: 0,
      overtimeFormatted: '+0h 00m',
      isDeficit: false,
      deficitMinutes: 0,
      deficitFormatted: '-0h 00m',
      isLive: false,
      status: 'non_timbrato',
      effectiveMinutesWorked: 0,
      effectiveHoursFormatted: '0h 00m',
    };
  }

  const standardMins = getStandardMinutesForDay(record.date, employee);

  // Check if Ferie
  if (record.leaveType === 'ferie') {
    return {
      minutesWorked: standardMins,
      hoursWorkedFormatted: `${formatMinutesToHM(standardMins)} (Ferie)`,
      morningMinutes: Math.floor(standardMins / 2),
      afternoonMinutes: standardMins - Math.floor(standardMins / 2),
      isOvertime: false,
      overtimeMinutes: 0,
      overtimeFormatted: '+0h 00m',
      isDeficit: false,
      deficitMinutes: 0,
      deficitFormatted: '-0h 00m',
      isLive: false,
      status: 'ferie',
      effectiveMinutesWorked: standardMins,
      effectiveHoursFormatted: formatMinutesToHM(standardMins),
    };
  }

  const { clockInMorning, clockOutMorning, clockInAfternoon, clockOutAfternoon, clockOutAfternoonNextDay } =
    getRecordTimestamps(record);
  const permMins = getPermessoMinutes(record);

  // Check if Permesso without any stamps
  if (
    record.leaveType === 'permesso' &&
    (!clockInMorning && !clockInAfternoon)
  ) {
    const leaveMins = permMins || (record.leaveHours || 8) * 60;
    const deficit = Math.max(0, standardMins - leaveMins);
    return {
      minutesWorked: 0,
      hoursWorkedFormatted: '0h 00m (Permesso)',
      morningMinutes: 0,
      afternoonMinutes: 0,
      isOvertime: false,
      overtimeMinutes: 0,
      overtimeFormatted: '+0h 00m',
      isDeficit: deficit > 0,
      deficitMinutes: deficit,
      deficitFormatted: formatMinutesToHM(deficit, true),
      isLive: false,
      status: 'permesso',
      effectiveMinutesWorked: leaveMins,
      effectiveHoursFormatted: formatMinutesToHM(leaveMins),
    };
  }

  // If no stamps at all
  if (!clockInMorning && !clockInAfternoon) {
    const todayStr = getTodayDateString();
    const isPastDay = record.date < todayStr;
    const hasJustification = record.leaveType && record.leaveType !== 'none';
    const isDeficit = isPastDay && standardMins > 0 && !hasJustification;
    const deficitMinutes = isDeficit ? standardMins : 0;

    return {
      minutesWorked: 0,
      hoursWorkedFormatted: '0h 00m',
      morningMinutes: 0,
      afternoonMinutes: 0,
      isOvertime: false,
      overtimeMinutes: 0,
      overtimeFormatted: '+0h 00m',
      isDeficit,
      deficitMinutes,
      deficitFormatted: isDeficit ? `-${formatMinutesToHM(standardMins)}` : '-0h 00m',
      isLive: false,
      status: 'non_timbrato',
      effectiveMinutesWorked: 0,
      effectiveHoursFormatted: '0h 00m',
    };
  }

  const sysTime = currentSystemTimeHHMM || getCurrentTimeHHMM();
  const sysMins = timeToMinutes(sysTime);

  let morningMinutes = 0;
  let isLiveMorning = false;
  let afternoonMinutes = 0;
  let isLiveAfternoon = false;

  const inMornMins = clockInMorning ? timeToMinutes(clockInMorning) : 0;
  const outMornMins = clockOutMorning ? timeToMinutes(clockOutMorning) : 0;
  const inAftMins = clockInAfternoon ? timeToMinutes(clockInAfternoon) : 0;
  const outAftMins = clockOutAfternoon ? timeToMinutes(clockOutAfternoon) : 0;

  // Single shift from morning to afternoon (Case 1: inMorning & outAfternoon, other two empty)
  if (clockInMorning && clockOutAfternoon && !clockOutMorning && !clockInAfternoon) {
    const isOvernight = clockOutAfternoonNextDay || (outAftMins <= inMornMins);
    if (isOvernight) {
      afternoonMinutes = (24 * 60 - inMornMins) + outAftMins;
    } else {
      afternoonMinutes = Math.max(0, outAftMins - inMornMins);
    }
  }
  // Single shift in morning (Case 2: inMorning & outMorning, other two empty)
  else if (clockInMorning && clockOutMorning && !clockInAfternoon && !clockOutAfternoon) {
    const isOvernight = outMornMins <= inMornMins;
    if (isOvernight) {
      morningMinutes = (24 * 60 - inMornMins) + outMornMins;
    } else {
      morningMinutes = Math.max(0, outMornMins - inMornMins);
    }
  }
  // Single shift in afternoon (Case 3: inAfternoon & outAfternoon, other two empty)
  else if (clockInAfternoon && clockOutAfternoon && !clockInMorning && !clockOutMorning) {
    const isOvernight = clockOutAfternoonNextDay || (outAftMins <= inAftMins);
    if (isOvernight) {
      afternoonMinutes = (24 * 60 - inAftMins) + outAftMins;
    } else {
      afternoonMinutes = Math.max(0, outAftMins - inAftMins);
    }
  }
  // Standard or mixed shifts
  else {
    if (clockInMorning) {
      if (clockOutMorning) {
        const isOvernight = outMornMins <= inMornMins;
        if (isOvernight) {
          morningMinutes = (24 * 60 - inMornMins) + outMornMins;
        } else {
          morningMinutes = Math.max(0, outMornMins - inMornMins);
        }
      } else if (isToday) {
        morningMinutes = Math.max(0, sysMins - inMornMins);
        isLiveMorning = true;
      }
    }

    if (clockInAfternoon) {
      if (clockOutAfternoon) {
        const isOvernight = clockOutAfternoonNextDay || (outAftMins <= inAftMins);
        if (isOvernight) {
          afternoonMinutes = (24 * 60 - inAftMins) + outAftMins;
        } else {
          afternoonMinutes = Math.max(0, outAftMins - inAftMins);
        }
      } else if (isToday) {
        if (sysMins >= inAftMins) {
          afternoonMinutes = sysMins - inAftMins;
        } else {
          afternoonMinutes = (24 * 60 - inAftMins) + sysMins;
        }
        isLiveAfternoon = true;
      } else {
        const todayStr = getTodayDateString();
        const yesterdayStr = getYesterdayDateString(todayStr);
        if (record.date === yesterdayStr) {
          const elapsed = (24 * 60 - inAftMins) + sysMins;
          if (elapsed > 0 && elapsed <= 18 * 60) {
            afternoonMinutes = elapsed;
            isLiveAfternoon = true;
          }
        }
      }
    }
  }

  let netWorked = morningMinutes + afternoonMinutes;

  // Subtract explicit "Uscita durante il turno di lavoro" from physical worked hours if present
  let exitDuration = 0;
  if (record.exitDuringTurnStart && record.exitDuringTurnEnd) {
    exitDuration = getMinutesBetweenTimes(record.exitDuringTurnStart, record.exitDuringTurnEnd, true);
  }
  netWorked = Math.max(0, netWorked - exitDuration);

  const isLive = isLiveMorning || isLiveAfternoon;
  
  // Calculate overtime and deficit using permission as a justification offset
  // Permesso cannot generate overtime, it only compensates up to the standard daily hours
  const maxPermAllowed = Math.max(0, standardMins - netWorked);
  const appliedPermMins = record.leaveType === 'permesso' ? Math.min(permMins, maxPermAllowed) : 0;
  const totalMinsWithJustification = netWorked + appliedPermMins;
  const diffFromStandard = totalMinsWithJustification - standardMins;
  
  const isOvertime = diffFromStandard > 0;
  const overtimeMinutes = isOvertime ? diffFromStandard : 0;

  // Deficit is flagged when day shift is complete or day has past
  const isFinished =
    clockOutAfternoon !== '' ||
    (!isToday && !isLive && (clockInMorning !== '' || clockInAfternoon !== ''));
  const isDeficit = diffFromStandard < 0 && isFinished && !isLive && standardMins > 0;
  const deficitMinutes = isDeficit ? Math.abs(diffFromStandard) : 0;

  let status: DayCalculation['status'] = 'completato';
  if (isLive) {
    status = 'al_lavoro';
  } else if (isToday && clockInMorning && clockOutMorning && !clockInAfternoon) {
    status = 'pausa'; // Morning shift ended, afternoon shift not yet started
  } else if (record.leaveType === 'permesso' && (!clockInMorning && !clockInAfternoon)) {
    status = 'permesso';
  } else if (!isFinished && !clockInMorning && !clockInAfternoon) {
    status = 'non_timbrato';
  }

  // Calculate diurnal, night, and holiday overtime splits
  let overtimeDiurniMinutes = 0;
  let overtimeNotturniMinutes = 0;
  let overtimeFestiviMinutes = 0;

  if (overtimeMinutes > 0 && record) {
    const isHolidayDay = isHoliday(record.date) || getDayOfWeek(record.date) === 0;
    if (isHolidayDay) {
      overtimeFestiviMinutes = overtimeMinutes;
    } else {
      const intervals: { start: number; end: number }[] = [];
      const times = getRecordTimestamps(record);
      
      const inMorn = times.clockInMorning ? timeToMinutes(times.clockInMorning) : 0;
      const outMorn = times.clockOutMorning ? timeToMinutes(times.clockOutMorning) : 0;
      const inAft = times.clockInAfternoon ? timeToMinutes(times.clockInAfternoon) : 0;
      const outAft = times.clockOutAfternoon ? timeToMinutes(times.clockOutAfternoon) : 0;

      if (times.clockInMorning && times.clockOutAfternoon && !times.clockOutMorning && !times.clockInAfternoon) {
        const isOvernight = times.clockOutAfternoonNextDay || (outAft <= inMorn);
        intervals.push({ start: inMorn, end: isOvernight ? 1440 + outAft : outAft });
      } else if (times.clockInMorning && times.clockOutMorning && !times.clockInAfternoon && !times.clockOutAfternoon) {
        const isOvernight = outMorn <= inMorn;
        intervals.push({ start: inMorn, end: isOvernight ? 1440 + outMorn : outMorn });
      } else if (times.clockInAfternoon && times.clockOutAfternoon && !times.clockInMorning && !times.clockOutMorning) {
        const isOvernight = times.clockOutAfternoonNextDay || (outAft <= inAft);
        intervals.push({ start: inAft, end: isOvernight ? 1440 + outAft : outAft });
      } else {
        if (times.clockInMorning && times.clockOutMorning) {
          const isOvernight = outMorn <= inMorn;
          intervals.push({ start: inMorn, end: isOvernight ? 1440 + outMorn : outMorn });
        }
        if (times.clockInAfternoon && times.clockOutAfternoon) {
          const isOvernight = times.clockOutAfternoonNextDay || (outAft <= inAft);
          intervals.push({ start: inAft, end: isOvernight ? 1440 + outAft : outAft });
        }
      }

      let finalIntervals: { start: number; end: number }[] = [];
      if (record.exitDuringTurnStart && record.exitDuringTurnEnd) {
        const exS = timeToMinutes(record.exitDuringTurnStart);
        const exE = timeToMinutes(record.exitDuringTurnEnd);
        for (const iv of intervals) {
          if (exE <= iv.start || exS >= iv.end) {
            finalIntervals.push(iv);
          } else {
            if (exS > iv.start) {
              finalIntervals.push({ start: iv.start, end: exS });
            }
            if (exE < iv.end) {
              finalIntervals.push({ start: exE, end: iv.end });
            }
          }
        }
      } else {
        finalIntervals = intervals;
      }

      const workedMinutesList: number[] = [];
      for (const iv of finalIntervals) {
        for (let m = iv.start; m < iv.end; m++) {
          workedMinutesList.push(m);
        }
      }

      const otList = workedMinutesList.slice(-overtimeMinutes);
      for (const m of otList) {
        const minInDay = m % 1440;
        const isNight = minInDay >= 1320 || minInDay < 360;
        if (isNight) {
          overtimeNotturniMinutes++;
        } else {
          overtimeDiurniMinutes++;
        }
      }
    }
  }

  return {
    minutesWorked: netWorked,
    hoursWorkedFormatted: formatMinutesToHM(netWorked),
    morningMinutes,
    afternoonMinutes,
    isOvertime,
    overtimeMinutes,
    overtimeFormatted: `+${formatMinutesToHM(overtimeMinutes)}`,
    isDeficit,
    deficitMinutes,
    deficitFormatted: `-${formatMinutesToHM(deficitMinutes)}`,
    isLive,
    status,
    effectiveMinutesWorked: totalMinsWithJustification,
    effectiveHoursFormatted: formatMinutesToHM(totalMinsWithJustification),
    overtimeDiurniMinutes,
    overtimeNotturniMinutes,
    overtimeFestiviMinutes,
  };
}

/**
 * Returns all date strings "YYYY-MM-DD" for a given month "YYYY-MM".
 */
export function getDaysInMonth(monthYear: string): string[] {
  if (!monthYear || monthYear.length !== 7) return [];
  const [year, month] = monthYear.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return [];

  const days: string[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Returns a complete list of records for a given month, generating dummy empty records
 * for any missing dates for each of the selected employees.
 */
export function getCompleteMonthRecords(
  monthYear: string,
  employees: Employee[],
  existingRecords: TimeRecord[],
  selectedEmpId: string = 'all'
): TimeRecord[] {
  const days = getDaysInMonth(monthYear);
  const empsToInclude = selectedEmpId === 'all' 
    ? employees 
    : employees.filter(e => e.id === selectedEmpId);

  const completeList: TimeRecord[] = [];

  for (const dateStr of days) {
    for (const emp of empsToInclude) {
      const existing = existingRecords.find(
        (r) => r.employeeId === emp.id && r.date === dateStr
      );
      if (existing) {
        completeList.push(existing);
      } else {
        // Create a dummy record with empty stamps
        completeList.push({
          id: `dummy-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          clockInMorning: '',
          clockOutMorning: '',
          clockInAfternoon: '',
          clockOutAfternoon: '',
          leaveType: 'none',
          leaveHours: 0,
          notes: '',
          updatedAt: '',
        });
      }
    }
  }

  // Sort by date first, then by employee
  return completeList.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.employeeId.localeCompare(b.employeeId);
  });
}
