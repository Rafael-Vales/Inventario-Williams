let productos = [];
let productoEditando = null;
let filtros = {
  categoria: "Todas",
  texto: "",
  color: "",
  tildado: false,
};
window.productos = productos;

document.addEventListener("DOMContentLoaded", () => {
  // Bloque temporal de depuración: mostrar toda la raíz de Firebase
  firebaseOnValue(firebaseRef("/"), (snapshot) => {
    console.log("🌐 Toda la raíz de Firebase:", snapshot.val());
  });
  const loader = document.getElementById("loader");
  const contenido = document.getElementById("contenido");
  const form = document.getElementById("formProducto");

  // Cargar productos desde Firebase
  firebaseOnValue(firebaseRef("productosPorLista/general"), (snapshot) => {
    console.log("Cargando productos...", snapshot.val());
    const data = snapshot.val();
    productos = [];
    for (let key in data) {
      if (data[key]) {
        productos.push(data[key]);
      }
    }
    window.productos = productos;
    sincronizarSeleccionadosDesdeLocalStorage();
    renderizarProductos();
    loader.style.display = "none";
    contenido.style.display = "block";
  });

  // Guardar producto
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarProducto();
  });

  // Botón para deseleccionar todos los productos seleccionados
  const btnDeseleccionar = document.getElementById("btnDeseleccionar");
  if (btnDeseleccionar) {
    btnDeseleccionar.addEventListener("click", () => {
      // No modificar p.seleccionado, solo limpiar localStorage
      localStorage.setItem("productosSeleccionados", "{}");
      renderizarProductos();
    });
  }

  // Manejar formulario del popup agregar producto (Firebase)
  const popupForm = document.querySelector("#popupAgregar form");
  if (popupForm) {
    popupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarProductoDesdePopup();
    });
  }

  // Botón de escaneo
  document.getElementById("btnEscanear").addEventListener("click", () => {
    console.log("📷 Botón escanear presionado");
    iniciarScanner();
  });

  // Botón escanear en popup agregar
  const btnEscanearPopup = document.getElementById("btnEscanearPopup");
  if (btnEscanearPopup) {
    btnEscanearPopup.addEventListener("click", () => {
      console.log("📷 Escanear desde popup");
      iniciarScanner(); // Usa la misma función ya existente
    });
  }

  // Botón cerrar scanner
  document.getElementById("cerrarScannerBtn").addEventListener("click", cerrarScanner);

  // Filtros (ajustados para integración con .filtros-contenedor)
  const filtroCategoriaInput = document.getElementById("filtroCategoriaInput");
  const listaCategoriasFiltro = document.getElementById("listaCategoriasFiltro");
  const filtroTexto = document.getElementById("buscador");
  const filtroColor = document.getElementById("filtroColor");
  const filtroTildado = document.getElementById("filtroSeleccionados");
  // Restaurar filtro de categoría guardado en localStorage si existe
  const categoriaGuardada = localStorage.getItem("filtroCategoriaSeleccionada");
  if (categoriaGuardada && filtroCategoriaInput) {
    filtroCategoriaInput.value = categoriaGuardada;
    filtros.categoria = categoriaGuardada;
  }
  // Rellenar filtroCategoriaInput automáticamente desde Firebase igual que categoriaProducto
  if (filtroCategoriaInput && listaCategoriasFiltro) {
    firebaseOnValue(firebaseRef("productosPorLista/categorias"), (snapshot) => {
      const data = snapshot.val();
      listaCategoriasFiltro.innerHTML = '<option value="">Todas</option>';
      if (data) {
        const ordenadas = Object.values(data).sort((a, b) => a.localeCompare(b));
        ordenadas.forEach(categoria => {
          const option = document.createElement("option");
          option.value = categoria;
          listaCategoriasFiltro.appendChild(option);
        });
      }
    });
    filtroCategoriaInput.addEventListener("input", e => {
      const valor = e.target.value.trim();
      filtros.categoria = valor;
      localStorage.setItem("filtroCategoriaSeleccionada", valor);
      renderizarProductos();
    });
  }
  if (filtroTexto) {
    filtroTexto.addEventListener("input", e => {
      filtros.texto = e.target.value;
      renderizarProductos();
    });
  }
  if (filtroColor) {
    filtroColor.addEventListener("change", e => {
      filtros.color = e.target.value;
      renderizarProductos();
    });
  }
  if (filtroTildado) {
    filtroTildado.addEventListener("change", e => {
      filtros.tildado = e.target.checked;
      renderizarProductos();
    });
  }

  // Selector de temas
  document.querySelectorAll(".tema-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tema = btn.dataset.tema;
      aplicarTema(tema);
      localStorage.setItem("temaSeleccionado", tema);
    });
  });

  function aplicarTema(tema) {
    document.body.className = "";
    document.body.classList.add(`tema-${tema}`);
    document.querySelectorAll(".tema-btn").forEach(btn =>
      btn.classList.toggle("selected", btn.dataset.tema === tema)
    );
  }

  const temaGuardado = localStorage.getItem("temaSeleccionado");
  if (temaGuardado) aplicarTema(temaGuardado);

  // Cargar categorías en todos los elementos con id="categoriaProducto" y también en datalist#listaCategoriasFormulario
  const selectCategoriasTodos = document.querySelectorAll("#categoriaProducto");
  const datalistFormulario = document.getElementById("listaCategoriasFormulario");
  if (selectCategoriasTodos.length > 0) {
    firebaseOnValue(firebaseRef("productosPorLista/categorias"), (snapshot) => {
      const data = snapshot.val();
      console.log("🔥 Categorías desde Firebase:", data);
      // Limpiar el datalist antes de agregar nuevas opciones
      if (datalistFormulario) {
        datalistFormulario.innerHTML = "";
      }
      selectCategoriasTodos.forEach(select => {
        // Solo modificar si es un <select>
        if (select.tagName === "SELECT") {
          select.innerHTML = '<option value="">Seleccionar categoría</option>';
        }
        if (data) {
          const ordenadas = Object.values(data).sort((a, b) => a.localeCompare(b));
          ordenadas.forEach(categoria => {
            if (select.tagName === "SELECT") {
              const option = document.createElement("option");
              option.value = categoria;
              option.textContent = categoria;
              select.appendChild(option);
            }
            if (datalistFormulario) {
              const option = document.createElement("option");
              option.value = categoria;
              datalistFormulario.appendChild(option);
            }
          });
        }
      });
    });
  }

  const inputNuevaCategoria = document.getElementById("nuevaCategoria");
  const btnAgregarCategoria = document.getElementById("btnAgregarCategoria");
  const btnEliminarCategoria = document.getElementById("btnEliminarCategoria");

  if (inputNuevaCategoria && btnAgregarCategoria) {
    btnAgregarCategoria.addEventListener("click", () => {
      const nueva = inputNuevaCategoria.value.trim();
      if (!nueva) return mostrarAviso("Escribí una categoría válida", "error");

      firebaseOnValue(firebaseRef("productosPorLista/categorias"), (snapshot) => {
        const categorias = snapshot.val() || [];
        if (categorias.includes(nueva)) {
          mostrarAviso("La categoría ya existe", "info");
          return;
        }

        categorias.push(nueva);
        firebaseSet(firebaseRef("productosPorLista/categorias"), categorias)
          .then(() => {
            inputNuevaCategoria.value = "";
            mostrarAviso("Categoría agregada correctamente", "ok");
          })
          .catch((error) => {
            console.error("Error al agregar categoría:", error);
            mostrarAviso("No se pudo agregar la categoría", "error");
          });
      }, { onlyOnce: true });
    });
  }

  if (btnEliminarCategoria) {
    btnEliminarCategoria.addEventListener("click", () => {
      const eliminar = inputNuevaCategoria.value.trim();
      if (!eliminar) return mostrarAviso("Escribí una categoría para eliminar", "error");

      firebaseOnValue(firebaseRef("productosPorLista/categorias"), (snapshot) => {
        const categorias = snapshot.val() || [];
        const index = categorias.indexOf(eliminar);
        if (index === -1) {
          mostrarAviso("La categoría no existe", "info");
          return;
        }

        categorias.splice(index, 1);
        firebaseSet(firebaseRef("productosPorLista/categorias"), categorias)
          .then(() => {
            inputNuevaCategoria.value = "";
            mostrarAviso("Categoría eliminada correctamente", "ok");
          })
          .catch((error) => {
            console.error("Error al eliminar categoría:", error);
            mostrarAviso("No se pudo eliminar la categoría", "error");
          });
      }, { onlyOnce: true });
    });
  }

  // Manejar apertura y cierre del popup de agregar (botón superior y modal)
  const popupAgregar = document.getElementById("popupAgregar");
  const overlay = document.getElementById("overlayAgregar");
  const btnAbrirPopup = document.getElementById("btnAbrirPopup");
  const btnCerrarPopup = document.getElementById("btnCerrarPopup");

  // Verificar existencia de elementos requeridos
  if (!btnAbrirPopup) {
    console.warn("No se encontró el botón con ID btnAbrirPopup en el HTML.");
  }
  if (!popupAgregar) {
    console.warn("No se encontró el elemento con ID popupAgregar en el HTML.");
  }
  if (!overlay) {
    console.warn("No se encontró el elemento con ID overlayAgregar en el HTML.");
  }
  if (!btnCerrarPopup) {
    console.warn("No se encontró el botón con ID btnCerrarPopup en el HTML.");
  }

  // Asignar evento al botón de abrir popup solo si existe
  if (btnAbrirPopup) {
    btnAbrirPopup.addEventListener("click", abrirPopupAgregar);
  }

  if (btnAbrirPopup && popupAgregar && overlay && btnCerrarPopup) {
    btnCerrarPopup.addEventListener("click", () => {
      popupAgregar.style.display = "none";
      overlay.style.display = "none";
    });

    overlay.addEventListener("click", () => {
      popupAgregar.style.display = "none";
      overlay.style.display = "none";
    });
  }
});

