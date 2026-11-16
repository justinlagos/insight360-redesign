import re
"""Build the Insight360 v2 (dark) site."""
import math, os, re, shutil, json
SRC = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(SRC)
NAV = [("solutions.html","Solutions"),("how-it-works.html","How it works"),("about.html","About"),("case-studies.html","Case studies"),("insights.html","Insights")]
OUTER = [(18,2.5),(25.75,4.5766),(31.4234,10.25),(33.5,18),(31.4234,25.75),(25.75,31.4234),(18,33.5),(10.25,31.4234),(4.5766,25.75),(2.5,18),(4.5766,10.25),(10.25,4.5766)]
INNER = [(21.2528,10.147),(25.853,14.7472),(25.853,21.2528),(21.2528,25.853),(14.7472,25.853),(10.147,21.2528),(10.147,14.7472),(14.7472,10.147)]
def mark(signal=True, extra="", cls_red=""):
    red = "#FE3D30" if signal else "currentColor"
    d = "".join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="currentColor"/>' for x,y in OUTER)
    d += "".join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="{red}"{cls_red}/>' for x,y in INNER)
    d += f'<circle cx="18" cy="18" r="1.7" fill="{red}"{cls_red}/>'
    return f'<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" {extra}>{d}</svg>'
FAV = "data:image/svg+xml," + re.sub(r"\s+"," ", mark().replace('fill="currentColor"','fill="%23F5F5F5"').replace("#FE3D30","%23FE3D30")).replace('"',"'").replace("<","%3C").replace(">","%3E")

def check_orbital():
    cx = cy = 210; R = 150; r = 82
    quads = {"structure": (180, 270), "tech": (270, 360), "data": (0, 90), "visibility": (90, 180)}
    out = ['<svg class="orbital" viewBox="0 0 420 420" role="img" aria-labelledby="ob-t"><title id="ob-t">Readiness by module. Arcs fill with readiness; red nodes mark gaps.</title>']
    out.append(f'<circle class="ring" cx="{cx}" cy="{cy}" r="{r}"/>')
    for q,(a0,a1) in quads.items():
        s, e = a0 + 6, a1 - 6
        x0 = cx + R*math.cos(math.radians(s)); y0 = cy + R*math.sin(math.radians(s))
        x1 = cx + R*math.cos(math.radians(e)); y1 = cy + R*math.sin(math.radians(e))
        L = 2*math.pi*R*(e-s)/360
        path = f'M{x0:.1f} {y0:.1f} A{R} {R} 0 0 1 {x1:.1f} {y1:.1f}'
        out.append(f'<path class="arc-bg" d="{path}"/>')
        out.append(f'<path class="arc" data-q="{q}" data-len="{L:.1f}" d="{path}" style="stroke-dasharray:{L:.1f};stroke-dashoffset:{L:.1f}"/>')
        for k, a in enumerate([a0+22, a0+45, a0+68]):
            x = cx + (R+22)*math.cos(math.radians(a)); y = cy + (R+22)*math.sin(math.radians(a))
            out.append(f'<circle class="node" data-q="{q}" cx="{x:.1f}" cy="{y:.1f}" r="4.5"/>')
        mid = (a0+a1)/2
        lx = cx + (r-30)*math.cos(math.radians(mid)); ly = cy + (r-30)*math.sin(math.radians(mid))
        out.append(f'<text class="q-score" data-q="{q}" x="{lx:.1f}" y="{ly+6:.1f}" text-anchor="middle"></text>')
    for k in range(8):
        a = math.radians(-67.5 + 45*k)
        out.append(f'<circle class="inner" cx="{cx+r*math.cos(a):.1f}" cy="{cy+r*math.sin(a):.1f}" r="3"/>')
    out.append(f'<circle class="core" cx="{cx}" cy="{cy}" r="6"/>')
    for q,t,x,y,anc in [("structure","Structure",14,24,"start"),("tech","Tech",406,24,"end"),("data","Data",406,404,"end"),("visibility","Visibility",14,404,"start")]:
        out.append(f'<text class="q-label" data-q="{q}" x="{x}" y="{y}" text-anchor="{anc}">{t}</text>')
    out.append('</svg>')
    return "\n".join(out)

