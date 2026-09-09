export interface Employee {
  id: string;
  name: string;
  role: string;
  color: string;
  avatarBg: string;
  standardHoursPerDay: number; // default 8
  ferieSpettanti: number; // default e.g. 26 days
  permessiSpettanti: number; // default e.g. 72 hours
  scheduleType?: 'standard_8h' | 'standard_9h' | 'six_days';
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  // 4 Timestamps: 2 mattina (entrata, uscita), 2 pomeriggio (entrata, uscita)
  clockInMorning: string; // HH:mm or ''
  clockOutMorning: string; // HH:mm or ''
  clockInAfternoon: string; // HH:mm or ''
  clockOutAfternoon: string; // HH:mm or ''
  // Legacy fields for backward compatibility
  clockIn?: string;
  clockOut?: string;
  breakMinutes?: number;
  notes?: string;
  leaveType?: 'none' | 'ferie' | 'permesso' | 'malattia';
  leaveHours?: number; // for partial permesso, e.g. 2, 4, 8 or decimal
  permessoHours?: number; // Ore permesso manuale
  permessoMinutes?: number; // Minuti permesso manuale
  permessoStart?: string; // Orario inizio permesso HH:mm
  permessoEnd?: string; // Orario fine permesso HH:mm
  exitDuringTurnStart?: string; // Orario uscita durante il turno HH:mm
  exitDuringTurnEnd?: string; // Orario rientro durante il turno HH:mm
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'ferie' | 'permesso' | 'malattia' | 'congedo';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  hoursPerDay: number; // e.g. 8 for ferie, 1-8 for permesso
  notes?: string;
  status: 'approvato' | 'in_attesa' | 'rifiutato';
  createdAt: string;
}

export interface DayCalculation {
  minutesWorked: number;
  hoursWorkedFormatted: string;
  morningMinutes?: number;
  afternoonMinutes?: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  overtimeFormatted: string;
  isDeficit: boolean;
  deficitMinutes: number;
  deficitFormatted: string;
  isLive: boolean; // clock in set, clock out not set
  status: 'al_lavoro' | 'pausa' | 'completato' | 'non_timbrato' | 'ferie' | 'permesso';
  effectiveMinutesWorked?: number;
  effectiveHoursFormatted?: string;
}

export interface EmployeeMonthlySummary {
  employee: Employee;
  daysWorked: number;
  totalRegularMinutes: number;
  totalOvertimeMinutes: number;
  totalDeficitMinutes: number;
  netBalanceMinutes: number; // overtime - deficit
  ferieDaysUsed: number;
  permessiHoursUsed: number;
  malattiaDaysUsed: number;
}
