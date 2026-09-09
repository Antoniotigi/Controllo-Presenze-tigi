import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Employee, TimeRecord, LeaveRequest } from './types';

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling according to Firebase Skill standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
      return false;
    }
    // Any other response (like doc not found) means network connection to server succeeded
    return true;
  }
}

// Firestore Realtime Collections Listeners
export function subscribeToTimeRecords(
  onData: (records: TimeRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'time_records';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const records: TimeRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as TimeRecord);
      });
      onData(records);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToLeaveRequests(
  onData: (leaves: LeaveRequest[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'leave_requests';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const leaves: LeaveRequest[] = [];
      snapshot.forEach((docSnap) => {
        leaves.push(docSnap.data() as LeaveRequest);
      });
      onData(leaves);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToEmployees(
  onData: (employees: Employee[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'employees';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const employees: Employee[] = [];
      snapshot.forEach((docSnap) => {
        employees.push(docSnap.data() as Employee);
      });
      onData(employees);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Write/Save single time record to Firestore
export async function saveRecordToFirestore(record: TimeRecord): Promise<void> {
  const path = `time_records/${record.id}`;
  try {
    // Sanitize payload to match firestore-blueprint schema
    const payload: Record<string, any> = {
      id: record.id,
      employeeId: record.employeeId,
      date: record.date,
      clockInMorning: record.clockInMorning || '',
      clockOutMorning: record.clockOutMorning || '',
      clockInAfternoon: record.clockInAfternoon || '',
      clockOutAfternoon: record.clockOutAfternoon || '',
      notes: record.notes ? record.notes.slice(0, 500) : '',
      leaveType: record.leaveType || 'none',
      leaveHours: typeof record.leaveHours === 'number' ? record.leaveHours : 0,
      permessoHours: typeof record.permessoHours === 'number' ? record.permessoHours : 0,
      permessoMinutes: typeof record.permessoMinutes === 'number' ? record.permessoMinutes : 0,
      permessoStart: record.permessoStart || '',
      permessoEnd: record.permessoEnd || '',
      exitDuringTurnStart: record.exitDuringTurnStart || '',
      exitDuringTurnEnd: record.exitDuringTurnEnd || '',
      updatedAt: new Date().toISOString(),
    };
    if (record.clockIn) payload.clockIn = record.clockIn;
    if (record.clockOut) payload.clockOut = record.clockOut;

    await setDoc(doc(db, 'time_records', record.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Batch save multiple time records (e.g. initial seed or save-all)
export async function batchSaveRecordsToFirestore(records: TimeRecord[]): Promise<void> {
  if (records.length === 0) return;
  const path = 'time_records';
  try {
    const batch = writeBatch(db);
    records.forEach((record) => {
      const ref = doc(db, 'time_records', record.id);
      const payload: Record<string, any> = {
        id: record.id,
        employeeId: record.employeeId,
        date: record.date,
        clockInMorning: record.clockInMorning || '',
        clockOutMorning: record.clockOutMorning || '',
        clockInAfternoon: record.clockInAfternoon || '',
        clockOutAfternoon: record.clockOutAfternoon || '',
        notes: record.notes ? record.notes.slice(0, 500) : '',
        leaveType: record.leaveType || 'none',
        leaveHours: typeof record.leaveHours === 'number' ? record.leaveHours : 0,
        permessoHours: typeof record.permessoHours === 'number' ? record.permessoHours : 0,
        permessoMinutes: typeof record.permessoMinutes === 'number' ? record.permessoMinutes : 0,
        permessoStart: record.permessoStart || '',
        permessoEnd: record.permessoEnd || '',
        exitDuringTurnStart: record.exitDuringTurnStart || '',
        exitDuringTurnEnd: record.exitDuringTurnEnd || '',
        updatedAt: record.updatedAt || new Date().toISOString(),
      };
      if (record.clockIn) payload.clockIn = record.clockIn;
      if (record.clockOut) payload.clockOut = record.clockOut;
      batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Clear all clock times from time_records in Firestore
export async function clearAllRecordsInFirestore(): Promise<void> {
  const path = 'time_records';
  try {
    const snap = await getDocs(collection(db, 'time_records'));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        clockInMorning: '',
        clockOutMorning: '',
        clockInAfternoon: '',
        clockOutAfternoon: '',
        clockIn: '',
        clockOut: '',
        notes: '',
        leaveType: 'none',
        leaveHours: 0,
        permessoHours: 0,
        permessoMinutes: 0,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save leave request to Firestore
export async function saveLeaveRequestToFirestore(leave: LeaveRequest): Promise<void> {
  const path = `leave_requests/${leave.id}`;
  try {
    const payload = {
      id: leave.id,
      employeeId: leave.employeeId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      hoursPerDay: Number(leave.hoursPerDay) || 8,
      status: leave.status,
      notes: leave.notes ? leave.notes.slice(0, 500) : '',
      createdAt: leave.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'leave_requests', leave.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete leave request from Firestore
export async function deleteLeaveRequestFromFirestore(id: string): Promise<void> {
  const path = `leave_requests/${id}`;
  try {
    await deleteDoc(doc(db, 'leave_requests', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save employee to Firestore
export async function saveEmployeeToFirestore(employee: Employee): Promise<void> {
  const path = `employees/${employee.id}`;
  try {
    await setDoc(doc(db, 'employees', employee.id), employee, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Check if collection is empty
export async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.empty;
  } catch {
    return true;
  }
}
