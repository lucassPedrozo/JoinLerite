export type LancamentoTipo = 'vencimento' | 'desconto';

export interface Lancamento {
  codigo: string;
  descricao: string;
  referencia: string;
  valorOriginal: string;
  valor: number;
  tipo: LancamentoTipo;
}

export interface Funcionario {
  codigo: string;
  nome: string;
  cargo: string;
  admissao: string;
}

export interface Totais {
  liquido?: number;
  bruto?: number;
  totalDescontos?: number;
}

export interface Holerite {
  id: string;
  fileId?: string;
  mes: string;
  ano: string;
  tipo: string;
  funcionario: Funcionario;
  lancamentos: Lancamento[];
  totais: Totais;
  rawXml?: string;
}

export interface FinancialEntry {
  id: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
}

export interface MonthFinancial {
  month: string;
  year: string;
  entries: FinancialEntry[];
}

export interface RecurringEntry {
  id: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
  startMonth: number;
  startYear: number;
  installments: number;
}
