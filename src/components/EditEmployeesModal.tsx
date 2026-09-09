import React, { useState } from 'react';
import { Users, X, Check, Save } from 'lucide-react';
import { Employee } from '../types';

interface EditEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (updated: Employee[]) => void;
}

export const EditEmployeesModal: React.FC<EditEmployeesModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSave,
}) => {
  const [formData, setFormData] = useState<Employee[]>(employees);

  if (!isOpen) return null;

  const handleChange = (index: number, field: keyof Employee, value: any) => {
    const updated = [...formData];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Personalizza i 4 Dipendenti
              </h3>
              <p className="text-xs text-slate-400">
                Modifica i nominativi dei 4 dipendenti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {formData.map((emp, index) => {
              const avatarThemes = [
                'bg-indigo-100 text-indigo-600',
                'bg-amber-100 text-amber-600',
                'bg-rose-100 text-rose-600',
                'bg-sky-100 text-sky-600',
              ];
              const avatarStyle = avatarThemes[index % avatarThemes.length];

              return (
                <div
                  key={emp.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Dipendente #{index + 1}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg ${avatarStyle} font-bold text-xs flex items-center justify-center`}
                    >
                      {emp.name.split(' ').map((n) => n[0]).join('') || '#'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 text-xs">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome e Cognome</label>
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Orario Lavoro</label>
                      <select
                        value={emp.scheduleType || 'standard_8h'}
                        onChange={(e) => handleChange(index, 'scheduleType', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
                      >
                        <option value="standard_8h">Standard (8 ore Lun-Ven)</option>
                        <option value="standard_9h">Standard (9 ore Lun-Ven)</option>
                        <option value="six_days">Su 6 giorni (7h 12m Lun-Ven, 4h Sab)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md shadow-slate-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
