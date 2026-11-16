/* Insight360 site behaviour, v2 */
(function () {
  "use strict";
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Header ---------- */
  var header = document.querySelector(".site-header");
  var hasFilm = !!document.querySelector("[data-film]");
  var lastY = window.scrollY;
  function headerTick(y) {
    if (!header) return;
    var solidAt = hasFilm ? 40 : 8;
    header.classList.toggle("is-solid", y > solidAt);
    var hide = y > 600 && y > lastY + 2 && !body.classList.contains("menu-open");
    if (y < lastY - 2 || y < 600) hide = false;
    if (Math.abs(y - lastY) > 2) {
      header.classList.toggle("is-hidden", hide);
      body.classList.toggle("header-hidden", hide);
    }
    lastY = y;
  }
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = body.classList.toggle("menu-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      header.classList.add("is-solid");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && body.classList.contains("menu-open")) { menuBtn.click(); menuBtn.focus(); }
    });
    document.querySelectorAll(".mobile-nav a").forEach(function (a) { a.addEventListener("click", function () { body.classList.remove("menu-open"); }); });
  }

  /* ---------- Hero film: frames scrubbed by scroll ---------- */
  var film = document.querySelector("[data-film]");
  var filmState = null;
  if (film) {
    var canvas = film.querySelector(".film-canvas");
    var poster = film.querySelector(".film-poster");
    var ctx = canvas.getContext("2d");
    var N = +film.getAttribute("data-count");
    var small = window.matchMedia("(max-width: 860px)").matches;
    var base = film.getAttribute(small ? "data-src-sm" : "data-src");
    var frames = new Array(N);
    var loaded = new Array(N).fill(false);
    var pad = function (i) { return ("00" + i).slice(-3); };
    var order = [];
    [16, 8, 4, 2, 1].forEach(function (step) { for (var i = 0; i < N; i += step) if (order.indexOf(i) < 0) order.push(i); });
    if (order.indexOf(N - 1) < 0) order.push(N - 1);
    var cursor = 0, inflight = 0;
    function pump() {
      while (inflight < 6 && cursor < order.length) {
        (function (i) {
          var im = new Image(); inflight++;
          im.decoding = "async";
          im.onload = function () { frames[i] = im; loaded[i] = true; inflight--; if (i === 0 || filmState) requestDraw(); pump(); };
          im.onerror = function () { inflight--; pump(); };
          im.src = base + pad(i) + ".jpg";
        })(order[cursor++]);
      }
    }
    function nearest(i) {
      if (loaded[i]) return i;
      for (var d = 1; d < N; d++) { if (i - d >= 0 && loaded[i - d]) return i - d; if (i + d < N && loaded[i + d]) return i + d; }
      return -1;
    }
    var posX = 0.62;
    var BOX = null;
    try { BOX = JSON.parse(document.getElementById("film-boxes").textContent); } catch (e) { BOX = null; }
    var stage = film.querySelector(".film-stage");
    var region = null;      // where the unit should sit, in canvas pixels, when we fit instead of cover
    function layout() {
      var cw = canvas.width, ch = canvas.height, k = cw / Math.max(1, canvas.clientWidth);
      var vw = canvas.clientWidth, vh = canvas.clientHeight;
      region = null;
      if (!BOX) return;
      var st = stage.getBoundingClientRect(), top = 76;
      var phoneLand = window.matchMedia("(max-width: 900px) and (orientation: landscape) and (max-height: 560px)").matches;
      var stacked = !phoneLand && window.matchMedia("(max-width: 860px)").matches;
      if (stacked) {
        // portrait: the unit fills the space between the header and the highest panel
        var pt = vh;
        film.querySelectorAll(".film-panel").forEach(function (p) {
          var r = p.getBoundingClientRect(); var y = r.top - st.top - (p.classList.contains("is-off") ? 16 : 0);
          if (r.height > 0) pt = Math.min(pt, y);
        });
        var bottom = Math.max(top + 160, pt - 20);
        region = { x0: 0, y0: top * k, x1: cw, y1: bottom * k, pad: 0.86 };
      } else if (phoneLand) {
        // phone in landscape: copy on the left, the unit centred in the right half
        region = { x0: cw * 0.5, y0: 56 * k, x1: cw - 12 * k, y1: ch - 44 * k, pad: 0.9 };
      }
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      layout();
      requestDraw(true);
    }
    function boxAt(c) {
      var i = Math.min(Math.floor(c), BOX.length - 1), j = Math.min(i + 1, BOX.length - 1), m = c - i, A = BOX[i], B = BOX[j];
      return [A[0] + (B[0] - A[0]) * m, A[1] + (B[1] - A[1]) * m, A[2] + (B[2] - A[2]) * m, A[3] + (B[3] - A[3]) * m];
    }
    var geo = null;
    function geometry(iw, ih) {
      var cw = canvas.width, ch = canvas.height;
      if (!region) {
        var s = Math.max(cw / iw, ch / ih);
        return { x: (cw - iw * s) * posX, y: (ch - ih * s) / 2, w: iw * s, h: ih * s, fit: false };
      }
      var bb = boxAt(current);
      var bw = (bb[2] - bb[0]) * iw, bh = (bb[3] - bb[1]) * ih;
      var rw = region.x1 - region.x0, rh = region.y1 - region.y0;
      var sp = Math.min(rw * region.pad / bw, rh * 0.94 / bh);
      var cx = (bb[0] + bb[2]) / 2 * iw, cy = (bb[1] + bb[3]) / 2 * ih;
      return { x: (region.x0 + region.x1) / 2 - cx * sp, y: (region.y0 + region.y1) / 2 - cy * sp, w: iw * sp, h: ih * sp, fit: true };
    }
    function feather(g) {
      // fade the frame's edges into the page so no rectangle shows
      var cw = canvas.width, ch = canvas.height, f = Math.min(g.w, g.h) * 0.16;
      ctx.globalAlpha = 1; ctx.fillStyle = "#050505";
      if (g.x > 0) ctx.fillRect(0, 0, Math.ceil(g.x), ch);
      if (g.x + g.w < cw) ctx.fillRect(Math.floor(g.x + g.w), 0, cw, ch);
      if (g.y > 0) ctx.fillRect(0, 0, cw, Math.ceil(g.y));
      if (g.y + g.h < ch) ctx.fillRect(0, Math.floor(g.y + g.h), cw, ch);
      var edges = [
        [g.x, 0, g.x + f, 0, g.x, g.y, f, g.h],
        [g.x + g.w, 0, g.x + g.w - f, 0, g.x + g.w - f, g.y, f, g.h],
        [0, g.y, 0, g.y + f, g.x, g.y, g.w, f],
        [0, g.y + g.h, 0, g.y + g.h - f, g.x, g.y + g.h - f, g.w, f]
      ];
      edges.forEach(function (e) {
        var gr = ctx.createLinearGradient(e[0], e[1], e[2], e[3]);
        gr.addColorStop(0, "#050505"); gr.addColorStop(1, "rgba(5,5,5,0)");
        ctx.fillStyle = gr; ctx.fillRect(e[4], e[5], e[6], e[7]);
      });
    }
    var drawn = -1, drawPending = false, current = 0, target = 0;
    function requestDraw(force) { if (force) drawn = -1; if (!drawPending) { drawPending = true; requestAnimationFrame(draw); } }
    function paint(im, a) {
      geo = geometry(im.naturalWidth, im.naturalHeight);
      ctx.globalAlpha = a;
      ctx.drawImage(im, geo.x, geo.y, geo.w, geo.h);
      ctx.globalAlpha = 1;
    }
    function draw() {
      drawPending = false;
      current += (target - current) * (reduce ? 1 : 0.14);
      if (Math.abs(target - current) < 0.004) current = target;
      if (current !== drawn) {
        var f0 = Math.floor(current), f1 = Math.min(f0 + 1, N - 1), mix = current - f0;
        var ok = loaded[f0] && loaded[f1], idx = ok ? f0 : nearest(Math.round(current));
        if (idx >= 0) {
          if (region) { ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          paint(frames[idx], 1);
          if (ok && mix > 0.01 && f1 !== f0) paint(frames[f1], mix);
          if (geo && geo.fit) feather(geo);
          drawn = ok ? current : -1;
        }
        if (poster && drawn !== -1 && poster.style.display !== "none") poster.style.display = "none";
      }
      if (current !== target) requestDraw();
    }
    var panels = { intro: film.querySelector(".film-panel--intro"), spec: film.querySelector(".film-panel--spec"), end: film.querySelector(".film-panel--end") };
    var specItems = film.querySelectorAll(".spec li");
    var fill = film.querySelector(".film-fill");
    var ticks = film.querySelectorAll(".film-ticks i");
    var lockAt = [0.42, 0.52, 0.62, 0.72];
    var connected = film.querySelector("[data-connected]");
    filmState = function () {
      var top = film.getBoundingClientRect().top;
      var span = film.offsetHeight - window.innerHeight;
      var p = clamp(-top / span, 0, 1);
      target = p * (N - 1);
      requestDraw();
      panels.intro.classList.toggle("is-off", p > 0.1);
      panels.spec.classList.toggle("is-off", p <= 0.12 || p > 0.86);
      panels.end.classList.toggle("is-off", p <= 0.88);
      var on = 0;
      specItems.forEach(function (li, i) { li.classList.toggle("is-on", p >= lockAt[i]); if (p >= lockAt[i]) on++; });
      if (connected) connected.textContent = on + " of 4 connected";
      ticks.forEach(function (t, i) { t.classList.toggle("is-on", p >= lockAt[i]); });
      fill.style.width = (p * 100).toFixed(2) + "%";
    };
    if (reduce) {
      film.classList.add("is-static");
      if (poster) poster.src = base + pad(N - 1) + ".jpg";
      panels.spec.classList.add("is-off"); panels.end.classList.add("is-off");
    } else {
      window.addEventListener("resize", size);
      window.addEventListener("orientationchange", function () { setTimeout(size, 250); });
      if (document.fonts) document.fonts.ready.then(size);
      size(); pump(); filmState();
    }
  }

  /* ---------- Rise-in for section heads (visible at rest, rises once) ---------- */
  var rise = document.querySelectorAll("[data-rise]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rise.forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("pre"); io.observe(el); } });
    var steps = document.querySelector("[data-steps]");
    if (steps) {
      var so = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          steps.querySelectorAll(".step").forEach(function (s, i) { setTimeout(function () { s.classList.add("is-lit"); }, i * 140); });
          so.disconnect();
        }
      }, { threshold: 0.3 });
      so.observe(steps);
    }
  } else {
    document.querySelectorAll(".step").forEach(function (s) { s.classList.add("is-lit"); });
  }

  /* ---------- Parallax on large photographs ---------- */
  var plx = Array.prototype.slice.call(document.querySelectorAll(".parallax img"));
  function parallax() {
    if (reduce) return;
    var vh = window.innerHeight;
    plx.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var k = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = "translate3d(0," + (k * -40).toFixed(1) + "px,0) scale(1.1)";
    });
  }

  /* ---------- Dot-matrix map of Nigeria ---------- */
  var mapCanvas = document.querySelector("[data-map]");
  function drawMap() {
    if (!mapCanvas) return;
    var poly = [[2.70,6.36],[2.73,7.0],[2.75,8.0],[2.85,9.0],[3.6,10.3],[3.62,11.7],[3.9,12.6],[4.1,13.5],[5.5,13.85],[6.5,13.6],[7.8,13.3],[9.0,12.85],[10.2,13.25],[11.5,13.3],[12.3,13.1],[13.1,13.6],[13.65,13.7],[14.2,13.1],[14.6,12.2],[14.2,11.3],[13.6,10.2],[13.25,9.0],[12.5,8.3],[11.9,7.1],[11.1,6.5],[10.6,7.0],[9.8,6.4],[9.3,5.8],[8.85,5.0],[8.5,4.55],[7.6,4.45],[6.9,4.35],[6.0,4.28],[5.45,5.1],[5.0,5.6],[4.5,6.2],[3.6,6.42]];
    var cities = [["Lagos",3.38,6.52],["Abuja",7.49,9.06],["Port Harcourt",7.01,4.82],["Kano",8.52,12.0]];
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    var W = mapCanvas.clientWidth, H = mapCanvas.clientHeight;
    mapCanvas.width = W * dpr; mapCanvas.height = H * dpr;
    var g = mapCanvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var lon0 = 2.3, lon1 = 15.0, lat0 = 3.9, lat1 = 14.2;
    var sc = Math.min(W / (lon1 - lon0), H / (lat1 - lat0));
    var ox = (W - (lon1 - lon0) * sc) / 2, oy = (H - (lat1 - lat0) * sc) / 2;
    var X = function (lon) { return ox + (lon - lon0) * sc; }, Y = function (lat) { return oy + (lat1 - lat) * sc; };
    function inside(x, y) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
    var step = 0.24;
    for (var lat = lat0; lat <= lat1; lat += step) for (var lon = lon0; lon <= lon1; lon += step) {
      if (!inside(lon, lat)) continue;
      var d = Infinity; cities.forEach(function (c) { d = Math.min(d, Math.hypot(c[1] - lon, c[2] - lat)); });
      var a = d < 1.1 ? 0.55 - d * 0.25 : 0.2;
      g.fillStyle = "rgba(245,245,245," + a.toFixed(2) + ")";
      g.beginPath(); g.arc(X(lon), Y(lat), 1.35, 0, Math.PI * 2); g.fill();
    }
    g.font = "500 12px Inter, 'Helvetica Neue', Arial, sans-serif";
    cities.forEach(function (c) {
      var x = X(c[1]), y = Y(c[2]);
      g.strokeStyle = "rgba(254,61,48,.55)"; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#fe3d30"; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(245,245,245,.75)"; g.fillText(c[0], x + 14, y + 4);
    });
  }
  if (mapCanvas) { drawMap(); window.addEventListener("resize", drawMap); if (document.fonts) document.fonts.ready.then(drawMap); }

  /* ---------- Growth scan: one question at a time, a live map, a brief ---------- */
  var scan = document.querySelector("[data-scan]");
  if (scan) {
    var D = JSON.parse(document.getElementById("scan-data").textContent);
    var ORDER = ["sector", "size", "pain", "brief"];
    var pick = { sector: null, size: null, pain: null };
    var at = 0, advanceT = null;
    var $ = function (sel) { return scan.querySelector(sel); };
    var $$ = function (sel) { return scan.querySelectorAll(sel); };
    var orb = $(".orbital"), caption = $("[data-caption]"), count = $("[data-count]"), back = $("[data-back]");
    var el = {
      meta: $("[data-brief-meta]"), head: $("[data-brief-head]"), why: $("[data-brief-why]"),
      sector: $("[data-brief-sector]"), size: $("[data-brief-size]"), first: $("[data-brief-first]"),
      kase: $("[data-brief-case]"), book: $("[data-brief-book]"), mail: $("[data-brief-mail]"),
      field: $("[data-brief-field]"), print: $("[data-brief-print]")
    };
    var SIZE_DOTS = { s1: 2, s2: 4, s3: 6, s4: 8 };
    var SHORT_SIZE = { s1: "1 to 10", s2: "11 to 50", s3: "51 to 200", s4: "200+" };

    function sectorLine(sc) { return "In " + sc.noun + ", growing pains usually show up first in " + sc.where + "."; }
    function briefText() {
      var sc = D.sectors[pick.sector], sz = D.sizes[pick.size], pn = D.pains[pick.pain];
      return [pn.title, sc.name + ", " + sz.name, "", pn.why, sectorLine(sc), sz.line, "",
        "What we would do first:"].concat(pn.first.map(function (t, i) { return (i + 1) + ". " + t; })).join("\n");
    }

    /* the map: preview = hovered answer, pick = chosen answers */
    function paintMap(preview) {
      var p = { sector: pick.sector, size: pick.size, pain: pick.pain };
      if (preview) p[preview.name] = preview.value;
      orb.classList.toggle("has-sector", !!p.sector);
      orb.classList.toggle("is-done", !!(pick.sector && pick.size && pick.pain));
      var n = p.size ? SIZE_DOTS[p.size] : 0;
      orb.querySelectorAll(".dot-i").forEach(function (d, i) { d.classList.toggle("is-on", i < n); });
      orb.querySelectorAll(".arc").forEach(function (arc) {
        var q = arc.getAttribute("data-q"), on = p.pain && (p.pain === "all" || p.pain === q);
        arc.classList.toggle("is-on", !!on);
        arc.classList.toggle("is-preview", !!on && !!preview && preview.name === "pain" && pick.pain !== p.pain);
      });
      orb.querySelectorAll(".dot-o").forEach(function (d) {
        var q = d.getAttribute("data-q");
        d.classList.toggle("is-red", !!p.pain && (p.pain === "all" || p.pain === q));
      });
      orb.querySelectorAll(".q-label").forEach(function (l) {
        var q = l.getAttribute("data-q");
        l.classList.toggle("is-lead", !!p.pain && (p.pain === "all" || p.pain === q));
      });
      orb.classList.toggle("has-pain", !!p.pain);
    }
    function setCaption() {
      var sc = D.sectors[pick.sector], pn = D.pains[pick.pain];
      if (pn && ORDER[at] === "brief") { caption.textContent = pn.title; caption.classList.add("is-strong"); return; }
      caption.classList.remove("is-strong");
      var bits = []; if (sc) bits.push(sc.name); if (pick.size) bits.push(D.sizes[pick.size].name);
      caption.textContent = bits.length ? bits.join(", ") : "Your answers build the map";
    }
    function nav() {
      $$(".sn").forEach(function (b, i) {
        var key = ORDER[i], val = key === "brief" ? "" : pick[key];
        b.classList.toggle("is-now", i === at);
        b.classList.toggle("is-done", key === "brief" ? at === 3 : !!val);
        var reachable = i === 0 || ORDER.slice(0, i).every(function (k) { return k === "brief" || pick[k]; });
        b.disabled = !reachable;
        var v = b.querySelector(".sn-v");
        v.textContent = key === "sector" && val ? D.sectors[val].name : key === "size" && val ? SHORT_SIZE[val] : key === "pain" && val ? D.pains[val].title.replace("Start with ", "") : "";
        if (i === at) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      back.hidden = at === 0;
      count.textContent = at < 3 ? "Question " + (at + 1) + " of 3" : "Brief ready";
    }
    function fillBrief() {
      var sc = D.sectors[pick.sector], sz = D.sizes[pick.size], pn = D.pains[pick.pain];
      el.meta.textContent = sc.name + ", " + sz.name;
      el.head.textContent = pn.title;
      el.why.textContent = pn.why;
      el.sector.textContent = sectorLine(sc);
      el.size.textContent = sz.line;
      el.first.innerHTML = pn.first.map(function (t) { return "<li>" + t + "</li>"; }).join("");
      el.kase.href = "case-studies.html#" + sc.case[0]; el.kase.textContent = sc.case[1];
      var code = [pick.sector, pick.size, pick.pain].join(".");
      var bookUrl = "contact.html?interest=Growth%20Audit&scan=" + encodeURIComponent(code);
      el.book.href = bookUrl;
      el.field.value = briefText();
      var abs = location.origin && location.origin !== "null" ? location.origin + location.pathname.replace(/[^/]*$/, "") + bookUrl : "";
      el.mail.href = "mailto:?subject=" + encodeURIComponent("Insight360 growth brief: " + pn.title) +
        "&body=" + encodeURIComponent(briefText() + (abs ? "\n\nBook a growth audit with this brief:\n" + abs : "") + "\n\nInsight360, hello@insight360.com");
      store.set("i360-scan", code);
    }
    function show(i, focus) {
      at = i;
      $$(".scan-q").forEach(function (q) {
        var on = q.getAttribute("data-step") === ORDER[i];
        q.hidden = !on; q.classList.toggle("is-active", on);
      });
      if (ORDER[i] === "brief") fillBrief();
      scan.classList.toggle("is-brief", ORDER[i] === "brief");
      nav(); setCaption(); paintMap();
      if (focus) {
        var cur = $(".scan-q.is-active");
        var f = ORDER[i] === "brief" ? cur : (cur.querySelector("input:checked") || cur.querySelector("input"));
        if (f) f.focus({ preventScroll: true });
        if (window.matchMedia("(max-width: 960px)").matches) {
          var top = scan.getBoundingClientRect().top + window.scrollY - 80;
          if (window.scrollY > top || ORDER[i] === "brief") window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
        }
      }
    }
    scan.addEventListener("change", function (e) {
      var t = e.target; if (!(t.name in pick)) return;
      var wasComplete = !!(pick.sector && pick.size && pick.pain);
      pick[t.name] = t.value;
      nav(); setCaption(); paintMap();
      clearTimeout(advanceT);
      var next = wasComplete ? 3 : ORDER.indexOf(t.name) + 1;
      advanceT = setTimeout(function () { show(next, true); }, reduce ? 0 : 420);
    });
    /* keyboard: number keys answer the current question */
    scan.addEventListener("keydown", function (e) {
      if (ORDER[at] === "brief" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.matches("input[type=email], input[type=text], textarea")) return;
      var n = parseInt(e.key, 10); if (!(n >= 1)) return;
      var r = $(".scan-q.is-active").querySelectorAll("input[type=radio]")[n - 1];
      if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); e.preventDefault(); }
    });
    /* hover and focus preview on the map */
    scan.querySelectorAll(".opt label").forEach(function (lab) {
      var input = document.getElementById(lab.getAttribute("for"));
      var on = function () { paintMap({ name: input.name, value: input.value }); };
      var off = function () { paintMap(); };
      lab.addEventListener("mouseenter", on); lab.addEventListener("mouseleave", off);
      input.addEventListener("focus", function () { if (input.matches(":focus-visible")) on(); }); input.addEventListener("blur", off);
    });
    back.addEventListener("click", function () { clearTimeout(advanceT); if (at > 0) show(at - 1, true); });
    $$(".sn").forEach(function (b, i) { b.addEventListener("click", function () { if (!b.disabled) { clearTimeout(advanceT); show(i, true); } }); });
    $("[data-restart]").addEventListener("click", function () {
      pick = { sector: null, size: null, pain: null };
      $$(".scan-q input[type=radio]").forEach(function (r) { r.checked = false; });
      store.set("i360-scan", "");
      show(0, true);
    });
    el.print.addEventListener("click", function () {
      var sc = D.sectors[pick.sector], sz = D.sizes[pick.size], pn = D.pains[pick.pain];
      var holder = document.createElement("div"); holder.id = "print-brief";
      var mark = (document.querySelector(".brand svg") || {}).outerHTML || "";
      var map = orb.cloneNode(true); map.removeAttribute("aria-labelledby"); map.setAttribute("aria-hidden", "true");
      var date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      holder.innerHTML =
        "<header class='pb-head'><span class='pb-brand'>" + mark + "<span><b>Insight</b><em>360</em></span></span><span class='pb-date'>Growth brief, " + date + "</span></header>" +
        "<div class='pb-grid'><div><p class='pb-k'>Where to start</p><h1>" + pn.title + "</h1><p class='pb-m'>" + sc.name + ", " + sz.name + "</p>" +
        "<p class='pb-lead'>" + pn.why + "</p><p>" + sectorLine(sc) + "</p><p>" + sz.line + "</p></div><div class='pb-map'></div></div>" +
        "<h2>What we would do first</h2><ol>" + pn.first.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ol>" +
        "<h2>Next step</h2><p>A growth audit turns this brief into a written diagnosis and a roadmap with the order of work.</p>" +
        "<p class='pb-contact'>hello@insight360.com &nbsp; +234 811 899 0300</p>";
      holder.querySelector(".pb-map").appendChild(map);
      document.body.appendChild(holder); document.documentElement.classList.add("printing");
      var done = function () { document.documentElement.classList.remove("printing"); if (holder.parentNode) holder.parentNode.removeChild(holder); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print(); setTimeout(done, 1500);
    });
    show(0, false);
  }

  /* ---------- Scroll spy for in-page navs ---------- */
  var spies = [];
  document.querySelectorAll("[data-spy]").forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']"));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    spies.push(function () {
      var line = window.innerHeight * 0.35, cur = 0;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top - line <= 0) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle("is-active", i === cur); if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    });
  });

  /* ---------- One scroll loop ---------- */
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    headerTick(y);
    if (filmState) filmState();
    parallax();
    spies.forEach(function (f) { f(); });
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Forms (Netlify Forms when live) ---------- */
  function isLive() { var h = location.hostname; return /netlify\.app$/.test(h) || /insight360/.test(h); }
  function validate(form) {
    var first = null;
    form.querySelectorAll("[data-required]").forEach(function (field) {
      var input = field.querySelector("input, select, textarea");
      var ok = input.value.trim() !== "";
      if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      field.classList.toggle("has-error", !ok);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var status = form.querySelector(".form-status") || document.querySelector(form.getAttribute("data-status"));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var nameInput = form.querySelector("[name='name']");
      var name = nameInput ? nameInput.value.trim().split(" ")[0] : "";
      function show(m) { status.textContent = m; status.classList.add("is-shown"); status.focus(); }
      if (!isLive()) { show("Preview only: your answers are complete. This form sends once the site is live on Netlify."); return; }
      var submit = form.querySelector("[type='submit']"); submit.disabled = true;
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); show(form.getAttribute("data-success").replace("{name}", name || "there")); })
        .catch(function () { show("The form did not send. Email hello@insight360.com and we will pick it up from there."); })
        .then(function () { submit.disabled = false; });
    });
    form.querySelectorAll("[data-required] input, [data-required] select").forEach(function (input) {
      input.addEventListener("input", function () { var f = input.closest("[data-required]"); if (input.value.trim() !== "") { f.classList.remove("has-error"); input.setAttribute("aria-invalid", "false"); } });
    });
  });

  /* ---------- Contact: request type and readiness results ---------- */
  var need = document.getElementById("need");
  if (need) {
    var params = new URLSearchParams(location.search);
    var q = (params.get("interest") || location.hash.replace("#", "") || "").toLowerCase();
    if (q.indexOf("consult") > -1) need.value = "Consultation"; else if (q.indexOf("audit") > -1) need.value = "Growth audit";
    var code = params.get("scan") || store.get("i360-scan");
    var box = document.querySelector(".attached");
    var SC = { retail: "Retail and e-commerce", food: "Food and FMCG", logistics: "Logistics and distribution", services: "Professional services", industry: "Manufacturing and energy", digital: "Tech and digital" };
    var SZ = { s1: "1 to 10 people", s2: "11 to 50 people", s3: "51 to 200 people", s4: "More than 200 people" };
    var PN = { structure: "Start with Structure", tech: "Start with Tech", data: "Start with Data", visibility: "Start with Visibility", all: "Start with a full growth audit" };
    var parts = (code || "").split(".");
    if (box && parts.length === 3 && SC[parts[0]] && SZ[parts[1]] && PN[parts[2]]) {
      var vals = [SC[parts[0]], SZ[parts[1]], PN[parts[2]]];
      document.getElementById("readiness").value = vals.join("; ");
      box.querySelector(".row").innerHTML = vals.map(function (v) { return "<span>" + v + "</span>"; }).join("");
      box.classList.add("is-shown");
      box.querySelector("button").addEventListener("click", function () { document.getElementById("readiness").value = ""; box.classList.remove("is-shown"); store.set("i360-scan", ""); });
      var sizeSel = document.getElementById("size");
      if (sizeSel && !sizeSel.value) { var want = { s1: "1 to 10", s2: "11 to 50", s3: "51 to 200", s4: "More than 200" }[parts[1]]; Array.prototype.forEach.call(sizeSel.options, function (o) { if (o.text === want) sizeSel.value = o.value || o.text; }); }
      var boxes = { structure: ["c-s"], tech: ["c-t"], data: ["c-d"], visibility: ["c-v"], all: ["c-s", "c-t", "c-d", "c-v"] }[parts[2]];
      boxes.forEach(function (id) { var c = document.getElementById(id); if (c) c.checked = true; });
      if (!need.value) need.value = "Growth audit";
    }
  }
})();
