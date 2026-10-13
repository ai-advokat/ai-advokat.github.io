#!/usr/bin/env python3
import argparse, hashlib, html, json, os, re, subprocess, sys, tempfile, time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

UA="AI-Advokat-Gazette-Backfill/1.0 (+source-first; paced official-source audit)"
REGISTER_PAGE="https://slvesnik.com.mk/Issues/634836914B1C2C48A528E23A94A0CD4B.pdf/hronoloshki-registri.nspx"
FREE_ACCESS_PAGE="https://www.slvesnik.com.mk/besplaten-pristap-do-izdanija.nspx"

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self._href=None
        self._buf=[]
        self.data_stream=[]
    def handle_starttag(self,tag,attrs):
        if tag.lower()=="a":
            self._href=dict(attrs).get("href")
            self._buf=[]
    def handle_data(self,data):
        txt=" ".join(data.split())
        if txt:
            self.data_stream.append(txt)
            if self._href is not None:
                self._buf.append(txt)
    def handle_endtag(self,tag):
        if tag.lower()=="a" and self._href is not None:
            self.links.append((self._href," ".join(self._buf).strip()))
            self._href=None
            self._buf=[]

def _official_host_variants(url):
    p=urlsplit(url)
    hosts=[p.netloc]
    if p.netloc=="slvesnik.com.mk": hosts.append("www.slvesnik.com.mk")
    elif p.netloc=="www.slvesnik.com.mk": hosts.append("slvesnik.com.mk")
    out=[]
    for host in hosts:
        candidate=urlunsplit((p.scheme,host,p.path,p.query,p.fragment))
        if candidate not in out: out.append(candidate)
    return out

def _curl_fetch(candidate, timeout, insecure=False):
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
        if insecure:
            cmd.append("--insecure")
        cmd.append(candidate)
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode!=0:
            raise RuntimeError("curl_fetch_failed:"+p.stderr[-300:])
        raw=Path(tmp).read_bytes()
        if not raw: raise RuntimeError("empty_response")
        return raw,(p.stdout or candidate).strip()
    finally:
        if tmp:
            try: os.unlink(tmp)
            except OSError: pass

def fetch_bytes(url, timeout=90):
    variants=_official_host_variants(url)
    last=None
    for candidate in variants:
        try:
            raw,final=_curl_fetch(candidate,timeout,insecure=False)
            return raw,final,{"X-AI-Advokat-TLS":"verified"}
        except Exception as e:
            last=e
    # The official Gazette host currently presents an incomplete certificate chain
    # to GitHub-hosted runners. A fallback is allowed ONLY for these exact public
    # official hosts, with no credentials/cookies. The result remains staging-only,
    # is fingerprinted, and must pass source reconciliation + Human Gate before use.
    p=urlsplit(url)
    if p.scheme=="https" and p.netloc in {"slvesnik.com.mk","www.slvesnik.com.mk"}:
        successful=[]
        for candidate in variants:
            try:
                raw,final=_curl_fetch(candidate,timeout,insecure=True)
                successful.append((raw,final))
            except Exception as e:
                last=e
        if successful:
            # Dynamic HTML may legitimately differ between apex/www hosts.
            # Require byte identity only when comparing PDF payloads.
            pdf_payloads=[(raw,final) for raw,final in successful if raw.startswith(b"%PDF")]
            if len(pdf_payloads)>1:
                hashes={hashlib.sha256(raw).hexdigest() for raw,_ in pdf_payloads}
                if len(hashes)>1:
                    raise RuntimeError("official_pdf_host_variants_mismatch_under_tls_fallback")
                raw,final=pdf_payloads[0]
            else:
                raw,final=successful[0]
            return raw,final,{"X-AI-Advokat-TLS":"unverified_official_host_fallback"}
    raise last

def fetch_text(url):
    raw, final, headers=fetch_bytes(url)
    enc="utf-8"
    ctype=headers.get("Content-Type","")
    m=re.search(r"charset=([A-Za-z0-9._-]+)",ctype,re.I)
    if m: enc=m.group(1)
    try: text=raw.decode(enc,errors="replace")
    except LookupError: text=raw.decode("utf-8",errors="replace")
    return text, final

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()

