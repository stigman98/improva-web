/* Portada de Improva: menú, selector de negocio, antes/después, trabajos y diagnóstico. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  // menú móvil
  var hamb = $("hamb"), menu = $("menu");
  hamb.addEventListener("click", function () {
    var abierto = menu.classList.toggle("abierto");
    hamb.setAttribute("aria-expanded", String(abierto));
    hamb.textContent = abierto ? "Cerrar" : "Menú";
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a") && menu.classList.contains("abierto")) { menu.classList.remove("abierto"); hamb.setAttribute("aria-expanded", "false"); hamb.textContent = "Menú"; }
  });
  // el desplegable de servicios se cierra al hacer clic fuera
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".menu details[open]").forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute("open"); });
  });

  // selector por tipo de negocio (pestañas accesibles)
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  function elegir(t) {
    tabs.forEach(function (x) {
      var sel = x === t;
      x.setAttribute("aria-selected", String(sel));
      x.tabIndex = sel ? 0 : -1;
      $(x.getAttribute("aria-controls")).hidden = !sel;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { elegir(t); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (j === null) return;
      var n = tabs[(j + tabs.length) % tabs.length]; elegir(n); n.focus(); e.preventDefault();
    });
  });

  // antes y después
  var corte = $("corte"), comparar = $("comparar");
  function mover() { comparar.style.setProperty("--corte", corte.value + "%"); }
  corte.addEventListener("input", mover); mover();

  // trabajos: flechas
  var pista = $("pista");
  function paso() { var a = pista.querySelector(".trabajo"); return a ? a.getBoundingClientRect().width + 16 : 300; }
  $("atras").addEventListener("click", function () { pista.scrollBy({ left: -paso(), behavior: "smooth" }); });
  $("sig").addEventListener("click", function () { pista.scrollBy({ left: paso(), behavior: "smooth" }); });

  // vídeos de trabajos: se cargan y reproducen solo cuando se ven
  var vids = document.querySelectorAll("video[data-auto]");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.play().catch(function () {}); else e.target.pause(); });
    }, { threshold: .4 });
    vids.forEach(function (v) { io.observe(v); });
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { var r = document.querySelector("#reel video"); if (r) { r.removeAttribute("autoplay"); r.pause(); r.controls = true; } }

  // foto de Ricardo: se pega como una pegatina al entrar en pantalla
  var peg = document.querySelector(".foto-proc img");
  if (peg && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    peg.classList.add("espera");
    var iop = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { peg.classList.add("pegada"); peg.classList.remove("espera"); iop.disconnect(); } });
    }, { threshold: .35 });
    iop.observe(peg);
  }

  // diagnóstico
  var NEG = { comercio: "comercio", hosteleria: "negocio de hostelería", cita: "negocio de estética o salud", empresa: "empresa" };
  var REC = {
    conocer: ["Empieza por Google", "Lo primero es que te encuentren: ficha de Google completa, fotos reales y las primeras reseñas. Con eso, la gente que busca lo que haces cerca te ve a ti."],
    elegir: ["Enseña cómo trabajas", "Para que te elijan a ti, necesitan verte: vídeos y fotos de tu día a día, y reseñas contestadas. Es lo que convence antes de llamar o entrar."],
    tiempo: ["Automatiza lo que se repite", "Respuestas en WhatsApp, recordatorios de citas y reservas online. Dejas de perder clientes mientras estás atendiendo."],
    gente: ["Haz que quieran trabajar contigo", "Un vídeo de tu equipo e instalaciones y una oferta de empleo que se comparta. Los buenos profesionales eligen empresas que conocen."]
  };
  var TIE = { nada: "Como ahora no le dedicas tiempo, lo hacemos nosotros de principio a fin.", poco: "Con el tiempo que ya le dedicas, lo ordenamos para que rinda el doble.", mucho: "Le dedicas tiempo de sobra: te lo quitamos de encima para que vuelvas a lo tuyo." };
  var form = $("form-diag");
  form.addEventListener("change", function () {
    var d = new FormData(form), neg = d.get("neg"), pre = d.get("pre"), tie = d.get("tie");
    if (!neg || !pre || !tie) return;
    var r = REC[pre];
    $("res-t").textContent = r[0];
    $("res-p").textContent = r[1] + " " + TIE[tie] + " Para empezar, la Semilla Improva (290 €): vemos tu " + NEG[neg] + ", te doy un plan por escrito y hacemos la primera mejora.";
    var texto = "Hola Ricardo, he hecho el diagnóstico en improva.es. Tengo un " + NEG[neg] + ". Me preocupa: " + form.querySelector('input[name="pre"]:checked').nextElementSibling.textContent.toLowerCase() + ". Me interesa la Semilla. Mi negocio es: ";
    $("res-wa").href = "https://wa.me/34614525458?text=" + encodeURIComponent(texto);
    var res = $("resultado"), primera = res.hidden;
    res.hidden = false;
    if (primera) res.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
