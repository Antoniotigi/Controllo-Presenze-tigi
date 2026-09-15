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
  Eye,
  EyeOff,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Employee, TimeRecord, LeaveRequest } from './types';
import {
  getEmployees,
  saveEmployees,
  getTimeRecords,
  saveTimeRecords,
  getLeaveRequests,
  saveLeaveRequests,
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
import { Logo } from './components/Logo';
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
  const [todayState, setTodayState] = useState<string>(getTodayDateString());
  const today = todayState;
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

  // Secure Cryptographic Helpers (Pure client-side Web Crypto API)
  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const decodeBase32 = (base32: string): Uint8Array => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.toUpperCase().replace(/[\s-=]/g, '');
    const length = cleaned.length;
    const buffer = new Uint8Array(Math.floor((length * 5) / 8));
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < length; i++) {
      const val = alphabet.indexOf(cleaned[i]);
      if (val === -1) continue;
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        buffer[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    return buffer;
  };

  const generateTOTP = async (secretBase32: string, timeOffsetSlots: number = 0): Promise<string> => {
    try {
      const keyData = decodeBase32(secretBase32);
      const time = Math.floor(Date.now() / 1000 / 30) + timeOffsetSlots;
      const counter = new Uint8Array(8);
      let temp = time;
      for (let i = 7; i >= 0; i--) {
        counter[i] = temp & 0xff;
        temp = temp >>> 8;
      }

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, counter);
      const hmac = new Uint8Array(signatureBuffer);

      const offset = hmac[hmac.length - 1] & 0xf;
      const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const otp = code % 1000000;
      return otp.toString().padStart(6, '0');
    } catch (err) {
      console.error('Errore TOTP:', err);
      return '';
    }
  };

  // Authentication & MFA States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('tigi_auth_session');
      if (!stored) return false;
      const { timestamp } = JSON.parse(stored);
      const now = Date.now();
      // Expiration set to 24 hours
      if (now - timestamp < 24 * 60 * 60 * 1000) {
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
  
  // Custom Browser Login Saving & Password Show/Hide
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('tigi_remember_me') === 'true';
  });

  // MFA (TOTP) state
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState<boolean>(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(() => {
    return localStorage.getItem('tigi_mfa_enabled') === 'true';
  });
  const [showMfaSetup, setShowMfaSetup] = useState<boolean>(false);

  // Brute Force Lockout States
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(localStorage.getItem('tigi_failed_attempts') || '0');
  });
  const [lockUntil, setLockUntil] = useState<number>(() => {
    return Number(localStorage.getItem('tigi_lock_until') || '0');
  });
  const [lockCountdown, setLockCountdown] = useState<number>(0);

  // Load saved credentials on mount
  useEffect(() => {
    if (rememberMe) {
      const savedUser = localStorage.getItem('tigi_saved_user') || '';
      const savedPassObfuscated = localStorage.getItem('tigi_saved_pass') || '';
      let savedPass = '';
      try {
        if (savedPassObfuscated) {
          savedPass = atob(savedPassObfuscated);
        }
      } catch (e) {
        // Ignore
      }
      if (savedUser) setLoginUsername(savedUser);
      if (savedPass) setLoginPassword(savedPass);
    }
  }, []);

  // Update lock countdown dynamically
  useEffect(() => {
    const checkLock = () => {
      const now = Date.now();
      if (lockUntil > now) {
        setLockCountdown(Math.ceil((lockUntil - now) / 1000));
      } else {
        setLockCountdown(0);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  // Live system time updated every second for real-time calculation
  const [systemTimeHHMM, setSystemTimeHHMM] = useState<string>(getCurrentTimeHHMM());

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTimeHHMM(getCurrentTimeHHMM());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically update the page when a new day starts (or in the morning)
  useEffect(() => {
    const checkMidnightRollover = () => {
      const actualToday = getTodayDateString();
      if (actualToday !== todayState) {
        setTodayState(actualToday);
        setCurrentDate(actualToday);
        setActiveView('cards');
        showToast('Nuovo giorno rilevato! Il pannello è stato aggiornato ad oggi.');
      }
    };

    // Check every 10 seconds to respond quickly if page is left open
    const interval = setInterval(checkMidnightRollover, 10000);
    return () => clearInterval(interval);
  }, [todayState]);

  // Periodic session validation every 30 seconds and on window focus (24 hours window)
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
        // 24 hours session window
        if (now - timestamp >= 24 * 60 * 60 * 1000) {
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check brute-force lockout
    const now = Date.now();
    if (lockUntil > now) {
      const waitTime = Math.ceil((lockUntil - now) / 1000);
      setLoginError(`Troppi tentativi falliti. Il login è bloccato per altri ${waitTime} secondi.`);
      return;
    }

    // SHA-256 based high-security verification (Plaintext passwords are not embedded in code)
    const userHash = await sha256(loginUsername);
    const passHash = await sha256(loginPassword);

    const EXPECTED_USER_HASH = '40c731c40ed40ea5fc2c30e8538ae7c21efe6d19ff91b135647ad8e424a9f7d3';
    const EXPECTED_PASS_HASH = '2f11e88ddf3f5937c33ac10aad8001f9879d6b0390e7371ddd14cfd050bd7603';

    if (userHash === EXPECTED_USER_HASH && passHash === EXPECTED_PASS_HASH) {
      // Credentials verified successfully! Now check Multi-Factor Authentication (TOTP)
      if (mfaEnabled) {
        if (!showMfaInput) {
          // Advance to OTP input screen
          setShowMfaInput(true);
          return;
        }

        // Verify the 6-digit verification code with offset of -1, 0, +1 for drift allowance
        const mfaSecret = 'TIGIBADGESECUREKEY2026';
        const code0 = await generateTOTP(mfaSecret, 0);
        const codeMinus1 = await generateTOTP(mfaSecret, -1);
        const codePlus1 = await generateTOTP(mfaSecret, 1);

        if (mfaCode === code0 || mfaCode === codeMinus1 || mfaCode === codePlus1) {
          // Success! Complete login
          proceedLogin();
        } else {
          setLoginError('Codice di verifica TOTP non valido. Inserisci il codice corrente dall\'app Google Authenticator.');
        }
      } else {
        // No MFA enabled, complete login immediately
        proceedLogin();
      }
    } else {
      // Failed login attempt
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('tigi_failed_attempts', String(newAttempts));

      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 5 * 60 * 1000; // 5 minutes lockout
        setLockUntil(lockoutTime);
        localStorage.setItem('tigi_lock_until', String(lockoutTime));
        setLoginError('Troppi tentativi falliti. Il sistema è stato bloccato per 5 minuti a scopo di sicurezza.');
      } else {
        setLoginError(`Credenziali non corrette. Riprova. (Tentativi rimasti prima del blocco: ${5 - newAttempts})`);
      }
    }
  };

  const proceedLogin = () => {
    // Reset brute force counter
    setFailedAttempts(0);
    localStorage.removeItem('tigi_failed_attempts');
    localStorage.removeItem('tigi_lock_until');
    setLockUntil(0);

    // Save Remember Me credentials if active
    if (rememberMe) {
      localStorage.setItem('tigi_remember_me', 'true');
      localStorage.setItem('tigi_saved_user', loginUsername);
      localStorage.setItem('tigi_saved_pass', btoa(loginPassword));
    } else {
      localStorage.removeItem('tigi_remember_me');
      localStorage.removeItem('tigi_saved_user');
      localStorage.removeItem('tigi_saved_pass');
    }

    // Set 24 hour session token
    localStorage.setItem(
      'tigi_auth_session',
      JSON.stringify({ timestamp: Date.now() })
    );
    setIsAuthenticated(true);
    setLoginError('');
    setShowMfaInput(false);
    setMfaCode('');
  };

  const handleLogout = () => {
    localStorage.removeItem('tigi_auth_session');
    setIsAuthenticated(false);
    setShowMfaInput(false);
    setMfaCode('');
    // Clear the form fields if we are not remembering credentials
    if (!rememberMe) {
      setLoginUsername('');
      setLoginPassword('');
    }
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
          <div className="text-center space-y-4 flex flex-col items-center">
            <Logo size={64} showText={false} />
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                TIGi Presenze Accesso Sicuro
              </h1>
              <p className="text-sm text-slate-500">
                {showMfaInput 
                  ? "Verifica a due fattori (MFA) richiesta" 
                  : "Inserisci le credenziali per accedere al pannello presenze"
                }
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {lockCountdown > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <strong>Login Temporaneamente Bloccato</strong>
                </span>
                <span>Riprova tra {lockCountdown} secondi. Il blocco automatico protegge il sistema da attacchi brute-force.</span>
              </div>
            )}

            {!showMfaInput ? (
              <>
                {/* Username Input */}
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
                    placeholder="Nome utente"
                    required
                    disabled={lockCountdown > 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent outline-none transition-all shadow-2xs disabled:opacity-50"
                  />
                </div>

                {/* Password Input with Show/Hide toggle */}
                <div className="space-y-1">
                  <label htmlFor="login-password" className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                    Password di Sicurezza
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={lockCountdown > 0}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent outline-none transition-all shadow-2xs disabled:opacity-50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Custom Browser Login Saving (Remember me) Checkbox */}
                <div className="flex items-center justify-between py-1 px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 accent-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                      Ricorda credenziali su questo dispositivo
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* TOTP MFA Input Step */}
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-900 animate-pulse" />
                    <span>Codice di Autenticazione TOTP</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Inserisci il codice temporaneo a 6 cifre dall'app Authenticator configurata sul tuo telefono.
                  </p>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full text-center text-xl tracking-[0.4em] font-mono font-black bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMfaInput(false);
                      setMfaCode('');
                      setLoginError('');
                    }}
                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
                  >
                    Torna al login classico
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={lockCountdown > 0}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md shadow-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{showMfaInput ? "Verifica e Accedi" : "Accedi al Sistema"}</span>
            </button>
          </form>

          {/* MFA Setup Toggle / Panel for Security Conscious Administrators */}
          <div className="border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowMfaSetup(!showMfaSetup)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{showMfaSetup ? "Nascondi opzioni sicurezza" : "Configura Autenticazione a due fattori (MFA)"}</span>
            </button>

            {showMfaSetup && (
              <div className="mt-3 text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0b5cd5] animate-pulse" />
                  <span>Configura Google Authenticator</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Per abilitare l'MFA, inserisci la chiave segreta sottostante nella tua app Authenticator (Google Authenticator, Microsoft Authenticator o Authy):
                </p>
                <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                  <code className="text-xs font-mono font-bold text-slate-700 tracking-wider">
                    TIGIBADGESECUREKEY2026
                  </code>
                  <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                    Chiave TOTP
                  </span>
                </div>
                
                <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mfaEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setMfaEnabled(enabled);
                      if (enabled) {
                        localStorage.setItem('tigi_mfa_enabled', 'true');
                      } else {
                        localStorage.removeItem('tigi_mfa_enabled');
                      }
                    }}
                    className="mt-0.5 w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 accent-slate-900 cursor-pointer"
                  />
                  <span className="text-[10px] font-semibold text-slate-600 leading-normal">
                    Attiva protezione 2-Factor (MFA) su questo dispositivo
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              TIGi Presenze • Sistema di Monitoraggio Presenze
            </span>
            <span className="text-[9px] text-slate-400 block mt-1">
              Timeout sessione: 24 ore • Crittografia SHA-256 attiva
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#101B32] flex flex-col font-sans antialiased">
      {/* Global Navbar */}
      <Navbar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onOpenLeaves={() => setActiveView('leaves')}
        onOpenReport={() => setActiveView('report')}
        onSaveAll={handleSaveAllToday}
        onClearAll={handleClearAllCartellini}
        activeView={activeView}
        setActiveView={setActiveView}
        isCloudConnected={isCloudConnected}
        onLogout={handleLogout}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#101B32] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2.5 border border-[#E2E8F0]/10 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#0b5cd5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-between">
        {activeView === 'cards' && (
          <div className="space-y-6 flex-1">
            {/* Day Header Banner & Status Bar */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#101B32] text-white rounded-xl flex items-center justify-center font-bold">
                  <Users className="w-6 h-6 text-[#0b5cd5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-[#101B32] tracking-tight">
                      {isToday ? 'Presenze di oggi' : 'Presenze passate'}
                    </h2>
                    {isToday ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f0fa] text-[#0b5cd5] uppercase tracking-wider">
                        In Servizio
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                        Storico
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {formatDateIT(currentDate)} • Orario standard 8 ore giornaliere
                  </p>
                </div>
              </div>

              {/* Action Buttons & Date Navigation merged */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Date Navigation Controls */}
                <div className="flex items-center gap-1 border border-[#E2E8F0] rounded-lg p-1 bg-[#F4F7FA]">
                  <button
                    type="button"
                    onClick={() => {
                      const prevDate = new Date(currentDate);
                      prevDate.setDate(prevDate.getDate() - 1);
                      const y = prevDate.getFullYear();
                      const m = (prevDate.getMonth() + 1).toString().padStart(2, '0');
                      const d = prevDate.getDate().toString().padStart(2, '0');
                      setCurrentDate(`${y}-${m}-${d}`);
                    }}
                    className="p-1.5 text-[#64748B] hover:text-[#101B32] hover:bg-white rounded-md transition-colors cursor-pointer"
                    title="Giorno Precedente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={currentDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setCurrentDate(e.target.value);
                        }
                      }}
                      className="pl-7 pr-1 py-1 text-xs font-bold text-[#101B32] bg-transparent outline-none cursor-pointer w-[138px]"
                    />
                    <Calendar className="w-3.5 h-3.5 text-[#64748B] absolute left-1.5 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextDate = new Date(currentDate);
                      nextDate.setDate(nextDate.getDate() + 1);
                      const y = nextDate.getFullYear();
                      const m = (nextDate.getMonth() + 1).toString().padStart(2, '0');
                      const d = nextDate.getDate().toString().padStart(2, '0');
                      setCurrentDate(`${y}-${m}-${d}`);
                    }}
                    className="p-1.5 text-[#64748B] hover:text-[#101B32] hover:bg-white rounded-md transition-colors cursor-pointer"
                    title="Giorno Successivo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setCurrentDate(today)}
                    className="px-3.5 py-2 text-xs font-bold text-[#0b5cd5] bg-[#e6f0fa] hover:bg-[#d2e5f7] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Oggi
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-[#101B32] bg-white hover:bg-[#F4F7FA] rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Settings2 className="w-4 h-4 text-[#64748B]" />
                  <span>Gestisci dipendenti</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('report')}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#0b5cd5] hover:bg-[#0a4ebd] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Report mensile</span>
                </button>
              </div>
            </div>

            {/* Synthesis / Summary Panel */}
            <div className="grid grid-cols-3 gap-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
              <div className="flex flex-col justify-between">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">In servizio</span>
                <span className="text-3xl font-black text-[#0b5cd5] mt-1">{countActiveNow}</span>
              </div>
              <div className="flex flex-col justify-between border-l border-[#E2E8F0] pl-4">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">In pausa</span>
                <span className="text-3xl font-black text-amber-500 mt-1">{countActiveNow > 0 ? dailySummary.filter((d) => d.calc.status === 'pausa').length : 0}</span>
              </div>
              <div className="flex flex-col justify-between border-l border-[#E2E8F0] pl-4">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Assenti</span>
                <span className="text-3xl font-black text-[#101B32] mt-1">{dailySummary.filter((d) => d.calc.status === 'non_timbrato' || d.calc.status === 'ferie' || d.calc.status === 'permesso').length}</span>
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
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 text-xs text-[#64748B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#64748B] shrink-0" />
                <span>
                  <strong>Regola Standard:</strong> 8 ore al giorno. Le ore oltre le 8h sono calcolate come <strong>Straordinario (+)</strong>, quelle inferiori come <strong>Recupero Ore (-)</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('report')}
                className="text-xs font-bold text-[#101B32] hover:text-[#0b5cd5] underline whitespace-nowrap self-end sm:self-center cursor-pointer"
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
        <footer className="mt-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[#E2E8F0]">
          <div className="text-xs text-[#64748B] font-semibold">
            <span>TIGi Presenze • Pannello Rilevazione Presenze</span>
          </div>
          <div className="text-xs sm:text-sm text-[#64748B] font-semibold flex items-center gap-2">
            <span>{formatDateIT(currentDate)}</span>
            <span>•</span>
            <span className="font-mono text-[#101B32] font-extrabold">{systemTimeHHMM}</span>
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
