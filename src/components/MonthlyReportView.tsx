import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Users,
  ChevronDown,
  User,
} from 'lucide-react';
import { Employee, TimeRecord, LeaveRequest } from '../types';
import {
  formatMonthIT,
  calculateRecord,
  formatMinutesToHM,
  getRecordTimestamps,
  getCompleteMonthRecords,
} from '../utils/timeUtils';
import {
  computeMonthlyStats,
  exportToExcel,
  exportToPDF,
  MonthlyStatsPerEmployee,
} from '../utils/exportUtils';

interface MonthlyReportViewProps {
  employees: Employee[];
  records: TimeRecord[];
  leaves: LeaveRequest[];
  currentDate: string;
  onBackToCards: () => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  employees,
  records,
  leaves,
  currentDate,
  onBackToCards,
}) => {
  // Current selected month: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentDate.slice(0, 7)
  );
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Compute monthly stats for all 4 employees
  const stats: MonthlyStatsPerEmployee[] = computeMonthlyStats(
    selectedMonth,
    employees,
    records,
    leaves
  );

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newY = d.getFullYear();
    const newM = (d.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newY = d.getFullYear();
    const newM = (d.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleExcelExport = () => {
    setIsExportingExcel(true);
    try {
      exportToExcel(selectedMonth, employees, records, leaves);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsExportingExcel(false), 1000);
    }
  };

  const handlePDFExport = (employeeId: string = 'all') => {
    setIsExportingPDF(true);
    try {
      exportToPDF(selectedMonth, employees, records, leaves, employeeId);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 1000);
    }
  };

  // Filtered detailed daily records (all days in month generated dynamically)
  const monthRecords = getCompleteMonthRecords(
    selectedMonth,
    employees,
    records,
    selectedEmployeeFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Bar with Month Selector and Export Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 text-[#16a34a] rounded-2xl flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Cartellino Mensile & Esportazione
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Riepilogo ore, calcolo straordinari, ore di recupero e download ufficiale
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 font-mono min-w-[130px] text-center">
              {formatMonthIT(selectedMonth)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export to PDF with Employee Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={isExportingPDF}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-200 flex items-center gap-2 transition-all cursor-pointer"
              title="Esporta il cartellino mensile e il registro giornaliero in formato PDF"
            >
              <FileText className="w-4 h-4 text-[#0b5cd5]" />
              <span>{isExportingPDF ? 'Generazione...' : 'Esporta PDF'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
            </button>

            {isExportDropdownOpen && (
              <>
                {/* Backdrop to close dropdown on outer click */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Seleziona opzione
                  </div>
                  
                  {/* Export All */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handlePDFExport('all');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Esporta Tutti</span>
                  </button>

                  <div className="border-t border-slate-100 my-1.5" />

                  {/* Individual Employees */}
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handlePDFExport(emp.id);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">Esporta {emp.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onBackToCards}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ← Timbrature
          </button>
        </div>
      </div>



      {/* Summary Table: The 4 Employees */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Riepilogo Dipendenti • {formatMonthIT(selectedMonth)}
            </h3>
          </div>
          <span className="text-xs text-slate-500">Standard 8h al giorno</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                <th className="py-2.5 px-3">Dipendente</th>
                <th className="py-2.5 px-3 text-center">Gg Lavorati</th>
                <th className="py-2.5 px-3 text-right">Ore Lavorate</th>
                <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                  Straordinari (+)
                </th>
                <th className="py-2.5 px-3 text-right text-red-600 font-bold">
                  Recuperi (-)
                </th>
                <th className="py-2.5 px-3 text-right">Saldo Netto</th>
                <th className="py-2.5 px-3 text-center">Ferie</th>
                <th className="py-2.5 px-3 text-center">Permessi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((s) => (
                <tr key={s.employee.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-md ${s.employee.avatarBg} text-white font-bold text-[10px] flex items-center justify-center`}
                      >
                        {s.employee.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-slate-900">{s.employee.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {s.daysWorked} gg
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatMinutesToHM(s.totalWorkedMinutes)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                    {s.totalOvertimeMinutes > 0
                      ? `+${formatMinutesToHM(s.totalOvertimeMinutes)}`
                      : '0h 00m'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-red-600">
                    {s.totalDeficitMinutes > 0
                      ? `-${formatMinutesToHM(s.totalDeficitMinutes)}`
                      : '0h 00m'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        s.netBalanceMinutes >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }
                    >
                      {s.netBalanceMinutes >= 0 ? '+' : ''}
                      {formatMinutesToHM(s.netBalanceMinutes)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">
                    {s.ferieDays > 0 ? (
                      <span className="font-semibold text-amber-800">{s.ferieDays} gg</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">
                    {s.permessiMinutes > 0 ? (
                      <span className="font-semibold text-purple-800">{formatMinutesToHM(s.permessiMinutes)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Timesheet List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Registro Giornaliero Dettagliato
            </h3>
            <span className="text-xs text-slate-400">({monthRecords.length} registrazioni)</span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600">Filtra per dipendente:</span>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="all">Tutti e 4 i dipendenti</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {monthRecords.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            Nessuna timbratura registrata per questo mese con i filtri selezionati.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Dipendente</th>
                  <th className="py-2.5 px-3 text-center">1ª Entr. (Matt.)</th>
                  <th className="py-2.5 px-3 text-center">1ª Usc. (Matt.)</th>
                  <th className="py-2.5 px-3 text-center">2ª Entr. (Pom.)</th>
                  <th className="py-2.5 px-3 text-center">2ª Usc. (Pom.)</th>
                  <th className="py-2.5 px-3 text-center font-medium text-amber-600">Uscita Turno</th>
                  <th className="py-2.5 px-3 text-center font-medium text-amber-600">Rientro Turno</th>
                  <th className="py-2.5 px-3 text-right">Ore Lavorate</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                    Straordinari
                  </th>
                  <th className="py-2.5 px-3 text-right text-red-600 font-semibold">
                    Recuperi
                  </th>
                  <th className="py-2.5 px-3">Note / Assenza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthRecords.map((r) => {
                  const emp = employees.find((e) => e.id === r.employeeId);
                  const calc = calculateRecord(r, undefined, false, emp);
                  const times = getRecordTimestamps(r);
                  const dateObj = new Date(r.date);
                  const weekday = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{r.date}</span>{' '}
                        <span className="text-[10px] text-slate-400 uppercase">({weekday})</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {emp?.name || r.employeeId}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                        {times.clockInMorning || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                        {times.clockOutMorning || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                        {times.clockInAfternoon || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                        {times.clockOutAfternoon ? (
                          <span className="inline-flex items-center justify-center gap-1">
                            <span>{times.clockOutAfternoon}</span>
                            {times.clockOutAfternoonNextDay && (
                              <span
                                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-1 py-0.2 rounded"
                                title="Concluso dopo la mezzanotte (+1 giorno)"
                              >
                                +1 🌙
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-700 font-semibold">
                        {r.exitDuringTurnStart || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-700 font-semibold">
                        {r.exitDuringTurnEnd || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {calc.hoursWorkedFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                        {calc.overtimeMinutes > 0 ? calc.overtimeFormatted : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-600 font-semibold">
                        {calc.deficitMinutes > 0 ? calc.deficitFormatted : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {r.leaveType === 'ferie' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                            Ferie
                          </span>
                        )}
                        {r.leaveType === 'permesso' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium">
                            Permesso ({(() => {
                              if (r.permessoHours !== undefined && r.permessoMinutes !== undefined && (r.permessoHours > 0 || r.permessoMinutes > 0)) {
                                return `${r.permessoHours}:${r.permessoMinutes.toString().padStart(2, '0')}`;
                              }
                              const hVal = r.leaveHours || 0;
                              const totalMinutes = Math.round(hVal * 60);
                              const hh = Math.floor(totalMinutes / 60);
                              const mm = totalMinutes % 60;
                              return `${hh}:${mm.toString().padStart(2, '0')}`;
                            })()})
                          </span>
                        )}
                        {r.notes && (
                          <span className="ml-1 text-slate-500 text-[11px]">{r.notes}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
