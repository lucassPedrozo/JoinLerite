const API = '/api';

export interface ConvertResponse {
  success: boolean;
  fileId: string;
  filename: string;
  xml: string;
}

export async function convertPdf(file: File): Promise<ConvertResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API}/convert`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadXml(file: File): Promise<ConvertResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API}/upload-xml`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteServerFile(fileId: string): Promise<void> {
  await fetch(`${API}/files/${fileId}`, { method: 'DELETE' });
}

export function getPdfUrl(fileId: string): string {
  return `${API}/files/${fileId}/pdf`;
}

export function getXmlUrl(fileId: string): string {
  return `${API}/files/${fileId}/xml`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
