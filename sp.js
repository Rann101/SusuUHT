/* SusuPasar: pustaka bersama untuk admin.html dan penjual.html (Supabase) */
(function () {
  "use strict";
  var C = window.SP_CONFIG || {}, SB = C.supabase || {};
  var KEY = String(SB.anonKey || ""), BASE = String(SB.url || "").replace(/\/$/, "");
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var clean = function (v) { return String(v == null ? "" : v).replace(/[<>"&'`\\]/g, "").trim().slice(0, 80); };
  var rp = function (n) { return "Rp" + Math.round(+n || 0).toLocaleString("id-ID"); };

  var FLV = ["Full Cream", "Low Fat High Calcium Plain", "Low Fat High Calcium Cokelat", "Cokelat", "Stroberi", "Moka", "Taro", "Karamel", "Blueberry Blast"];
  var MLS = [125, 200, 250, 750, 1000], QTY = [1, 12, 24, 40];
  var CATOPT = ["Susu dan minuman", "Camilan", "Sembako", "Bayi dan anak", "Lainnya"];
  var ul = function (ml) { return ml >= 1000 ? "1 L" : ml + " ml"; };
  var catOf = function (f) {
    return f.indexOf("Low Fat") === 0 ? "Low Fat" : ["Full Cream", "Cokelat", "Stroberi"].indexOf(f) > -1 ? f : "Rasa Lain";
  };
  var opt = function (a, f) { return a.map(function (x) { return '<option value="' + x + '">' + (f ? f(x) : x) + "</option>"; }).join(""); };

  /* ---------- sesi dan permintaan ---------- */
  var sess = null;
  try { sess = JSON.parse(sessionStorage.getItem("sp-sess") || "null"); } catch (e) {}
  function saveSess(s) {
    sess = s;
    try { if (s) sessionStorage.setItem("sp-sess", JSON.stringify(s)); else sessionStorage.removeItem("sp-sess"); } catch (e) {}
  }
  function hdr(extra) {
    var h = Object.assign({ apikey: KEY }, extra || {});
    if (sess && sess.at) h.Authorization = "Bearer " + sess.at;
    else if (KEY.indexOf("sb_") !== 0) h.Authorization = "Bearer " + KEY;
    return h;
  }
  function raw(method, path, body, extra, isBlob) {
    var h = hdr(extra);
    if (body !== undefined && !isBlob && !h["Content-Type"]) h["Content-Type"] = "application/json";
    return fetch(BASE + path, { method: method, headers: h, body: body === undefined ? undefined : (isBlob ? body : JSON.stringify(body)) });
  }
  async function refresh() {
    try {
      var r = await fetch(BASE + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: sess.rt })
      });
      var j = await r.json();
      if (!r.ok || !j.access_token) { saveSess(null); return false; }
      saveSess({ at: j.access_token, rt: j.refresh_token || sess.rt });
      return true;
    } catch (e) { return false; }
  }
  async function req(method, path, body, extra, isBlob) {
    var r = await raw(method, path, body, extra, isBlob);
    if (r.status === 401 && sess && sess.rt && (await refresh())) r = await raw(method, path, body, extra, isBlob);
    var t = await r.text(), j = null;
    try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) {
      var err = new Error((j && (j.message || j.msg || j.error_description || j.error)) || t || "HTTP " + r.status);
      err.status = r.status;
      throw err;
    }
    return j;
  }
  function me() {
    if (!sess) return null;
    try {
      var b = sess.at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      var p = JSON.parse(atob(b + "=".repeat((4 - (b.length % 4)) % 4)));
      return { id: p.sub, email: p.email || "" };
    } catch (e) { return null; }
  }
  async function signIn(email, password) {
    var r = await fetch(BASE + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password })
    });
    var j = await r.json();
    if (!r.ok || !j.access_token) throw new Error("Email atau kata sandi salah.");
    saveSess({ at: j.access_token, rt: j.refresh_token });
    return me();
  }
  async function signUp(email, password) {
    var r = await fetch(BASE + "/auth/v1/signup", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password })
    });
    var j = await r.json();
    if (!r.ok) throw new Error(j.msg || j.error_description || j.message || "Gagal mendaftar.");
    if (j.access_token) { saveSess({ at: j.access_token, rt: j.refresh_token }); return { session: true }; }
    return { session: false };
  }
  function signOut() { saveSess(null); }

  /* ---------- foto ---------- */
  function resize(file, size) {
    return new Promise(function (ok, no) {
      if (!file || !/^image\//.test(file.type)) return no(new Error("File harus berupa gambar."));
      if (file.size > 15 * 1048576) return no(new Error("Ukuran foto maksimal 15 MB."));
      var fr = new FileReader();
      fr.onerror = function () { no(new Error("Foto tidak bisa dibaca.")); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { no(new Error("Foto tidak bisa dibaca. Coba JPG atau PNG.")); };
        im.onload = function () {
          var c = document.createElement("canvas");
          c.width = c.height = size || 800;
          var q = Math.min(im.width, im.height);
          c.getContext("2d").drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, c.width, c.height);
          c.toBlob(function (b) { b ? ok(b) : no(new Error("Gagal memproses foto.")); }, "image/jpeg", 0.82);
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  async function upload(blob, prefix) {
    var path = prefix + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
    await req("POST", "/storage/v1/object/produk/" + path, blob, { "Content-Type": "image/jpeg" }, true);
    return BASE + "/storage/v1/object/public/produk/" + path;
  }
  var pickCb = null;
  function toast(m) {
    var t = $("toast");
    if (!t) return;
    t.textContent = m; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }
  function pick(cb) { pickCb = cb; var i = $("phIn"); i.value = ""; i.click(); }
  function initPicker() {
    var i = $("phIn");
    if (!i) return;
    i.addEventListener("change", async function () {
      var f = i.files[0]; i.value = "";
      if (!f || !pickCb) return;
      try { var b = await resize(f, 800); await pickCb(b); } catch (e) { toast(e.message); }
    });
  }

  /* ---------- form produk ---------- */
  var PEND = {};
  function formHtml(pre) {
    var inp = function (id, l) {
      return '<label>' + l + '<input type="text" id="' + pre + id + '" maxlength="60" style="width:100%;margin:2px 0 6px"></label>';
    };
    return '<div class="c fm" data-k="um" data-pre="' + pre + '"><b>Tambah produk</b>' +
      '<div class="a"><select id="' + pre + 'K"><option value="um">Ultra Milk</option><option value="cu">Produk lain</option></select></div>' +
      '<div class="f-um a"><select id="' + pre + 'F">' + opt(FLV) + '</select><select id="' + pre + 'M">' + opt(MLS, ul) +
      '</select><select id="' + pre + 'Q">' + opt(QTY, function (q) { return q > 1 ? "Dus isi " + q : "Satuan"; }) + '</select></div>' +
      '<div class="f-cu">' + inp("N", "Nama produk") + inp("B", "Merek") +
      '<label>Kategori <select id="' + pre + 'C">' + CATOPT.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select></label>' +
      inp("S", "Ukuran atau isi (contoh: 500 g)") + inp("D", "Deskripsi singkat") +
      '<div class="a"><label>Warna kemasan <input type="color" id="' + pre + 'Col" value="#1d4ed8"></label></div></div>' +
      '<div class="a"><button type="button" data-pick="' + pre + '">Pilih foto</button>' +
      '<img id="' + pre + 'Pv" alt="" class="th" style="display:none"><button type="button" data-rmpick="' + pre + '">Hapus foto</button></div>' +
      '<div class="a"><label>Harga <input type="number" id="' + pre + 'P" min="0" style="width:110px"></label>' +
      '<label>Stok <input type="number" id="' + pre + 'St" min="0" placeholder="bebas" style="width:84px"></label>' +
      '<button class="p" id="' + pre + 'Add" type="button">Tambah</button></div></div>';
  }
  function setPv(pre) {
    var e = $(pre + "Pv"); if (!e) return;
    if (PEND[pre]) { e.src = URL.createObjectURL(PEND[pre]); e.style.display = "block"; } else { e.removeAttribute("src"); e.style.display = "none"; }
  }
  function bindForm(root) {
    root.addEventListener("change", function (e) {
      var el = e.target, fm = el.closest && el.closest(".fm");
      if (fm && el.tagName === "SELECT" && /K$/.test(el.id)) fm.dataset.k = el.value;
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button");
      if (!b) return;
      if (b.dataset.pick) { var pre = b.dataset.pick; pick(function (blob) { PEND[pre] = blob; setPv(pre); }); }
      if (b.dataset.rmpick) { PEND[b.dataset.rmpick] = null; setPv(b.dataset.rmpick); }
    });
  }
  function readForm(pre) {
    var g = function (id) { return $(pre + id); };
    var k = g("K").value, price = +g("P").value, st = g("St").value === "" ? null : Math.max(0, Math.floor(+g("St").value));
    if (!(price >= 0) || g("P").value === "") throw new Error("Isi harga produk.");
    if (k === "um") {
      var f = g("F").value, ml = +g("M").value, q = +g("Q").value;
      return { kind: "um", name: "Ultra Milk " + f + " " + (q > 1 ? q + " \u00d7 " + ul(ml) + " (dus)" : ul(ml)), brand: "Ultra Milk",
        category: catOf(f), flavor: f, ml: ml, pack_qty: q, size_label: q > 1 ? q + " \u00d7 " + ul(ml) : ul(ml), price: price, stock: st };
    }
    var n = clean(g("N").value);
    if (!n) throw new Error("Isi nama produk.");
    return { kind: "cu", name: n, brand: clean(g("B").value) || n, category: g("C").value, flavor: "", ml: 0, pack_qty: 1,
      size_label: clean(g("S").value), description: clean(g("D").value), color: g("Col").value, price: price, stock: st };
  }
  function productRow(p, ownerLabel) {
    return '<div class="c" data-pid="' + p.id + '"><div class="r"><div style="display:flex;gap:10px;align-items:center;min-width:0">' +
      (p.image_url ? '<img class="th" src="' + esc(p.image_url) + '" alt="">' : '<span class="th ph"></span>') +
      '<div><b>' + esc(p.name) + '</b><div class="m">' + esc(ownerLabel || "") + (p.size_label ? " \u00b7 " + esc(p.size_label) : "") + '</div></div></div></div>' +
      '<div class="a"><label>Harga <input data-f="price" type="number" min="0" value="' + (+p.price || 0) + '" style="width:110px"></label>' +
      '<label>Stok <input data-f="stock" type="number" min="0" value="' + (p.stock == null ? "" : p.stock) + '" placeholder="bebas" style="width:84px"></label>' +
      '<label><input data-f="active" type="checkbox" ' + (p.active ? "checked" : "") + '> Tampil</label>' +
      '<button data-act="photo" data-id="' + p.id + '">' + (p.image_url ? "Ganti foto" : "Tambah foto") + '</button>' +
      (p.image_url ? '<button data-act="rmphoto" data-id="' + p.id + '">Hapus foto</button>' : "") +
      '<button data-act="del" data-id="' + p.id + '">Hapus</button></div></div>';
  }
  async function saveField(el) {
    var row = el.closest("[data-pid]"); if (!row) return;
    var id = row.dataset.pid, f = el.dataset.f, patch = {};
    if (f === "price") patch.price = Math.max(0, Math.floor(+el.value || 0));
    else if (f === "stock") patch.stock = el.value === "" ? null : Math.max(0, Math.floor(+el.value));
    else if (f === "active") patch.active = el.checked;
    else return;
    await req("PATCH", "/rest/v1/products?id=eq." + encodeURIComponent(id), patch, { Prefer: "return=minimal" });
    toast("Tersimpan");
    return { id: +id, patch: patch };
  }

  window.SP = {
    cfg: C, ok: !!(BASE && KEY), $: $, esc: esc, clean: clean, rp: rp, FLV: FLV, MLS: MLS, QTY: QTY, CATOPT: CATOPT, ul: ul, catOf: catOf,
    req: req, me: me, signIn: signIn, signUp: signUp, signOut: signOut, hasSession: function () { return !!sess; },
    resize: resize, upload: upload, pick: pick, initPicker: initPicker, toast: toast, PEND: PEND, setPv: setPv,
    formHtml: formHtml, bindForm: bindForm, readForm: readForm, productRow: productRow, saveField: saveField, BASE: BASE
  };
})();