def scan_orbital():
    """The Insight360 mark as a live diagram: outer ring = the business, inner ring = team size,
    four arcs = the modules, core = where to start."""
    c = 210; RO = 112; RI = 64; RA = 166
    quads = [("structure", 180, 270), ("tech", 270, 360), ("data", 0, 90), ("visibility", 90, 180)]
    def q_of(a):
        a %= 360
        for q, a0, a1 in quads:
            if a0 <= a < a1: return q
        return "data"
    o = ['<svg class="orbital" viewBox="0 0 420 420" role="img" aria-labelledby="ob-t ob-d">',
         '<title id="ob-t">Growth scan map</title><desc id="ob-d">The outer ring lights when you pick a sector, the inner ring shows team size, and the arc for the module to start with turns red.</desc>',
         f'<circle class="guide" cx="{c}" cy="{c}" r="{RO}"/><circle class="guide" cx="{c}" cy="{c}" r="{RI}"/>',
         f'<g class="sweep"><path d="M{c} {c-RA+26} A{RA-26} {RA-26} 0 0 1 {c+(RA-26)*math.sin(math.radians(38)):.1f} {c-(RA-26)*math.cos(math.radians(38)):.1f}"/></g>']
    for q, a0, a1 in quads:
        s, e = a0 + 7, a1 - 7
        x0 = c + RA*math.cos(math.radians(s)); y0 = c + RA*math.sin(math.radians(s))
        x1 = c + RA*math.cos(math.radians(e)); y1 = c + RA*math.sin(math.radians(e))
        L = 2*math.pi*RA*(e-s)/360
        d = f'M{x0:.1f} {y0:.1f} A{RA} {RA} 0 0 1 {x1:.1f} {y1:.1f}'
        o.append(f'<path class="arc-bg" d="{d}"/>')
        o.append(f'<path class="arc" data-q="{q}" d="{d}" style="stroke-dasharray:{L:.1f};stroke-dashoffset:{L:.1f};--len:{L:.1f}"/>')
    for k in range(12):
        a = -90 + 30*k
        x = c + RO*math.cos(math.radians(a)); y = c + RO*math.sin(math.radians(a))
        o.append(f'<circle class="dot-o" data-q="{q_of(a)}" style="--i:{k}" cx="{x:.1f}" cy="{y:.1f}" r="9"/>')
    for k in range(8):
        a = -67.5 + 45*k
        x = c + RI*math.cos(math.radians(a)); y = c + RI*math.sin(math.radians(a))
        o.append(f'<circle class="dot-i" style="--i:{k}" cx="{x:.1f}" cy="{y:.1f}" r="7.5"/>')
    o.append(f'<circle class="core-glow" cx="{c}" cy="{c}" r="34"/><circle class="core" cx="{c}" cy="{c}" r="10"/>')
    for q, t, x, y, anc in [("structure","Structure",8,22,"start"),("tech","Tech",412,22,"end"),("data","Data",412,410,"end"),("visibility","Visibility",8,410,"start")]:
        o.append(f'<text class="q-label" data-q="{q}" x="{x}" y="{y}" text-anchor="{anc}">{t}</text>')
    o.append('<defs><radialGradient id="glow"><stop offset="0" stop-color="#fe3d30" stop-opacity=".55"/><stop offset="1" stop-color="#fe3d30" stop-opacity="0"/></radialGradient></defs></svg>')
    return "".join(o)

def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="img/i360_og.jpg">
<meta name="theme-color" content="#050505">
<link rel="icon" href="{FAV}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&amp;family=Inter+Tight:wght@300;400;500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<script>document.documentElement.classList.add("js");</script>
</head>"""

def header(active):
    links = "".join(f'<a href="{h}"' + (' aria-current="page"' if h == active else '') + f'>{l}</a>' for h,l in NAV)
    ml = "".join(f'<a href="{h}">{l}<span>0{i+1}</span></a>' for i,(h,l) in enumerate([("index.html","Home")] + NAV + [("contact.html","Contact")]))
    return f"""<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Insight360 home">{mark()}<span class="brand-word">Insight<b>360</b></span></a>
    <nav class="nav" aria-label="Main">{links}</nav>
    <div class="header-cta">
      <a class="btn btn--sm" href="contact.html?interest=Consultation">Book a consultation</a>
      <a class="btn btn--sm btn--solid" href="contact.html?interest=Growth%20Audit">Start your growth audit</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu"><span></span></button>
    </div>
  </div>
</header>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">{ml}
  <div class="actions"><a class="btn btn--solid" href="contact.html?interest=Growth%20Audit">Start your growth audit</a><a class="btn" href="contact.html?interest=Consultation">Book a consultation</a></div>