def extract_register_links():
    text, final=fetch_text(REGISTER_PAGE)
    p=LinkParser(); p.feed(text)
    out={}
    for href,label in p.links:
        m=re.search(r"Регистар\s+за\s+(19\d{2}|20\d{2})\s+година",label,re.I)
        if not m:
            m=re.search(r"(19\d{2}|20\d{2})",label)
        if m and ("pdf" in href.lower() or "content" in href.lower() or "issues" in href.lower()):
            y=int(m.group(1)); out[y]=urljoin(final,href)
    return out

def register_url_candidates(year, discovered=None):
    out=[]
    if discovered: out.append(discovered)
    bases=[
        f"https://www.slvesnik.com.mk/content/pdf/Hronoloski_registar_{year}.pdf",
        f"https://www.slvesnik.com.mk/content/pdf/Hronoloski_Registar_{year}.pdf",
        f"https://slvesnik.com.mk/content/pdf/Hronoloski_registar_{year}.pdf",
        f"https://slvesnik.com.mk/content/pdf/Hronoloski_Registar_{year}.pdf"
    ]
    for u in bases:
        if u not in out: out.append(u)
    return out

def fetch_register_pdf(year, discovered=None):
    last=None
    for url in register_url_candidates(year, discovered):
        try:
            raw,final,transport=fetch_bytes(url)
            if raw.startswith(b"%PDF"):
                return raw,final,transport
        except Exception as e:
            last=e
    if last: raise last
    raise RuntimeError(f"register_pdf_not_found:{year}")

def _parse_issue_links(page_text, page_url, year_hint=None):
    p=LinkParser(); p.feed(page_text)
    rows={}
    for href,label in p.links:
        im=re.search(r"СЛУЖБЕН\s+ВЕСНИК[^0-9]{0,40}(\d{1,3})\s*$",label,re.I)
        if not im: continue
        issue=int(im.group(1))
        ym=re.search(r"(19\d{2}|20\d{2})",label+" "+href)
        year=int(ym.group(1)) if ym else year_hint
        if not year: continue
        url=urljoin(page_url,href)
        rows.setdefault(year,{})[issue]={
            "issue_number":str(issue),
            "source_url":url,
            "label":label,
            "direct_pdf":url.lower().split("?")[0].endswith(".pdf")
        }
    return rows

def extract_free_issue_inventory(years=None):
    text, final=fetch_text(FREE_ACCESS_PAGE)
    p=LinkParser(); p.feed(text)
    inventory=_parse_issue_links(text,final)
    year_links={}
    for href,label in p.links:
        if re.fullmatch(r"(19\d{2}|20\d{2})",label.strip()):
            year=int(label.strip())
            if href and not href.lower().startswith("javascript:") and href!="#":
                year_links[year]=urljoin(final,href)
    requested=sorted(set(years or year_links.keys() or inventory.keys()))
    for year in requested:
        if year in year_links:
            try:
                ytext,yfinal=fetch_text(year_links[year])
                parsed=_parse_issue_links(ytext,yfinal,year_hint=year)
                for y,items in parsed.items():
                    inventory.setdefault(y,{}).update(items)
                time.sleep(0.15)
            except Exception as e:
                print(f"WARN year page {year}: {e}",file=sys.stderr)
    # Last-resort ordered-page heuristic for the currently rendered year.
    current_year=None
    for token in p.data_stream:
        if re.fullmatch(r"(19\d{2}|20\d{2})",token):
            current_year=int(token); continue
        m=re.search(r"СЛУЖБЕН\s+ВЕСНИК[^0-9]{0,30}(\d{1,3})\s*$",token,re.I)
        if m and current_year:
            issue=int(m.group(1))
            inventory.setdefault(current_year,{}).setdefault(issue,{
                "issue_number":str(issue),
                "source_url":FREE_ACCESS_PAGE,
                "label":token,
                "direct_pdf":False
            })
    return {y:list(sorted(rows.values(),key=lambda x:int(x["issue_number"]))) for y,rows in inventory.items()}

