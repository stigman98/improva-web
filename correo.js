// Muestra el correo solo en el navegador, para que los robots que rastrean webs no lo recojan.
document.querySelectorAll('[data-c]').forEach(function (el) {
  var m = el.getAttribute('data-c').split('|').join('@').split('').reverse().join('');
  el.textContent = m;
  if (el.tagName === 'A') el.href = 'mailto:' + m;
});
