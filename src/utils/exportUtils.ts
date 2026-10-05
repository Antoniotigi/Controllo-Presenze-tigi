import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, TimeRecord, LeaveRequest } from '../types';
import {
  calculateRecord,
  formatMinutesToHM,
  formatMinutesToDecimal,
  formatMonthIT,
  timeToMinutes,
  STANDARD_MINUTES_PER_DAY,
  getRecordTimestamps,
  getPermessoMinutes,
  getCompleteMonthRecords,
  getTodayDateString,
  getDayOfWeek,
} from './timeUtils';

export interface MonthlyStatsPerEmployee {
  employee: Employee;
  daysWorked: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  totalOvertimeDiurniMinutes: number;
  totalOvertimeNotturniMinutes: number;
  totalOvertimeFestiviMinutes: number;
  totalDeficitMinutes: number;
  netBalanceMinutes: number;
  ferieDays: number;
  permessiHours: number;
  permessiMinutes: number;
  // Banca Ore and Paid Overtime fields
  totalBancaOreAccumulated: number;
  totalBancaOreCompensated: number;
  bancaOreBalance: number;
  totalPaidOvertimeMinutes: number;
}

/**
 * Checks if today's timbrature are fully complete depending on schedule
 */
function areTimbratureComplete(r: TimeRecord, emp: Employee): boolean {
  const times = getRecordTimestamps(r);
  const dayOfWeek = getDayOfWeek(r.date);
  const schedule = emp.scheduleType || 'standard_8h';

  if (schedule === 'six_days' && dayOfWeek === 6) {
    // On Saturday for 6-day schedule, only morning shift is expected
    return Boolean(times.clockInMorning && times.clockOutMorning);
  }

  // For any other working day, both shifts are expected
  return Boolean(
    times.clockInMorning &&
    times.clockOutMorning &&
    times.clockInAfternoon &&
    times.clockOutAfternoon
  );
}