// Eliminada definición duplicada de renderizarProductos (tablaProductos) para evitar conflictos.

// Reemplazo completo de la función crearFilaProducto para asegurar alineación de columnas con el thead,
// y para que el valor tildado/seleccionado provenga solo de localStorage.
function crearFilaProducto(p) {
  const fila = document.createElement("tr");

  // Obtener seleccionados desde localStorage
  const seleccionados = JSON.parse(localStorage.getItem("productosSeleccionados") || "{}");
  // Use id fallback logic
  const id = p.codigoBarras || p.producto || Date.now().toString();
  const estaSeleccionado = !!seleccionados[id];

  const totalUnidades = calcularTotalUnidades(p);
  const precioUnidad = parseFloat(p.precioUnidad || 0);
  const precioCosto = parseFloat(p.precioCosto || 0);
  const gananciaUnidad = precioUnidad - precioCosto;
  const porcentajeGanancia = precioCosto > 0 ? Math.round((gananciaUnidad / precioCosto) * 100) : 0;
  const valorTotal = totalUnidades * precioUnidad;
  const valorCostoTotal = totalUnidades * precioCosto;
  const gananciaTotal = valorTotal - valorCostoTotal;
  const colorStock = obtenerColorPorStock(totalUnidades, p.color);
  const fechaMod = p.ultimaModificacion
    ? new Date(p.ultimaModificacion).toLocaleDateString("es-AR") + " " +
      new Date(p.ultimaModificacion).toLocaleTimeString("es-AR", { hour12: false })
    : "-";

  // Crear el checkbox de forma segura y asociar el evento según instrucciones
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "producto-check";
  checkbox.dataset.id = id;
  checkbox.checked = !!estaSeleccionado;
  checkbox.addEventListener("change", () => {
    actualizarSeleccionado(id, checkbox.checked);
    console.log("Checkbox change:", id, checkbox.checked);
  });
  const tdCheck = document.createElement("td");
  tdCheck.className = "show-mobile";
  tdCheck.appendChild(checkbox);

  // Resto de columnas (sin el checkbox)
  const columnas = [
    // Checkbox eliminado del array de columnas para evitar duplicado
    `<td class="show-mobile">${p.producto || ""}</td>`,
    `<td class="show-mobile">${p.unidadesPorCaja || 0}</td>`,
    `<td class="show-mobile">${p.cantidadCajas || 0}</td>`,
    `<td class="show-mobile">${p.unidadesSueltas || 0}</td>`,
    `<td class="show-mobile" style="background: ${colorStock}; font-weight: bold;">${totalUnidades}</td>`,
    `<td>${formatearMoneda(precioCosto)}</td>`,
    `<td class="show-mobile">${formatearMoneda(precioUnidad)}</td>`,
    `<td><div style="font-size: 0.8em; color: #888;">${porcentajeGanancia}%</div><div>${formatearMoneda(gananciaUnidad)}</div></td>`,
    `<td>${formatearMoneda(valorTotal)}</td>`,
    `<td>${formatearMoneda(valorCostoTotal)}</td>`,
    `<td>${formatearMoneda(gananciaTotal)}</td>`,
    `<td>${p.categoria || "-"}</td>`,
    `<td>${fechaMod}</td>`,
    `<td><button onclick="editarProductoDesdeTabla('${p.codigoBarras}')">✏️</button><button onclick="eliminarProducto('${p.codigoBarras}')">🗑️</button></td>`
  ];

  // Ensamblar la fila: primero el checkbox, luego el resto de columnas
  fila.appendChild(tdCheck);
  columnas.forEach(html => {
    const td = document.createElement("td");
    td.innerHTML = html.replace(/^<td[^>]*>|<\/td>$/g, ""); // solo el contenido
    // Copiar clases de la columna original si existieran
    const matchClass = html.match(/<td\s+([^>]*)>/);
    if (matchClass && matchClass[1]) {
      // Buscar class="..."
      const classMatch = matchClass[1].match(/class="([^"]*)"/);
      if (classMatch) td.className = classMatch[1];
      // Buscar style="..."
      const styleMatch = matchClass[1].match(/style="([^"]*)"/);
      if (styleMatch) td.setAttribute("style", styleMatch[1]);
    }
    fila.appendChild(td);
  });
  // Colorear la fila si el producto no se modificó en más de una semana (usando objetos Date)
  const ahora = new Date();
  const ultimaMod = p.ultimaModificacion ? new Date(p.ultimaModificacion) : null;
  const diferencia = ultimaMod ? (ahora - ultimaMod) : 0;
  const unaSemana = 7 * 24 * 60 * 60 * 1000;
  if (diferencia > unaSemana) {
    fila.style.backgroundColor = "#ffd1d1"; // rojo suave
  }
  return fila;
}


