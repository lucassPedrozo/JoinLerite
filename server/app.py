import os
import re
import uuid
import json
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from extractor import ExtratorHolerite

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("holerite")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

HOST = "127.0.0.1"
PORT = 5000
GEMINI_MODEL = "gemini-3-flash-preview"

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

DATA_DIR = os.path.join(BASE_DIR, "data")
PDF_DIR = os.path.join(DATA_DIR, "pdfs")
XML_DIR = os.path.join(DATA_DIR, "xmls")
MANIFEST = os.path.join(DATA_DIR, "manifest.json")

for d in [PDF_DIR, XML_DIR]:
    os.makedirs(d, exist_ok=True)

_FILE_ID_RE = re.compile(r"^[a-f0-9]{12}$")


def _valid_file_id(file_id: str) -> bool:
    return bool(_FILE_ID_RE.match(file_id))


def _load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_manifest(entries):
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ─── Upload & Convert ────────────────────────────────────────────────────────

@app.route("/api/convert", methods=["POST"])
def convert():
    """Recebe um PDF, converte para XML, armazena ambos e retorna o XML."""
    if "file" not in request.files:
        return jsonify({"error": "Campo 'file' obrigatório."}), 400

    uploaded = request.files["file"]
    name = uploaded.filename or ""

    if not name.lower().endswith(".pdf"):
        return jsonify({"error": "Apenas arquivos PDF são aceitos."}), 400

    file_id = uuid.uuid4().hex[:12]
    pdf_path = os.path.join(PDF_DIR, f"{file_id}.pdf")
    xml_path = os.path.join(XML_DIR, f"{file_id}.xml")

    uploaded.save(pdf_path)
    log.info("PDF recebido: %s -> %s", name, file_id)

    try:
        ExtratorHolerite().processar_pdf(pdf_path, xml_path)

        with open(xml_path, "r", encoding="utf-8") as f:
            xml_content = f.read()

        manifest = _load_manifest()
        manifest.append({
            "id": file_id,
            "originalName": name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
        _save_manifest(manifest)

        return jsonify({
            "success": True,
            "fileId": file_id,
            "filename": name,
            "xml": xml_content,
        })

    except Exception as e:
        log.exception("Falha ao processar PDF %s", name)
        for p in [pdf_path, xml_path]:
            if os.path.exists(p):
                os.remove(p)
        return jsonify({"error": f"Erro ao processar: {e}"}), 500


@app.route("/api/upload-xml", methods=["POST"])
def upload_xml():
    """Recebe um XML já pronto, armazena e retorna o conteúdo."""
    if "file" not in request.files:
        return jsonify({"error": "Campo 'file' obrigatório."}), 400

    uploaded = request.files["file"]
    name = uploaded.filename or ""

    if not name.lower().endswith(".xml"):
        return jsonify({"error": "Apenas arquivos XML são aceitos."}), 400

    file_id = uuid.uuid4().hex[:12]
    xml_path = os.path.join(XML_DIR, f"{file_id}.xml")

    content = uploaded.read().decode("utf-8")
    with open(xml_path, "w", encoding="utf-8") as f:
        f.write(content)

    manifest = _load_manifest()
    manifest.append({
        "id": file_id,
        "originalName": name,
        "type": "xml",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    _save_manifest(manifest)

    return jsonify({
        "success": True,
        "fileId": file_id,
        "filename": name,
        "xml": content,
    })


# ─── File Management ─────────────────────────────────────────────────────────

@app.route("/api/files")
def list_files():
    return jsonify(_load_manifest())


@app.route("/api/files/<file_id>/pdf")
def download_pdf(file_id):
    if not _valid_file_id(file_id):
        return jsonify({"error": "ID inválido."}), 400
    path = os.path.join(PDF_DIR, f"{file_id}.pdf")
    if not os.path.exists(path):
        return jsonify({"error": "PDF não encontrado."}), 404

    entry = next((e for e in _load_manifest() if e["id"] == file_id), None)
    download_name = entry["originalName"] if entry else f"{file_id}.pdf"
    return send_file(path, as_attachment=True, download_name=download_name)


@app.route("/api/files/<file_id>/xml")
def download_xml(file_id):
    if not _valid_file_id(file_id):
        return jsonify({"error": "ID inválido."}), 400
    path = os.path.join(XML_DIR, f"{file_id}.xml")
    if not os.path.exists(path):
        return jsonify({"error": "XML não encontrado."}), 404

    entry = next((e for e in _load_manifest() if e["id"] == file_id), None)
    base = entry["originalName"] if entry else f"{file_id}.pdf"
    download_name = base.rsplit(".", 1)[0] + ".xml"
    return send_file(path, as_attachment=True, download_name=download_name)


@app.route("/api/files/<file_id>", methods=["DELETE"])
def delete_file(file_id):
    if not _valid_file_id(file_id):
        return jsonify({"error": "ID inválido."}), 400
    for directory, ext in [(PDF_DIR, ".pdf"), (XML_DIR, ".xml")]:
        p = os.path.join(directory, f"{file_id}{ext}")
        if os.path.exists(p):
            os.remove(p)

    manifest = [e for e in _load_manifest() if e["id"] != file_id]
    _save_manifest(manifest)
    return jsonify({"success": True})


# ─── IA (Google Gemini) ──────────────────────────────────────────────────────
# A chave fica apenas no servidor (server/.env) e nunca é enviada ao navegador.

def _gemini_generate(prompt: str) -> str:
    from google import genai

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return response.text or ""


@app.route("/api/ai/analyze", methods=["POST"])
def ai_analyze():
    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "GEMINI_API_KEY não configurada no servidor."}), 503

    data_context = request.get_json(silent=True)
    if not isinstance(data_context, dict):
        return jsonify({"error": "Corpo JSON inválido."}), 400

    prompt = f"""
    Atue como um Auditor de Folha de Pagamento Sênior e Analista Financeiro.
    Analise tecnicamente os dados do holerite abaixo.

    Diretrizes da análise:
    1.  **Auditoria de Tributos**: Verifique se os valores de INSS e IRRF parecem coerentes com a base bruta.
    2.  **Composição de Renda**: Analise a proporção de salário fixo vs. variáveis (horas extras, comissões).
    3.  **Alertas**: Identifique descontos não usuais ou altos demais.
    4.  **Conclusão Técnica**: Um breve parágrafo sobre a saúde financeira demonstrada neste documento.

    *Não use tom coloquial. Use linguagem corporativa e direta.*

    Dados do Holerite (JSON):
    {json.dumps(data_context, ensure_ascii=False)}
    """

    try:
        text = _gemini_generate(prompt)
        return jsonify({"text": text or "Não foi possível gerar a análise técnica no momento."})
    except Exception:
        log.exception("Falha ao chamar Gemini (analyze)")
        return jsonify({"error": "Ocorreu um erro ao conectar com o serviço de auditoria IA."}), 502


@app.route("/api/ai/explain", methods=["POST"])
def ai_explain():
    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "GEMINI_API_KEY não configurada no servidor."}), 503

    body = request.get_json(silent=True) or {}
    descricao = str(body.get("descricao", ""))[:200]
    tipo = str(body.get("tipo", ""))[:50]
    if not descricao:
        return jsonify({"error": "Campo 'descricao' obrigatório."}), 400

    prompt = (
        f'Definição técnica contábil do item de folha de pagamento: "{descricao}" ({tipo}). '
        "Explique a base de cálculo usual e finalidade legal. Seja breve."
    )

    try:
        text = _gemini_generate(prompt)
        return jsonify({"text": text or "Sem explicação técnica disponível."})
    except Exception:
        log.exception("Falha ao chamar Gemini (explain)")
        return jsonify({"error": "Erro ao buscar explicação."}), 502


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Servidor iniciando em http://%s:%d", HOST, PORT)
    app.run(host=HOST, port=PORT, debug=False)
