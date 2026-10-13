#!/usr/bin/env python3
import hashlib, json, os, re, subprocess, tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

PAGE="https://www.slvesnik.com.mk/besplaten-pristap-do-izdanija.nspx"
UA="AI-Advokat-Gazette-Endpoint-Diagnostic/1.0"

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(); self.src=[]; self.inline=[]; self._in=False; self._buf=[]
    def handle_starttag(self,tag,attrs):
        if tag.lower()=="script":
            a=dict(attrs); src=a.get("src")
            if src: self.src.append(src)
            else: self._in=True; self._buf=[]
    def handle_data(self,data):
        if self._in: self._buf.append(data)
    def handle_endtag(self,tag):
        if tag.lower()=="script" and self._in:
            self.inline.append("".join(self._buf)); self._in=False; self._buf=[]

def variants(url):
    p=urlsplit(url); hs=[p.netloc]
    if p.netloc=="www.slvesnik.com.mk": hs.append("slvesnik.com.mk")
    elif p.netloc=="slvesnik.com.mk": hs.append("www.slvesnik.com.mk")
    return [urlunsplit((p.scheme,h,p.path,p.query,p.fragment)) for h in hs]

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

def fetch(url):
    errs=[]
    for u in variants(url):
        try:
            b,final=curl(u,False); return b,final,True,errs
        except Exception as e: errs.append(str(e))
    p=urlsplit(url)
    if p.scheme=="https" and p.netloc in {"slvesnik.com.mk","www.slvesnik.com.mk"}:
        for u in variants(url):
            try:
                b,final=curl(u,True); return b,final,False,errs
            except Exception as e: errs.append(str(e))
    raise RuntimeError(" | ".join(errs)[-1000:])

def strings_of_interest(text):
    patterns=[
        r'''["']([^"']*(?:api|Api|ajax|Ajax|service|Service|issue|Issue|publication|Publication|edition|Edition|free|Free|download|Download)[^"']*)["']''',
        r'''url\s*:\s*["']([^"']+)["']''',
        r'''\$http\.(?:get|post)\(\s*["']([^"']+)["']''',
        r'''fetch\(\s*["']([^"']+)["']'''
    ]
    vals=[]
    for pat in patterns:
        vals.extend(re.findall(pat,text,re.I))
    out=[]
    for v in vals:
        v=" ".join(v.split())
        if 2<=len(v)<=300 and v not in out:
            out.append(v)
    return out[:500]

raw,final,tls,errors=fetch(PAGE)
html=raw.decode("utf-8",errors="replace")
p=Scripts(); p.feed(html)
scripts=[]
for src in p.src:
    u=urljoin(final,src)
    if "slvesnik.com.mk" not in u: continue
    try:
        b,f,tls_ok,errs=fetch(u)
        txt=b.decode("utf-8",errors="replace")
        scripts.append({
            "url":f,
            "tls_verified":tls_ok,
            "sha256":hashlib.sha256(b).hexdigest(),
            "bytes":len(b),
            "matches":strings_of_interest(txt)
        })
    except Exception as e:
        scripts.append({"url":u,"error":str(e)[:500]})

inline_matches=[]
for block in p.inline:
    inline_matches.extend(strings_of_interest(block))
dedup=[]
for x in inline_matches:
    if x not in dedup: dedup.append(x)

result={
  "page_url":final,
  "page_tls_verified":tls,
  "page_sha256":hashlib.sha256(raw).hexdigest(),
  "page_inline_matches":dedup[:500],
  "same_origin_scripts":scripts,
  "network_errors":errors[-4:]
}
Path("/tmp/gazette-endpoint-discovery.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),"utf-8")
print(json.dumps({
  "page_inline_match_count":len(result["page_inline_matches"]),
  "script_count":len(scripts),
  "script_match_count":sum(len(x.get("matches",[])) for x in scripts)
},ensure_ascii=False))
