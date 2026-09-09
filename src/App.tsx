/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Palmtree,
  Settings2,
  AlertCircle,
  HelpCircle,
  Eraser,
} from 'lucide-react';
import { Employee, TimeRecord, LeaveRequest } from './types';
import {
  getEmployees,
  saveEmployees,
  getTimeRecords,
  saveTimeRecords,
  getLeaveRequests,
  saveLeaveRequests,
  resetAllData,
  clearAllCartelliniTimes,
} from './utils/storage';
import {
  getCurrentTimeHHMM,
  getTodayDateString,
  formatDateIT,
  calculateRecord,
  formatMinutesToHM,
} from './utils/timeUtils';
import { Navbar } from './components/Navbar';
import { EmployeeCard } from './components/EmployeeCard';
import { LeaveManagementView } from './components/LeaveManagementView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { EditEmployeesModal } from './components/EditEmployeesModal';
import { ClearAllConfirmModal } from './components/ClearAllConfirmModal';
import {
  testConnection,
  subscribeToTimeRecords,
  subscribeToLeaveRequests,
  subscribeToEmployees,
  saveRecordToFirestore,
  batchSaveRecordsToFirestore,
  saveLeaveRequestToFirestore,
  deleteLeaveRequestFromFirestore,
  saveEmployeeToFirestore,
  isCollectionEmpty,
  clearAllRecordsInFirestore,
} from './firebase';