function obtenerColorPorStock(stock, customColor) {
  if (customColor) return customColor;
  if (stock >= 0 && stock <= 8) return 'var(--color-red)';
  if (stock >= 9 && stock <= 25) return 'var(--color-yellow)';
  return 'var(--color-green)';
}

function crearTarjetaProducto(p) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "producto-card";

  const header = document.createElement("div");
  header.className = "card-header";
  header.innerHTML = `<strong>${p.producto}</strong> <span>⬇️</span>`;

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <div>Total: ${calcularTotalUnidades(p)} unidades</div>
    <div>Precio: ${formatearMoneda(p.precioUnidad)}</div>
    <div>Unidades por caja: ${p.unidadesPorCaja || 0}</div>
    <div>Cajas: ${p.cantidadCajas || 0}</div>
    <div>Unidades sueltas: ${p.unidadesSueltas || 0}</div>
    <div>Precio costo: ${formatearMoneda(p.precioCosto)}</div>
    <div>Categoría: ${p.categoria || "-"}</div>
    <div class="acciones">
      <button onclick="editarProductoDesdeTabla('${p.codigoBarras}')">✏️ Editar</button>
      <button onclick="eliminarProducto('${p.codigoBarras}')">🗑️ Borrar</button>
    </div>
  `;

  header.addEventListener("click", () => {
    tarjeta.classList.toggle("expanded");
    const icono = header.querySelector("span");
    icono.textContent = tarjeta.classList.contains("expanded") ? "⬆️" : "⬇️";
  });

  tarjeta.appendChild(header);
  tarjeta.appendChild(body);

  return tarjeta;
}

function guardarProducto() {
  const esEdicion = productoEditando && productoEditando.codigoBarras;
  let codigoFinal = esEdicion
    ? productoEditando.codigoBarras
    : document.getElementById("codigoBarras").value.trim();

  if (!codigoFinal) {
    codigoFinal = Date.now().toString();
  }

  const producto = {
    codigoBarras: codigoFinal,
    producto: document.getElementById("producto").value.trim(),
    unidadesPorCaja: parseInt(document.getElementById("unidadesPorCaja").value) || 0,
    cantidadCajas: parseInt(document.getElementById("cajas").value) || 0,
    unidadesSueltas: parseInt(document.getElementById("unidadesSueltas").value) || 0,
    precioUnidad: parseFloat(document.getElementById("precioPorUnidad").value) || 0,
    precioCosto: parseFloat(document.getElementById("precioCosto").value) || 0,
    categoria: document.getElementById("categoriaProducto").value,
    ultimaModificacion: Date.now()
  };

  if (!producto.producto) {
    return mostrarAviso("Faltan datos obligatorios", "error");
  }

  const ref = firebaseRef(`productosPorLista/general/${codigoFinal}`);
  firebaseSet(ref, producto)
    .then(() => {
      mostrarAviso("Producto guardado correctamente", "ok");
      limpiarFormulario();
      productoEditando = null;
      mostrarSugerenciasInteligentes(); // Agregado
    })
    .catch((error) => {
      console.error("Error al guardar el producto:", error);
      mostrarAviso("Error al guardar el producto", "error");
    });
}

function editarProductoDesdeTabla(codigo) {
  const producto = productos.find(p => p.codigoBarras === codigo);
  if (!producto) return;

  productoEditando = producto;

  document.getElementById("codigoBarras").value = producto.codigoBarras;
  document.getElementById("producto").value = producto.producto;
  document.getElementById("unidadesPorCaja").value = producto.unidadesPorCaja;
  document.getElementById("cajas").value = producto.cantidadCajas;
  document.getElementById("unidadesSueltas").value = producto.unidadesSueltas;
  document.getElementById("precioPorUnidad").value = producto.precioUnidad;
  document.getElementById("precioCosto").value = producto.precioCosto;
  document.getElementById("categoriaProducto").value = producto.categoria;

  abrirPopupAgregar();
}

function eliminarProducto(codigo) {
  const confirmar = confirm("¿Estás seguro de eliminar este producto?");
  if (!confirmar) return;

  const ref = firebaseRef(`productosPorLista/general/${codigo}`);
  firebaseRemove(ref)
    .then(() => mostrarAviso("Producto eliminado", "ok"))
    .catch(mostrarError);
}

function limpiarFormulario() {
  document.getElementById("formProducto").reset();
  productoEditando = null;
}

function mostrarFormulario() {
  const form = document.getElementById("formProducto");
  form.scrollIntoView({ behavior: "smooth" });
}

function calcularTotalUnidades(producto) {
  return (producto.unidadesPorCaja || 0) * (producto.cantidadCajas || 0) + (producto.unidadesSueltas || 0);
}

function formatearMoneda(valor) {
  const numero = parseFloat(valor);
  if (isNaN(numero)) return "$0";
  return `$${numero.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Cargar formulario desde escaneo
function cargarFormularioEdicion(producto) {
  document.getElementById("codigoBarras").value = producto.codigoBarras;
  document.getElementById("producto").value = producto.producto;
  document.getElementById("unidadesPorCaja").value = producto.unidadesPorCaja;
  document.getElementById("cajas").value = producto.cantidadCajas;
  document.getElementById("unidadesSueltas").value = producto.unidadesSueltas;
  document.getElementById("precioPorUnidad").value = producto.precioUnidad;
  document.getElementById("precioCosto").value = producto.precioCosto;
  document.getElementById("categoriaProducto").value = producto.categoria;
}

function actualizarResumenInventario(lista) {
  let totalUnidades = 0;
  let valorTotal = 0;
  let valorCostoTotal = 0;
  let gananciaTotal = 0;

  // Ya se reciben los productos filtrados como parámetro (lista), no es necesario volver a filtrar.
  lista.forEach(p => {
    const total = calcularTotalUnidades(p);
    const valorUnitario = parseFloat(p.precioUnidad || 0);
    const costoUnitario = parseFloat(p.precioCosto || 0);
    totalUnidades += total;
    valorTotal += total * valorUnitario;
    valorCostoTotal += total * costoUnitario;
    gananciaTotal += total * (valorUnitario - costoUnitario);
  });

  const resumen = document.getElementById("resumenInventario");
  if (!resumen) {
    console.warn("Elemento #resumenInventario no encontrado.");
    return;
  }
  resumen.style.display = "block";
  resumen.innerHTML = `
    <strong>Productos:</strong> ${lista.length} &nbsp;|&nbsp;
    <strong>Unidades:</strong> ${totalUnidades} &nbsp;|&nbsp;
    <strong>Valor total:</strong> ${formatearMoneda(valorTotal)} &nbsp;|&nbsp;
    <strong>Costo total:</strong> ${formatearMoneda(valorCostoTotal)} &nbsp;|&nbsp;
    <strong>Ganancia:</strong> ${formatearMoneda(gananciaTotal)}
  `;
}

function renderizarProductos() {
  const contenedorTabla = document.getElementById("tablaProductos");
  if (!contenedorTabla) {
    console.warn("Contenedor de tabla no encontrado en el DOM.");
    return;
  }
  // Verificación de que el contenedor es un tbody
  if (contenedorTabla.tagName !== "TBODY") {
    console.warn("El contenedorTabla no es un tbody. Verifica el HTML.");
  }
  contenedorTabla.innerHTML = "";

  // Leer seleccionados SOLO de localStorage
  const seleccionados = JSON.parse(localStorage.getItem("productosSeleccionados") || "{}");

  const filtrados = productos
    .filter(p => p && typeof p.producto === "string")
    .filter(p => {
      const coincideCategoria =
        !filtros.categoria ||
        filtros.categoria === "Todas" ||
        p.categoria === filtros.categoria;
      const coincideTexto = p.producto.toLowerCase().includes(filtros.texto.toLowerCase());
      const coincideColor =
        !filtros.color ||
        obtenerColorPorStock(calcularTotalUnidades(p), p.color).includes(filtros.color);
      // Usar id consistente para filtro de tildados
      const id = p.codigoBarras || p.producto;
      const coincideTildado = !filtros.tildado || seleccionados[id];
      return coincideCategoria && coincideTexto && coincideColor && coincideTildado;
    });

  filtrados.sort((a, b) => a.producto.localeCompare(b.producto));

  filtrados.forEach(producto => {
    const fila = crearFilaProducto(producto);
    contenedorTabla.appendChild(fila);
    // El listener de cambio ahora se maneja con el atributo onchange en el HTML del checkbox
  });

  // Renderizar tarjetas móviles
  const contenedorTarjetas = document.getElementById("tarjetasProductos");
  if (contenedorTarjetas) {
    contenedorTarjetas.innerHTML = "";
    filtrados.forEach(producto => {
      const tarjeta = crearTarjetaProducto(producto);
      contenedorTarjetas.appendChild(tarjeta);
    });
  }

  actualizarResumenInventario(filtrados);
  // Actualizar resumen de productos visibles
  const resumenProductosVisibles = document.getElementById("resumenProductosVisibles");
  if (resumenProductosVisibles) {
    resumenProductosVisibles.textContent = `🧾 Mostrando: ${filtrados.length} productos`;
  }
}


// Definición de la función abrirPopupAgregar
function abrirPopupAgregar() {
  const popupAgregar = document.getElementById("popupAgregar");
  const overlay = document.getElementById("overlayAgregar");
  if (popupAgregar && overlay) {
    popupAgregar.style.display = "block";
    popupAgregar.style.opacity = "1";
    popupAgregar.style.transform = "translate(-50%, -50%) scale(1)";
    overlay.style.display = "block";
    overlay.style.opacity = "1";
    // Set popup title for "Agregar Producto" if not editing
    const tituloPopup = document.getElementById("popupTitulo");
    if (tituloPopup && !productoEditando) {
      tituloPopup.textContent = "Agregar Producto";
      tituloPopup.style.color = "";
    }
  }
}

// Guardar producto desde el formulario del popup
function guardarProductoDesdePopup() {
  const popupForm = document.querySelector("#popupAgregar form");
  const codigoBarras = popupForm.querySelector("#codigoBarras").value.trim() || Date.now().toString();
  const producto = {
    codigoBarras,
    producto: popupForm.querySelector("#producto").value.trim(),
    unidadesPorCaja: parseInt(popupForm.querySelector("#unidadesPorCaja").value) || 0,
    cantidadCajas: parseInt(popupForm.querySelector("#cajas").value) || 0,
    unidadesSueltas: parseInt(popupForm.querySelector("#unidadesSueltas").value) || 0,
    precioUnidad: parseFloat(popupForm.querySelector("#precioPorUnidad").value) || 0,
    precioCosto: parseFloat(popupForm.querySelector("#precioCosto").value) || 0,
    categoria: popupForm.querySelector("#categoriaProducto").value,
    ultimaModificacion: Date.now()
  };

  if (!producto.producto) {
    mostrarAviso("Faltan datos obligatorios", "error");
    return;
  }

  const ref = firebaseRef(`productosPorLista/general/${codigoBarras}`);
  firebaseSet(ref, producto)
    .then(() => {
      mostrarAviso("Producto guardado correctamente", "ok");
      popupForm.reset();
      cerrarPopupAgregar();
      mostrarSugerenciasInteligentes(); // Agregado
    })
    .catch((error) => {
      console.error("Error al guardar desde popup:", error);
      mostrarAviso("Error al guardar el producto", "error");
    });
}

// Función para actualizar el seleccionado y sincronizar con localStorage
function actualizarSeleccionado(codigoBarras, estado) {
  // No modificar el objeto producto directamente
  const seleccionados = JSON.parse(localStorage.getItem("productosSeleccionados") || "{}");
  if (estado) {
    seleccionados[codigoBarras] = true;
  } else {
    delete seleccionados[codigoBarras];
  }
  localStorage.setItem("productosSeleccionados", JSON.stringify(seleccionados));
  // No renderizar de nuevo la tabla completa
}

// Sincroniza los seleccionados desde localStorage al array productos
// Ya no es necesario modificar p.seleccionado, pero se deja la función vacía para compatibilidad.
function sincronizarSeleccionadosDesdeLocalStorage() {
  // Ahora el filtrado y los checks dependen solo de localStorage, no de la propiedad p.seleccionado.
}
  // Mostrar panel de sugerencias al hacer clic
  const btnSugerencias = document.getElementById("btnSugerencias");
  const panelSugerencias = document.getElementById("panelSugerencias");
  const listaSugerencias = document.getElementById("listaSugerencias");

  if (btnSugerencias && panelSugerencias) {
    btnSugerencias.addEventListener("click", () => {
      panelSugerencias.style.display = panelSugerencias.style.display === "none" ? "block" : "none";
    });
  }

  // Función para mostrar sugerencias inteligentes
  function mostrarSugerenciasInteligentes() {
    if (!listaSugerencias) return;

    listaSugerencias.innerHTML = ""; // Limpiar lista

    const sugerencias = [];

    const productosAntiguos = productos.filter(p => {
      const mod = p.ultimaModificacion ? new Date(p.ultimaModificacion) : null;
      if (!mod) return false;
      const ahora = new Date();
      return (ahora - mod) > (7 * 24 * 60 * 60 * 1000); // más de 7 días
    });

    if (productosAntiguos.length > 0) {
      const li = document.createElement("li");
      li.innerHTML = `🕒 Tenés ${productosAntiguos.length} productos sin modificar en más de una semana.`;
      const lista = document.createElement("ul");
      lista.style.marginTop = "6px";
      productosAntiguos.forEach(p => {
        const item = document.createElement("li");
        // Fallback id for edit button
        const id = p.codigoBarras || p.producto.replace(/\s+/g, '_');
        item.innerHTML = `<strong>${p.producto}</strong> <button onclick="abrirPopupEdicion('${id}')">✏️</button>`;
        item.style.marginBottom = "4px";
        lista.appendChild(item);
      });
      li.appendChild(lista);
      listaSugerencias.appendChild(li);
    }

    const sinCodigo = productos.filter(p => !p.codigoBarras || p.codigoBarras === "");
    if (sinCodigo.length > 0) {
      const li = document.createElement("li");
      li.innerHTML = `🔍 Hay ${sinCodigo.length} productos sin código de barras asignado.`;
      const lista = document.createElement("ul");
      lista.style.marginTop = "6px";
      sinCodigo.forEach(p => {
        const item = document.createElement("li");
        // Fallback id for edit button
        const id = p.codigoBarras || p.producto.replace(/\s+/g, '_');
        item.innerHTML = `<strong>${p.producto}</strong> <button onclick="abrirPopupEdicion('${id}')">✏️</button> <button onclick="agregarCodigoBarras('${id}')">📎 Agregar código</button>`;
        item.style.marginBottom = "4px";
        lista.appendChild(item);
      });
      li.appendChild(lista);
      listaSugerencias.appendChild(li);
    }

    if (productosAntiguos.length === 0 && sinCodigo.length === 0) {
      const li = document.createElement("li");
      li.textContent = "✅ Todo parece estar en orden.";
      listaSugerencias.appendChild(li);
    }
  }

  // Ejecutar una vez cargado todo
  setTimeout(() => {
    mostrarSugerenciasInteligentes();
  }, 1000);

// Nueva función: abrirPopupEdicion
function abrirPopupEdicion(codigo) {
  // Use fallback id for search
  const producto = productos.find(p => (p.codigoBarras || p.producto.replace(/\s+/g, '_')) === codigo);
  if (!producto) return;

  // Cambiar el título del popup y color antes de abrir
  const tituloPopup = document.getElementById("popupTitulo");
  if (tituloPopup) {
    tituloPopup.innerHTML = ` <span style="color: #c94f7c;">${producto.producto}</span>`;
    tituloPopup.style.color = "";
  }

  const popupForm = document.querySelector("#popupAgregar form");
  if (!popupForm) return;

  productoEditando = producto;

  popupForm.querySelector("#codigoBarras").value = producto.codigoBarras;
  popupForm.querySelector("#producto").value = producto.producto;
  popupForm.querySelector("#unidadesPorCaja").value = producto.unidadesPorCaja;
  popupForm.querySelector("#cajas").value = producto.cantidadCajas;
  popupForm.querySelector("#unidadesSueltas").value = producto.unidadesSueltas;
  popupForm.querySelector("#precioPorUnidad").value = producto.precioUnidad;
  popupForm.querySelector("#precioCosto").value = producto.precioCosto;
  popupForm.querySelector("#categoriaProducto").value = producto.categoria;

  abrirPopupAgregar();
}

// Nueva función: agregarCodigoBarras
function agregarCodigoBarras(id) {
  const producto = productos.find(p => (p.codigoBarras || p.producto.replace(/\s+/g, '_')) === id);
  if (!producto) return;

  const nuevoCodigo = prompt("Ingresá el nuevo código de barras:");
  if (!nuevoCodigo || !/^\d+$/.test(nuevoCodigo)) {
    mostrarAviso("Código inválido. Ingresá solo números.", "error");
    return;
  }

  // Validar si el código ya está en uso por otro producto
  const codigoExistente = productos.find(p => p.codigoBarras === nuevoCodigo);
  if (codigoExistente) {
    mostrarAviso("Ese código ya está en uso por otro producto", "error");
    return;
  }

  producto.codigoBarras = nuevoCodigo;
  const ref = firebaseRef(`productosPorLista/general/${nuevoCodigo}`);
  firebaseSet(ref, producto)
    .then(() => {
      mostrarAviso("Código de barras agregado correctamente", "ok");
      mostrarSugerenciasInteligentes();
    })
    .catch((error) => {
      console.error("Error al guardar nuevo código:", error);
      mostrarAviso("Error al guardar el código", "error");
    });
}