#!/usr/bin/env python3
import argparse, hashlib, json, re
from pathlib import Path

def sqlq(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"

def source_key(year,issue,ordinal,title):
    raw=f"{year}|{issue}|{ordinal}|{title}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def load_year(base,year):
    summary=json.loads((base/"summary.json").read_text("utf-8"))
    row=next((x for x in summary.get("years",[]) if int(x.get("year",0))==year),None)
    if not row:
        raise RuntimeError(f"missing_summary_year:{year}")
    status=str(row.get("status",""))
    if not status.startswith("parsed"):
        raise RuntimeError(f"year_not_parsed:{year}:{status}")
    if int(row.get("unresolved_count",0))!=0:
        raise RuntimeError(f"year_has_unresolved:{year}:{row.get('unresolved_count')}")
    if row.get("missing_issue_links"):
        raise RuntimeError(f"year_has_missing_issue_links:{year}:{row.get('missing_issue_links')}")
    acts_path=base/"acts"/f"{year}.ndjson"
    acts=[json.loads(line) for line in acts_path.read_text("utf-8").splitlines() if line.strip()]
    if not acts:
        raise RuntimeError(f"year_has_no_acts:{year}")
    return row,acts

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--year-base",action="append",required=True,help="YEAR=/path/to/backfill")
    ap.add_argument("--out-sql",required=True)
    args=ap.parse_args()

    year_bases={}
    for item in args.year_base:
        m=re.fullmatch(r"(\d{4})=(.+)",item)
        if not m:
            raise SystemExit(f"invalid --year-base: {item}")
        year_bases[int(m.group(1))]=Path(m.group(2))

    lines=[
      "-- AI Advokat Gazette act-index metadata promotion",
      "-- Official chronological-register metadata only; no full text/current-law promotion.",
      "BEGIN;"
    ]
    totals={"years":0,"issues":0,"acts":0}
    for year,base in sorted(year_bases.items()):
        summary,acts=load_year(base,year)
        register_url=str(summary.get("register_url") or "")
        register_sha=str(summary.get("register_sha256") or "")
        if not register_url.startswith("http") or len(register_sha)!=64:
            raise RuntimeError(f"invalid_register_provenance:{year}")

        by_issue={}
        for act in acts:
            issue=str(act.get("issue_number") or "").strip()
            if not issue:
                raise RuntimeError(f"act_without_issue:{year}:{act}")
            by_issue.setdefault(issue,[]).append(act)

        for issue,rows in sorted(by_issue.items(),key=lambda kv:int(kv[0])):
            rows=sorted(rows,key=lambda x:(int(x.get("page_start") or 10**9),int(x.get("ordinal") or 10**9),str(x.get("title") or "")))
            note=f"official chronological-register act index; machine extracted; year {year}; reconciliation passed; Human Gate pending"
            lines.append(f"""
INSERT INTO gazette_issues(
  publication_name,publication_name_historical,year,issue_number,issue_date,
  source_url,source_access_class,source_sha256,chronological_register_url,
  human_review_status,provenance_checked_at,notes,updated_at
)
SELECT
  COALESCE((SELECT publication_type FROM gazette_issue_metadata WHERE year={year} AND issue_number={sqlq(issue)} ORDER BY issue_date LIMIT 1),'Службен весник'),
  NULL,{year},{sqlq(issue)},
  (SELECT issue_date FROM gazette_issue_metadata WHERE year={year} AND issue_number={sqlq(issue)} ORDER BY issue_date LIMIT 1),
  {sqlq(register_url)},'official_chronological_register_index',{sqlq(register_sha)},{sqlq(register_url)},
  'pending',CURRENT_TIMESTAMP,{sqlq(note)},CURRENT_TIMESTAMP
ON CONFLICT(year,issue_number,publication_name) DO UPDATE SET
  issue_date=COALESCE(excluded.issue_date,gazette_issues.issue_date),
  source_url=excluded.source_url,
  source_access_class=excluded.source_access_class,
  source_sha256=excluded.source_sha256,
  chronological_register_url=excluded.chronological_register_url,
  human_review_status='pending',
  provenance_checked_at=CURRENT_TIMESTAMP,
  notes=excluded.notes,
  updated_at=CURRENT_TIMESTAMP;
""".strip())
            for ordinal_in_issue,act in enumerate(rows,1):
                title=str(act.get("title") or "").strip()
                if not title:
                    raise RuntimeError(f"act_without_title:{year}:{issue}")
                key=source_key(year,issue,act.get("ordinal"),title)
                page=act.get("page_start")
                act_type=str(act.get("act_type") or "other")
                lines.append(f"""
INSERT INTO gazette_acts(
  issue_id,source_key,ordinal_in_issue,act_number,act_type,title,issuer,
  page_start,page_end,source_url,source_sha256,canonical_instrument_key,
  legal_effect_class,effective_date,application_date,human_review_status,updated_at
)
VALUES(
  (SELECT id FROM gazette_issues WHERE year={year} AND issue_number={sqlq(issue)}
     ORDER BY CASE human_review_status WHEN 'approved' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,id LIMIT 1),
  {sqlq(key)},{ordinal_in_issue},NULL,{sqlq(act_type)},{sqlq(title)},NULL,
  {int(page) if page is not None else 'NULL'},NULL,{sqlq(register_url)},{sqlq(register_sha)},NULL,
  'official_register_index_only',NULL,NULL,'pending',CURRENT_TIMESTAMP
)
ON CONFLICT(issue_id,source_key) DO UPDATE SET
  ordinal_in_issue=excluded.ordinal_in_issue,
  act_type=excluded.act_type,
  title=excluded.title,
  page_start=excluded.page_start,
  source_url=excluded.source_url,
  source_sha256=excluded.source_sha256,
  legal_effect_class='official_register_index_only',
  human_review_status='pending',
  updated_at=CURRENT_TIMESTAMP;
""".strip())
            totals["issues"]+=1
            totals["acts"]+=len(rows)

        batch_key=f"gazette-act-index-{year}-official-register-v1"
        lines.append(f"""
INSERT INTO gazette_ingest_batches(
  batch_key,year_from,year_to,source_kind,source_url,item_count,issue_count,act_count,
  article_count,parse_status,human_review_status,checksum_sha256,notes,updated_at
)
VALUES(
  {sqlq(batch_key)},{year},{year},'official_chronological_register',{sqlq(register_url)},
  {len(acts)},{len(by_issue)},{len(acts)},0,'validated','pending',{sqlq(register_sha)},
  'Act-index metadata only. Reconciliation passed; Human Gate pending; no current-law/full-text promotion.',
  CURRENT_TIMESTAMP
)
ON CONFLICT(batch_key) DO UPDATE SET
  item_count=excluded.item_count,issue_count=excluded.issue_count,act_count=excluded.act_count,
  parse_status='validated',human_review_status='pending',checksum_sha256=excluded.checksum_sha256,
  notes=excluded.notes,updated_at=CURRENT_TIMESTAMP;
""".strip())
        totals["years"]+=1

    lines.append("COMMIT;")
    Path(args.out_sql).write_text("\n\n".join(lines)+"\n","utf-8")
    print(json.dumps(totals,ensure_ascii=False))

if __name__=="__main__":
    main()
