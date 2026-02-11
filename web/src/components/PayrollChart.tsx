import React from 'react';
import { Holerite } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface PayrollChartProps {
  holerite: Holerite;
  hideValues?: boolean;
}

const COLOR_NET = '#10B981';
const COLOR_DISCOUNT = '#F43F5E';
const COLOR_BAR_BG = '#F1F5F9';

const PayrollChart: React.FC<PayrollChartProps> = ({ holerite, hideValues = false }) => {

  const breakdownData = [
    { name: 'Líquido', value: holerite.totais.liquido || 0, color: COLOR_NET },
    { name: 'Descontos', value: holerite.totais.totalDescontos || 0, color: COLOR_DISCOUNT },
  ];

  const allDeductions = holerite.lancamentos
    .filter(l => l.tipo === 'desconto' && l.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const topDeductions = allDeductions.slice(0, 5).map(l => ({
    name: l.descricao.length > 15 ? l.descricao.substring(0, 15) + '...' : l.descricao,
    fullDesc: l.descricao,
    value: l.valor,
  }));

  const otherDeductionsValue = allDeductions.slice(5).reduce((acc, curr) => acc + curr.valor, 0);
  if (otherDeductionsValue > 0) {
    topDeductions.push({ name: 'Outros', fullDesc: 'Outros Descontos Menores', value: otherDeductionsValue });
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const CustomTooltipDonut = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase">{payload[0].name}</p>
          <p className="text-sm font-bold text-slate-800">{hideValues ? 'R$ ••••••' : formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {hideValues ? '••%' : `${((payload[0].value / (holerite.totais.bruto || 1)) * 100).toFixed(1)}% do Bruto`}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase">{data.fullDesc}</p>
          <p className="text-sm font-bold text-slate-800">{hideValues ? 'R$ ••••••' : formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Donut */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destinação do Bruto</h3>
          <p className="text-xs text-slate-400">Distribuição entre valor líquido recebido e descontos totais.</p>
        </div>
        <div className="h-64 w-full relative mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                cornerRadius={5}
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipDonut />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 font-medium">Bruto Total</span>
            <span className="text-lg font-bold text-slate-800">{hideValues ? 'R$ ••••••' : formatCurrency(holerite.totais.bruto || 0)}</span>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          {breakdownData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-xs font-medium text-slate-600">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal Bars */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maiores Descontos</h3>
          <p className="text-xs text-slate-400">Ranking dos principais impactos na folha de pagamento.</p>
        </div>
        <div className="flex-1 w-full min-h-[250px]">
          {topDeductions.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDeductions}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#f8fafc' }} />
                <Bar
                  dataKey="value"
                  fill={COLOR_DISCOUNT}
                  radius={[0, 4, 4, 0] as [number, number, number, number]}
                  background={{ fill: COLOR_BAR_BG, radius: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Sem descontos registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollChart;