export function computeMonthlyStats(
  monthYear: string, // YYYY-MM
  employees: Employee[],
  records: TimeRecord[],
  leaves: LeaveRequest[]
): MonthlyStatsPerEmployee[] {
  const todayStr = getTodayDateString();

  return employees.map((emp) => {
    const empRecords = getCompleteMonthRecords(monthYear, [emp], records);

    let daysWorked = 0;
    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalOvertimeDiurniMinutes = 0;
    let totalOvertimeNotturniMinutes = 0;
    let totalOvertimeFestiviMinutes = 0;
    let totalDeficitMinutes = 0;
    let ferieDays = 0;
    let permessiHours = 0;
    let permessiMinutes = 0;

    // Banca Ore & Paid Overtime trackers
    let totalBancaOreAccumulated = 0;
    let totalBancaOreCompensated = 0;
    let totalPaidOvertimeMinutes = 0;

    empRecords.forEach((r) => {
      const calc = calculateRecord(r, undefined, false, emp);
      const times = getRecordTimestamps(r);
      const hasStamps = Boolean(
        times.clockInMorning || times.clockOutMorning || times.clockInAfternoon || times.clockOutAfternoon
      );

      // Determine if this day should be counted in summary stats
      const isFuture = r.date > todayStr;
      const isToday = r.date === todayStr;

      let shouldCount = false;
      if (!isFuture) {
        if (isToday) {
          const hasJustification = r.leaveType && r.leaveType !== 'none';
          const timbratureComplete = areTimbratureComplete(r, emp);
          shouldCount = hasJustification || timbratureComplete;
        } else {
          shouldCount = true;
        }
      }

      if (shouldCount) {
        if (r.leaveType === 'ferie') {
          ferieDays += 1;
        } else if (r.leaveType === 'permesso') {
          const permMins = getPermessoMinutes(r);
          const mins = permMins || Math.round((r.leaveHours || 8) * 60);
          permessiMinutes += mins;
          permessiHours += permMins > 0 ? Number((permMins / 60).toFixed(2)) : (r.leaveHours || 8);
        }
        
        if (hasStamps) {
          daysWorked += 1;
        }

        totalWorkedMinutes += calc.minutesWorked;
        totalOvertimeMinutes += calc.overtimeMinutes;
        totalOvertimeDiurniMinutes += calc.overtimeDiurniMinutes || 0;
        totalOvertimeNotturniMinutes += calc.overtimeNotturniMinutes || 0;
        totalOvertimeFestiviMinutes += calc.overtimeFestiviMinutes || 0;
        totalDeficitMinutes += calc.deficitMinutes;

        // Banca Ore & Paid Overtime core allocation
        const isAuthorized = r.overtimeAuthorized === true || (r.overtimeEventName && r.overtimeEventName.trim() !== '');
        const otFestivi = calc.overtimeFestiviMinutes || 0;
        const otNotturni = calc.overtimeNotturniMinutes || 0;
        const otDiurni = calc.overtimeDiurniMinutes || 0;
        const totalOt = calc.overtimeMinutes || 0;

        if (isAuthorized) {
          totalPaidOvertimeMinutes += totalOt;
        } else {
          totalPaidOvertimeMinutes += (otFestivi + otNotturni);
          totalBancaOreAccumulated += otDiurni;
        }

        if (calc.deficitMinutes && calc.deficitMinutes > 0) {
          totalBancaOreCompensated += calc.deficitMinutes;
        }
      }
    });

    const netBalanceMinutes = totalOvertimeMinutes - totalDeficitMinutes;
    const bancaOreBalance = totalBancaOreAccumulated - totalBancaOreCompensated;

    return {
      employee: emp,
      daysWorked,
      totalWorkedMinutes,
      totalOvertimeMinutes,
      totalOvertimeDiurniMinutes,
      totalOvertimeNotturniMinutes,
      totalOvertimeFestiviMinutes,
      totalDeficitMinutes,
      netBalanceMinutes,
      ferieDays,
      permessiHours,
      permessiMinutes,
      totalBancaOreAccumulated,
      totalBancaOreCompensated,
      bancaOreBalance,
      totalPaidOvertimeMinutes,
    };
  });
}

/**
 * Exports data to Excel .xlsx with two comprehensive sheets:
 * 1. Riepilogo Mensile
 * 2. Dettaglio Giornaliero
 */
