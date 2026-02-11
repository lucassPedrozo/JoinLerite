import { Holerite, Lancamento, Funcionario, Totais } from '../types';

const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanValue);
};

export const parseHoleriteXML = (xmlContent: string): Holerite[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const holeriteNodes = xmlDoc.getElementsByTagName("holerite");

  const holeriteMap = new Map<string, {
    mes: string;
    ano: string;
    tipo: string;
    funcionario: Funcionario;
    lancamentos: Lancamento[];
    totaisXml: Partial<Totais>;
    xmlParts: string[];
  }>();

  for (let i = 0; i < holeriteNodes.length; i++) {
    const node = holeriteNodes[i];

    const mes = node.getAttribute("mes") || "";
    const ano = node.getAttribute("ano") || "";
    const key = `${ano}-${mes}`;

    if (!holeriteMap.has(key)) {
      const tipo = node.getAttribute("tipo") || "";
      const funcNode = node.getElementsByTagName("funcionario")[0];
      const funcionario: Funcionario = {
        codigo: funcNode?.getElementsByTagName("codigo")[0]?.textContent || "",
        nome: funcNode?.getElementsByTagName("nome")[0]?.textContent || "",
        cargo: funcNode?.getElementsByTagName("cargo")[0]?.textContent || "Não informado",
        admissao: funcNode?.getElementsByTagName("admissao")[0]?.textContent || "-",
      };

      holeriteMap.set(key, {
        mes, ano, tipo, funcionario,
        lancamentos: [],
        totaisXml: {},
        xmlParts: [],
      });
    }

    const entry = holeriteMap.get(key)!;
    entry.xmlParts.push(node.outerHTML);

    const itens = node.getElementsByTagName("item");
    for (let j = 0; j < itens.length; j++) {
      const item = itens[j];
      const tipoInferido = item.getAttribute("tipo_inferido") as 'vencimento' | 'desconto' || 'vencimento';
      const valorStr = item.getElementsByTagName("valor")[0]?.textContent || "0";

      entry.lancamentos.push({
        codigo: item.getElementsByTagName("codigo")[0]?.textContent || "",
        descricao: item.getElementsByTagName("descricao")[0]?.textContent || "",
        referencia: item.getElementsByTagName("referencia")[0]?.textContent || "",
        valorOriginal: valorStr,
        valor: parseCurrency(valorStr),
        tipo: tipoInferido,
      });
    }

    const totaisNode = node.getElementsByTagName("totais")[0];
    if (totaisNode) {
      const liquidoStr = totaisNode.getElementsByTagName("liquido")[0]?.textContent;
      const brutoStr = totaisNode.getElementsByTagName("vencimentos")[0]?.textContent;
      const descontosStr = totaisNode.getElementsByTagName("descontos")[0]?.textContent;

      if (liquidoStr) entry.totaisXml.liquido = parseCurrency(liquidoStr);
      if (brutoStr) entry.totaisXml.bruto = parseCurrency(brutoStr);
      if (descontosStr) entry.totaisXml.totalDescontos = parseCurrency(descontosStr);
    }
  }

  return Array.from(holeriteMap.values()).map(entry => {
    const calcBruto = entry.lancamentos
      .filter(l => l.tipo === 'vencimento')
      .reduce((acc, curr) => acc + curr.valor, 0);

    const calcDescontos = entry.lancamentos
      .filter(l => l.tipo === 'desconto')
      .reduce((acc, curr) => acc + curr.valor, 0);

    const totais: Totais = {
      bruto: entry.totaisXml.bruto ?? calcBruto,
      totalDescontos: entry.totaisXml.totalDescontos ?? calcDescontos,
      liquido: entry.totaisXml.liquido ?? (calcBruto - calcDescontos),
    };

    return {
      id: `${entry.ano}-${entry.mes}-${Date.now()}`,
      mes: entry.mes,
      ano: entry.ano,
      tipo: entry.tipo,
      funcionario: entry.funcionario,
      lancamentos: entry.lancamentos,
      totais,
      rawXml: entry.xmlParts.join('\n'),
    };
  });
};
