import React from 'react';
import { Holerite } from '../types';
import { getPdfUrl, getXmlUrl } from '../services/api';
import { TrendingUp, TrendingDown, Calendar, User, Briefcase, Building2, Download, FileCode } from 'lucide-react';
import PayrollChart from './PayrollChart';

interface PayrollDetailProps {
  holerite: Holerite;
  hideValues?: boolean;
}

const formatCurrency = (val: number | undefined) => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const PayrollDetail: React.FC<PayrollDetailProps> = ({ holerite, hideValues = false }) => {
  const mask = (text: string) => hideValues ? '••••••' : text;
  const maskCur = (val: number | undefined) => hideValues ? 'R$ ••••••' : formatCurrency(val);
  const vencimentos = holerite.lancamentos.filter(l => l.tipo === 'vencimento');
  const descontos = holerite.lancamentos.filter(l => l.tipo === 'desconto');

  const bruto = holerite.totais.bruto || 0;
  const totalDesc = holerite.totais.totalDescontos || 0;
  const liquido = holerite.totais.liquido || 0;
  const effectiveRate = bruto > 0 ? (totalDesc / bruto) * 100 : 0;
  const adiantamento = holerite.lancamentos.find(l => l.descricao.toUpperCase() === 'ADIANTAMENTO SALARIAL');

  return (
    <div className="animate-fade-in space-y-6 pb-12">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">DEMONSTRATIVO DE PAGAMENTO</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Referência: {holerite.mes}/{holerite.ano}</p>
            </div>
          </div>
          {holerite.fileId && (
            <div className="hidden md:flex gap-1">
              <a
                href={getPdfUrl(holerite.fileId)}
                className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Baixar PDF"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-medium">PDF</span>
              </a>
              <a
                href={getXmlUrl(holerite.fileId)}
                className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Baixar XML"
              >
                <FileCode className="w-4 h-4" />
                <span className="text-xs font-medium">XML</span>
              </a>
            </div>
          )}
        </div>

        {/* Employee Info */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">{mask(holerite.funcionario.nome)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>{mask(holerite.funcionario.cargo)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 md:justify-end">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Admissão: {holerite.funcionario.admissao}</span>
          </div>
        </div>

        {/* Key Financials */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6 text-center md:text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Vencimentos</p>
            <p className="text-2xl font-bold text-emerald-600">{maskCur(bruto)}</p>
          </div>
          <div className="p-6 text-center md:text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Descontos</p>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <p className="text-2xl font-bold text-red-600">{maskCur(totalDesc)}</p>
              <span className="text-xs font-medium text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                {hideValues ? '••%' : `${effectiveRate.toFixed(1)}%`}
              </span>
            </div>
          </div>
          <div className="p-6 bg-slate-50/50 text-center md:text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Valor Líquido</p>
            <p className="text-3xl font-bold text-slate-800">{maskCur(adiantamento ? liquido + adiantamento.valor : liquido)}</p>
            {adiantamento && (
              <p className="text-xs text-slate-500 mt-1">
                {maskCur(liquido)} + Adiantamento {maskCur(adiantamento.valor)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <PayrollChart holerite={holerite} hideValues={hideValues} />

      {/* Detailed Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Earnings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50/30">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Créditos
            </h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-2 w-16 text-xs uppercase">Cód</th>
                  <th className="px-4 py-2 text-xs uppercase">Descrição</th>
                  <th className="px-4 py-2 text-right w-20 text-xs uppercase">Ref</th>
                  <th className="px-4 py-2 text-right w-28 text-xs uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vencimentos.map((item, idx) => (
                  <tr key={`v-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{item.descricao}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs font-mono">{item.referencia !== '0,00' ? item.referencia : ''}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{hideValues ? 'R$ ••••••' : item.valorOriginal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500">Subtotal Créditos</span>
            <span className="text-lg font-bold text-emerald-700">{maskCur(bruto)}</span>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="px-5 py-3 border-b border-slate-100 bg-red-50/30">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Débitos
            </h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-2 w-16 text-xs uppercase">Cód</th>
                  <th className="px-4 py-2 text-xs uppercase">Descrição</th>
                  <th className="px-4 py-2 text-right w-20 text-xs uppercase">Ref</th>
                  <th className="px-4 py-2 text-right w-28 text-xs uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {descontos.map((item, idx) => (
                  <tr key={`d-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{item.descricao}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs font-mono">{item.referencia !== '0,00' ? item.referencia : ''}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600">{hideValues ? 'R$ ••••••' : item.valorOriginal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500">Subtotal Débitos</span>
            <span className="text-lg font-bold text-red-600">{maskCur(totalDesc)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PayrollDetail;
