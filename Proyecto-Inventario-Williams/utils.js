// utils.js – Funciones utilitarias globales para avisos, errores, cálculos y formatos
// Mostrar un aviso tipo toast
function mostrarAviso(mensaje, tipo = 'info') {
  const aviso = document.createElement("div");
  aviso.className = `aviso aviso-${tipo}`;
  aviso.textContent = mensaje;
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 3000);
}

// Mostrar un error
function mostrarError(error) {
  console.error("❌ Error:", error);
  mostrarAviso("Ocurrió un error. Revisá la consola.", "error");
}

// Obtener color según el stock
function obtenerColorPorStock(stockTotal) {
  if (stockTotal <= 0) return "#ffcccc"; // rojo claro
  if (stockTotal < 10) return "#fff3cd"; // amarillo
  if (stockTotal < 50) return "#d1ecf1"; // celeste
  return "#d4edda"; // verde claro
}

// Calcular total de unidades
function calcularTotalUnidades(producto) {
  const cajas = parseInt(producto.cajas || 0);
  const unidadesPorCaja = parseInt(producto.unidadesPorCaja || 0);
  const sueltas = parseInt(producto.unidadesSueltas || 0);
  return (cajas * unidadesPorCaja) + sueltas;
}

// Formatear dinero
function formatearMoneda(valor) {
  const numero = parseFloat(valor);
  if (isNaN(numero)) return "$0.00";
  return `$${numero.toFixed(2)}`;
}

window.mostrarAviso = mostrarAviso;
window.mostrarError = mostrarError;
window.obtenerColorPorStock = obtenerColorPorStock;
window.calcularTotalUnidades = calcularTotalUnidades;
window.formatearMoneda = formatearMoneda;