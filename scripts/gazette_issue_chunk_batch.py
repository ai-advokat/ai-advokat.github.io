#!/usr/bin/env python3
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, urlunsplit

UA="AI-Advokat-Gazette-Chunker/1.0 (+source-first; paced official-source audit)"

def _official_host_variants(url):
    p=urlsplit(url)
    hosts=[p.netloc]
    if p.netloc=="slvesnik.com.mk": hosts.append("www.slvesnik.com.mk")
    elif p.netloc=="www.slvesnik.com.mk": hosts.append("slvesnik.com.mk")
    return [urlunsplit((p.scheme,h,p.path,p.query,p.fragment)) for h in hosts]

def _curl_fetch(candidate,timeout,insecure=False):
    tmp=None
    try:
        with tempfile.NamedTemporaryFile(delete=False) as fh:
            tmp=fh.name
        cmd=[
            "curl","--fail","--location","--silent","--show-error",
            "--retry","2","--retry-delay","1",
            "--connect-timeout","20","--max-time",str(int(timeout)),
            "--user-agent",UA,
            "--output",tmp,
            "--write-out","%{url_effective}"
        ]
        if insecure: cmd.append("--insecure")
        cmd.append(candidate)
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode!=0:
            raise RuntimeError("curl_fetch_failed:"+p.stderr[-300:])
        b=Path(tmp).read_bytes()
        if not b: raise RuntimeError("empty_response")
        return b,(p.stdout or candidate).strip()
    finally:
        if tmp:
            try: os.unlink(tmp)
            except OSError: pass

def fetch(url,timeout=120):
    variants=_official_host_variants(url)
    last=None
    for candidate in variants:
        try:
            b,final=_curl_fetch(candidate,timeout,insecure=False)
            return b,final,True
        except Exception as e:
            last=e
    p=urlsplit(url)
    if p.scheme=="https" and p.netloc in {"slvesnik.com.mk","www.slvesnik.com.mk"}:
        successful=[]
        for candidate in variants:
            try:
                b,final=_curl_fetch(candidate,timeout,insecure=True)
                successful.append((b,final))
            except Exception as e:
                last=e
        if successful:
            hashes={hashlib.sha256(b).hexdigest() for b,_ in successful}
            if len(hashes)>1:
                raise RuntimeError("official_host_variants_mismatch_under_tls_fallback")
            b,final=successful[0]
            return b,final,False
    raise last

def sha256_bytes(b): return hashlib.sha256(b).hexdigest()

def run(cmd):
    p=subprocess.run(cmd,capture_output=True,text=True)
    return p.returncode,p.stdout,p.stderr

def pdf_pages(path):
    rc,out,err=run(["pdfinfo",str(path)])
    if rc!=0: return None,err
    m=re.search(r"^Pages:\s+(\d+)\s*$",out,re.M)
    return (int(m.group(1)) if m else None),err

def extract_pages(pdf,start,end,out):
    rc,_,err=run(["pdftotext","-layout","-f",str(start),"-l",str(end),str(pdf),str(out)])
    return rc,err

def extract_full_issue(pdf,out):
    rc,_,err=run(["pdftotext","-layout",str(pdf),str(out)])
    return rc,err

def _clean_register_title_for_anchor(title):
    t=str(title)
    # Two-column annual-register extraction can leak the neighbouring
    # "issue/page" reference into the title. Remove only that structural noise
    # for matching; the preserved source title itself is never rewritten.
    t=re.sub(r"(?<!\\d)\\d{1,3}\\s*/\\s*\\d{1,5}(?!\\d)"," ",t)
    t=re.sub(r"\\.{2,}"," ",t)
    # Repair line-wrap hyphenation created by layout extraction.
    t=re.sub(r"(?<=[A-Za-zА-Яа-яЀ-ӿ])-\\s+(?=[A-Za-zА-Яа-яЀ-ӿ])","",t)
    return " ".join(t.split())

def _title_anchor_pattern(title,min_tokens=5,max_tokens=12):
    # Register ordinals are annual-index ordinals and are not guaranteed to be
    # printed as body markers inside the individual Gazette issue. For an exact
    # secondary anchor, require a substantial sequence of cleaned title words
    # and tolerate only layout/punctuation separators.
    cleaned=_clean_register_title_for_anchor(title)
    words=[w for w in re.findall(r"[0-9A-Za-zА-Яа-яЀ-ӿ]+",cleaned) if len(w)>=2]
    if len(words)<min_tokens:
        return None
    words=words[:max_tokens]
    sep=r"(?:[\\s,.:;()\\[\\]{}'\"„“”«»/\\\\\\-–—]+)"
    return re.compile(sep.join(re.escape(w) for w in words),re.I|re.M)

