import React, { useCallback, useState } from 'react';
import { UploadCloud, FileCode, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { parseHoleriteXML } from '../utils/xmlParser';
import { convertPdf, uploadXml } from '../services/api';
import { Holerite } from '../types';

interface Props {
  onDataLoaded: (data: Holerite[]) => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const FileUploader: React.FC<Props> = ({ onDataLoaded }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    setStatus('loading');
    setMessage(`Processando ${file.name}...`);

    try {
      let xmlContent: string;
      let fileId: string | undefined;

      if (ext === 'pdf') {
        const res = await convertPdf(file);
        xmlContent = res.xml;
        fileId = res.fileId;
      } else if (ext === 'xml') {
        const res = await uploadXml(file);
        xmlContent = res.xml;
        fileId = res.fileId;
      } else {
        throw new Error('Use arquivos .pdf ou .xml');
      }

      const parsed = parseHoleriteXML(xmlContent);
      if (parsed.length === 0) throw new Error('Nenhum holerite encontrado no arquivo.');

      if (fileId) {
        parsed.forEach(h => (h.fileId = fileId));
      }

      onDataLoaded(parsed);
      setStatus('success');
      setMessage(`${parsed.length} holerite(s) importado(s).`);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Erro ao processar.');
    }
  }, [onDataLoaded]);

  const border = { idle: 'border-indigo-300', loading: 'border-amber-300', success: 'border-emerald-400', error: 'border-red-300' }[status];
  const bg = { idle: 'bg-indigo-50 hover:bg-indigo-100', loading: 'bg-amber-50', success: 'bg-emerald-50', error: 'bg-red-50' }[status];

  return (
    <div className={`w-full max-w-2xl mx-auto mt-6 p-8 border-2 border-dashed ${border} rounded-xl ${bg} transition-colors cursor-pointer relative`}>
      <input
        type="file"
        accept=".xml,.pdf"
        onChange={handleFile}
        disabled={status === 'loading'}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
      />
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-white rounded-full shadow-sm">
          {status === 'loading' && <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
          {status === 'error' && <AlertCircle className="w-10 h-10 text-red-500" />}
          {status === 'idle' && <UploadCloud className="w-10 h-10 text-indigo-600" />}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            {status === 'loading' ? 'Processando...' : 'Importar Arquivo'}
          </h3>
          {message ? (
            <p className={`mt-2 text-sm ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
              {message}
            </p>
          ) : (
            <p className="text-slate-500 mt-2 text-sm">Arraste ou clique para selecionar.</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-md shadow-sm">
            <FileText className="w-4 h-4 text-red-500" /> .pdf
          </span>
          <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-md shadow-sm">
            <FileCode className="w-4 h-4 text-indigo-500" /> .xml
          </span>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
