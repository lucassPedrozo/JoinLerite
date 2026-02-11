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
