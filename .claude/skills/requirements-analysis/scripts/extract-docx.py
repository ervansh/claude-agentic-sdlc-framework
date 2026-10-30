#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
T = f"{{{WORD_NS}}}t"
TAB = f"{{{WORD_NS}}}tab"
BR = f"{{{WORD_NS}}}br"
CR = f"{{{WORD_NS}}}cr"
P = f"{{{WORD_NS}}}p"
BODY = f"{{{WORD_NS}}}body"

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []
    for element in paragraph.iter():
        if element.tag == T:
            parts.append(element.text or "")
        elif element.tag == TAB:
            parts.append("\t")
        elif element.tag in {BR, CR}:
            parts.append("\n")
    return "".join(parts).strip()

def extract_main_document(path: Path) -> list[str]:
    with zipfile.ZipFile(path, "r") as package:
        xml_bytes = package.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    body = root.find(f".//{BODY}")
    if body is None:
        raise RuntimeError("DOCX main document has no WordprocessingML body.")
    return [text for p in body.iter(P) if (text := paragraph_text(p))]

def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: extract-docx.py <path-to-document.docx>", file=sys.stderr)
        return 2
    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".docx":
        print("Error: supply an existing .docx file.", file=sys.stderr)
        return 2
    try:
        paragraphs = extract_main_document(source)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    print(f"SOURCE_FILE: {source}")
    print(f"SOURCE_SHA256: {sha256_file(source)}")
    print("SOURCE_TEXT_BEGIN")
    for paragraph in paragraphs:
        print(paragraph)
    print("SOURCE_TEXT_END")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
