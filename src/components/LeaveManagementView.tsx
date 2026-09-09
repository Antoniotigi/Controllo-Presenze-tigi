import React, { useState } from 'react';
import {
  Palmtree,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  HeartPulse,
  User,
  AlertCircle,
} from 'lucide-react';
import { Employee, LeaveRequest, TimeRecord } from '../types';
import { getTodayDateString, formatDateIT } from '../utils/timeUtils';

interface LeaveManagementViewProps {
  employees: Employee[];
  leaves: LeaveRequest[];
  records: TimeRecord[];
  onAddLeave: (leave: LeaveRequest, applyToTimesheet: boolean) => void;
  onDeleteLeave: (leaveId: string) => void;
  preselectedEmployeeId?: string;
  onBackToCards: () => void;
}

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  employees,
  leaves,
  records,
  onAddLeave,
  onDeleteLeave,
  preselectedEmployeeId,
  onBackToCards,
}) => {
  const today = getTodayDateString();

  // Form state
  const [employeeId, setEmployeeId] = useState<string>(
    preselectedEmployeeId || employees[0]?.id || 'emp-1'
  );
  const [type, setType] = useState<LeaveRequest['type']>('ferie');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Calculate used leaves from records
  const getEmployeeStats = (empId: string) => {
    const empRecords = records.filter((r) => r.employeeId === empId);
    const empLeaves = leaves.filter((l) => l.employeeId === empId);

    let ferieDaysUsed = 0;
    let permessiHoursUsed = 0;
    let malattiaDaysUsed = 0;

    empRecords.forEach((r) => {
      if (r.leaveType === 'ferie') ferieDaysUsed += 1;
      if (r.leaveType === 'permesso') permessiHoursUsed += r.leaveHours || 8;
      if (r.leaveType === 'malattia') malattiaDaysUsed += 1;
    });

    const emp = employees.find((e) => e.id === empId);
    const ferieSpettanti = emp?.ferieSpettanti || 26;
    const permessiSpettanti = !emp?.permessiSpettanti || emp.permessiSpettanti === 72 ? 88 : emp.permessiSpettanti;

    return {
      ferieSpettanti,
      ferieDaysUsed,
      ferieResidue: Math.max(0, ferieSpettanti - ferieDaysUsed),
      permessiSpettanti,
      permessiHoursUsed,
      permessiResidui: Math.max(0, permessiSpettanti - permessiHoursUsed),
      malattiaDaysUsed,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId,
      type,
      startDate,
      endDate: endDate || startDate,
      hoursPerDay: type === 'ferie' ? 8 : hoursPerDay,
      notes,
      status: 'approvato',
      createdAt: new Date().toISOString(),
    };

    onAddLeave(newLeave, true);
    setNotes('');
    setSuccessMessage('Richiesta registrata e applicata con successo al cartellino!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold shadow-xs">
              <Palmtree className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Gestione Ferie, Permessi e Assenze
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoraggio residui e programmazione assenze per i 4 dipendenti
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToCards}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors self-start sm:self-center cursor-pointer"
        >
          ← Torna alle Timbrature
        </button>
      </div>

      {/* 4 Employee Leave Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {employees.map((emp, idx) => {
          const stats = getEmployeeStats(emp.id);
          const feriePct = Math.min(100, Math.round((stats.ferieDaysUsed / stats.ferieSpettanti) * 100));
          const permessiPct = Math.min(100, Math.round((stats.permessiHoursUsed / stats.permessiSpettanti) * 100));
          const avatarThemes = [
            'bg-indigo-100 text-indigo-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
            'bg-sky-100 text-sky-600',
          ];
          const avatarStyle = avatarThemes[idx % avatarThemes.length];

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                employeeId === emp.id
                  ? 'border-slate-900 ring-2 ring-slate-900/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${avatarStyle} font-bold text-sm flex items-center justify-center`}>
                    {emp.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {emp.name}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEmployeeId(emp.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    employeeId === emp.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {employeeId === emp.id ? 'Attivo' : 'Seleziona'}
                </button>
              </div>

              {/* Balances */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                {/* Ferie */}
                <div>
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-600 mb-1">
                    <span className="flex items-center gap-1">
                      <Palmtree className="w-3 h-3 text-amber-500" /> Ferie
                    </span>
                    <span>
                      <strong className="text-slate-900 font-bold">{stats.ferieResidue}</strong> / {stats.ferieSpettanti} gg res.
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: `${feriePct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Permessi ROL */}
                <div>
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-600 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-500" /> Permessi ROL
                    </span>
                    <span>
                      <strong className="text-slate-900 font-bold">{stats.permessiResidui}</strong> / {stats.permessiSpettanti} ore res.
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${permessiPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Add Request Form + History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Registra Assenza o Permesso
            </h3>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Employee Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dipendente</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipologia Assenza</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('ferie')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    type === 'ferie'
                      ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ferie (8h)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('permesso')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    type === 'permesso'
                      ? 'border-purple-400 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Permesso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('malattia')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    type === 'malattia'
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  <span>Malattia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('congedo')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    type === 'congedo'
                      ? 'border-blue-400 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Congedo</span>
                </button>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Inizio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Fine</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            {/* If Permesso: Hours selector */}
            {type === 'permesso' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Ore di Permesso</label>
                <select
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl font-bold focus:outline-hidden"
                >
                  <option value={1}>1 ora</option>
                  <option value={2}>2 ore</option>
                  <option value={3}>3 ore</option>
                  <option value={4}>4 ore (Mezza giornata)</option>
                  <option value={6}>6 ore</option>
                  <option value={8}>8 ore (Intera giornata)</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Motivazione / Note</label>
              <textarea
                rows={2}
                placeholder="es. Visita medica specialistica, ferie estive..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md shadow-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Registra Assenza nel Cartellino</span>
            </button>
          </form>
        </div>

        {/* History / Registry Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Registro Assenze & Permessi Registrati
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {leaves.length} registrazioni
            </span>
          </div>

          {leaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nessuna richiesta di ferie o permesso registrata.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Dipendente</th>
                    <th className="py-2.5 px-3">Tipologia</th>
                    <th className="py-2.5 px-3">Periodo</th>
                    <th className="py-2.5 px-3">Ore / gg</th>
                    <th className="py-2.5 px-3">Note</th>
                    <th className="py-2.5 px-3 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((l) => {
                    const emp = employees.find((e) => e.id === l.employeeId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {emp?.name || l.employeeId}
                        </td>
                        <td className="py-2.5 px-3">
                          {l.type === 'ferie' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              <Palmtree className="w-3 h-3 text-amber-600" /> Ferie
                            </span>
                          )}
                          {l.type === 'permesso' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-800 border border-purple-200">
                              <Clock className="w-3 h-3 text-purple-600" /> Permesso
                            </span>
                          )}
                          {l.type === 'malattia' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-800 border border-rose-200">
                              <HeartPulse className="w-3 h-3 text-rose-600" /> Malattia
                            </span>
                          )}
                          {l.type === 'congedo' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              Congedo
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono">
                          {l.startDate === l.endDate ? l.startDate : `${l.startDate} → ${l.endDate}`}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {l.type === 'ferie' ? '1 giorno (8h)' : `${l.hoursPerDay}h`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-[160px] truncate">
                          {l.notes || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteLeave(l.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Elimina richiesta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
