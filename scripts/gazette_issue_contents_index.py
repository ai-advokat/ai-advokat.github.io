#!/usr/bin/env python3
import argparse, json
from collections import defaultdict
from pathlib import Path

SOURCE_CLASS="primary_official_chronological_register_metadata"

def sqlq(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"

def read_register_summary(path: Path):
    data=json.loads(path.read_text("utf-8"))
    if isinstance(data,dict) and isinstance(data.get("summary"),dict):
        return data["summary"], data.get("unresolved") or []
    return data, data.get("unresolved") or [] if isinstance(data,dict) else []

def load_year(root: Path, year: int):
    reg_path=root/"registers"/f"{year}.json"
    acts_path=root/"acts"/f"{year}.ndjson"
    if not reg_path.exists() or not acts_path.exists():
        return None
    summary, unresolved=read_register_summary(reg_path)
    status=str(summary.get("status") or "")
    act_count=int(summary.get("act_count") or 0)
    unresolved_count=int(summary.get("unresolved_count") or len(unresolved) or 0)
    if not status.startswith("parsed") or act_count<=0 or unresolved_count!=0:
        return {"eligible":False,"year":year,"status":status,"unresolved_count":unresolved_count}
    rows=[]
    for line in acts_path.read_text("utf-8").splitlines():
        if not line.strip():
            continue
        row=json.loads(line)
        if int(row.get("year") or 0)!=year:
            raise RuntimeError(f"year mismatch in {acts_path}: {row.get('year')}")
        if not str(row.get("issue_number") or "").isdigit():
            raise RuntimeError(f"invalid issue number in {acts_path}: {row.get('issue_number')}")
        if not str(row.get("title") or "").strip():
            raise RuntimeError(f"empty title in {acts_path}")
        if not str(row.get("register_source_url") or "").startswith("http"):
            raise RuntimeError(f"missing official register URL in {acts_path}")
        sha=str(row.get("register_source_sha256") or "")
        if len(sha)!=64:
            raise RuntimeError(f"invalid register sha in {acts_path}")
        rows.append(row)
    if len(rows)!=act_count:
        raise RuntimeError(f"act count mismatch {year}: {len(rows)} != {act_count}")
    if len({(r["ordinal"],r["title"]) for r in rows})!=len(rows):
        raise RuntimeError(f"duplicate register ordinal/title in {year}")
    return {"eligible":True,"year":year,"summary":summary,"rows":rows}

def build_index(year_bundle, authorization_id):
    year=year_bundle["year"]
    summary=year_bundle["summary"]
    rows=year_bundle["rows"]
    grouped=defaultdict(list)
    for row in rows:
        grouped[str(row["issue_number"])].append(row)
    indexed=[]
    for issue, items in grouped.items():
        items=sorted(items,key=lambda r:(
            int(r.get("page_start") or 10**9),
            int(r.get("ordinal") or 10**9),
            str(r.get("title") or "")
        ))
        for idx,row in enumerate(items,1):
            indexed.append({
                "year":year,
                "issue_number":issue,
                "ordinal_in_issue":idx,
                "register_ordinal":int(row["ordinal"]),
                "act_type":str(row.get("act_type") or "other"),
                "title":str(row["title"]).strip(),
                "page_start":int(row["page_start"]) if row.get("page_start") is not None else None,
                "register_source_url":str(row["register_source_url"]),
                "register_source_sha256":str(row["register_source_sha256"]),
                "source_class":SOURCE_CLASS,
                "verification_status":"reconciled",
                "human_review_status":"pending",
                "runtime_eligible":1,
                "legal_text_authority":0,
                "current_law_authority":0,
                "release_authorization_id":authorization_id
            })
    manifest={
        "year":year,
        "register_source_url":str(summary.get("register_url") or indexed[0]["register_source_url"]),
        "register_source_sha256":str(summary.get("register_sha256") or indexed[0]["register_source_sha256"]),
        "register_entry_count":len(indexed),
        "issue_count":len(grouped),
        "unresolved_count":0,
        "missing_issue_links_count":len(summary.get("missing_issue_links") or []),
        "reconciliation_status":"reconciled",
        "verification_status":"reconciled",
        "human_review_status":"pending",
        "runtime_eligible":1,
        "release_authorization_id":authorization_id
    }
    return manifest,indexed

def manifest_sql(rows):
    cols=("year,register_source_url,register_source_sha256,register_entry_count,issue_count,"
          "unresolved_count,missing_issue_links_count,reconciliation_status,verification_status,"
          "human_review_status,runtime_eligible,release_authorization_id,verified_at")
    vals=[]
    for r in rows:
        vals.append("(" + ",".join([
            str(r["year"]),sqlq(r["register_source_url"]),sqlq(r["register_source_sha256"]),
            str(r["register_entry_count"]),str(r["issue_count"]),str(r["unresolved_count"]),
            str(r["missing_issue_links_count"]),sqlq(r["reconciliation_status"]),
            sqlq(r["verification_status"]),sqlq(r["human_review_status"]),str(r["runtime_eligible"]),
            sqlq(r["release_authorization_id"]),"CURRENT_TIMESTAMP"
        ]) + ")")
    return "INSERT OR REPLACE INTO gazette_issue_contents_manifest_stage ("+cols+") VALUES\n"+",\n".join(vals)+";\n"

def content_sql(rows):
    cols=("year,issue_number,ordinal_in_issue,register_ordinal,act_type,title,page_start,"
          "register_source_url,register_source_sha256,source_class,verification_status,"
          "human_review_status,runtime_eligible,legal_text_authority,current_law_authority,"
          "release_authorization_id")
    vals=[]
    for r in rows:
        vals.append("(" + ",".join([
            str(r["year"]),sqlq(r["issue_number"]),str(r["ordinal_in_issue"]),str(r["register_ordinal"]),
            sqlq(r["act_type"]),sqlq(r["title"]),str(r["page_start"]) if r["page_start"] is not None else "NULL",
            sqlq(r["register_source_url"]),sqlq(r["register_source_sha256"]),sqlq(r["source_class"]),
            sqlq(r["verification_status"]),sqlq(r["human_review_status"]),str(r["runtime_eligible"]),
            str(r["legal_text_authority"]),str(r["current_law_authority"]),sqlq(r["release_authorization_id"])
        ]) + ")")
    return "INSERT OR REPLACE INTO gazette_issue_contents_stage ("+cols+") VALUES\n"+",\n".join(vals)+";\n"

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--input-root",required=True)
    ap.add_argument("--out-dir",required=True)
    ap.add_argument("--authorization-id",required=True)
    ap.add_argument("--from-year",type=int,default=1991)
    ap.add_argument("--to-year",type=int,default=2025)
    ap.add_argument("--batch-size",type=int,default=250)
    args=ap.parse_args()
    root=Path(args.input_root)
    out=Path(args.out_dir)
    out.mkdir(parents=True,exist_ok=True)
    manifests=[]
    contents=[]
    skipped=[]
    for year in range(args.from_year,args.to_year+1):
        bundle=load_year(root,year)
        if not bundle or not bundle.get("eligible"):
            skipped.append(bundle or {"eligible":False,"year":year,"status":"missing"})
            continue
        manifest,rows=build_index(bundle,args.authorization_id)
        manifests.append(manifest)
        contents.extend(rows)
    if not manifests or not contents:
        raise RuntimeError("no reconciled register years available for issue contents index")
    (out/"manifest.sql").write_text(manifest_sql(manifests),encoding="utf-8")
    batch_size=max(50,min(500,args.batch_size))
    batches=[]
    for start in range(0,len(contents),batch_size):
        path=out/f"batch_{start//batch_size:03d}.sql"
        path.write_text(content_sql(contents[start:start+batch_size]),encoding="utf-8")
        batches.append(path.name)
    by_year=defaultdict(int)
    by_type=defaultdict(int)
    issue_keys=set()
    for row in contents:
        by_year[str(row["year"])]+=1
        by_type[row["act_type"]]+=1
        issue_keys.add((row["year"],row["issue_number"]))
    summary={
        "authorization_id":args.authorization_id,
        "years_requested":[args.from_year,args.to_year],
        "eligible_years":[m["year"] for m in manifests],
        "eligible_year_count":len(manifests),
        "skipped_years":skipped,
        "issue_count":len(issue_keys),
        "content_rows":len(contents),
        "by_year":dict(sorted(by_year.items(),key=lambda x:int(x[0]))),
        "by_type":dict(sorted(by_type.items())),
        "batch_count":len(batches),
        "metadata_only":True,
        "legal_text_authority":False,
        "current_law_authority":False,
        "human_review_status":"pending",
        "verification_status":"reconciled",
        "completeness_basis":"official_chronological_register_with_zero_unresolved_entries"
    }
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":
    main()
