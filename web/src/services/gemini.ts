import { Holerite } from '../types';

// A chave do Gemini fica somente no backend (server/.env).
// O frontend apenas envia os dados para a API local.
const API = '/api/ai';

async function postAi(path: string, body: unknown, fallback: string): Promise<string> {
  try {
    const res = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || fallback;
    return data.text || fallback;
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return fallback;
  }
}

export const analyzePayrollWithGemini = async (holerite: Holerite): Promise<string> => {
  const dataContext = {
    periodo: `${holerite.mes}/${holerite.ano}`,
    cargo: holerite.funcionario.cargo,
    admissao: holerite.funcionario.admissao,
    itens: holerite.lancamentos.map(l => ({
      d: l.descricao,
      v: l.valorOriginal,
      t: l.tipo,
      ref: l.referencia,
    })),
    totais: {
      bruto: holerite.totais.bruto?.toFixed(2),
      descontos: holerite.totais.totalDescontos?.toFixed(2),
      liquido: holerite.totais.liquido?.toFixed(2),
    },
  };

  return postAi('analyze', dataContext, "Ocorreu um erro ao conectar com o serviço de auditoria IA.");
};

export const explainItemWithGemini = async (descricao: string, valor: string, tipo: string): Promise<string> => {
  return postAi('explain', { descricao, valor, tipo }, "Erro ao buscar explicação.");
};