def find_act_boundaries(text, acts):
    hits=[]
    methods={}
    for act in acts:
        ordinal=str(act["ordinal"])
        # First prefer a literal body ordinal when the issue really prints it.
        pat=re.compile(r"(?m)(?:^|[ \\t]{6,})"+re.escape(ordinal)+r"\\.\\s+")
        matches=list(pat.finditer(text))
        if not matches:
            pat2=re.compile(r"(?m)^\\s*"+re.escape(ordinal)+r"\\.\\s*$")
            matches=list(pat2.finditer(text))
        method="act_ordinal_marker"
        if not matches:
            title_pat=_title_anchor_pattern(act.get("title",""))
            matches=list(title_pat.finditer(text)) if title_pat else []
            method="act_title_anchor"
        if matches:
            # Contents/index copies often occur before the actual body. Prefer
            # the last exact structural/title occurrence in the issue.
            m=matches[-1]
            pos=m.start()
            hits.append((pos,act))
            methods[int(act["ordinal"])]=method
    hits.sort(key=lambda x:x[0])
    out={}
    for i,(pos,act) in enumerate(hits):
        end=hits[i+1][0] if i+1<len(hits) else len(text)
        out[int(act["ordinal"])]=(pos,end,methods[int(act["ordinal"])])
    return out

ARTICLE_RE=re.compile(r"(?m)^\s*Член\s+([0-9]+(?:\s*[-–—]\s*[А-Яа-яA-Za-z]+)?)\s*$")
POINT_RE=re.compile(r"(?m)^\s*(\d{1,3})\.\s+")

def normalize_article_no(v):
    return re.sub(r"\s+","",v.replace("–","-").replace("—","-")).lower()

def split_long(text,target=2600,max_chars=4200,overlap=220):
    text=text.strip()
    if len(text)<=max_chars: return [(text,0,0)]
    paras=[p.strip() for p in re.split(r"\n\s*\n+",text) if p.strip()]
    chunks=[]; cur=""
    for p in paras:
        candidate=(cur+"\n\n"+p).strip() if cur else p
        if len(candidate)<=target or not cur:
            cur=candidate
            continue
        chunks.append((cur,0,overlap))
        tail=cur[-overlap:] if overlap and len(cur)>overlap else cur
        cur=(tail+"\n\n"+p).strip()
    if cur: chunks.append((cur,overlap if chunks else 0,0))
    # Hard split pathological chunks while retaining exact overlap markers.
    final=[]
    for txt,ob,oa in chunks:
        if len(txt)<=max_chars:
            final.append((txt,ob,oa)); continue
        pos=0; first=True
        while pos<len(txt):
            end=min(len(txt),pos+target)
            part=txt[pos:end]
            final.append((part,0 if first else overlap,overlap if end<len(txt) else 0))
            if end>=len(txt): break
            pos=max(pos+1,end-overlap); first=False
    return final

def article_blocks(text):
    ms=list(ARTICLE_RE.finditer(text))
    if not ms: return []
    out=[]
    for i,m in enumerate(ms):
        start=m.start(); end=ms[i+1].start() if i+1<len(ms) else len(text)
        body=text[start:end].strip()
        out.append((normalize_article_no(m.group(1)),body))
    return out

