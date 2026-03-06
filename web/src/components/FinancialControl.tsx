import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight,
  Briefcase, ShoppingCart, DollarSign, Repeat,
} from 'lucide-react';
import { Holerite, MonthFinancial, FinancialEntry, RecurringEntry } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface FinancialControlProps {
  holerites: Holerite[];
  financialData: MonthFinancial[];
  setFinancialData: React.Dispatch<React.SetStateAction<MonthFinancial[]>>;
  recurringData: RecurringEntry[];
  setRecurringData: React.Dispatch<React.SetStateAction<RecurringEntry[]>>;
  hideValues?: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinancialControl: React.FC<FinancialControlProps> = ({
  holerites, financialData, setFinancialData, recurringData, setRecurringData, hideValues = false,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [newDesc, setNewDesc] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('income');
  const [isRecurring, setIsRecurring] = useState(false);
  const [newInstallments, setNewInstallments] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteRecurringId, setConfirmDeleteRecurringId] = useState<string | null>(null);

  const mask = (v: number) => hideValues ? 'R$ ••••••' : fmt(v);

  const monthName = MONTHS[selectedMonth];
  const yearStr = String(selectedYear);

  const navigate = (dir: -1 | 1) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Salary from imported holerites for the selected month
  const monthHolerite = holerites.find(
    h => h.mes === monthName && h.ano === yearStr
  );
  const salaryBase = useMemo(() => {
    if (!monthHolerite) return 0;
    const liq = monthHolerite.totais.liquido || 0;
    const adiant = monthHolerite.lancamentos.find(
      l => l.descricao.toUpperCase() === 'ADIANTAMENTO SALARIAL'
    );
    return adiant ? liq + adiant.valor : liq;
  }, [monthHolerite]);

  // Get or create month financial data
  const monthData = financialData.find(
    d => d.month === monthName && d.year === yearStr
  );
  const entries = monthData?.entries || [];

  const addEntry = () => {
    const parsed = parseFloat(newValue.replace(',', '.'));
    if (!newDesc.trim() || isNaN(parsed) || parsed <= 0) return;

    if (isRecurring) {
      const inst = parseInt(newInstallments);
      if (isNaN(inst) || inst < 2 || inst > 120) return;
      const recurring: RecurringEntry = {
        id: crypto.randomUUID(),
        description: newDesc.trim(),
        value: parsed,
        type: newType,
        startMonth: selectedMonth,
        startYear: selectedYear,
        installments: inst,
      };
      setRecurringData(prev => [...prev, recurring]);
    } else {
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        description: newDesc.trim(),
        value: parsed,
        type: newType,
      };
      setFinancialData(prev => {
        const existing = prev.find(d => d.month === monthName && d.year === yearStr);
        if (existing) {
          return prev.map(d =>
            d.month === monthName && d.year === yearStr
              ? { ...d, entries: [...d.entries, entry] }
              : d
          );
        }
        return [...prev, { month: monthName, year: yearStr, entries: [entry] }];
      });
    }
    setNewDesc('');
    setNewValue('');
    setNewInstallments('');
  };

  const removeEntry = (entryId: string) => {
    if (confirmDeleteId !== entryId) {
      setConfirmDeleteId(entryId);
      return;
    }
    setConfirmDeleteId(null);
    setFinancialData(prev =>
      prev.map(d =>
        d.month === monthName && d.year === yearStr
          ? { ...d, entries: d.entries.filter(e => e.id !== entryId) }
          : d
      ).filter(d => d.entries.length > 0)
    );
  };

  const removeRecurring = (recurringId: string) => {
    if (confirmDeleteRecurringId !== recurringId) {
      setConfirmDeleteRecurringId(recurringId);
      return;
    }
    setConfirmDeleteRecurringId(null);
    setRecurringData(prev => prev.filter(r => r.id !== recurringId));
  };

  // Compute which recurring entries apply to a given month/year
  const getRecurringForMonth = (monthIdx: number, year: number) => {
    return recurringData
      .map(r => {
        const startAbs = r.startYear * 12 + r.startMonth;
        const currentAbs = year * 12 + monthIdx;
        const diff = currentAbs - startAbs;
        if (diff < 0 || diff >= r.installments) return null;
        return { ...r, currentInstallment: diff + 1 };
      })
      .filter((r): r is RecurringEntry & { currentInstallment: number } => r !== null);
  };

  const activeRecurring = getRecurringForMonth(selectedMonth, selectedYear);

  const incomes = entries.filter(e => e.type === 'income');
  const expenses = entries.filter(e => e.type === 'expense');
  const recurringIncomes = activeRecurring.filter(r => r.type === 'income');
  const recurringExpenses = activeRecurring.filter(r => r.type === 'expense');
  const totalIncome = incomes.reduce((s, e) => s + e.value, 0) + recurringIncomes.reduce((s, r) => s + r.value, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.value, 0) + recurringExpenses.reduce((s, r) => s + r.value, 0);
  const totalReceived = salaryBase + totalIncome;
  const balance = totalReceived - totalExpense;

  // Chart data for overview (last 6 months)
  const chartData = useMemo(() => {
    const data: { name: string; receita: number; gasto: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m < 0) { m += 12; y--; }
      const mName = MONTHS[m];
      const yStr = String(y);
      const h = holerites.find(x => x.mes === mName && x.ano === yStr);
      let sal = 0;
      if (h) {
        const liq = h.totais.liquido || 0;
        const ad = h.lancamentos.find(l => l.descricao.toUpperCase() === 'ADIANTAMENTO SALARIAL');
        sal = ad ? liq + ad.valor : liq;
      }
      const fd = financialData.find(d => d.month === mName && d.year === yStr);
      const monthRecurring = getRecurringForMonth(m, y);
      const inc = (fd?.entries || []).filter(e => e.type === 'income').reduce((s, e) => s + e.value, 0)
        + monthRecurring.filter(r => r.type === 'income').reduce((s, r) => s + r.value, 0);
      const exp = (fd?.entries || []).filter(e => e.type === 'expense').reduce((s, e) => s + e.value, 0)
        + monthRecurring.filter(r => r.type === 'expense').reduce((s, r) => s + r.value, 0);
      data.push({ name: `${mName.substring(0, 3)}/${yStr.slice(2)}`, receita: sal + inc, gasto: exp });
    }
    return data;
  }, [selectedMonth, selectedYear, holerites, financialData, recurringData]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-semibold text-slate-700 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
              {p.dataKey === 'receita' ? 'Receita' : 'Gasto'}: {hideValues ? 'R$ ••••••' : fmt(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in space-y-6 pb-12">

      {/* Month Navigator */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">CONTROLE FINANCEIRO</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Gestão mensal de receitas e despesas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold min-w-[140px] text-center">{monthName} / {yearStr}</span>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Salário Base
            </p>
            <p className={`text-xl font-bold ${salaryBase > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
              {salaryBase > 0 ? mask(salaryBase) : (hideValues ? 'R$ ••••••' : 'Sem dados')}
            </p>
            {!monthHolerite && !hideValues && (
              <p className="text-[10px] text-slate-400 mt-1">Importe o holerite deste mês</p>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Receitas Extras
            </p>
            <p className="text-xl font-bold text-emerald-600">{mask(totalIncome)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{incomes.length + recurringIncomes.length} lançamento(s)</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Total Gastos
            </p>
            <p className="text-xl font-bold text-red-600">{mask(totalExpense)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{expenses.length + recurringExpenses.length} lançamento(s)</p>
          </div>
          <div className={`p-5 ${balance >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Saldo do Mês
            </p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {mask(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Visão dos Últimos 6 Meses</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => hideValues ? '••' : `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((_, i) => (
                  <Cell key={`r-${i}`} fill="#10B981" />
                ))}
              </Bar>
              <Bar dataKey="gasto" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((_, i) => (
                  <Cell key={`g-${i}`} fill="#F43F5E" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita Total</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Gastos</span>
        </div>
      </div>

      {/* Add Entry Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Novo Lançamento</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setNewType('income')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  newType === 'income'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Receita
              </button>
              <button
                onClick={() => setNewType('expense')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  newType === 'expense'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Gasto
              </button>
              <button
                onClick={() => setIsRecurring(v => !v)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isRecurring
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" /> Recorrente
              </button>
            </div>
            <input
              type="text"
              placeholder="Descrição (ex: Freelance, Aluguel...)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Valor (R$)"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              className="w-full sm:w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {isRecurring && (
              <input
                type="text"
                inputMode="numeric"
                placeholder="Parcelas"
                value={newInstallments}
                onChange={e => setNewInstallments(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEntry()}
                className="w-full sm:w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            )}
            <button
              onClick={addEntry}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5 justify-center"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          {isRecurring && (
            <p className="text-[11px] text-indigo-500 flex items-center gap-1.5">
              <Repeat className="w-3 h-3" />
              O valor será lançado automaticamente nos próximos meses a partir de {monthName}/{yearStr}.
            </p>
          )}
        </div>
      </div>

      {/* Entries Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Incomes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50/30 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Receitas Extras
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {mask(totalIncome)}
            </span>
          </div>
          {incomes.length === 0 && recurringIncomes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Nenhuma receita extra adicionada
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {incomes.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{e.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-600">{mask(e.value)}</span>
                    <button
                      onClick={() => removeEntry(e.id)}
                      onBlur={() => setConfirmDeleteId(null)}
                      className={`p-1 rounded transition-all text-xs font-medium ${
                        confirmDeleteId === e.id
                          ? 'bg-red-600 text-white px-2'
                          : 'text-slate-300 hover:text-red-500'
                      }`}
                    >
                      {confirmDeleteId === e.id ? 'Confirmar?' : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              {recurringIncomes.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors bg-indigo-50/20">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.description}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">Parcela {r.currentInstallment}/{r.installments}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-600">{mask(r.value)}</span>
                    <button
                      onClick={() => removeRecurring(r.id)}
                      onBlur={() => setConfirmDeleteRecurringId(null)}
                      className={`p-1 rounded transition-all text-xs font-medium ${
                        confirmDeleteRecurringId === r.id
                          ? 'bg-red-600 text-white px-2'
                          : 'text-slate-300 hover:text-red-500'
                      }`}
                      title={confirmDeleteRecurringId === r.id ? 'Confirmar exclusão de todas as parcelas' : 'Excluir recorrência'}
                    >
                      {confirmDeleteRecurringId === r.id ? 'Excluir todas?' : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-red-50/30 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Gastos
            </h3>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {mask(totalExpense)}
            </span>
          </div>
          {expenses.length === 0 && recurringExpenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Nenhum gasto adicionado
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{e.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-red-600">{mask(e.value)}</span>
                    <button
                      onClick={() => removeEntry(e.id)}
                      onBlur={() => setConfirmDeleteId(null)}
                      className={`p-1 rounded transition-all text-xs font-medium ${
                        confirmDeleteId === e.id
                          ? 'bg-red-600 text-white px-2'
                          : 'text-slate-300 hover:text-red-500'
                      }`}
                    >
                      {confirmDeleteId === e.id ? 'Confirmar?' : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              {recurringExpenses.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors bg-indigo-50/20">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.description}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">Parcela {r.currentInstallment}/{r.installments}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-red-600">{mask(r.value)}</span>
                    <button
                      onClick={() => removeRecurring(r.id)}
                      onBlur={() => setConfirmDeleteRecurringId(null)}
                      className={`p-1 rounded transition-all text-xs font-medium ${
                        confirmDeleteRecurringId === r.id
                          ? 'bg-red-600 text-white px-2'
                          : 'text-slate-300 hover:text-red-500'
                      }`}
                      title={confirmDeleteRecurringId === r.id ? 'Confirmar exclusão de todas as parcelas' : 'Excluir recorrência'}
                    >
                      {confirmDeleteRecurringId === r.id ? 'Excluir todas?' : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialControl;
