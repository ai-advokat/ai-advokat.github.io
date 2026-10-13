#!/usr/bin/env python3
import hashlib, html, json, os, re, subprocess, tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

URL="https://www.slvesnik.com.mk/besplaten-pristap-do-izdanija.nspx"
UA="AI-Advokat-Gazette-Diagnostic/1.0"

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.forms=[]; self.inputs=[]; self.links=[]; self.scripts=[]; self.selects=[]; self._select=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs); t=tag.lower()
        if t=="form": self.forms.append({k:a.get(k) for k in ["action","method","id","name"]})
        elif t=="input": self.inputs.append({k:a.get(k) for k in ["type","name","id","value"]})
        elif t=="a": self.links.append({"href":a.get("href"),"id":a.get("id"),"class":a.get("class")})
        elif t=="script": self.scripts.append({"src":a.get("src"),"type":a.get("type")})
        elif t=="select":
            self._select={"name":a.get("name"),"id":a.get("id"),"options":[]}; self.selects.append(self._select)
        elif t=="option" and self._select is not None:
            self._select["options"].append({"value":a.get("value")})
    def handle_endtag(self,tag):
        if tag.lower()=="select": self._select=None

def variants(url):
    p=urlsplit(url); hosts=[p.netloc]
    if p.netloc=="www.slvesnik.com.mk": hosts.append("slvesnik.com.mk")
    elif p.netloc=="slvesnik.com.mk": hosts.append("www.slvesnik.com.mk")
    return [urlunsplit((p.scheme,h,p.path,p.query,p.fragment)) for h in hosts]

def curl(url,insecure=False):
    with tempfile.NamedTemporaryFile(delete=False) as f: path=f.name
    try:
        cmd=["curl","--fail","--location","--silent","--show-error","--connect-timeout","20","--max-time","90","--user-agent",UA,"--output",path,"--write-out","%{url_effective}"]
        if insecure: cmd.append("--insecure")
        cmd.append(url)
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode: raise RuntimeError(p.stderr[-400:])
        b=Path(path).read_bytes()
        return b,(p.stdout or url).strip()
    finally:
        try: os.unlink(path)
        except OSError: pass

def fetch():
    errors=[]
    for u in variants(URL):
        try:
            b,final=curl(u,False); return b,final,True,errors
        except Exception as e: errors.append(str(e))
    for u in variants(URL):
        try:
            b,final=curl(u,True); return b,final,False,errors
        except Exception as e: errors.append(str(e))
    raise RuntimeError(" | ".join(errors)[-1200:])

raw,final,tls_verified,errors=fetch()
text=raw.decode("utf-8",errors="replace")
parser=P(); parser.feed(text)

years=sorted(set(int(x) for x in re.findall(r"\b(19\d{2}|20\d{2})\b",text)))
pdf_refs=sorted(set(urljoin(final,h) for h in re.findall(r'''(?:href|src)=["']([^"']+\.pdf(?:\?[^"']*)?)["']''',text,re.I)))
issue_words=re.findall(r"СЛУЖБЕН\s+ВЕСНИК[^<\r\n]{0,120}",re.sub(r"<[^>]+>"," ",text),re.I)

out={
  "source_url":URL,
  "final_url":final,
  "tls_verified":tls_verified,
  "sha256":hashlib.sha256(raw).hexdigest(),
  "bytes":len(raw),
  "years_seen":years,
  "forms":parser.forms,
  "selects":parser.selects,
  "inputs":[x for x in parser.inputs if x.get("name") or x.get("id")][:200],
  "scripts":parser.scripts[:100],
  "link_count":len(parser.links),
  "pdf_refs":pdf_refs[:500],
  "issue_text_samples":issue_words[:100],
  "network_errors":errors[-4:]
}
Path("/tmp/gazette-free-access-diagnostic.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),"utf-8")
print(json.dumps({k:out[k] for k in ["final_url","tls_verified","bytes","years_seen","link_count"]},ensure_ascii=False))
print("pdf_refs",len(pdf_refs),"forms",len(parser.forms),"selects",len(parser.selects))
