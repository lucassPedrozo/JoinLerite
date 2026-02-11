import React, { useState } from 'react';
import { LayoutDashboard, FolderOpen, ChevronRight, FileText, Trash2, Download, FileCode, Eye, EyeOff } from 'lucide-react';
import FileUploader from './components/FileUploader';
import PayrollDetail from './components/PayrollDetail';
import { useLocalStorage } from './hooks/useLocalStorage';
import { deleteServerFile, getPdfUrl, getXmlUrl } from './services/api';
import { Holerite } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis'>('upload');
  const [holerites, setHolerites] = useLocalStorage<Holerite[]>('holerites', []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState(false);

  const mask = (text: string) => hideValues ? '••••••' : text;
  const maskCurrency = (v: number | undefined) => hideValues ? 'R$ ••••••' : fmt(v);

  const handleDataLoaded = (data: Holerite[]) => {
    setHolerites(prev => [...prev, ...data]);
    if (holerites.length === 0 && data.length > 0) {
      setSelectedId(data[0].id);
      setActiveTab('analysis');
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    const h = holerites.find(x => x.id === id);
    if (h?.fileId) {
      try { await deleteServerFile(h.fileId); } catch { /* best-effort */ }
    }
    setHolerites(prev => prev.filter(x => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = holerites.find(h => h.id === selectedId);

  const fmt = (v: number | undefined) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">

      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('upload')}>
                <img src="/assets/favicon.png" alt="JoinLerite" className="h-9 w-9 rounded-lg" />
                <span className="font-bold text-lg text-indigo-700 tracking-tight">JoinLerite</span>
              </div>
              <nav className="hidden sm:flex space-x-1">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'upload' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Arquivos</div>
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  disabled={holerites.length === 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'analysis' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  } ${holerites.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</div>
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHideValues(v => !v)}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === 'upload' && (
          <div className="animate-fade-in space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Importação de Dados</h2>
                <p className="text-slate-500 text-sm">Carregue arquivos PDF ou XML para alimentar o sistema.</p>
              </div>
              <FileUploader onDataLoaded={handleDataLoaded} />
            </section>

            {holerites.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Histórico de Arquivos
                  </h3>
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                    {holerites.length} registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Período</th>
                        <th className="px-6 py-3">Funcionário</th>
                        <th className="px-6 py-3 text-right">Bruto</th>
                        <th className="px-6 py-3 text-right">Líquido</th>
                        <th className="px-6 py-3 text-center">Arquivos</th>
                        <th className="px-6 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {holerites.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900">{h.mes}/{h.ano}</td>
                          <td className="px-6 py-3 text-slate-600">{mask(h.funcionario.nome)}</td>
                          <td className="px-6 py-3 text-right text-emerald-600 font-medium">{maskCurrency(h.totais.bruto)}</td>
                          <td className="px-6 py-3 text-right font-bold text-slate-800">{maskCurrency(h.totais.liquido)}</td>
                          <td className="px-6 py-3 text-center">
                            {h.fileId ? (
                              <div className="flex items-center justify-center gap-2">
                                <a href={getPdfUrl(h.fileId)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Baixar PDF">
                                  <Download className="w-4 h-4" />
                                </a>
                                <a href={getXmlUrl(h.fileId)} className="text-indigo-500 hover:text-indigo-700 p-1 rounded hover:bg-indigo-50 transition-colors" title="Baixar XML">
                                  <FileCode className="w-4 h-4" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => { setSelectedId(h.id); setActiveTab('analysis'); }}
                                className="text-indigo-600 hover:text-indigo-900 text-xs border border-indigo-200 hover:border-indigo-400 bg-indigo-50 px-3 py-1 rounded transition-all"
                              >
                                Visualizar
                              </button>
                              <button
                                onClick={() => handleDelete(h.id)}
                                onBlur={() => setConfirmDeleteId(null)}
                                className={`p-1 rounded transition-all text-xs font-medium ${
                                  confirmDeleteId === h.id
                                    ? 'bg-red-600 text-white px-2'
                                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title={confirmDeleteId === h.id ? 'Clique para confirmar' : 'Excluir'}
                              >
                                {confirmDeleteId === h.id ? 'Confirmar?' : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="flex flex-col md:flex-row gap-6 h-full animate-fade-in">
            <aside className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Navegação</h3>
                </div>
                <div className="p-2 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {holerites.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">Nenhum dado importado</div>
                  ) : (
                    holerites.map(h => (
                      <div key={h.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedId(h.id)}
                          className={`flex-1 flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            selectedId === h.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {h.mes}/{h.ano}
                          </span>
                          {selectedId === h.id && <ChevronRight className="w-3 h-3 text-slate-400" />}
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          onBlur={() => setConfirmDeleteId(null)}
                          className={`p-1.5 rounded transition-all ${
                            confirmDeleteId === h.id
                              ? 'bg-red-600 text-white text-[10px] font-bold px-1.5'
                              : 'text-slate-300 hover:text-red-500'
                          }`}
                          title={confirmDeleteId === h.id ? 'Clique para confirmar' : 'Excluir'}
                        >
                          {confirmDeleteId === h.id ? '×' : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-center text-slate-400">
                  Selecione um mês para detalhar
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {selected ? (
                <PayrollDetail holerite={selected} hideValues={hideValues} />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <LayoutDashboard className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-500">Nenhum holerite selecionado</p>
                  <p className="text-sm mt-1">Selecione na barra lateral ou importe um arquivo.</p>
                  <button onClick={() => setActiveTab('upload')} className="mt-6 text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                    Ir para Importação &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
