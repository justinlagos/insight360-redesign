"""Outline type as clean SVG paths: glyphs are shaped with HarfBuzz, overlapping
contours are merged with Skia PathOps, so a 1px stroke never shows inner seams."""
import functools, pathops, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Light.otf"

@functools.lru_cache(None)
def _font(path):
    tt = TTFont(path)
    blob = hb.Blob.from_file_path(path)
    return tt, hb.Font(hb.Face(blob)), tt["head"].unitsPerEm

def _shape(text, path, track):
    tt, f, upm = _font(path)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {"kern": True, "liga": False, "tnum": True})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    x, out = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((gs[order[info.codepoint]], x + pos.x_offset))
        x += pos.x_advance + track * upm
    return out

def _union(glyphs):
    p = pathops.Path()
    for g, x in glyphs:
        gp = pathops.Path(); g.draw(TransformPen(gp.getPen(), (1, 0, 0, 1, x, 0)))
        p = pathops.op(p, gp, pathops.PathOp.UNION) if len(p) else gp
    p.simplify(fix_winding=True)
    return p

def _d(path):
    pen = SVGPathPen(None, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    path.draw(pen); return pen.getCommands()

def outline_svg(text, accent_from=None, track=-0.04, font=FONT, cls="outline", pad=6):
    """accent_from: index where the accent (red) part starts, e.g. 7 for 'Insight360'."""
    glyphs = _shape(text, font, track)
    n = len(text) if accent_from is None else accent_from
    parts = [_union(glyphs[:n])] + ([_union(glyphs[n:])] if accent_from is not None else [])
    xs, ys, xe, ye = [], [], [], []
    for p in parts:
        b = p.bounds; xs.append(b[0]); ys.append(b[1]); xe.append(b[2]); ye.append(b[3])
    x0, y0, x1, y1 = min(xs) - pad, min(ys) - pad, max(xe) + pad, max(ye) + pad
    w, h = x1 - x0, y1 - y0
    paths = ['<path d="%s"/>' % _d(parts[0])]
    if len(parts) > 1: paths.append('<path class="accent" d="%s"/>' % _d(parts[1]))
    return ('<svg class="%s" viewBox="0 0 %d %d" aria-hidden="true" focusable="false">'
            '<g transform="translate(%d %d) scale(1 -1)">%s</g></svg>') % (cls, round(w), round(h), round(-x0), round(y1), "".join(paths))

if __name__ == "__main__":
    print(outline_svg("Insight360", accent_from=7)[:300])
