/* Selección de productos para la tienda online de CuidaT. Guarda en el dispositivo y envía por Netlify Forms. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  var CLAVE = "cuidat-seleccion-v1", PASO = 120;
  var datos = { productos: [], categorias: [] };
  var filtro = { q: "", cat: "", stock: false, marcados: false }, mostrados = PASO;
  var estado = leer();               // {m: {codigo: 1}, n: [{n,p,nota}], quien: ""}

  function leer() {
    try { var e = JSON.parse(localStorage.getItem(CLAVE) || "null"); if (e && e.m) return e; } catch (x) {}
    return { m: {}, n: [], quien: "", nuevo: true };
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (x) {} contar(); }
  function sinAcentos(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  fetch("../productos.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      datos = d;
      d.productos.forEach(function (p) { p._b = sinAcentos(p.n); });
      // primera vez: salen marcados los que tienen stock; ellas quitan lo que no quieran vender online
      if (estado.nuevo) { d.productos.forEach(function (p) { if (p.s > 0) estado.m[p.c] = 1; }); delete estado.nuevo; guardar(); }
      var nombres = {}; d.categorias.forEach(function (c) { nombres[c[0]] = c[1]; });
      $("chips").innerHTML = [["", "Todo"]].concat(d.categorias.filter(function (c) {
        return d.productos.some(function (p) { return p.k === c[0]; });
      })).map(function (c) {
        return '<button class="chip" data-cat="' + c[0] + '" aria-pressed="' + (c[0] === "") + '">' + esc(c[1]) + "</button>";
      }).join("");
      $("quien").value = estado.quien || "";
      pintar(); pintarNuevos(); contar();
    })
    .catch(function () { $("resumen").textContent = "No se han podido cargar los productos. Recarga la página."; });

  function lista() {
    var pal = sinAcentos(filtro.q.trim()).split(/\s+/).filter(Boolean);
    return datos.productos.filter(function (p) {
      if (filtro.cat && p.k !== filtro.cat) return false;
      if (filtro.stock && p.s < 1) return false;
      if (filtro.marcados && !estado.m[p.c]) return false;
      for (var i = 0; i < pal.length; i++) if (p._b.indexOf(pal[i]) === -1) return false;
      return true;
    });
  }

  function pintar() {
    var res = lista();
    $("lista").innerHTML = res.slice(0, mostrados).map(function (p) {
      return '<label class="sel"><input type="checkbox" data-c="' + esc(p.c) + '"' + (estado.m[p.c] ? " checked" : "") + '>' +
        '<span class="nom">' + esc(p.n) + '</span><span class="precio">' + euro.format(p.p) + "</span>" +
        '<span class="det">' + (p.s > 0 ? "Stock: " + p.s : "Sin stock ahora") + " · código " + esc(p.c) + "</span></label>";
    }).join("") || '<p class="vacio">No hay productos con estos filtros.</p>';
    $("resumen").textContent = res.length + (res.length === 1 ? " producto" : " productos") + " en esta vista";
    $("ver-mas").hidden = res.length <= mostrados;
  }

  function contar() {
    var n = Object.keys(estado.m).length + estado.n.length;
    $("cuenta").textContent = n + (n === 1 ? " elegido" : " elegidos");
    $("enviar").disabled = n === 0;
    $("enviar").textContent = n ? "Enviar a Improva (" + n + ")" : "Enviar a Improva";
  }

  var espera;
  $("q").addEventListener("input", function (e) { clearTimeout(espera); espera = setTimeout(function () { filtro.q = e.target.value; mostrados = PASO; pintar(); }, 150); });
  $("solo-stock").addEventListener("change", function (e) { filtro.stock = e.target.checked; mostrados = PASO; pintar(); });
  $("solo-marcados").addEventListener("change", function (e) { filtro.marcados = e.target.checked; mostrados = PASO; pintar(); });
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    filtro.cat = b.getAttribute("data-cat"); mostrados = PASO;
    document.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    pintar();
  });
  $("ver-mas").addEventListener("click", function () { mostrados += PASO; pintar(); });
  $("lista").addEventListener("change", function (e) {
    var c = e.target.getAttribute("data-c"); if (!c) return;
    if (e.target.checked) estado.m[c] = 1; else delete estado.m[c];
    guardar();
  });
  function enBloque(marcar) {
    var res = lista();
    if (res.length > 60 && !confirmar(marcar, res.length)) return;
    res.forEach(function (p) { if (marcar) estado.m[p.c] = 1; else delete estado.m[p.c]; });
    guardar(); pintar();
  }
  function confirmar(marcar, n) { return window.confirm((marcar ? "¿Marcar " : "¿Desmarcar ") + n + " productos?"); }
  $("marcar-vis").addEventListener("click", function () { enBloque(true); });
  $("desmarcar-vis").addEventListener("click", function () { enBloque(false); });

  // productos que faltan
  $("form-nuevo").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, n = f.n.value.trim(); if (!n) return;
    estado.n.push({ n: n, p: f.p.value.trim(), nota: f.nota.value.trim() });
    f.reset(); guardar(); pintarNuevos();
  });
  function pintarNuevos() {
    $("nuevos").innerHTML = estado.n.map(function (x, i) {
      return "<li>" + esc(x.n) + (x.p ? " · " + esc(x.p) + " €" : "") + (x.nota ? " · " + esc(x.nota) : "") + ' <button class="enlace" data-quitar="' + i + '">Quitar</button></li>';
    }).join("");
  }
  $("nuevos").addEventListener("click", function (e) {
    var i = e.target.getAttribute("data-quitar"); if (i === null) return;
    estado.n.splice(Number(i), 1); guardar(); pintarNuevos();
  });
  $("quien").addEventListener("input", function (e) { estado.quien = e.target.value; guardar(); });

  // enviar
  function aviso(t, p) { $("dlg-t").textContent = t; $("dlg-p").textContent = p; $("dialogo").hidden = false; $("dlg-ok").focus(); }
  $("dlg-ok").addEventListener("click", function () { $("dialogo").hidden = true; });
  $("enviar").addEventListener("click", function () {
    var quien = $("quien").value.trim();
    if (!quien) { $("quien").focus(); aviso("Falta vuestro nombre", "Escribidlo abajo para que sepamos quién envía la selección."); return; }
    var codigos = Object.keys(estado.m);
    var cuerpo = new URLSearchParams({
      "form-name": "seleccion-cuidat", quien: quien, total: String(codigos.length + estado.n.length),
      codigos: codigos.join(","), nuevos: JSON.stringify(estado.n)
    });
    var b = $("enviar"); b.disabled = true; b.textContent = "Enviando…";
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: cuerpo.toString() })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        aviso("¡Enviado!", "Richi ya tiene vuestra selección. Podéis seguir cambiándola y volver a enviarla cuando queráis: vale la última.");
      })
      .catch(function () { aviso("No se ha podido enviar", "Revisad la conexión e intentadlo otra vez. Lo marcado sigue guardado."); })
      .then(function () { contar(); });
  });
})();
