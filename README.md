# JoinLerite

> Sistema completo para importação, conversão e análise visual de holerites (folhas de pagamento), com auditoria inteligente por IA.

---

## Visão Geral

O **JoinLerite** automatiza a análise de holerites: basta fazer upload do PDF ou XML e o sistema extrai os dados, gera visualizações interativas e, opcionalmente, utiliza a API do Google Gemini para auditoria técnica contábil.

### Principais Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Upload PDF/XML** | Conversão automática de PDF para XML estruturado |
| **Dashboard interativo** | Gráficos de composição salarial via Recharts |
| **Download** | Exportação de PDF e XML originais a qualquer momento |
| **Gerenciamento** | Exclusão de registros com limpeza automática de arquivos |
| **Auditoria por IA** | Análise técnica via Google Gemini (opcional) |
| **Persistência** | Dados salvos no servidor e cache local no navegador |

---

## Pré-requisitos

| Dependência | Versão mínima | Link |
|-------------|---------------|------|
| Python | 3.8+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |

---

## Início Rápido

### Windows

Clique duas vezes em **`start.bat`** ou execute no terminal:

```bash
.\start.bat
```

O script automaticamente:

1. Verifica se Python e Node.js estão instalados
2. Instala dependências (`pip` + `npm`)
3. Inicia o backend Flask (porta `5000`) e o frontend Vite (porta `3000`)
4. Abre o navegador em `http://localhost:3000`

> **Para encerrar:** digite `close`, `exit`, `quit`, `sair` ou `fechar` no terminal.

### Manual (qualquer SO)

```bash
# Backend
cd server
pip install -r requirements.txt
python app.py

# Frontend (em outro terminal)
cd web
npm install
npm run dev
```

---

## Configuração da IA (opcional)

Para habilitar a auditoria inteligente com o Google Gemini, crie o arquivo `web/.env.local`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

> **⚠️ IMPORTANTE:** Nunca commite arquivos `.env` ou chaves de API. O `.gitignore` já está configurado para ignorar esses arquivos.

Obtenha sua chave em: [Google AI Studio](https://aistudio.google.com/apikey)

---

## Estrutura do Projeto

```
JoinLerite/
├── server/                  API Flask + motor de extração
│   ├── app.py               Servidor REST (porta 5000)
│   ├── extractor.py         Extrator PDF → XML estruturado
│   ├── requirements.txt     Dependências Python
│   └── data/                Armazenamento runtime (gitignored)
│       ├── manifest.json    Índice de arquivos processados
│       ├── pdfs/            PDFs recebidos
│       └── xmls/            XMLs gerados
│
├── web/                     Interface React + TypeScript
│   ├── vite.config.ts       Configuração do Vite + proxy
│   ├── package.json         Dependências Node.js
│   ├── tsconfig.json        Configuração TypeScript
│   └── src/
│       ├── App.tsx           Componente raiz
│       ├── types.ts          Definições de tipos
│       ├── components/
│       │   ├── FileUploader.tsx    Upload e conversão de arquivos
│       │   ├── PayrollChart.tsx    Gráficos de composição salarial
│       │   └── PayrollDetail.tsx   Detalhamento do holerite
│       ├── hooks/
│       │   └── useLocalStorage.ts  Persistência local
│       ├── services/
│       │   ├── api.ts              Comunicação com o backend
│       │   └── gemini.ts           Integração com Google Gemini
│       └── utils/
│           └── xmlParser.ts        Parser de XML para objetos
│
├── start.bat                Ponto de entrada Windows
├── start.ps1                Script de setup e inicialização
└── .gitignore               Proteção contra vazamento de dados
```

---

## Stack Tecnológica

### Backend
- **Python 3** — Linguagem do servidor
- **Flask** — Framework web REST
- **pdfplumber** — Extração de dados de PDFs

### Frontend
- **React 19** — Interface de usuário
- **TypeScript** — Tipagem estática
- **Tailwind CSS 4** — Estilização
- **Recharts** — Gráficos interativos
- **Vite** — Build tool e dev server
- **Google Gemini** — Auditoria por IA (opcional)

---

## Segurança

- Dados de folha de pagamento (`server/data/`) são ignorados pelo Git
- Chaves de API devem ser armazenadas exclusivamente em variáveis de ambiente
- Arquivos `.env`, `.env.local` e derivados são protegidos pelo `.gitignore`
- Atalhos `.lnk` do Windows são ignorados (contêm caminhos locais do usuário)

---

## Licença

Este projeto é de uso interno. Todos os direitos reservados.
