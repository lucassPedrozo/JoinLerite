import pdfplumber
import re
import logging
import xml.etree.ElementTree as ET
from xml.dom import minidom

log = logging.getLogger("holerite.extractor")

def normalizar_texto(texto):
    """Remove acentos e coloca em maiúsculo."""
    substituicoes = {
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C', '.': '', '-': ' '
    }
    texto_norm = texto.upper()
    for original, novo in substituicoes.items():
        texto_norm = texto_norm.replace(original, novo)
    return texto_norm

class ExtratorHolerite:
    def __init__(self):
        self.rx_competencia = re.compile(r"(Mensalista|Folha Mensal)\s+([A-Z][a-zç]+)\s+de\s+(\d{4})")
        self.rx_liquido = re.compile(r"Valor Líquido\s+(\d{1,3}(?:\.\d{3})*,\d{2})")

    def classificar_item(self, descricao):
        """Classifica se um item é vencimento ou desconto."""
        desc_norm = normalizar_texto(descricao)
        
        if "TROCO" in desc_norm:
            return "desconto" if "ANTERIOR" in desc_norm else "vencimento"

        termos_desconto = [
            "INSS", "IRRF", "IMPOSTO", "RENDA", "CONTRIBUICAO", "SINDICAL", 
            "ASSISTENCIAL", "PENSAO", "JUDICIAL", "FALTAS", "ATRASOS", 
            "DSR SOBRE FALTAS", "HORAS FALTAS", "VALE", "ADIANTAMENTO", 
            "ANTECIPACAO", "UNIMED", "PLANO", "SAUDE", "COPART", "SEGURO", 
            "VIDA", "ACADEMIA", "FILIACAO", "ASSOCIACAO", "GREMIO",
            "FARMACIA", "CONVENIO", "ALIMENTACAO", "REFEICAO", "TRANSPORTE",
            "DESC", "DESCONTO", "DEVOLUCAO"
        ]
        
        # INSS sempre é desconto, mesmo com férias
        if "INSS" in desc_norm:
            return "desconto"
        
        # Férias e diferenças de férias são geralmente vencimentos
        if "FERIAS" in desc_norm:
            # Exceção: adiantamento de férias é desconto
            if "ADIANTAMENTO" in desc_norm:
                return "desconto"
            return "vencimento"

        for termo in termos_desconto:
            if termo in desc_norm:
                return "desconto"
        return "vencimento"

    def limpar_valor(self, valor):
        """Limpa e valida valor."""
        if not valor:
            return None
        valor = str(valor).strip()
        # Remove espaços e caracteres inválidos
        valor = valor.replace(' ', '')
        # Verifica se é valor monetário válido
        if re.match(r'^\d{1,3}(?:\.\d{3})*,\d{2}$', valor):
            return valor
        # Verifica se é hora válida
        if re.match(r'^\d+:\d{2}$', valor):
            return valor
        return None

    def extrair_funcionario(self, texto):
        """Extrai código, nome, cargo e admissão do funcionário."""
        linhas = texto.split('\n')
        cod = None
        nome = None
        cargo = None
        admissao = None
        
        for idx, linha in enumerate(linhas):
            # Padrão: número pequeno + nome + número grande (matrícula)
            match = re.search(r'^\s*(\d{1,3})\s+([A-Z][A-Z\s\.]+?)\s+(\d{5,})', linha)
            if match:
                cod = match.group(1)
                nome = match.group(2).strip()
                # Cargo: próxima linha não vazia após o nome
                for j in range(idx + 1, min(idx + 4, len(linhas))):
                    prox = linhas[j].strip()
                    if prox and not prox.startswith('Admiss'):
                        # Remove possíveis dados de admissão colados no final
                        cargo = re.split(r'\s{2,}', prox)[0].strip()
                        break
                break
        
        # Admissão: busca em qualquer linha
        for linha in linhas:
            match_adm = re.search(r'Admiss[ãa]o[:\s]+\s*(\d{2}/\d{2}/\d{4})', linha)
            if match_adm:
                admissao = match_adm.group(1)
                break
        
        return cod, nome, cargo, admissao

    def processar_pdf(self, caminho_pdf, caminho_xml):
        """Processa o PDF e gera o XML."""
        root = ET.Element("folhas_pagamento")
        
        # Dicionário para acumular todos os lançamentos do holerite
        todos_lancamentos = {}
        cod_funcionario = None
        nome_funcionario = None
        cargo_funcionario = None
        admissao_funcionario = None
        competencia_info = {}
        valor_liquido = None
        
        try:
            with pdfplumber.open(caminho_pdf) as pdf:
                log.info("Processando %d pagina(s)...", len(pdf.pages))
                
                for i, page in enumerate(pdf.pages):
                    log.debug("Pagina %d", i + 1)
                    
                    # Extrai texto completo da página
                    texto = page.extract_text(layout=True)
                    if not texto:
                        log.debug("Pagina %d: sem texto", i + 1)
                        continue
                    
                    # Extrai competência (apenas da primeira página)
                    if i == 0:
                        match_comp = self.rx_competencia.search(texto)
                        if match_comp:
                            competencia_info = {
                                'tipo': match_comp.group(1),
                                'mes': match_comp.group(2),
                                'ano': match_comp.group(3)
                            }
                            log.info("Competencia: %s/%s", match_comp.group(2), match_comp.group(3))
                    
                    # Extrai funcionário (apenas da primeira página)
                    if i == 0:
                        cod_funcionario, nome_funcionario, cargo_funcionario, admissao_funcionario = self.extrair_funcionario(texto)
                        if cod_funcionario:
                            log.info("Funcionario: %s - %s", cod_funcionario, nome_funcionario)
                            if cargo_funcionario:
                                log.debug("Cargo: %s", cargo_funcionario)
                            if admissao_funcionario:
                                log.debug("Admissao: %s", admissao_funcionario)
                    
                    # Extrai valor líquido
                    match_liq = self.rx_liquido.search(texto)
                    if match_liq:
                        valor_liquido = match_liq.group(1)
                        log.info("Valor Liquido: %s", valor_liquido)
                    
                    # Extrai tabelas da página
                    tables = page.extract_tables()
                    
                    if not tables:
                        log.debug("Pagina %d: nenhuma tabela", i + 1)
                        continue
                    
                    log.debug("Tabelas encontradas: %d", len(tables))
                    
                    for table_idx, table in enumerate(tables):
                        log.debug("Tabela %d: %d linhas", table_idx + 1, len(table))
                        
                        for row_idx, row in enumerate(table):
                            if not row or len(row) < 2:
                                continue
                            
                            # Verifica se a primeira célula contém múltiplas linhas de dados
                            primeira_celula = str(row[0] or "").strip()
                            
                            # Se a célula contém quebras de linha, pode ter múltiplos lançamentos
                            if '\n' in primeira_celula:
                                # Divide por linhas
                                linhas_codigo = primeira_celula.split('\n')
                                
                                # Pega a segunda célula (descrições)
                                segunda_celula = str(row[1] or "").strip() if len(row) > 1 else ""
                                linhas_descricao = segunda_celula.split('\n') if segunda_celula else []
                                
                                # Detecção dinâmica das colunas de dados
                                # Varre todas as colunas após a descrição procurando dados numéricos
                                data_cols = []
                                for col_idx in range(2, len(row)):
                                    cell = row[col_idx]
                                    if cell is None:
                                        continue
                                    cell_str = str(cell).strip()
                                    if cell_str and re.search(r'\d', cell_str):
                                        data_cols.append(cell_str)
                                
                                # Mapeia: 1ª=referência, 2ª=vencimentos, 3ª=descontos
                                coluna_ref = data_cols[0] if len(data_cols) > 0 else ""
                                coluna_venc = ""
                                coluna_desc = ""
                                
                                if len(data_cols) >= 3:
                                    coluna_venc = data_cols[1]
                                    coluna_desc = data_cols[2]
                                elif len(data_cols) == 2:
                                    # Apenas ref + uma coluna de valor
                                    # Trata como vencimento; classificar_item corrige o tipo
                                    coluna_venc = data_cols[1]
                                
                                linhas_ref = coluna_ref.split('\n') if coluna_ref else []
                                linhas_venc = coluna_venc.split('\n') if coluna_venc else []
                                linhas_desc = coluna_desc.split('\n') if coluna_desc else []
                                
                                # Processa cada linha
                                max_linhas = max(len(linhas_codigo), len(linhas_descricao))
                                num_venc = len(linhas_venc)
                                
                                for i in range(max_linhas):
                                    codigo = linhas_codigo[i].strip() if i < len(linhas_codigo) else ""
                                    descricao = linhas_descricao[i].strip() if i < len(linhas_descricao) else ""
                                    referencia = linhas_ref[i].strip() if i < len(linhas_ref) else None
                                    
                                    # Alinhamento correto: vencimentos vêm primeiro, descontos depois
                                    vencimento = None
                                    desconto = None
                                    if i < num_venc:
                                        vencimento = linhas_venc[i].strip()
                                    elif linhas_desc:
                                        desc_idx = i - num_venc
                                        if desc_idx < len(linhas_desc):
                                            desconto = linhas_desc[desc_idx].strip()
                                    
                                    # Valida código numérico
                                    if not codigo or not re.match(r'^\d{1,5}$', codigo):
                                        continue
                                    
                                    # Pula cabeçalhos e linhas vazias
                                    if not descricao or descricao.upper() in ['DESCRICAO', 'DESCRIÇÃO', 'CODIGO']:
                                        continue
                                    
                                    # Pula linhas de funcionário (tem matrícula)
                                    if re.search(r'\d{5,}', descricao):
                                        continue
                                    
                                    # Limpa valores
                                    referencia = self.limpar_valor(referencia) if referencia else None
                                    vencimento = self.limpar_valor(vencimento) if vencimento else None
                                    desconto = self.limpar_valor(desconto) if desconto else None
                                    
                                    # Remove zeros
                                    if vencimento == '0,00':
                                        vencimento = None
                                    if desconto == '0,00':
                                        desconto = None
                                    
                                    # Define o valor final e tipo
                                    # Se tem valor em desconto, é desconto; senão é vencimento
                                    if desconto:
                                        valor = desconto
                                        tipo = "desconto"
                                    elif vencimento:
                                        valor = vencimento
                                        # Usa classificação inteligente baseada na descrição
                                        tipo = self.classificar_item(descricao)
                                    else:
                                        continue
                                    
                                    # Chave única para evitar duplicatas
                                    chave = f"{codigo}|{descricao}"
                                    
                                    if chave not in todos_lancamentos:
                                        todos_lancamentos[chave] = {
                                            'codigo': codigo,
                                            'descricao': descricao,
                                            'referencia': referencia,
                                            'valor': valor,
                                            'tipo': tipo
                                        }
                            else:
                                # Processamento original para células separadas
                                codigo = primeira_celula
                                
                                # Valida se é código numérico
                                if not codigo or not re.match(r'^\d{1,5}$', codigo):
                                    continue
                                
                                # Segunda célula é descrição
                                descricao = str(row[1] or "").strip()
                                
                                # Pula cabeçalhos
                                if not descricao or descricao.upper() in ['DESCRICAO', 'DESCRIÇÃO', 'CODIGO']:
                                    continue
                                
                                # Pula linhas de funcionário (tem matrícula)
                                if re.search(r'\d{5,}', descricao):
                                    continue
                                
                                # Extrai valores das colunas restantes
                                referencia = None
                                vencimento = None
                                desconto = None
                                
                                # Processa colunas de valores (índices 2, 3, 4)
                                if len(row) > 2:
                                    ref_raw = self.limpar_valor(row[2])
                                    if ref_raw:
                                        referencia = ref_raw
                                
                                if len(row) > 3:
                                    venc_raw = self.limpar_valor(row[3])
                                    if venc_raw and venc_raw != '0,00':
                                        vencimento = venc_raw
                                
                                if len(row) > 4:
                                    desc_raw = self.limpar_valor(row[4])
                                    if desc_raw and desc_raw != '0,00':
                                        desconto = desc_raw
                                
                                # Define o valor final (vencimento ou desconto)
                                valor = desconto if desconto else vencimento
                                
                                if not valor:
                                    continue
                                
                                # Chave única para evitar duplicatas
                                chave = f"{codigo}|{descricao}"
                                
                                if chave not in todos_lancamentos:
                                    tipo = "desconto" if desconto else "vencimento"
                                    
                                    todos_lancamentos[chave] = {
                                        'codigo': codigo,
                                        'descricao': descricao,
                                        'referencia': referencia,
                                        'valor': valor,
                                        'tipo': tipo
                                    }
                
                # Cria o XML com todos os dados acumulados
                folha_xml = ET.SubElement(root, "holerite")
                
                if competencia_info:
                    folha_xml.set("tipo", competencia_info['tipo'])
                    folha_xml.set("mes", competencia_info['mes'])
                    folha_xml.set("ano", competencia_info['ano'])
                
                # Funcionário
                dados_func = ET.SubElement(folha_xml, "funcionario")
                if cod_funcionario:
                    ET.SubElement(dados_func, "codigo").text = cod_funcionario
                    ET.SubElement(dados_func, "nome").text = nome_funcionario
                    if cargo_funcionario:
                        ET.SubElement(dados_func, "cargo").text = cargo_funcionario
                    if admissao_funcionario:
                        ET.SubElement(dados_func, "admissao").text = admissao_funcionario
                
                # Lançamentos
                itens_xml = ET.SubElement(folha_xml, "lancamentos_financeiros")
                
                log.info("Total de lancamentos unicos: %d", len(todos_lancamentos))
                
                total_vencimentos = 0.0
                total_descontos = 0.0
                
                for lanc in todos_lancamentos.values():
                    item = ET.SubElement(itens_xml, "item")
                    item.set("tipo_inferido", lanc['tipo'])
                    
                    ET.SubElement(item, "codigo").text = lanc['codigo']
                    ET.SubElement(item, "descricao").text = lanc['descricao']
                    if lanc['referencia']:
                        ET.SubElement(item, "referencia").text = lanc['referencia']
                    ET.SubElement(item, "valor").text = lanc['valor']
                    
                    # Calcula totais
                    valor_num = float(lanc['valor'].replace('.', '').replace(',', '.'))
                    if lanc['tipo'] == 'vencimento':
                        total_vencimentos += valor_num
                    else:
                        total_descontos += valor_num
                
                # Totais
                totais_xml = ET.SubElement(folha_xml, "totais")
                ET.SubElement(totais_xml, "vencimentos").text = f"{total_vencimentos:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                ET.SubElement(totais_xml, "descontos").text = f"{total_descontos:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                if valor_liquido:
                    ET.SubElement(totais_xml, "liquido").text = valor_liquido
            
            # Salva XML
            xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
            xml_str = "\n".join([line for line in xml_str.split('\n') if line.strip()])
            
            with open(caminho_xml, "w", encoding="utf-8") as f:
                f.write(xml_str)
            
            log.info("XML salvo em: %s", caminho_xml)
            
        except Exception as e:
            log.exception("Erro ao processar PDF")
            raise
