import os
import uuid
import json
import logging
from datetime import datetime, timezone

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

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PDF_DIR = os.path.join(DATA_DIR, "pdfs")
XML_DIR = os.path.join(DATA_DIR, "xmls")
MANIFEST = os.path.join(DATA_DIR, "manifest.json")

for d in [PDF_DIR, XML_DIR]:
    os.makedirs(d, exist_ok=True)


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
    path = os.path.join(PDF_DIR, f"{file_id}.pdf")
    if not os.path.exists(path):
        return jsonify({"error": "PDF não encontrado."}), 404

    entry = next((e for e in _load_manifest() if e["id"] == file_id), None)
    download_name = entry["originalName"] if entry else f"{file_id}.pdf"
    return send_file(path, as_attachment=True, download_name=download_name)


@app.route("/api/files/<file_id>/xml")
def download_xml(file_id):
    path = os.path.join(XML_DIR, f"{file_id}.xml")
    if not os.path.exists(path):
        return jsonify({"error": "XML não encontrado."}), 404

    entry = next((e for e in _load_manifest() if e["id"] == file_id), None)
    base = entry["originalName"] if entry else f"{file_id}.pdf"
    download_name = base.rsplit(".", 1)[0] + ".xml"
    return send_file(path, as_attachment=True, download_name=download_name)


@app.route("/api/files/<file_id>", methods=["DELETE"])
def delete_file(file_id):
    for directory, ext in [(PDF_DIR, ".pdf"), (XML_DIR, ".xml")]:
        p = os.path.join(directory, f"{file_id}{ext}")
        if os.path.exists(p):
            os.remove(p)

    manifest = [e for e in _load_manifest() if e["id"] != file_id]
    _save_manifest(manifest)
    return jsonify({"success": True})


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Servidor iniciando em http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
