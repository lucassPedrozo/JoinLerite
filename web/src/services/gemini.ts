import { GoogleGenAI } from "@google/genai";
import { Holerite } from '../types';

export const analyzePayrollWithGemini = async (holerite: Holerite): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  const prompt = `
    Atue como um Auditor de Folha de Pagamento Sênior e Analista Financeiro.
    Analise tecnicamente os dados do holerite abaixo.

    Diretrizes da análise:
    1.  **Auditoria de Tributos**: Verifique se os valores de INSS e IRRF parecem coerentes com a base bruta.
    2.  **Composição de Renda**: Analise a proporção de salário fixo vs. variáveis (horas extras, comissões).
    3.  **Alertas**: Identifique descontos não usuais ou altos demais.
    4.  **Conclusão Técnica**: Um breve parágrafo sobre a saúde financeira demonstrada neste documento.

    *Não use tom coloquial. Use linguagem corporativa e direta.*

    Dados do Holerite (JSON):
    ${JSON.stringify(dataContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise técnica no momento.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Ocorreu um erro ao conectar com o serviço de auditoria IA.";
  }
};

export const explainItemWithGemini = async (descricao: string, valor: string, tipo: string): Promise<string> => {
  if (!process.env.API_KEY) return "Configuração de API Key ausente.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Definição técnica contábil do item de folha de pagamento: "${descricao}" (${tipo}). Explique a base de cálculo usual e finalidade legal. Seja breve.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Sem explicação técnica disponível.";
  } catch {
    return "Erro ao buscar explicação.";
  }
};
