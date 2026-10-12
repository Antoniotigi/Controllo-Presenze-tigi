import { Employee, TimeRecord, LeaveRequest } from '../types';

export type UserRole = 'admin' | 'manager' | 'worker' | 'kiosk';

export interface UserAccount {
  username: string;
  userHash: string;
  passHash: string;
  displayName: string;
  subtitle: string;
  initials: string;
  role: UserRole;
  employeeId?: string;
  canClearCartellini: boolean;
  canEditHoursDirectly: boolean;
  canManageEmployees: boolean;
  isWorkerOnly: boolean;
  isKioskOnly?: boolean;
}

export const USER_ACCOUNTS: Record<string, UserAccount> = {
  tigicongress: {
    username: 'tigicongress',
    userHash: '40c731c40ed40ea5fc2c30e8538ae7c21efe6d19ff91b135647ad8e424a9f7d3',
    passHash: '2f11e88ddf3f5937c33ac10aad8001f9879d6b0390e7371ddd14cfd050bd7603',
    displayName: 'TigiCongress',
    subtitle: 'Pannello Presenze',
    initials: 'TG',
    role: 'kiosk',
    canClearCartellini: false,
    canEditHoursDirectly: false,
    canManageEmployees: false,
    isWorkerOnly: false,
    isKioskOnly: true,
  },
  giulia: {
    username: 'giulia',
    userHash: 'e4c2eed8a6df0147265631e9ff25b70fd0e4b3a246896695b089584bf3ce8b90',
    passHash: 'd6833bfa7579da6fa37e5d1713dba384fe2904996be920b92351f0e26b616d44',
    displayName: 'Giulia (Admin)',
    subtitle: 'Accesso Completo',
    initials: 'GL',
    role: 'manager',
    canClearCartellini: false,
    canEditHoursDirectly: true,
    canManageEmployees: true,
    isWorkerOnly: false,
  },
  // Dipendenti individuali (Visualizzazione e reportistica strettamente riservata al singolo lavoratore)
  luca: {
    username: 'luca',
    userHash: 'd70f47790f689414789eeff231703429c7f88a10210775906460edbf38589d90',
    passHash: 'f53179edd3c5af22f03e844cd14fdba66321f7b00e615c72de256a1340a6af16', // Luca12@23
    displayName: 'Luca Cardinali',
    subtitle: 'Area Personale Dipendente',
    initials: 'LC',
    role: 'worker',
    employeeId: 'emp-2',
    canClearCartellini: false,
    canEditHoursDirectly: false,
    canManageEmployees: false,
    isWorkerOnly: true,
  },
  andrea: {
    username: 'andrea',
    userHash: '5f3d6952c5c5e22077fabf461de80f1ce475752fe75afcf5ca46bac438405619',
    passHash: '513c4be82b1106c8c373a81a65c126609b396e07fb85e89df233586f43f187d7', // Andrea@345
    displayName: 'Andrea Rossi',
    subtitle: 'Area Personale Dipendente',
    initials: 'AR',
    role: 'worker',
    employeeId: 'emp-3',
    canClearCartellini: false,
    canEditHoursDirectly: false,
    canManageEmployees: false,
    isWorkerOnly: true,
  },
  dario: {
    username: 'dario',
    userHash: '2dbe33913ae5d6b16a801119f5fa1c419620c26d1a456e01490d697eb9b12589',
    passHash: '6665e6a7f824963450b666b10cbb4cfc8e050a0f6d5c7cc83f6f7ecba7f601ae', // Dar@345
    displayName: 'Dario Clemente',
    subtitle: 'Area Personale Dipendente',
    initials: 'DC',
    role: 'worker',
    employeeId: 'emp-4',
    canClearCartellini: false,
    canEditHoursDirectly: false,
    canManageEmployees: false,
    isWorkerOnly: true,
  },
  antonio: {
    username: 'antonio',
    userHash: '4ee3679892e6ac5a5b513eba7fd529d363d7a96508421c5dbd44b01b349cf514',
    passHash: '2637a73b08af091b19f4e9a4e4abc89435d5e374b5cdd609ed352a9758e8494d', // Ant@365
    displayName: 'Antonio Santoro',
    subtitle: 'Area Personale Dipendente',
    initials: 'AS',
    role: 'worker',
    employeeId: 'emp-1',
    canClearCartellini: false,
    canEditHoursDirectly: false,
    canManageEmployees: false,
    isWorkerOnly: true,
  },
};

/**
 * Retrieves the user account configuration by normalized username.
 */
export function findUserAccount(username: string): UserAccount | undefined {
  if (!username) return undefined;
  const norm = username.trim().toLowerCase();
  return USER_ACCOUNTS[norm];
}

/**
 * Validates SHA-256 credentials against registered accounts.
 */
export function verifyCredentials(userHash: string, passHash: string): UserAccount | undefined {
  for (const account of Object.values(USER_ACCOUNTS)) {
    if (account.userHash === userHash && account.passHash === passHash) {
      return account;
    }
  }
  return undefined;
}

/**
 * Checks if the current logged-in user is a single-worker account (Luca, Andrea, Dario, Antonio).
 */
export function isWorkerUser(username: string): boolean {
  const account = findUserAccount(username);
  return Boolean(account?.isWorkerOnly);
}

/**
 * Checks if the current logged-in user is the entrance kiosk tablet (tigicongress).
 */
export function isKioskUser(username: string): boolean {
  if (!username) return false;
  const norm = username.trim().toLowerCase();
  return norm === 'tigicongress';
}

/**
 * Resolves the specific Employee associated with a worker account.
 */
export function getWorkerEmployee(username: string, employees: Employee[]): Employee | undefined {
  const account = findUserAccount(username);
  if (!account || !account.isWorkerOnly) return undefined;

  if (account.employeeId) {
    const byId = employees.find((e) => e.id === account.employeeId);
    if (byId) return byId;
  }

  const norm = username.trim().toLowerCase();
  return employees.find((e) => e.name.toLowerCase().includes(norm));
}

/**
 * Filters the employee list to enforce privacy:
 * If the user is a worker, they ONLY see their own employee record.
 * If the user is an admin or manager, they see all employees.
 */
export function filterEmployeesForUser(username: string, employees: Employee[]): Employee[] {
  if (!isWorkerUser(username)) {
    return employees;
  }
  const workerEmp = getWorkerEmployee(username, employees);
  return workerEmp ? [workerEmp] : [];
}

/**
 * Filters time records to guarantee privacy for worker accounts.
 */
export function filterRecordsForUser(
  username: string,
  records: TimeRecord[],
  employees: Employee[]
): TimeRecord[] {
  if (!isWorkerUser(username)) {
    return records;
  }
  const workerEmp = getWorkerEmployee(username, employees);
  if (!workerEmp) return [];
  return records.filter((r) => r.employeeId === workerEmp.id);
}

/**
 * Filters leave requests to guarantee privacy for worker accounts.
 */
export function filterLeavesForUser(
  username: string,
  leaves: LeaveRequest[],
  employees: Employee[]
): LeaveRequest[] {
  if (!isWorkerUser(username)) {
    return leaves;
  }
  const workerEmp = getWorkerEmployee(username, employees);
  if (!workerEmp) return [];
  return leaves.filter((l) => l.employeeId === workerEmp.id);
}
