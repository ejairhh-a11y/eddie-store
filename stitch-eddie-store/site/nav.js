(function () {
  var ROUTES = {
    'gama-yz-motos': 'catalogo.html',
    '4-tiempos-yz450f-yz250f': 'ficha-yz450f.html',
    'simulador-financiacion': 'pago.html',
    'carrito-de-compra': 'checkout.html'
  };

  document.querySelectorAll('a[data-path]').forEach(function (a) {
    var target = ROUTES[a.getAttribute('data-path')];
    if (target) {
      a.setAttribute('href', target);
    } else {
      a.addEventListener('click', function (e) {
        e.preventDefault();
      });
    }
  });

  var logoImg = document.querySelector('img[alt="Eddie Store Logo"]');
  if (logoImg) {
    var logoWrap = logoImg.closest('div');
    if (logoWrap) {
      logoWrap.style.cursor = 'pointer';
      logoWrap.addEventListener('click', function () {
        window.location.href = 'index.html';
      });
    }
  }

  var checkoutBtn = document.getElementById('btn-continuar-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      window.location.href = 'checkout.html';
    });
  }
})();
