import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Property } from '../../../types';
import { supabase } from '../../../lib/SupabaseService';
import { showToast } from '../../../utils/toast';

interface FinancialsSectionProps {
  property: Property;
  bookings: any[];
}

const FinancialsSection: React.FC<FinancialsSectionProps> = ({ property, bookings }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isExpLoading, setIsExpLoading] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState(0);
  const [newExpCat, setNewExpCat] = useState<'maintenance' | 'cleaning' | 'tax' | 'utilities' | 'other'>('maintenance');

  const fetchExpenses = async () => {
    setIsExpLoading(true);
    const { data } = await supabase.from('property_expenses').select('*').eq('property_id', property.id).order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setIsExpLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [property.id]);

  const handleAddExpense = async () => {
    if (!newExpDesc || newExpAmount <= 0) return;
    const { error } = await supabase.from('property_expenses').insert({
      property_id: property.id,
      description: newExpDesc,
      amount: newExpAmount,
      category: newExpCat || 'other'
    });

    if (!error) {
      showToast("Gasto registrado ✨");
      setNewExpDesc('');
      setNewExpAmount(0);
      fetchExpenses();
    }
  };

  // Calculations for VIP Insights 🔱
  const { totalIncome, totalExpensesSum, netProfit, expenseRatio } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const income = bookings
      .filter(b => {
        const bDate = new Date(b.check_in);
        return b.property_id === property.id &&
          (b.status === 'confirmed' || b.status === 'Paid') &&
          bDate.getMonth() === currentMonth &&
          bDate.getFullYear() === currentYear;
      })
      .reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);

    const expensesTotal = expenses
      .filter(exp => {
        const expDate = new Date(exp.created_at);
        return expDate.getMonth() === currentMonth &&
          expDate.getFullYear() === currentYear;
      })
      .reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

    const net = income - expensesTotal;
    const ratio = income > 0 ? (expensesTotal / income) * 100 : 0;

    return { totalIncome: income, totalExpensesSum: expensesTotal, netProfit: net, expenseRatio: ratio };
  }, [bookings, expenses, property.id]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header>
        <h3 className="text-xl font-serif font-black italic text-text-main tracking-tighter">Rentabilidad y Finanzas 🔱</h3>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.25em] opacity-80 mt-1">Ingresos vs Gastos del Mes en Curso</p>
      </header>

      {/* Financial Health Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-gray-400 mb-2">Ingresos Mes ({new Date().toLocaleString('es-ES', { month: 'long' })})</p>
          <p className="text-3xl font-serif font-black italic tracking-tighter text-yellow-400">${totalIncome.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${100 - expenseRatio}%` }} className="h-full bg-yellow-400" />
            </div>
            <span className="text-[8px] font-black text-yellow-400">{Math.round(100 - expenseRatio)}% NETO</span>
          </div>
        </div>

        <div className="p-6 bg-red-50/50 border border-red-100 rounded-[2.5rem] shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-red-400 mb-2">Gastos Operativos</p>
          <p className="text-3xl font-serif font-black italic tracking-tighter text-red-600">-${totalExpensesSum.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-red-400 mt-2 uppercase tracking-tighter">{expenseRatio.toFixed(1)}% de ratio de gasto</p>
        </div>

        <div className="p-6 bg-primary/10 border border-primary/20 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary mb-2">Profit Neto Real</p>
          <p className={`text-3xl font-serif font-black italic tracking-tighter ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
            ${netProfit.toLocaleString()}
          </p>
          <p className="text-[9px] font-bold text-primary/60 mt-2 uppercase tracking-tighter">Felicidades, vas por buen camino 🔱</p>
        </div>
      </div>

      {/* Expense Ledger */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-soft">
        <h4 className="font-bold text-sm mb-6 flex items-center gap-2"><span className="material-icons text-primary/40 text-sm">list_alt</span> Registro de Gastos</h4>
        
        {/* Add Expense Form */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 p-6 bg-sand/20 rounded-[2rem] border border-primary/20/30">
          <div className="flex-1">
            <label className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-[#2D5A27] block mb-2 ml-1">Descripción</label>
            <input value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} placeholder="Ej: Reparación A/C Master" className="w-full p-3 rounded-xl border-none bg-white text-xs font-bold outline-none" />
          </div>
          <div className="w-full md:w-32">
            <label className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-[#2D5A27] block mb-2 ml-1">Monto ($)</label>
            <input type="number" value={newExpAmount} onChange={e => setNewExpAmount(Number(e.target.value))} className="w-full p-3 rounded-xl border-none bg-white text-xs font-bold outline-none" />
          </div>
          <button onClick={handleAddExpense} className="md:mt-6 bg-black text-white px-6 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 hover:scale-105 transition-all shadow-lg active:scale-95">Registrar 🔱</button>
        </div>

        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp.id} className="flex justify-between items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <span className="material-icons text-sm">receipt_long</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-main">{exp.description}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-black">{new Date(exp.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="font-black text-xs text-red-500">-${Number(exp.amount).toFixed(2)}</p>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-center py-10 text-xs text-gray-400 font-bold uppercase tracking-widest">No hay gastos registrados este mes</p>}
        </div>
      </div>
    </div>
  );
};

export default FinancialsSection;