export default function App() {
  const today = getTodayDateString();
  const [currentDate, setCurrentDate] = useState<string>(today);
  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [records, setRecords] = useState<TimeRecord[]>(getTimeRecords());
  const [leaves, setLeaves] = useState<LeaveRequest[]>(getLeaveRequests());
  const [activeView, setActiveView] = useState<'cards' | 'leaves' | 'report'>('cards');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [preselectedLeaveEmployee, setPreselectedLeaveEmployee] = useState<string | undefined>();
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('tigi_auth_session');
      if (!stored) return false;
      const { timestamp } = JSON.parse(stored);
      const now = Date.now();
      // Expiration set to 2 hours
      if (now - timestamp < 2 * 60 * 60 * 1000) {
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Live system time updated every second for real-time calculation
  const [systemTimeHHMM, setSystemTimeHHMM] = useState<string>(getCurrentTimeHHMM());

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTimeHHMM(getCurrentTimeHHMM());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic session validation every 30 seconds and on window focus
  useEffect(() => {
    const verifySession = () => {
      try {
        const stored = localStorage.getItem('tigi_auth_session');
        if (!stored) {
          setIsAuthenticated(false);
          return;
        }
        const { timestamp } = JSON.parse(stored);
        const now = Date.now();
        // 2 hours session window
        if (now - timestamp >= 2 * 60 * 60 * 1000) {
          setIsAuthenticated(false);
          localStorage.removeItem('tigi_auth_session');
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    const interval = setInterval(verifySession, 30000);
    window.addEventListener('focus', verifySession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifySession);
    };
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'tigicongress' && loginPassword === 'Mappescio2026@') {
      localStorage.setItem(
        'tigi_auth_session',
        JSON.stringify({ timestamp: Date.now() })
      );
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Credenziali non corrette. Riprova.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tigi_auth_session');
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
  };

  // Synchronize with Firebase Firestore in real time across devices
  useEffect(() => {
    let unsubscribeRecords: (() => void) | undefined;
    let unsubscribeLeaves: (() => void) | undefined;
    let unsubscribeEmployees: (() => void) | undefined;

    async function initFirebaseSync() {
      const connected = await testConnection();
      setIsCloudConnected(connected);

      // Check if Firestore collections are empty on first run and seed initial baseline data
      try {
        const emptyRecords = await isCollectionEmpty('time_records');
        if (emptyRecords) {
          const initialRecs = getTimeRecords();
          if (initialRecs.length > 0) {
            await batchSaveRecordsToFirestore(initialRecs);
          }
        }

        const emptyEmployees = await isCollectionEmpty('employees');
        if (emptyEmployees) {
          const initialEmps = getEmployees();
          for (const emp of initialEmps) {
            await saveEmployeeToFirestore(emp);
          }
        }
      } catch (err) {
        console.warn('Initial Firestore seed check:', err);
      }

      // Realtime listener for time records across all devices & deployments
      unsubscribeRecords = subscribeToTimeRecords(
        (remoteRecords) => {
          setIsCloudConnected(true);
          if (remoteRecords && remoteRecords.length > 0) {
            setRecords((prev) => {
              // Merge remote and local records so nothing entered locally is overwritten
              const map = new Map<string, TimeRecord>();
              prev.forEach((r) => map.set(r.id, r));
              remoteRecords.forEach((r) => {
                const local = map.get(r.id);
                if (!local || !local.updatedAt || !r.updatedAt || new Date(r.updatedAt) >= new Date(local.updatedAt)) {
                  map.set(r.id, r);
                }
              });
              const merged = Array.from(map.values());
              saveTimeRecords(merged);
              return merged;
            });
          }
        },
        () => setIsCloudConnected(false)
      );

      // Realtime listener for leave requests
      unsubscribeLeaves = subscribeToLeaveRequests(
        (remoteLeaves) => {
          setIsCloudConnected(true);
          if (remoteLeaves) {
            setLeaves(remoteLeaves);
            saveLeaveRequests(remoteLeaves);
          }
        },
        () => setIsCloudConnected(false)
      );

      // Realtime listener for employee profiles
      unsubscribeEmployees = subscribeToEmployees(
        (remoteEmps) => {
          setIsCloudConnected(true);
          if (remoteEmps && remoteEmps.length > 0) {
            const normalized = remoteEmps.map(e => ({
              ...e,
              permessiSpettanti: !e.permessiSpettanti || e.permessiSpettanti === 72 ? 88 : e.permessiSpettanti
            }));
            setEmployees(normalized);
            saveEmployees(normalized);
          }
        },
        () => setIsCloudConnected(false)
      );
    }

    initFirebaseSync();

    return () => {
      if (unsubscribeRecords) unsubscribeRecords();
      if (unsubscribeLeaves) unsubscribeLeaves();
      if (unsubscribeEmployees) unsubscribeEmployees();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Save single record automatically with Cloud Sync
  const handleSaveRecord = (recordToSave: TimeRecord) => {
    setRecords((prevRecords) => {
      const updatedRecords = prevRecords.filter(
        (r) => !(r.employeeId === recordToSave.employeeId && r.date === recordToSave.date)
      );
      updatedRecords.push(recordToSave);
      saveTimeRecords(updatedRecords);
      return updatedRecords;
    });

    // Push to Firestore Cloud Database in real-time
    saveRecordToFirestore(recordToSave).catch((err) => {
      console.error('Error syncing record to Firestore:', err);
    });
  };

  // Save all 4 records at once
  const handleSaveAllToday = () => {
    showToast('Tutte le timbrature sono sincronizzate sul Database Cloud!');
  };

  // Add leave request and auto-apply to time record for that date
  const handleAddLeave = (leave: LeaveRequest, applyToTimesheet: boolean) => {
    const updatedLeaves = [leave, ...leaves];
    setLeaves(updatedLeaves);
    saveLeaveRequests(updatedLeaves);
    saveLeaveRequestToFirestore(leave).catch(console.error);

    if (applyToTimesheet) {
      // Loop through date range (single or multi days)
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const updatedRecords = [...records];
      const affectedRecords: TimeRecord[] = [];

      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        const y = dt.getFullYear();
        const m = (dt.getMonth() + 1).toString().padStart(2, '0');
        const d = dt.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const existingIdx = updatedRecords.findIndex(
          (r) => r.employeeId === leave.employeeId && r.date === dateStr
        );

        const newRec: TimeRecord = {
          id: `rec-${leave.employeeId}-${dateStr}`,
          employeeId: leave.employeeId,
          date: dateStr,
          clockInMorning: '',
          clockOutMorning: '',
          clockInAfternoon: '',
          clockOutAfternoon: '',
          leaveType: leave.type === 'ferie' ? 'ferie' : leave.type === 'permesso' ? 'permesso' : 'none',
          leaveHours: leave.hoursPerDay,
          notes: leave.notes || (leave.type === 'ferie' ? 'Ferie programmate' : 'Permesso retribuito'),
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          updatedRecords[existingIdx] = {
            ...updatedRecords[existingIdx],
            leaveType: newRec.leaveType,
            leaveHours: newRec.leaveHours,
            notes: newRec.notes,
            updatedAt: new Date().toISOString(),
          };
          affectedRecords.push(updatedRecords[existingIdx]);
        } else {
          updatedRecords.push(newRec);
          affectedRecords.push(newRec);
        }
      }

      setRecords(updatedRecords);
      saveTimeRecords(updatedRecords);
      batchSaveRecordsToFirestore(affectedRecords).catch(console.error);
    }
  };

  const handleDeleteLeave = (leaveId: string) => {
    const updated = leaves.filter((l) => l.id !== leaveId);
    setLeaves(updated);
    saveLeaveRequests(updated);
    deleteLeaveRequestFromFirestore(leaveId).catch(console.error);
    showToast('Richiesta assenza rimossa.');
  };

  const handleResetData = () => {
    if (confirm('Vuoi ripristinare i dati dimostrativi iniziali? Tutti i dispositivi connessi si aggiorneranno automaticamente.')) {
      const reset = resetAllData();
      setEmployees(reset.employees);
      setRecords(reset.records);
      setLeaves(reset.leaves);
      batchSaveRecordsToFirestore(reset.records).catch(console.error);
      for (const emp of reset.employees) {
        saveEmployeeToFirestore(emp).catch(console.error);
      }
      showToast('Dati ripristinati e sincronizzati sul Cloud.');
    }
  };

  const handleClearAllCartellini = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClearAll = async () => {
    const cleared = clearAllCartelliniTimes(records);
    setRecords(cleared);
    saveTimeRecords(cleared);
    try {
      await clearAllRecordsInFirestore();
    } catch (err) {
      console.error('Error clearing Firestore records:', err);
    }
    showToast('Tutti gli orari dei cartellini sono stati svuotati.');
  };

  const handleOpenLeaveForEmployee = (employeeId: string) => {
    setPreselectedLeaveEmployee(employeeId);
    setActiveView('leaves');
  };

  const isToday = currentDate === today;

  // Monthly totals calculation for footer
  const currentMonth = currentDate.substring(0, 7);
  const monthRecords = records.filter((r) => r.date.startsWith(currentMonth));
  let totalMonthOvertimeMins = 0;
  let totalMonthDeficitMins = 0;
  for (const r of monthRecords) {
    const emp = employees.find((e) => e.id === r.employeeId);
    const calc = calculateRecord(r, systemTimeHHMM, false, emp);
    totalMonthOvertimeMins += calc.overtimeMinutes;
    totalMonthDeficitMins += calc.deficitMinutes;
  }

  // Daily status statistics for the 4 employees
  const dailySummary = employees.map((emp) => {
    const rec = records.find((r) => r.employeeId === emp.id && r.date === currentDate);
    const calc = calculateRecord(rec, systemTimeHHMM, isToday, emp);
    return { emp, rec, calc };
  });

  const countActiveNow = dailySummary.filter((d) => d.calc.status === 'al_lavoro').length;
  const countCompleted = dailySummary.filter((d) => d.calc.status === 'completato').length;
  const countLeaves = dailySummary.filter((d) => d.calc.status === 'ferie' || d.calc.status === 'permesso').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 bg-slate-900 text-white rounded-2xl items-center justify-center font-bold shadow-md shadow-slate-200">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              TigiBadge Accesso
            </h1>
            <p className="text-sm text-slate-500">
              Inserisci le credenziali per accedere al pannello presenze
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="login-username" className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Nome Utente
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="es. tigicongress"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Password di Sicurezza
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent outline-none transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Accedi al Sistema</span>
            </button>
          </form>

          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TigiBadge • Sistema di Monitoraggio Presenze
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Global Navbar */}
      <Navbar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onOpenLeaves={() => setActiveView('leaves')}
        onOpenReport={() => setActiveView('report')}
        onSaveAll={handleSaveAllToday}
        onResetData={handleResetData}
        onClearAll={handleClearAllCartellini}
        activeView={activeView}
        setActiveView={setActiveView}
        isCloudConnected={isCloudConnected}
        onLogout={handleLogout}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-between">
        {activeView === 'cards' && (
          <div className="space-y-6 flex-1">
            {/* Day Header Banner & Status Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold shadow-md shadow-slate-200">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Pannello Timbrature
                    </h2>
                    {isToday ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        In Servizio Oggi
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {currentDate}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateIT(currentDate)} • Orario standard 8 ore giornaliere
                  </p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-900 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>
                    <strong>{countActiveNow}</strong> in servizio
                  </span>
                </div>

                <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>{countCompleted}</strong> uscite registrate
                  </span>
                </div>

                {countLeaves > 0 && (
                  <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center gap-2 text-rose-900 font-semibold">
                    <Palmtree className="w-4 h-4 text-rose-600" />
                    <span>
                      <strong>{countLeaves}</strong> ferie/permesso
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-200 bg-white"
                  title="Modifica nominativi dei 4 dipendenti"
                >
                  <Settings2 className="w-4 h-4 text-slate-500" />
                  <span>Modifica Dipendenti</span>
                </button>
              </div>
            </div>

            {/* THE 4 EMPLOYEE CELLS (DEFAULT SCREEN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {employees.map((employee, idx) => {
                const record = records.find(
                  (r) => r.employeeId === employee.id && r.date === currentDate
                );

                return (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    record={record}
                    currentDate={currentDate}
                    isToday={isToday}
                    systemTimeHHMM={systemTimeHHMM}
                    onSave={handleSaveRecord}
                    onOpenLeaveForEmployee={handleOpenLeaveForEmployee}
                    index={idx}
                  />
                );
              })}
            </div>

            {/* Sleek Interface Informational Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Regola Standard:</strong> 8 ore al giorno. Le ore oltre le 8h sono calcolate come <strong>Straordinario (+)</strong>, quelle inferiori come <strong>Recupero Ore (-)</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('report')}
                className="text-xs font-bold text-slate-900 hover:text-slate-700 underline whitespace-nowrap self-end sm:self-center cursor-pointer"
              >
                Visualizza Riepilogo Mese ed Esporta →
              </button>
            </div>
          </div>
        )}

        {activeView === 'leaves' && (
          <LeaveManagementView
            employees={employees}
            leaves={leaves}
            records={records}
            onAddLeave={handleAddLeave}
            onDeleteLeave={handleDeleteLeave}
            preselectedEmployeeId={preselectedLeaveEmployee}
            onBackToCards={() => setActiveView('cards')}
          />
        )}

        {activeView === 'report' && (
          <MonthlyReportView
            employees={employees}
            records={records}
            leaves={leaves}
            currentDate={currentDate}
            onBackToCards={() => setActiveView('cards')}
          />
        )}

        {/* Sleek Interface Footer */}
        <footer className="mt-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-200">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Totale Straordinari Mese
              </span>
              <span className="text-sm font-bold text-emerald-600 font-mono">
                +{formatMinutesToHM(totalMonthOvertimeMins)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Totale Recuperi Mese
              </span>
              <span className="text-sm font-bold text-amber-600 font-mono">
                -{formatMinutesToHM(totalMonthDeficitMins)}
              </span>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2">
            <span>{formatDateIT(currentDate)}</span>
            <span>•</span>
            <span className="font-mono text-slate-700 font-semibold">{systemTimeHHMM}</span>
          </div>
        </footer>
      </main>

      {/* Edit Employees Modal */}
      <EditEmployeesModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employees={employees}
        onSave={(updated) => {
          setEmployees(updated);
          saveEmployees(updated);
          for (const emp of updated) {
            saveEmployeeToFirestore(emp).catch(console.error);
          }
          showToast('Dati dei dipendenti aggiornati e sincronizzati sul Cloud!');
        }}
      />

      {/* Security Password Protected Clear All Modal */}
      <ClearAllConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClearAll}
      />
    </div>
  );
}