def fallback_blocks(text):
    ms=list(POINT_RE.finditer(text))
    if not ms: return [("body",text.strip())] if text.strip() else []
    out=[]
    for i,m in enumerate(ms):
        start=m.start(); end=ms[i+1].start() if i+1<len(ms) else len(text)
        out.append(("point-"+m.group(1),text[start:end].strip()))
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--base",required=True,help="wave-one output directory")
    ap.add_argument("--year",type=int,required=True)
    ap.add_argument("--out",required=True)
    ap.add_argument("--max-issues",type=int,default=0)
    ap.add_argument("--delay",type=float,default=1.0)
    args=ap.parse_args()
    base=Path(args.base); out=Path(args.out)
    for d in ["issues","acts","chunks","evidence","pdf","text"]: (out/d).mkdir(parents=True,exist_ok=True)
    acts_path=base/"acts"/f"{args.year}.ndjson"
    issues_path=base/"issues"/f"{args.year}.json"
    if not acts_path.exists() or not issues_path.exists(): raise SystemExit("wave-one year inputs missing")
    acts=[json.loads(x) for x in acts_path.read_text("utf-8").splitlines() if x.strip()]
    issues=json.loads(issues_path.read_text("utf-8"))
    by_issue={}
    for a in acts: by_issue.setdefault(str(a["issue_number"]),[]).append(a)
    issue_map={str(i["issue_number"]):i for i in issues}
    wanted=[n for n in sorted(by_issue,key=lambda x:int(x)) if n in issue_map and issue_map[n].get("direct_pdf")]
    if args.max_issues>0: wanted=wanted[:args.max_issues]
    summary={"year":args.year,"issues_targeted":len(wanted),"issues_processed":0,"acts_processed":0,"articles_found":0,"chunks_created":0,"skipped":[],"human_review_status":"pending","runtime_eligible":False}
    all_chunks=[]
    for issue_no in wanted:
        meta=issue_map[issue_no]; url=meta["source_url"]
        try:
            raw,final,tls_verified=fetch(url)
            if not raw.startswith(b"%PDF"): raise RuntimeError("not_pdf")
            pdf=out/"pdf"/f"{issue_no}.pdf"; pdf.write_bytes(raw)
            issue_sha=sha256_bytes(raw)
            pages,err=pdf_pages(pdf)
            if not pages: raise RuntimeError("pdfinfo_failed:"+err[-200:])
            acts_i=sorted(by_issue[issue_no],key=lambda a:(int(a["page_start"]),int(a["ordinal"])))
            full_txt=out/"text"/f"{issue_no}-full.txt"
            frc,ferr=extract_full_issue(pdf,full_txt)
            full_text=full_txt.read_text("utf-8",errors="replace") if frc==0 and full_txt.exists() else ""
            boundaries=find_act_boundaries(full_text,acts_i) if full_text else {}
            for idx,a in enumerate(acts_i):
                start=max(1,int(a["page_start"]))
                next_start=int(acts_i[idx+1]["page_start"]) if idx+1<len(acts_i) else pages+1
                end=min(pages,max(start,next_start-1))
                boundary=boundaries.get(int(a["ordinal"]))
                if boundary:
                    text=full_text[boundary[0]:boundary[1]].strip()
                    boundary_method=boundary[2]
                else:
                    txt=out/"text"/f"{issue_no}-{a['ordinal']}.txt"
                    rc,err=extract_pages(pdf,start,end,txt)
                    if rc!=0 or not txt.exists():
                        summary["skipped"].append({"issue":issue_no,"ordinal":a["ordinal"],"reason":"pdftotext_failed"}); continue
                    text=txt.read_text("utf-8",errors="replace").strip()
                    local_pat=_title_anchor_pattern(a.get("title",""),min_tokens=5,max_tokens=10)
                    local_matches=list(local_pat.finditer(text)) if local_pat else []
                    if local_matches:
                        # Page range is already bound by the official register.
                        # A strict cleaned title match inside that range is an
                        # exact act anchor; start at the matched body title.
                        text=text[local_matches[-1].start():].strip()
                        boundary_method="act_title_anchor_page_bound"
                    else:
                        boundary_method="page_fallback"
                if len(text)<40:
                    summary["skipped"].append({"issue":issue_no,"ordinal":a["ordinal"],"reason":"text_too_short"}); continue
                blocks=article_blocks(text)
                block_kind="article"
                if not blocks:
                    blocks=fallback_blocks(text); block_kind="provision"
                act_chunks=0
                for block_idx,(locator,block) in enumerate(blocks,1):
                    parts=split_long(block)
                    for part_idx,(part,ob,oa) in enumerate(parts,1):
                        if not part.strip(): continue
                        chunk_sha=hashlib.sha256(part.encode("utf-8")).hexdigest()
                        key=f"mk-gazette:{args.year}:{issue_no}:{a['ordinal']}:{locator}:{block_idx}:{part_idx}"
                        row={
                          "chunk_key":key,
                          "year":args.year,
                          "issue_number":issue_no,
                          "issue_source_url":final,
                          "issue_sha256":issue_sha,
                          "transport_tls_verified":tls_verified,
                          "act_ordinal":a["ordinal"],
                          "act_title":a["title"],
                          "act_type":a["act_type"],
                          "page_start":start,
                          "page_end":end,
                          "boundary_method":boundary_method,
                          "locator_kind":block_kind,
                          "article_number":locator if block_kind=="article" else None,
                          "provision_locator":locator if block_kind!="article" else None,
                          "chunk_order":part_idx,
                          "text_content":part,
                          "text_sha256":chunk_sha,
                          "char_count":len(part),
                          "overlap_before_chars":ob,
                          "overlap_after_chars":oa,
                          "human_review_status":"pending",
                          "runtime_eligible":False,
                          "current_law_eligible":False,
                          "authority_class":"official_gazette_source",
                          "register_source_url":a["register_source_url"],
                          "register_source_sha256":a["register_source_sha256"]
                        }
                        all_chunks.append(row); act_chunks+=1
                summary["acts_processed"]+=1
                summary["articles_found"]+=len(blocks) if block_kind=="article" else 0
                summary["chunks_created"]+=act_chunks
            (out/"issues"/f"{issue_no}.json").write_text(json.dumps({"issue_number":issue_no,"source_url":final,"sha256":issue_sha,"transport_tls_verified":tls_verified,"pages":pages,"acts":len(acts_i)},ensure_ascii=False,indent=2),"utf-8")
            summary["issues_processed"]+=1
        except Exception as e:
            summary["skipped"].append({"issue":issue_no,"reason":str(e)[:300]})
        time.sleep(args.delay)
    keys=[x["chunk_key"] for x in all_chunks]
    if len(keys)!=len(set(keys)):
        raise SystemExit("Duplicate chunk_key detected; stop before artifact publication.")
    (out/"chunks"/f"{args.year}.ndjson").write_text("\n".join(json.dumps(x,ensure_ascii=False) for x in all_chunks)+("\n" if all_chunks else ""),"utf-8")
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),"utf-8")
    print(json.dumps(summary,ensure_ascii=False))
    if summary["issues_processed"]==0 or summary["chunks_created"]==0:
        raise SystemExit("No issue chunks created; stop before any runtime promotion.")

if __name__=="__main__":
    main()