export function exportToExcel(
  monthYear: string,
  employees: Employee[],
  records: TimeRecord[],
  leaves: LeaveRequest[]
): void {
  const monthTitle = formatMonthIT(monthYear);
  const stats = computeMonthlyStats(monthYear, employees, records, leaves);

  // 1. Riepilogo Data
  const summaryRows = stats.map((s) => ({
    'Dipendente': s.employee.name,
    'Giorni Lavorati': s.daysWorked,
    'Ore Totali Lavorate': formatMinutesToHM(s.totalWorkedMinutes),
    'Ore Decimali': Number(formatMinutesToDecimal(s.totalWorkedMinutes)),
    'Straordinari Notturni': s.totalOvertimeNotturniMinutes > 0 ? formatMinutesToHM(s.totalOvertimeNotturniMinutes) : '—',
    'Straordinari Festivi': s.totalOvertimeFestiviMinutes > 0 ? formatMinutesToHM(s.totalOvertimeFestiviMinutes) : '—',
    'Straordinari Pagati (Autorizz.)': s.totalPaidOvertimeMinutes > 0 ? formatMinutesToHM(s.totalPaidOvertimeMinutes) : '—',
    'Banca Ore (+)': s.totalBancaOreAccumulated > 0 ? formatMinutesToHM(s.totalBancaOreAccumulated) : '—',
    'Banca Ore (-)': s.totalBancaOreCompensated > 0 ? formatMinutesToHM(s.totalBancaOreCompensated) : '—',
    'Saldo Banca Ore': (s.bancaOreBalance >= 0 ? '+' : '') + formatMinutesToHM(s.bancaOreBalance),
    'Ferie Fruite (gg)': s.ferieDays,
    'Permessi Fruiti': s.permessiMinutes > 0 ? formatMinutesToHM(s.permessiMinutes) : '—',
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  // Auto column widths
  wsSummary['!cols'] = [
    { wch: 26 }, // Dipendente
    { wch: 15 }, // Giorni
    { wch: 18 }, // Ore Totali
    { wch: 14 }, // Decimali
    { wch: 20 }, // Straordinari Notturni
    { wch: 20 }, // Straordinari Festivi
    { wch: 26 }, // Straordinari Pagati (Autorizz.)
    { wch: 16 }, // Banca Ore (+)
    { wch: 16 }, // Banca Ore (-)
    { wch: 18 }, // Saldo Banca Ore
    { wch: 16 }, // Ferie
    { wch: 18 }, // Permessi
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Riepilogo Mensile');

  // 2. Dettaglio Giornaliero
  const allMonthRecords = getCompleteMonthRecords(monthYear, employees, records);
  const detailRows = allMonthRecords.map((r) => {
    const emp = employees.find((e) => e.id === r.employeeId);
    const calc = calculateRecord(r, undefined, false, emp);
    const times = getRecordTimestamps(r);
    const dateParts = r.date.split('-');
    const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : r.date;
    const outAftDisplay = times.clockOutAfternoon
      ? times.clockOutAfternoonNextDay
        ? `${times.clockOutAfternoon} (+1 gg 🌙)`
        : times.clockOutAfternoon
      : '—';

    // Daily Banca Ore & Paid Overtime allocation
    const isAuthorized = r.overtimeAuthorized === true || (r.overtimeEventName && r.overtimeEventName.trim() !== '');
    const otFestivi = calc.overtimeFestiviMinutes || 0;
    const otNotturni = calc.overtimeNotturniMinutes || 0;
    const otDiurni = calc.overtimeDiurniMinutes || 0;
    const totalOt = calc.overtimeMinutes || 0;

    let dailyPaidOt = 0;
    let dailyBankAccumulated = 0;

    if (isAuthorized) {
      dailyPaidOt = totalOt;
    } else {
      dailyPaidOt = otFestivi + otNotturni;
      dailyBankAccumulated = otDiurni;
    }

    const dailyDeficit = calc.deficitMinutes || 0;

    let noteText = '';
    if (r.overtimeAuthorized) noteText = '[Autorizzato]';
    if (r.overtimeEventName) noteText = noteText ? `${noteText} Evento: ${r.overtimeEventName}` : `Evento: ${r.overtimeEventName}`;

    if (r.leaveType === 'ferie') noteText = noteText ? `${noteText} - Ferie` : 'Ferie';
    else if (r.leaveType === 'malattia') noteText = noteText ? `${noteText} - Malattia` : 'Malattia';
    else if (r.leaveType === 'permesso') {
      const pm = getPermessoMinutes(r);
      noteText = noteText ? `${noteText} - Permesso (${formatMinutesToHM(pm)})` : `Permesso (${formatMinutesToHM(pm)})`;
    }
    if (r.notes) noteText = noteText ? `${noteText} - ${r.notes}` : r.notes;

    return {
      'Data': dateFormatted,
      'Dipendente': emp?.name || r.employeeId,
      '1ª Entrata (Mattina)': times.clockInMorning || '—',
      '1ª Uscita (Mattina)': times.clockOutMorning || '—',
      '2ª Entrata (Pomeriggio)': times.clockInAfternoon || '—',
      '2ª Uscita (Pomeriggio)': outAftDisplay,
      'Ore Lavorate': calc.hoursWorkedFormatted,
      'Straordinari Notturni': otNotturni > 0 ? `+${formatMinutesToHM(otNotturni)}` : '—',
      'Straordinari Festivi': otFestivi > 0 ? `+${formatMinutesToHM(otFestivi)}` : '—',
      'Straordinari Pagati (Autorizz.)': dailyPaidOt > 0 ? `+${formatMinutesToHM(dailyPaidOt)}` : '—',
      'Banca Ore (+)': dailyBankAccumulated > 0 ? `+${formatMinutesToHM(dailyBankAccumulated)}` : '—',
      'Banca Ore (-) / Recupero': dailyDeficit > 0 ? `-${formatMinutesToHM(dailyDeficit)}` : '—',
      'Note / Assenza': noteText || '—',
    };
  });

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 12 }, // Data
    { wch: 22 }, // Dipendente
    { wch: 20 }, // 1ª Entrata
    { wch: 20 }, // 1ª Uscita
    { wch: 22 }, // 2ª Entrata
    { wch: 24 }, // 2ª Uscita
    { wch: 14 }, // Ore Lavorate
    { wch: 20 }, // Straordinari Notturni
    { wch: 20 }, // Straordinari Festivi
    { wch: 26 }, // Straordinari Pagati (Autorizz.)
    { wch: 16 }, // Banca Ore (+)
    { wch: 24 }, // Banca Ore (-)
    { wch: 35 }, // Note
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Dettaglio Giornaliero');

  const fileName = `TIGi_Presenze_${monthYear}_${monthTitle.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports printable PDF using jsPDF and jspdf-autotable
 */
export function exportToPDF(
  monthYear: string,
  employees: Employee[],
  records: TimeRecord[],
  leaves: LeaveRequest[],
  selectedEmployeeId: string = 'all'
): void {
  const monthTitle = formatMonthIT(monthYear);
  
  // Filter employees based on selection
  const filteredEmployees = selectedEmployeeId === 'all'
    ? employees
    : employees.filter((e) => e.id === selectedEmployeeId);

  const stats = computeMonthlyStats(monthYear, filteredEmployees, records, leaves);

  // Landscape A4 for best table readability
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Helper to format date YYYY-MM-DD into DD/MM/YYYY
  const formatDateIT = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // --- PAGE 1: Riepilogo Mensile ---
  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('TIGi Presenze • Riepilogo Presenze e Calcolo Straordinari / Banca Ore', 14, 16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(
    `Periodo di riferimento: ${monthTitle} (${monthYear})  |  Orario Standard: 8h/giorno  |  Dipendenti esportati: ${
      selectedEmployeeId === 'all' ? 'Tutti (4)' : filteredEmployees[0]?.name
    }`,
    14,
    23
  );

  // 1. Summary Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Riepilogo Mensile per Dipendente', 14, 32);

  const summaryHead = [
    ['Dipendente', 'Gg Lav.', 'Ore Lavorate', 'Str. Notturni', 'Str. Festivi', 'Str. Pagati', 'Banca Ore (+)', 'Banca Ore (-)', 'Saldo Banca', 'Ferie', 'Permessi']
  ];

  const summaryBody = stats.map((s) => [
    s.employee.name,
    s.daysWorked.toString(),
    formatMinutesToHM(s.totalWorkedMinutes),
    s.totalOvertimeNotturniMinutes > 0 ? `+${formatMinutesToHM(s.totalOvertimeNotturniMinutes)}` : '0h 00m',
    s.totalOvertimeFestiviMinutes > 0 ? `+${formatMinutesToHM(s.totalOvertimeFestiviMinutes)}` : '0h 00m',
    s.totalPaidOvertimeMinutes > 0 ? `+${formatMinutesToHM(s.totalPaidOvertimeMinutes)}` : '0h 00m',
    s.totalBancaOreAccumulated > 0 ? `+${formatMinutesToHM(s.totalBancaOreAccumulated)}` : '0h 00m',
    s.totalBancaOreCompensated > 0 ? `-${formatMinutesToHM(s.totalBancaOreCompensated)}` : '0h 00m',
    (s.bancaOreBalance >= 0 ? '+' : '') + formatMinutesToHM(s.bancaOreBalance),
    `${s.ferieDays} gg`,
    s.permessiMinutes > 0 ? formatMinutesToHM(s.permessiMinutes) : '—',
  ]);

  autoTable(doc, {
    startY: 35,
    head: summaryHead,
    body: summaryBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 16 },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 22, textColor: [23, 37, 84], fontStyle: 'bold' }, // Notturni
      4: { cellWidth: 22, textColor: [153, 27, 27], fontStyle: 'bold' }, // Festivi
      5: { cellWidth: 22, textColor: [16, 185, 129], fontStyle: 'bold' }, // Str. Pagati (Emerald)
      6: { cellWidth: 22, textColor: [79, 70, 229] }, // Banca Ore (+)
      7: { cellWidth: 22, textColor: [217, 119, 6] }, // Banca Ore (-)
      8: { cellWidth: 24, fontStyle: 'bold', textColor: [79, 70, 229] }, // Saldo
      9: { cellWidth: 18 },
      10: { cellWidth: 18 },
    },
    styles: {
      cellPadding: 2,
    },
  });

  // --- PAGES 2+: Registro Giornaliero Dettagliato ---
  filteredEmployees.forEach((emp) => {
    doc.addPage();

    // Page Title for Employee Detailed Daily Register
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`Registro Giornaliero Dettagliato - ${emp.name}`, 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Mese: ${monthTitle} (${monthYear})  |  Qualifica: ${emp.role}`, 14, 22);

    const detailedHead = [
      ['Data', '1ª Entr.', '1ª Usc.', '2ª Entr.', '2ª Usc.', 'Lavorato', 'Str. Notturni', 'Str. Festivi', 'Str. Pagati', 'Banca Ore (+)', 'Banca Ore (-)', 'Note / Assenza']
    ];

    const empRecords = getCompleteMonthRecords(monthYear, [emp], records);
    const detailedBody = empRecords.map((r) => {
      const calc = calculateRecord(r, undefined, false, emp);
      const times = getRecordTimestamps(r);
      const dateFormatted = formatDateIT(r.date);
      const worked = calc.hoursWorkedFormatted;

      const isAuthorized = r.overtimeAuthorized === true || (r.overtimeEventName && r.overtimeEventName.trim() !== '');
      const otFestivi = calc.overtimeFestiviMinutes || 0;
      const otNotturni = calc.overtimeNotturniMinutes || 0;
      const otDiurni = calc.overtimeDiurniMinutes || 0;
      const totalOt = calc.overtimeMinutes || 0;

      let dailyPaidOt = 0;
      let dailyBankAccumulated = 0;

      if (isAuthorized) {
        dailyPaidOt = totalOt;
      } else {
        dailyPaidOt = otFestivi + otNotturni;
        dailyBankAccumulated = otDiurni;
      }

      const dailyDeficit = calc.deficitMinutes || 0;

      let noteCol = '';
      if (r.overtimeAuthorized) noteCol = '[Autorizzato]';
      if (r.overtimeEventName) noteCol = noteCol ? `${noteCol} Evento: ${r.overtimeEventName}` : `Evento: ${r.overtimeEventName}`;

      if (r.leaveType === 'ferie') {
        noteCol = noteCol ? `${noteCol} - Ferie` : 'Ferie';
      } else if (r.leaveType === 'malattia') {
        noteCol = noteCol ? `${noteCol} - Malattia` : 'Malattia';
      } else if (r.leaveType === 'permesso') {
        if (r.permessoHours !== undefined && r.permessoMinutes !== undefined && (r.permessoHours > 0 || r.permessoMinutes > 0)) {
          noteCol = noteCol ? `${noteCol} - Permesso (${r.permessoHours}:${r.permessoMinutes.toString().padStart(2, '0')})` : `Permesso (${r.permessoHours}:${r.permessoMinutes.toString().padStart(2, '0')})`;
        } else {
          const hVal = r.leaveHours || 0;
          const totalMinutes = Math.round(hVal * 60);
          const hh = Math.floor(totalMinutes / 60);
          const mm = totalMinutes % 60;
          noteCol = noteCol ? `${noteCol} - Permesso (${hh}:${mm.toString().padStart(2, '0')})` : `Permesso (${hh}:${mm.toString().padStart(2, '0')})`;
        }
      }

      if (r.notes) {
        noteCol = noteCol ? `${noteCol} - ${r.notes}` : r.notes;
      }

      return [
        dateFormatted,
        times.clockInMorning || '—',
        times.clockOutMorning || '—',
        times.clockInAfternoon || '—',
        times.clockOutAfternoon ? (times.clockOutAfternoonNextDay ? `${times.clockOutAfternoon} (+1)` : times.clockOutAfternoon) : '—',
        worked,
        otNotturni > 0 ? `+${formatMinutesToHM(otNotturni)}` : '—',
        otFestivi > 0 ? `+${formatMinutesToHM(otFestivi)}` : '—',
        dailyPaidOt > 0 ? `+${formatMinutesToHM(dailyPaidOt)}` : '—',
        dailyBankAccumulated > 0 ? `+${formatMinutesToHM(dailyBankAccumulated)}` : '—',
        dailyDeficit > 0 ? `-${formatMinutesToHM(dailyDeficit)}` : '—',
        noteCol || '—'
      ];
    });

    autoTable(doc, {
      startY: 27,
      head: detailedHead,
      body: detailedBody,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85], // Slate 700
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 14 },
        2: { cellWidth: 14 },
        3: { cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 16, fontStyle: 'bold' }, // Worked
        6: { cellWidth: 16, textColor: [23, 37, 84], fontStyle: 'bold' }, // Notturni
        7: { cellWidth: 16, textColor: [153, 27, 27], fontStyle: 'bold' }, // Festivi
        8: { cellWidth: 18, textColor: [16, 185, 129], fontStyle: 'bold' }, // Pagati
        9: { cellWidth: 16, textColor: [79, 70, 229] }, // Banca Ore (+)
        10: { cellWidth: 16, textColor: [217, 119, 6], fontStyle: 'bold' }, // Banca Ore (-)
        11: { halign: 'left' },
      },
      styles: {
        cellPadding: 1,
      },
      didParseCell: (data) => {
        // Highlight weekend dates
        if (data.column.index === 0 && data.cell.raw) {
          const rawStr = data.cell.raw as string;
          const parts = rawStr.split('/');
          if (parts.length === 3) {
            const dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            const day = dateObj.getDay();
            if (day === 0 || day === 6) {
              data.cell.styles.fillColor = [248, 250, 252]; // Slate 50
              data.cell.styles.textColor = [148, 163, 184]; // Slate 400
            }
          }
        }
        // Color coding for Overtime (6, 7, 8, 9) and Deficit (10)
        if ((data.column.index === 6 || data.column.index === 7 || data.column.index === 8 || data.column.index === 9) && data.cell.raw) {
          const rawStr = data.cell.raw as string;
          if (rawStr.startsWith('+')) {
            if (data.column.index === 6) {
              data.cell.styles.textColor = [23, 37, 84]; // Notturni
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 7) {
              data.cell.styles.textColor = [153, 27, 27]; // Festivi
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 8) {
              data.cell.styles.textColor = [16, 185, 129]; // Pagati
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 9) {
              data.cell.styles.textColor = [79, 70, 229]; // Banca Ore (+)
            }
          }
        }
        if (data.column.index === 10 && data.cell.raw) {
          const rawStr = data.cell.raw as string;
          if (rawStr.startsWith('-')) {
            data.cell.styles.textColor = [217, 119, 6]; // Amber/Orange
          }
        }
      }
    });
  });

  // Footer page numbers across all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TIGi Presenze • Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')} - Pagina ${i} di ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const exportLabel = selectedEmployeeId === 'all' ? 'Tutti_Dipendenti' : filteredEmployees[0]?.name.replace(/\s+/g, '_');
  const fileName = `TIGi_Presenze_Cartellino_${monthYear}_${exportLabel}.pdf`;
  doc.save(fileName);
}