</nav>"""

def cta(title, tone, text, show=True):
    if not show: return ""
    return f"""<section class="cta" aria-labelledby="cta-title">
  <div class="wrap grid">
    <span class="eyebrow" style="grid-column:1/-1">Start here</span>
    <h2 class="h2" id="cta-title">{title} <span class="tone">{tone}</span></h2>
    <p class="lead">{text}</p>
    <div class="actions"><a class="btn btn--solid" href="contact.html?interest=Growth%20Audit"><span class="dot"></span>Start your growth audit</a><a class="btn" href="contact.html?interest=Consultation">Book a consultation</a></div>
    <p class="contact-line">Or email <a href="mailto:hello@insight360.com">hello@insight360.com</a> or call <a href="tel:+2348118990300">+234 811 899 0300</a>.</p>
  </div>
  <div class="cta-mark">{mark(signal=False, extra='width="100%"')}</div>
</section>"""

FOOTER = f"""<footer class="site-footer">
  <div class="wrap">
    <div class="grid">
      <div class="foot-brand">
        <a class="brand" href="index.html" aria-label="Insight360 home">{mark()}<span class="brand-word">Insight<b>360</b></span></a>
        <span class="by">by ionec</span>
        <p>Build better systems. Make better decisions. Grow with confidence. A modular growth partner for businesses that are ready for the next stage.</p>
      </div>
      <div class="foot-col"><h4>Explore</h4><a href="solutions.html">Solutions</a><a href="how-it-works.html">How it works</a><a href="about.html">About</a><a href="case-studies.html">Case studies</a><a href="insights.html">Insights</a></div>
      <div class="foot-col"><h4>Modules</h4><a href="solutions.html#structure">Structure</a><a href="solutions.html#tech">Tech</a><a href="solutions.html#data">Data</a><a href="solutions.html#visibility">Visibility</a></div>
      <div class="foot-col"><h4>Get started</h4><a href="contact.html?interest=Growth%20Audit">Start your growth audit</a><a href="contact.html?interest=Consultation">Book a consultation</a><a href="index.html#scan">Growth scan</a></div>
      <div class="foot-col"><h4>Contact</h4><a href="mailto:hello@insight360.com">hello@insight360.com</a><a href="tel:+2348118990300">+234 811 899 0300</a></div>
    </div>
    <div class="foot-word" aria-hidden="true">{{WORDMARK}}</div>
    <div class="foot-base"><span>&copy; 2026 Insight360. All rights reserved.</span><span>Photography and renders are illustrative.</span></div>
  </div>
</footer>
<script src="assets/site.js"></script>
</body>
</html>"""

from outline import outline_svg
_NUM = re.compile(r'<(span|div|p) class="numeral" aria-hidden="true">(\d+)</\1>')
_STEP = re.compile(r'<span class="n" aria-hidden="true">(\d+)</span>')
def outlines(html):
    html = _NUM.sub(lambda m: '<span class="numeral" aria-hidden="true">%s</span>' % outline_svg(m.group(2), track=-0.03), html)
    html = _STEP.sub(lambda m: '<span class="n" aria-hidden="true">%s</span>' % outline_svg(m.group(1), track=-0.03), html)
    w = outline_svg("Insight360", accent_from=7, track=-0.03)
    return html.replace("{{WORDMARK}}", w).replace("{WORDMARK}", w)

def build():
    if os.path.isdir(OUT + "/assets"): shutil.rmtree(OUT + "/assets")
    shutil.copytree(SRC + "/assets", OUT + "/assets")
    for f in sorted(os.listdir(SRC + "/pages")):
        raw = open(os.path.join(SRC, "pages", f), encoding="utf8").read()
        meta_block, body = raw.split("\n---\n", 1)
        meta = dict(l.split(": ", 1) for l in meta_block.strip().splitlines())
        body = body.replace("{{FILM_BOXES}}", open(SRC + "/film-boxes.json").read().strip()).replace("{{SCAN_ORBITAL}}", scan_orbital()).replace("{{MARK_PRINT}}", mark()).replace("{{CHECK_ORBITAL}}", check_orbital()).replace("{{MARK}}", mark())
        html = head(meta["title"], meta["description"]) + "\n" + header(meta.get("active","")) + '\n<main id="main">\n' + body + "\n</main>\n"
        html += cta(meta.get("cta_title","Ready to replace business chaos"), meta.get("cta_tone","with structure?"), meta.get("cta_text","Find out what is standing between your business and its next stage of growth. A growth audit shows where the business stands, what is holding it back and where to focus first."), meta.get("cta","yes")=="yes")
        html += "\n" + FOOTER
        open(os.path.join(OUT, f), "w", encoding="utf8").write(outlines(html))
        print("built", f, len(html))
if __name__ == "__main__": build()
