#!/usr/bin/env python3
"""Build deterministic D1 batch SQL from the official data.gov.mk Gazette XLSX.

This script ingests metadata only. It never extracts or republishes Gazette full text.
It is intentionally dependency-free: XLSX is read as ZIP/XML using Python stdlib.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from collections import OrderedDict
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

EXPECTED_SHA256 = "4d111eb03ed0b8e877d151e030bf38096831cedc7a26f4a09121d9e6dfac5a18"
EXPECTED_SOURCE_ROWS = 8651
EXPECTED_UNIQUE_ROWS = 8638
EXPECTED_TYPES = 7
EXPECTED_MIN_DATE = "1944-01-01"
EXPECTED_MAX_DATE = "2017-12-29"
DATASET_ID = "05342c32-f4a6-49c3-b8fa-5a555a6df6ff"
RESOURCE_ID = "9a039791-1abb-411f-bc04-bf136776a83a"
DATASET_URL = "https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017"
RESOURCE_URL = "https://data.gov.mk/dataset/05342c32-f4a6-49c3-b8fa-5a555a6df6ff/resource/9a039791-1abb-411f-bc04-bf136776a83a/download/izdanija-sluzben-vesnik-do-2017.xlsx"
SOURCE_AUTHORITY = "ЈП Службен весник на РСМ"
SOURCE_CLASS = "PRIMARY_OFFICIAL_METADATA"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def sqlq(value: object) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def excel_date(value: str) -> str:
    try:
        serial = float(value)
    except ValueError as exc:
        raise ValueError(f"Invalid Excel date serial: {value}") from exc
    day = datetime(1899, 12, 30) + timedelta(days=serial)
    return day.date().isoformat()


def cell_col(ref: str) -> str:
    m = re.match(r"([A-Z]+)", ref or "")
    return m.group(1) if m else ""


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out = []
    for si in root.findall("m:si", NS):
        parts = [t.text or "" for t in si.iterfind(".//m:t", NS)]
        out.append("".join(parts))
    return out


def read_rows(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as zf:
        shared = read_shared_strings(zf)
        root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        rows = root.findall(".//m:sheetData/m:row", NS)
        if not rows:
            raise RuntimeError("No worksheet rows found")

        parsed = []
        for row in rows:
            row_num = int(row.attrib.get("r", "0"))
            vals = {}
            for cell in row.findall("m:c", NS):
                ref = cell.attrib.get("r", "")
                col = cell_col(ref)
                v = cell.find("m:v", NS)
                raw = "" if v is None or v.text is None else v.text
                if cell.attrib.get("t") == "s" and raw != "":
                    raw = shared[int(raw)]
                vals[col] = raw
            parsed.append((row_num, vals))

    header = parsed[0][1]
    expected = {"A": "Број на издание", "B": "Дата на издание", "C": "Тип на издание"}
    if any(header.get(k) != v for k, v in expected.items()):
        raise RuntimeError(f"Unexpected XLSX schema: {header}")

    records = []
    for row_num, vals in parsed[1:]:
        if not vals:
            continue
        issue_raw = str(vals.get("A", "")).strip()
        date_raw = str(vals.get("B", "")).strip()
        pub_type = str(vals.get("C", "")).strip()
        if not issue_raw or not date_raw or not pub_type:
            raise RuntimeError(f"Blank mandatory value at source row {row_num}")

        try:
            issue_float = float(issue_raw)
            issue_number = str(int(issue_float)) if issue_float.is_integer() else issue_raw
        except ValueError:
            issue_number = issue_raw

        issue_date = excel_date(date_raw)
        records.append({
            "source_row": row_num,
            "issue_number": issue_number,
            "issue_date": issue_date,
            "year": int(issue_date[:4]),
            "publication_type": pub_type,
        })
    return records


def canonicalize(records: list[dict]) -> list[dict]:
    if len(records) != EXPECTED_SOURCE_ROWS:
        raise RuntimeError(f"Source row count mismatch: {len(records)} != {EXPECTED_SOURCE_ROWS}")

    grouped: OrderedDict[tuple[str, str, str], dict] = OrderedDict()
    for rec in records:
        key = (rec["publication_type"], rec["issue_number"], rec["issue_date"])
        if key not in grouped:
            grouped[key] = {**rec, "source_occurrences": 1}
        else:
            grouped[key]["source_occurrences"] += 1

    rows = list(grouped.values())
    if len(rows) != EXPECTED_UNIQUE_ROWS:
        raise RuntimeError(f"Canonical count mismatch: {len(rows)} != {EXPECTED_UNIQUE_ROWS}")

    types = {r["publication_type"] for r in rows}
    dates = [r["issue_date"] for r in rows]
    if len(types) != EXPECTED_TYPES:
        raise RuntimeError(f"Publication type count mismatch: {len(types)} != {EXPECTED_TYPES}")
    if min(dates) != EXPECTED_MIN_DATE or max(dates) != EXPECTED_MAX_DATE:
        raise RuntimeError(f"Date coverage mismatch: {min(dates)}..{max(dates)}")

    return rows


def row_sql(r: dict) -> str:
    vals = [
        r["publication_type"],
        r["issue_number"],
        r["issue_date"],
        r["year"],
        r["source_row"],
        r["source_occurrences"],
        SOURCE_AUTHORITY,
        DATASET_ID,
        RESOURCE_ID,
        DATASET_URL,
        RESOURCE_URL,
        EXPECTED_SHA256,
        SOURCE_CLASS,
        "reviewed",
        0,
        0,
        0,
    ]
    rendered = []
    for i, value in enumerate(vals):
        rendered.append(str(value) if i in {3, 4, 5, 14, 15, 16} else sqlq(value))
    return "(" + ",".join(rendered) + ")"


def write_batches(rows: list[dict], out_dir: Path, batch_size: int) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("batch_*.sql"):
        old.unlink()
    cols = (
        "publication_type,issue_number,issue_date,year,source_row_first,source_occurrences,"
        "source_authority,dataset_id,resource_id,dataset_url,resource_url,snapshot_sha256,"
        "source_class,human_review_status,runtime_eligible,legal_text_authority,current_law_authority"
    )
    paths = []
    for idx in range(0, len(rows), batch_size):
        chunk = rows[idx:idx + batch_size]
        path = out_dir / f"batch_{idx // batch_size:03d}.sql"
        sql = (
            "INSERT OR REPLACE INTO gazette_issue_metadata_stage (" + cols + ") VALUES\n"
            + ",\n".join(row_sql(r) for r in chunk)
            + ";\n"
        )
        path.write_text(sql, encoding="utf-8")
        paths.append(path)
    return paths


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--batch-size", type=int, default=350)
    args = ap.parse_args()

    src = Path(args.input)
    digest = hashlib.sha256(src.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(f"SHA-256 mismatch: {digest}")

    records = read_rows(src)
    rows = canonicalize(records)
    out_dir = Path(args.out_dir)
    batches = write_batches(rows, out_dir, max(50, min(500, args.batch_size)))

    summary = {
        "source_sha256": digest,
        "source_rows": len(records),
        "canonical_unique_rows": len(rows),
        "exact_duplicate_extra_rows": len(records) - len(rows),
        "publication_types": len({r["publication_type"] for r in rows}),
        "first_issue_date": min(r["issue_date"] for r in rows),
        "last_issue_date": max(r["issue_date"] for r in rows),
        "batch_count": len(batches),
        "metadata_only": True,
        "legal_text_authority": False,
        "current_law_authority": False,
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"gazette_open_data_backfill: {exc}", file=sys.stderr)
        raise
