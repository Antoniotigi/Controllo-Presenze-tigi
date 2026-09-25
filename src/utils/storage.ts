import { Employee, TimeRecord, LeaveRequest } from '../types';
import { getTodayDateString } from './timeUtils';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Antonio Santoro',
    role: '',
    color: 'indigo',
    avatarBg: 'bg-indigo-600',
    standardHoursPerDay: 8,
    ferieSpettanti: 26,
    permessiSpettanti: 88,
    scheduleType: 'standard_8h',
  },
  {
    id: 'emp-2',
    name: 'Luca Cardinali',
    role: '',
    color: 'amber',
    avatarBg: 'bg-amber-600',
    standardHoursPerDay: 8,
    ferieSpettanti: 26,
    permessiSpettanti: 88,
    scheduleType: 'standard_8h',
  },
  {
    id: 'emp-3',
    name: 'Andre Rossi',
    role: '',
    color: 'rose',
    avatarBg: 'bg-rose-600',
    standardHoursPerDay: 8,
    ferieSpettanti: 26,
    permessiSpettanti: 88,
    scheduleType: 'standard_8h',
  },
  {
    id: 'emp-4',
    name: 'Dario Clemente',
    role: '',
    color: 'sky',
    avatarBg: 'bg-sky-600',
    standardHoursPerDay: 8,
    ferieSpettanti: 26,
    permessiSpettanti: 88,
    scheduleType: 'six_days',
  },
];

const EMPLOYEES_KEY = 'timbrature_employees_v2';
const RECORDS_KEY = 'timbrature_records_v3';
const LEAVES_KEY = 'timbrature_leaves_v2';

/**
 * Generates initial empty records (all cartellini clock times cleared).
 */
function generateSeedRecords(): TimeRecord[] {
  return [
    {
      id: 'rec-emp-1-2026-09-24',
      employeeId: 'emp-1',
      date: '2026-09-24',
      clockInMorning: '07:15',
      clockOutMorning: '',
      clockInAfternoon: '',
      clockOutAfternoon: '00:45',
      clockOutAfternoonNextDay: true,
      clockIn: '07:15',
      clockOut: '00:45',
      leaveType: 'none',
      leaveHours: 0,
      notes: 'Turno unico continuato a cavallo della mezzanotte',
      updatedAt: new Date().toISOString(),
    }
  ];
}

/**
 * Clears all clock times from time records (svuota tutti gli orari).
 */
export function clearAllCartelliniTimes(records: TimeRecord[]): TimeRecord[] {
  return records.map((r) => ({
    ...r,
    clockInMorning: '',
    clockOutMorning: '',
    clockInAfternoon: '',
    clockOutAfternoon: '',
    clockOutAfternoonNextDay: false,
    clockIn: '',
    clockOut: '',
    notes: '',
    leaveType: 'none',
    leaveHours: 0,
    permessoHours: 0,
    permessoMinutes: 0,
    updatedAt: new Date().toISOString(),
  }));
}

export function getEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (!raw) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    const parsed: Employee[] = JSON.parse(raw);
    const isOldNames = parsed.some((e) => e.name === 'Marco Rossi' || e.name === 'Giulia Bianchi');
    if (isOldNames) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return parsed.map((e) => {
      let scheduleType = e.scheduleType;
      if (!scheduleType) {
        scheduleType = e.id === 'emp-4' || e.name.toLowerCase().includes('dario') ? 'six_days' : 'standard_8h';
      }
      return {
        ...e,
        role: '',
        scheduleType,
        permessiSpettanti: e.permessiSpettanti === 72 || !e.permessiSpettanti ? 88 : e.permessiSpettanti,
      };
    });
  } catch (err) {
    console.error('Failed to parse employees', err);
    return INITIAL_EMPLOYEES;
  }
}

export function saveEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch (err) {
    console.error('Failed to save employees', err);
  }
}

export function getTimeRecords(): TimeRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      const initial = generateSeedRecords();
      localStorage.setItem(RECORDS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse time records', err);
    return [];
  }
}

export function saveTimeRecords(records: TimeRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save time records', err);
  }
}

export function getLeaveRequests(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(LEAVES_KEY);
    if (!raw) {
      localStorage.setItem(LEAVES_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse leaves', err);
    return [];
  }
}

export function saveLeaveRequests(leaves: LeaveRequest[]): void {
  try {
    localStorage.setItem(LEAVES_KEY, JSON.stringify(leaves));
  } catch (err) {
    console.error('Failed to save leaves', err);
  }
}

export function resetAllData(): { employees: Employee[]; records: TimeRecord[]; leaves: LeaveRequest[] } {
  localStorage.removeItem(EMPLOYEES_KEY);
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(LEAVES_KEY);

  const employees = INITIAL_EMPLOYEES;
  const records = generateSeedRecords();
  const leaves: LeaveRequest[] = [];

  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  localStorage.setItem(LEAVES_KEY, JSON.stringify(leaves));

  return { employees, records, leaves };
}