TYPE_PATTERNS=[
    ("law",r"^ЗАКОН\b"),("decision",r"^ОДЛУКА\b"),("rulebook",r"^ПРАВИЛНИК\b"),
    ("decree",r"^УРЕДБА\b"),("resolution",r"^РЕШЕНИЕ\b"),("correction",r"^ИСПРАВКА\b"),
    ("order",r"^НАРЕДБА\b"),("program",r"^ПРОГРАМА\b"),("statute",r"^СТАТУТ\b"),
    ("instruction",r"^УПАТСТВО\b"),("announcement",r"^ОБЈАВА\b")
]
def classify_title(title):
    t=title.strip().upper()
    for kind,pat in TYPE_PATTERNS:
        if re.search(pat,t,re.I): return kind
    return "other"

def _page_two_column_split(page):
    lines=page.splitlines()
    if len(lines)<8:
        return page
    width=max((len(x) for x in lines),default=0)
    if width<110:
        return page
    centers=[]
    for line in lines:
        for m in re.finditer(r" {8,}",line):
            c=(m.start()+m.end())//2
            if int(width*0.35)<=c<=int(width*0.65):
                left=line[:m.start()].strip()
                right=line[m.end():].strip()
                if left and right:
                    centers.append(c)
    if len(centers)<8:
        return page
    centers.sort()
    split=centers[len(centers)//2]
    left=[]; right=[]
    for line in lines:
        l=line[:split].rstrip()
        r=line[split:].strip()
        if l.strip(): left.append(l)
        if r: right.append(r)
    # Registers are printed in reading order: top-to-bottom left column, then right.
    return "\n".join(left+right)

def normalize_register_layout(text):
    return "\f".join(_page_two_column_split(p) for p in text.split("\f"))

def parse_register_text(text, year, source_url, source_sha):
    text=normalize_register_layout(text)
    lines=[" ".join(x.split()) for x in text.splitlines()]
    entries=[]; unresolved=[]; current=None
    ordinal_re=re.compile(r"^(\d{1,6})\.\s*(.*)$")
    ref_re=re.compile(r"(?<!\d)(\d{1,3})\s*/\s*(\d{1,5})\s*$")
    for line in lines:
        if not line: continue
        if "СЛУЖБЕН ВЕСНИК" in line.upper() and "РЕГИСТАР" in line.upper(): continue
        m=ordinal_re.match(line)
        if m:
            if current:
                unresolved.append(current)
            current={"ordinal":int(m.group(1)),"parts":[m.group(2)] if m.group(2) else []}
        elif current:
            current["parts"].append(line)
        else:
            continue
        joined=" ".join(current["parts"]).strip()
        rm=ref_re.search(joined)
        if rm:
            issue=rm.group(1); page=rm.group(2)
            title=joined[:rm.start()].strip(" .…·-")
            if title:
                entries.append({
                    "year":year,
                    "ordinal":current["ordinal"],
                    "title":title,
                    "act_type":classify_title(title),
                    "issue_number":issue,
                    "page_start":int(page),
                    "register_source_url":source_url,
                    "register_source_sha256":source_sha,
                    "human_review_status":"pending",
                    "source_role":"official_chronological_register"
                })
            else:
                unresolved.append(current)
            current=None
    if current: unresolved.append(current)
    return entries, unresolved

def pdftotext(pdf_path, txt_path):
    p=subprocess.run(["pdftotext","-layout",str(pdf_path),str(txt_path)],capture_output=True,text=True)
    return p.returncode,p.stderr[-1000:]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--from-year",type=int,default=1991)
    ap.add_argument("--to-year",type=int,default=2025)
    ap.add_argument("--out",required=True)
    ap.add_argument("--delay",type=float,default=0.7)
    args=ap.parse_args()
    out=Path(args.out); (out/"registers").mkdir(parents=True,exist_ok=True); (out/"acts").mkdir(exist_ok=True); (out/"issues").mkdir(exist_ok=True); (out/"pdf").mkdir(exist_ok=True); (out/"text").mkdir(exist_ok=True)
    try:
        reg_links=extract_register_links()
    except Exception as e:
        reg_links={}
        print("WARN register index page unavailable; using direct official PDF discovery:",e,file=sys.stderr)
    try: issue_inventory=extract_free_issue_inventory(range(args.from_year,args.to_year+1))
    except Exception as e:
        issue_inventory={}; print("WARN free issue inventory:",e,file=sys.stderr)
    summary={"scope":{"from":args.from_year,"to":args.to_year},"register_page":REGISTER_PAGE,"free_access_page":FREE_ACCESS_PAGE,"years":[],"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
    for year in range(args.from_year,args.to_year+1):
        row={"year":year,"register_url":reg_links.get(year),"status":"pending","act_count":0,"unresolved_count":0,"issue_inventory_count":len(issue_inventory.get(year,[]))}
        try:
            raw,final,transport=fetch_register_pdf(year,row["register_url"])
            row["register_url"]=final
            if not raw.startswith(b"%PDF"):
                raise RuntimeError("register is not PDF")
            pdf=out/"pdf"/f"{year}.pdf"; pdf.write_bytes(raw)
            sha=sha256_bytes(raw)
            txt=out/"text"/f"{year}.txt"
            rc,err=pdftotext(pdf,txt)
            text=txt.read_text("utf-8",errors="replace") if txt.exists() else ""
            if rc!=0 or len(text.strip())<500:
                row.update({"status":"needs_ocr_or_manual_extraction","register_sha256":sha,"pdftotext_error":err})
                (out/"registers"/f"{year}.json").write_text(json.dumps(row,ensure_ascii=False,indent=2),"utf-8")
                summary["years"].append(row); time.sleep(args.delay); continue
            entries,unresolved=parse_register_text(text,year,final,sha)
            for entry in entries:
                entry["transport_tls_verified"]=transport.get("X-AI-Advokat-TLS")=="verified"
                entry["transport_state"]=transport.get("X-AI-Advokat-TLS")
            row.update({"status":"parsed_pending_reconciliation","register_url":final,"register_sha256":sha,"transport_tls_verified":transport.get("X-AI-Advokat-TLS")=="verified","transport_state":transport.get("X-AI-Advokat-TLS"),"act_count":len(entries),"unresolved_count":len(unresolved)})
            issues=issue_inventory.get(year,[])
            issue_nums={int(x["issue_number"]) for x in issues if str(x.get("issue_number","")).isdigit()}
            referenced={int(x["issue_number"]) for x in entries if str(x.get("issue_number","")).isdigit()}
            row["referenced_issue_count"]=len(referenced)
            row["missing_issue_links"]=sorted(referenced-issue_nums) if issue_nums else sorted(referenced)
            if issues and not row["missing_issue_links"] and len(entries)>0 and len(unresolved)==0:
                row["status"]="parsed_inventory_reconciled_pending_human_gate"
            (out/"acts"/f"{year}.ndjson").write_text("\n".join(json.dumps(x,ensure_ascii=False) for x in entries)+("\n" if entries else ""),"utf-8")
            (out/"issues"/f"{year}.json").write_text(json.dumps(issues,ensure_ascii=False,indent=2),"utf-8")
            (out/"registers"/f"{year}.json").write_text(json.dumps({"summary":row,"unresolved":unresolved[:500]},ensure_ascii=False,indent=2),"utf-8")
        except Exception as e:
            row["status"]="failed"; row["error"]=str(e)[:500]
        summary["years"].append(row)
        time.sleep(args.delay)
    summary["totals"]={
        "years":len(summary["years"]),
        "parsed_years":sum(1 for x in summary["years"] if x["status"].startswith("parsed")),
        "acts":sum(x.get("act_count",0) for x in summary["years"]),
        "unresolved":sum(x.get("unresolved_count",0) for x in summary["years"]),
        "issue_inventory":sum(x.get("issue_inventory_count",0) for x in summary["years"])
    }
    (out/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),"utf-8")
    print(json.dumps(summary["totals"],ensure_ascii=False))
    # Fail only when nothing useful was parsed.
    if summary["totals"]["parsed_years"]==0:
        raise SystemExit("No chronological register year parsed; stop before ingest.")

if __name__=="__main__":
    main()
