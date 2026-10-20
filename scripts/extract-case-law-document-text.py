#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

MAX_OUTPUT_CHARS = 4_000_000
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n[ \t]+", "\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    value = re.sub(r"\n{4,}", "\n\n\n", value)
    value = value.strip()
    if len(value) > MAX_OUTPUT_CHARS:
        raise ValueError("extracted_text_too_large")
    if not value:
        raise ValueError("extracted_text_empty")
    return value

def run_tool(args, timeout=90):
    try:
        proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
    except FileNotFoundError:
        raise RuntimeError("required_extractor_unavailable:" + args[0])
    except subprocess.TimeoutExpired:
        raise RuntimeError("extractor_timeout:" + args[0])
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()[:500]
        raise RuntimeError("extractor_failed:" + args[0] + (":" + stderr if stderr else ""))
    return proc.stdout

def extract_pdf(path):
    if not shutil.which("pdftotext"):
        raise RuntimeError("required_extractor_unavailable:pdftotext")
    raw = run_tool(["pdftotext", "-layout", "-enc", "UTF-8", path, "-"])
    return normalize_text(raw.decode("utf-8", errors="replace")), "pdf_pdftotext"

def paragraph_text(paragraph):
    parts = []
    for node in paragraph.iter():
        if node.tag == W_NS + "t":
            parts.append(node.text or "")
        elif node.tag == W_NS + "tab":
            parts.append("\t")
        elif node.tag in {W_NS + "br", W_NS + "cr"}:
            parts.append("\n")
    return "".join(parts).strip()

def extract_docx(path):
    try:
        archive = zipfile.ZipFile(path, "r")
    except (zipfile.BadZipFile, OSError) as exc:
        raise RuntimeError("docx_invalid_zip") from exc
    names = set(archive.namelist())
    ordered = ["word/document.xml"]
    ordered += sorted(n for n in names if re.fullmatch(r"word/header\d+\.xml", n))
    ordered += sorted(n for n in names if re.fullmatch(r"word/footer\d+\.xml", n))
    chunks = []
    with archive:
        for name in ordered:
            if name not in names:
                continue
            try:
                root = ET.fromstring(archive.read(name))
            except ET.ParseError as exc:
                raise RuntimeError("docx_xml_invalid:" + name) from exc
            for paragraph in root.iter(W_NS + "p"):
                text = paragraph_text(paragraph)
                if text:
                    chunks.append(text)
    return normalize_text("\n".join(chunks)), "docx_zip_xml"

def extract_doc(path):
    if not shutil.which("antiword"):
        raise RuntimeError("required_extractor_unavailable:antiword")
    raw = run_tool(["antiword", "-w", "0", path])
    return normalize_text(raw.decode("utf-8", errors="replace")), "doc_antiword"

def extract_rtf(path):
    if not shutil.which("unrtf"):
        raise RuntimeError("required_extractor_unavailable:unrtf")
    raw = run_tool(["unrtf", "--text", "--nopict", path])
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"^###.*?$", "", text, flags=re.MULTILINE)
    return normalize_text(text), "rtf_unrtf"

def extract(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".docx":
        return extract_docx(path)
    if ext == ".doc":
        return extract_doc(path)
    if ext == ".rtf":
        return extract_rtf(path)
    raise RuntimeError("unsupported_document_type:" + ext)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    if not os.path.isfile(args.input):
        raise RuntimeError("input_file_missing")
    text, method = extract(args.input)
    with open(args.output, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text + "\n")
    print(json.dumps({
        "ok": True,
        "method": method,
        "chars": len(text),
        "output": args.output
    }, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
