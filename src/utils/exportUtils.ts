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
} from './timeUtils';

export interface MonthlyStatsPerEmployee {
  employee: Employee;
  daysWorked: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  totalDeficitMinutes: number;
  netBalanceMinutes: number;
  ferieDays: number;
  permessiHours: number;
  permessiMinutes: number;
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
    let totalDeficitMinutes = 0;
    let ferieDays = 0;
    let permessiHours = 0;
    let permessiMinutes = 0;

    empRecords.forEach((r) => {
      const calc = calculateRecord(r, undefined, false, emp);
      const times = getRecordTimestamps(r);
      const hasStamps = Boolean(
        times.clockInMorning || times.clockOutMorning || times.clockInAfternoon || times.clockOutAfternoon
      );

      // Determine if this day should be counted in summary stats
      // "nel riepilogo mensile non inserire le ore non lavorate del giorno aggiorna il conteggio solo a fine giornata a timbrature completate"
      // User request: "nel Riepilogo Dipendenti non conteggiare la giornata in corso," -> do not count today at all in the summary
      const isFuture = r.date > todayStr;
      const isToday = r.date === todayStr;

      let shouldCount = false;
      if (!isFuture) {
        if (isToday) {
          // Non conteggiamo la giornata in corso nel riepilogo dipendenti
          shouldCount = false;
        } else {
          // Past days are always counted (unexcused past absences will rightly carry over the 8/9/7.2h deficit)
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
        totalDeficitMinutes += calc.deficitMinutes;
      }
    });

    const netBalanceMinutes = totalOvertimeMinutes - totalDeficitMinutes;

    return {
      employee: emp,
      daysWorked,
      totalWorkedMinutes,
      totalOvertimeMinutes,
      totalDeficitMinutes,
      netBalanceMinutes,
      ferieDays,
      permessiHours,
      permessiMinutes,
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
    'Straordinari (+)': formatMinutesToHM(s.totalOvertimeMinutes),
    'Recupero Ore (-)': formatMinutesToHM(s.totalDeficitMinutes),
    'Saldo Netto': (s.netBalanceMinutes >= 0 ? '+' : '') + formatMinutesToHM(s.netBalanceMinutes),
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
    { wch: 16 }, // Straordinari
    { wch: 16 }, // Recupero
    { wch: 15 }, // Saldo
    { wch: 16 }, // Ferie
    { wch: 18 }, // Permessi
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Riepilogo Mensile');

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
  doc.text('TIGi Presenze • Riepilogo Presenze e Calcolo Straordinari / Recuperi', 14, 16);

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
    ['Dipendente', 'Gg Lav.', 'Ore Lavorate', 'Straordinari (+)', 'Recupero Ore (-)', 'Saldo Netto', 'Ferie', 'Permessi']
  ];

  const summaryBody = stats.map((s) => [
    s.employee.name,
    s.daysWorked.toString(),
    formatMinutesToHM(s.totalWorkedMinutes),
    s.totalOvertimeMinutes > 0 ? `+${formatMinutesToHM(s.totalOvertimeMinutes)}` : '0h 00m',
    s.totalDeficitMinutes > 0 ? `-${formatMinutesToHM(s.totalDeficitMinutes)}` : '0h 00m',
    (s.netBalanceMinutes >= 0 ? '+' : '') + formatMinutesToHM(s.netBalanceMinutes),
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
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 20 },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 34, textColor: [16, 185, 129] }, // Emerald Green
      4: { cellWidth: 34, textColor: [239, 68, 68] },  // Red/Amber
      5: { cellWidth: 30, fontStyle: 'bold' },
      6: { cellWidth: 24 },
      7: { cellWidth: 24 },
    },
    styles: {
      cellPadding: 2.5,
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
      ['Data', '1ª Entr.', '1ª Usc.', '2ª Entr.', '2ª Usc.', 'Usc. Turno', 'Rie. Turno', 'Lavorato', 'Straordinari / Recuperi', 'Note / Assenza']
    ];

    const empRecords = getCompleteMonthRecords(monthYear, [emp], records);
    const detailedBody = empRecords.map((r) => {
      const calc = calculateRecord(r, undefined, false, emp);
      const times = getRecordTimestamps(r);
      const dateFormatted = formatDateIT(r.date);
      const worked = calc.hoursWorkedFormatted;

      let otDef = '—';
      if (calc.overtimeMinutes > 0) {
        otDef = `+${formatMinutesToHM(calc.overtimeMinutes)}`;
      } else if (calc.deficitMinutes > 0) {
        otDef = `-${formatMinutesToHM(calc.deficitMinutes)}`;
      } else if (calc.minutesWorked > 0) {
        otDef = '0h 00m';
      }

      let noteCol = '';
      if (r.leaveType === 'ferie') {
        noteCol = 'Ferie';
      } else if (r.leaveType === 'malattia') {
        noteCol = 'Malattia';
      } else if (r.leaveType === 'permesso') {
        if (r.permessoHours !== undefined && r.permessoMinutes !== undefined && (r.permessoHours > 0 || r.permessoMinutes > 0)) {
          noteCol = `Permesso (${r.permessoHours}:${r.permessoMinutes.toString().padStart(2, '0')})`;
        } else {
          const hVal = r.leaveHours || 0;
          const totalMinutes = Math.round(hVal * 60);
          const hh = Math.floor(totalMinutes / 60);
          const mm = totalMinutes % 60;
          noteCol = `Permesso (${hh}:${mm.toString().padStart(2, '0')})`;
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
        times.clockOutAfternoon || '—',
        r.exitDuringTurnStart || '—',
        r.exitDuringTurnEnd || '—',
        worked,
        otDef,
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
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 22, textColor: [180, 83, 9] }, // Amber-700
        6: { cellWidth: 22, textColor: [180, 83, 9] }, // Amber-700
        7: { cellWidth: 24, fontStyle: 'bold' },
        8: { cellWidth: 36, fontStyle: 'bold' },
        9: { halign: 'left' },
      },
      styles: {
        cellPadding: 1.5,
      },
      didParseCell: (data) => {
        // Highlight weekend dates
        if (data.column.index === 0 && data.cell.raw) {
          const rawStr = data.cell.raw as string;
          // rawStr format is DD/MM/YYYY
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
        // Color coding for Overtime/Deficit
        if (data.column.index === 8 && data.cell.raw) {
          const rawStr = data.cell.raw as string;
          if (rawStr.startsWith('+')) {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald Green
          } else if (rawStr.startsWith('-')) {
            data.cell.styles.textColor = [239, 68, 68]; // Red
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

