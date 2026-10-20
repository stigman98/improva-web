/* Tienda CuidaT · catálogo, cesta y pago. Sin dependencias. */
(function () {
  "use strict";

  // ---- Ajustes de la tienda (los decide CuidaT) ----
  var AJUSTES = {
    demo: true,                // true = no se cobra (versión de prueba)
    whatsapp: "34604815133",
    envio: 4.95,               // € por pedido a península (EJEMPLO, pendiente de decidir)
    gratisDesde: 50,           // € a partir de los que el envío es gratis (EJEMPLO)
    porPagina: 48,
    maxUnidades: 20
  };

  var ICONOS = {
    plantas: '<path d="M12 21V11"/><path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7Z"/><path d="M12 14c0-3-2.5-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5Z"/>',
    complementos: '<rect x="4" y="9" width="16" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M9.6 7.8l4.8 8.4"/>',
    cosmetica: '<path d="M8 9h8v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9Z"/><path d="M10 9V6h4v3"/><path d="M11 3h2v3h-2z"/>',
    alimentacion: '<path d="M12 21V8"/><path d="M12 12c-2-1-3-3-3-5 2 0 3 1.5 3 3"/><path d="M12 12c2-1 3-3 3-5-2 0-3 1.5-3 3"/><path d="M12 16c-2-1-3-3-3-5 2 0 3 1.5 3 3"/><path d="M12 16c2-1 3-3 3-5-2 0-3 1.5-3 3"/>',
    aromas: '<path d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10Z"/>',
    bach: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c-1.2-3 0-5.3 0-5.3s1.2 2.3 0 5.3M14.2 12c3-1.2 5.3 0 5.3 0s-2.3 1.2-5.3 0M12 14.2c1.2 3 0 5.3 0 5.3s-1.2-2.3 0-5.3M9.8 12c-3 1.2-5.3 0-5.3 0s2.3-1.2 5.3 0"/>',
    otros: '<path d="M5 9l7-5 7 5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9Z"/><path d="M9 20v-6h6v6"/>'
  };

  var $ = function (id) { return document.getElementById(id); };
  var euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  var datos = { productos: [], categorias: [] }, porCodigo = {};
  var filtro = { q: "", cat: "", solo: true }, mostrados = AJUSTES.porPagina;
  var cesta = leerCesta();

  function quitarAcentos(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function leerCesta() {
    try { var c = JSON.parse(localStorage.getItem("cuidat-cesta") || "{}"); return c && typeof c === "object" ? c : {}; }
    catch (e) { return {}; }
  }
  function guardarCesta() { try { localStorage.setItem("cuidat-cesta", JSON.stringify(cesta)); } catch (e) {} }

  // ---- Carga ----
  fetch("productos.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      datos = d;
      d.productos.forEach(function (p) { p._b = quitarAcentos(p.n); porCodigo[p.c] = p; });
      // la cesta guardada solo conserva lo que sigue existiendo y con stock
      Object.keys(cesta).forEach(function (c) {
        var p = porCodigo[c];
        if (!p || p.s < 1) delete cesta[c]; else cesta[c] = Math.min(cesta[c], p.s, AJUSTES.maxUnidades);
      });
      guardarCesta();
      pintarChips(); pintar(); pintarCesta();
      $("actualizado").textContent = "Precios y disponibilidad actualizados el " + d.actualizado.split(" ")[0].split("-").reverse().join("/") + ".";
    })
    .catch(function () { $("resumen").textContent = "No hemos podido cargar los productos. Prueba a recargar la página o escríbenos por WhatsApp."; });

  if (AJUSTES.demo) $("aviso-demo").hidden = false;
  $("v-envio").textContent = "Envío a península · gratis desde " + euro.format(AJUSTES.gratisDesde).replace(",00", "");
  $("txt-envio").textContent = euro.format(AJUSTES.envio) + " · gratis desde " + euro.format(AJUSTES.gratisDesde).replace(",00", "");

  // ---- Catálogo ----
  function pintarChips() {
    var cont = $("chips"), cats = [["", "Todo"]].concat(datos.categorias.filter(function (c) {
      return datos.productos.some(function (p) { return p.k === c[0]; });
    }));
    cont.innerHTML = cats.map(function (c) {
      return '<button class="chip" data-cat="' + c[0] + '" aria-pressed="' + (filtro.cat === c[0]) + '">' + esc(c[1]) + "</button>";
    }).join("");
  }

  function lista() {
    var palabras = quitarAcentos(filtro.q.trim()).split(/\s+/).filter(Boolean);
    return datos.productos.filter(function (p) {
      if (filtro.cat && p.k !== filtro.cat) return false;
      if (filtro.solo && p.s < 1) return false;
      for (var i = 0; i < palabras.length; i++) if (p._b.indexOf(palabras[i]) === -1) return false;
      return true;
    });
  }

  function tarjeta(p) {
    var letra = esc(p.n.charAt(0).toUpperCase());
    var hay = p.s > 0, enCesta = cesta[p.c] || 0;
    var estado = !hay ? '<span class="estado agotado">Agotado</span>' : (p.s <= 2 ? '<span class="estado">Últimas unidades</span>' : "");
    var boton = hay
      ? '<button class="anadir' + (enCesta ? " hecho" : "") + '" data-add="' + esc(p.c) + '">' + (enCesta ? "En la cesta (" + enCesta + ")" : "Añadir") + "</button>"
      : '<a class="preguntar" target="_blank" rel="noopener" href="https://wa.me/' + AJUSTES.whatsapp + "?text=" + encodeURIComponent("Hola, ¿os llegará pronto «" + p.n + "»?") + '">Avísame</a>';
    return '<article class="prod"><div class="tile k-' + p.k + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS[p.k] || ICONOS.otros) + '</svg><span class="letra" aria-hidden="true">' + letra + "</span></div>" +
      "<h3>" + esc(p.n) + "</h3>" + estado +
      '<div class="pie"><span class="precio">' + euro.format(p.p) + "</span>" + boton + "</div></article>";
  }

  function pintar() {
    var res = lista(), vis = res.slice(0, mostrados);
    $("rejilla").innerHTML = vis.length ? vis.map(tarjeta).join("") : "";
    $("resumen").textContent = res.length
      ? res.length + (res.length === 1 ? " producto" : " productos") + (filtro.solo ? " disponibles" : "")
      : "";
    if (!res.length) $("rejilla").innerHTML = '<p class="vacio">No encontramos nada con esa búsqueda. ¿Nos preguntas por <a target="_blank" rel="noopener" href="https://wa.me/' + AJUSTES.whatsapp + '">WhatsApp</a>? Si no lo tenemos, lo pedimos.</p>';
    $("ver-mas").hidden = res.length <= mostrados;
  }

  var espera;
  $("q").addEventListener("input", function (e) {
    clearTimeout(espera);
    espera = setTimeout(function () { filtro.q = e.target.value; mostrados = AJUSTES.porPagina; pintar(); }, 150);
  });
  $("solo").addEventListener("change", function (e) { filtro.solo = e.target.checked; mostrados = AJUSTES.porPagina; pintar(); });
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    filtro.cat = b.getAttribute("data-cat"); mostrados = AJUSTES.porPagina;
    pintarChips(); pintar();
  });
  $("ver-mas").addEventListener("click", function () { mostrados += AJUSTES.porPagina; pintar(); });
  $("rejilla").addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]"); if (!b) return;
    var c = b.getAttribute("data-add"), p = porCodigo[c]; if (!p) return;
    cesta[c] = Math.min((cesta[c] || 0) + 1, p.s, AJUSTES.maxUnidades);
    guardarCesta(); pintarCesta(); pintar();
  });

  // ---- Cesta ----
  function totales() {
    var sub = 0, uds = 0;
    Object.keys(cesta).forEach(function (c) { var p = porCodigo[c]; if (p) { sub += p.p * cesta[c]; uds += cesta[c]; } });
    var aCasa = document.querySelector('input[name="modo"]:checked').value === "envio";
    var env = !aCasa || sub === 0 || sub >= AJUSTES.gratisDesde ? 0 : AJUSTES.envio;
    return { sub: sub, env: env, tot: sub + env, uds: uds, aCasa: aCasa };
  }

  function pintarCesta() {
    var t = totales(), codigos = Object.keys(cesta);
    $("cesta-num").textContent = t.uds;
    $("cesta-btn").hidden = t.uds === 0;
    $("lineas").innerHTML = codigos.length ? codigos.map(function (c) {
      var p = porCodigo[c]; if (!p) return "";
      return '<div class="linea"><span class="nom">' + esc(p.n) + '</span><span class="imp">' + euro.format(p.p * cesta[c]) + "</span>" +
        '<div class="cant"><button data-menos="' + esc(c) + '" aria-label="Quitar una unidad">−</button><span>' + cesta[c] + '</span><button data-mas="' + esc(c) + '" aria-label="Añadir una unidad"' + (cesta[c] >= Math.min(p.s, AJUSTES.maxUnidades) ? " disabled" : "") + ">+</button></div>" +
        '<button class="quitar" data-quitar="' + esc(c) + '">Quitar</button></div>';
    }).join("") : '<p class="vacio">Tu cesta está vacía.</p>';
    $("t-sub").textContent = euro.format(t.sub);
    $("t-env").textContent = t.aCasa ? (t.env ? euro.format(t.env) : "Gratis") : "Recogida en tienda";
    $("t-tot").textContent = euro.format(t.tot);
    var falta = AJUSTES.gratisDesde - t.sub;
    $("nota-envio").textContent = t.aCasa && t.sub > 0 && falta > 0 ? "Te faltan " + euro.format(falta) + " para el envío gratis." : "";
    var ok = t.uds > 0 && $("acepto").checked;
    $("pagar").disabled = !ok;
    $("whatsapp").hidden = t.aCasa;
    $("whatsapp").disabled = !ok;
  }

  function abrir() { $("panel").hidden = false; $("velo").hidden = false; $("cerrar").focus(); }
  function cerrar() { $("panel").hidden = true; $("velo").hidden = true; $("cesta-btn").focus(); }
  $("cesta-btn").addEventListener("click", abrir);
  $("cerrar").addEventListener("click", cerrar);
  $("velo").addEventListener("click", cerrar);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("panel").hidden) cerrar(); });
  $("acepto").addEventListener("change", pintarCesta);
  document.querySelectorAll('input[name="modo"]').forEach(function (r) { r.addEventListener("change", pintarCesta); });
  $("lineas").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var c = b.getAttribute("data-menos") || b.getAttribute("data-mas") || b.getAttribute("data-quitar"), p = porCodigo[c];
    if (!p) return;
    if (b.hasAttribute("data-mas")) cesta[c] = Math.min(cesta[c] + 1, p.s, AJUSTES.maxUnidades);
    if (b.hasAttribute("data-menos")) cesta[c] = cesta[c] - 1;
    if (b.hasAttribute("data-quitar") || cesta[c] < 1) delete cesta[c];
    guardarCesta(); pintarCesta(); pintar();
  });

  // ---- Pagar ----
  function aviso(titulo, texto) {
    $("dlg-t").textContent = titulo; $("dlg-p").textContent = texto;
    $("dialogo").hidden = false; $("dlg-ok").focus();
  }
  $("dlg-ok").addEventListener("click", function () { $("dialogo").hidden = true; });

  $("pagar").addEventListener("click", function () {
    var t = totales();
    if (AJUSTES.demo) {
      aviso("Aquí se paga", "En la tienda real, este botón abre el pago seguro con tarjeta de Stripe por " + euro.format(t.tot) + ". En esta versión de prueba no se cobra nada.");
      return;
    }
    var boton = $("pagar"); boton.disabled = true; boton.textContent = "Abriendo el pago seguro…";
    fetch("/.netlify/functions/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineas: Object.keys(cesta).map(function (c) { return { c: c, q: cesta[c] }; }), modo: t.aCasa ? "envio" : "tienda" })
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "error"); return j; }); })
      .then(function (j) { window.location.href = j.url; })
      .catch(function (e) {
        boton.disabled = false; boton.textContent = "Pagar con tarjeta";
        aviso("No se ha podido abrir el pago", (e.message && e.message !== "error" ? e.message + " " : "") + "Inténtalo de nuevo o escríbenos por WhatsApp.");
      });
  });

  $("whatsapp").addEventListener("click", function () {
    var t = totales(), texto = "Hola, quiero reservar para recoger en la tienda:\n";
    Object.keys(cesta).forEach(function (c) { var p = porCodigo[c]; if (p) texto += "• " + cesta[c] + " × " + p.n + " (" + p.c + ")\n"; });
    texto += "Total: " + euro.format(t.tot) + "\nMi nombre es: ";
    window.open("https://wa.me/" + AJUSTES.whatsapp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  });
})();
