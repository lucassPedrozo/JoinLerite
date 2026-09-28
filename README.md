# JoinLerite

Aplicacao web full stack para importacao, conversao e analise visual de holerites (folhas de pagamento). O usuario envia o PDF ou XML do holerite, o backend extrai os lancamentos para um XML estruturado e a interface exibe graficos, detalhamento dos itens, controle financeiro mensal e, opcionalmente, uma auditoria tecnica gerada pelo Google Gemini.

## Visao geral

O projeto e dividido em duas partes: um backend em Python com Flask, responsavel por receber os arquivos, extrair os dados do PDF com `pdfplumber` e armazenar PDFs e XMLs gerados; e um frontend em React com TypeScript, construido com Vite e Tailwind CSS, que faz o parse do XML, organiza os holerites por competencia e apresenta os dados em dashboards interativos. Um script PowerShell automatiza a verificacao de dependencias e a inicializacao dos dois servidores no Windows.

## Funcionalidades

- Upload de holerites em PDF, com conversao automatica para XML estruturado.
- Upload direto de XML ja convertido.
- Extracao de funcionario, competencia, lancamentos, totais e valor liquido.
- Classificacao automatica de itens em vencimentos e descontos.
- Dashboard com graficos de composicao salarial via Recharts.
- Detalhamento dos lancamentos de cada holerite.
- Controle financeiro mensal com receitas, despesas e lancamentos recorrentes parcelados.
- Modo para ocultar valores sensiveis na tela.
- Download do PDF original e do XML gerado.
- Exclusao de registros com limpeza dos arquivos no servidor.
- Auditoria tecnica e explicacao de itens com Google Gemini via backend (opcional).
- Persistencia local no navegador via `localStorage`.

## Estrutura do projeto

```text
.
|-- server/
|   |-- .env                   (opcional, ignorado pelo Git)
|   |-- app.py
|   |-- extractor.py
|   |-- requirements.txt
|   `-- data/                  (gerado em runtime, ignorado pelo Git)
|-- web/
|   |-- assets/
|   |   |-- [project_images]/
|   |   |   |-- img1.png
|   |   |   |-- img2.png
|   |   |   `-- img3.png
|   |   `-- favicon.png
|   |-- src/
|   |   |-- components/
|   |   |   |-- FileUploader.tsx
|   |   |   |-- FinancialControl.tsx
|   |   |   |-- PayrollChart.tsx
|   |   |   `-- PayrollDetail.tsx
|   |   |-- hooks/
|   |   |   `-- useLocalStorage.ts
|   |   |-- services/
|   |   |   |-- api.ts
|   |   |   `-- gemini.ts
|   |   |-- utils/
|   |   |   `-- xmlParser.ts
|   |   |-- App.tsx
|   |   |-- index.css
|   |   |-- main.tsx
|   |   `-- types.ts
|   |-- index.html
|   |-- package.json
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- start.bat
|-- start.ps1
|-- .gitignore
|-- LICENSE
`-- README.md
```

## Como executar

Pre-requisitos: Python 3.8+ e Node.js 18+.

No Windows, execute o arquivo `start.bat`. O script verifica Python e Node.js, instala as dependencias quando necessario, sobe o backend Flask na porta `5000`, o frontend Vite na porta `3000` e abre o navegador em `http://localhost:3000`. Para encerrar, digite `close`, `exit`, `quit`, `sair` ou `fechar` no terminal.

Em qualquer sistema operacional, tambem e possivel executar manualmente:

```bash
cd server
pip install -r requirements.txt
python app.py
```

```bash
cd web
npm install
npm run dev
```

Para habilitar a auditoria por IA, crie o arquivo `server/.env` com a chave obtida no [Google AI Studio](https://aistudio.google.com/apikey):

```env
GEMINI_API_KEY=sua_chave_aqui
```

A chave e lida apenas pelo backend e nunca e enviada ao navegador. Arquivos `.env` sao ignorados pelo Git.

O backend escuta somente em `127.0.0.1` e aceita CORS apenas de `localhost:3000`, portanto os holerites nao ficam expostos para outros dispositivos da rede.

## Stacks

- Python 3
- Flask
- Flask-CORS
- pdfplumber
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Recharts
- Lucide React
- Google Gemini API
- PowerShell

## Licenca

Distribuido sob a licenca MIT. Veja o arquivo `LICENSE`.

## Hook para portfolio

**Categoria do projeto:** Aplicacao web full stack

**Breve descricao:** Sistema em Python e React que converte holerites em PDF para XML estruturado e os apresenta em dashboards interativos, com controle financeiro mensal e auditoria opcional por IA com Google Gemini.

**Contexto:** O projeto foi desenvolvido para automatizar a leitura e a analise de folhas de pagamento, eliminando a conferencia manual de PDFs. Envolveu extracao de dados de documentos com expressoes regulares, construcao de uma API REST, parse de XML no frontend, visualizacao de dados e integracao com um modelo de linguagem.

**Resultado:** Uma aplicacao local funcional em que o usuario importa seus holerites, acompanha a evolucao salarial por competencia, confere vencimentos e descontos, organiza receitas e despesas do mes e pode solicitar uma analise tecnica automatizada de cada documento.

**Destaques:**

- Motor de extracao de PDF para XML com `pdfplumber` e expressoes regulares.
- Classificacao automatica de lancamentos em vencimentos e descontos.
- API REST em Flask com upload, download, listagem e exclusao de arquivos.
- Validacao de identificadores para evitar path traversal nos downloads.
- Chave da IA mantida apenas no servidor e backend restrito a `127.0.0.1`.
- Dashboards interativos com Recharts e interface responsiva com Tailwind CSS.
- Controle financeiro com lancamentos recorrentes e parcelados.
- Modo de privacidade para ocultar valores na tela.
- Integracao opcional com Google Gemini, feita pelo backend, para auditoria de tributos e explicacao de itens.
- Script de setup que verifica dependencias e inicia backend e frontend com um clique.

**Stacks:**

- Python
- Flask
- pdfplumber
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Google Gemini API

**Imagens:**

- `web/assets/[project_images]/img1.png`
- `web/assets/[project_images]/img2.png`
- `web/assets/[project_images]/img3.png`
