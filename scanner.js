// scanner.js – Lógica del escáner de códigos de barras con Html5Qrcode
let html5QrCode;
let camaraActiva = false;

// Exponer funciones necesarias en window
window.iniciarScanner = iniciarScanner;
window.cerrarScanner = cerrarScanner;

// Iniciar el escáner
function iniciarScanner() {
  const scannerContainer = document.getElementById("scannerContainer");
  const qrReader = document.getElementById("qr-reader");

  if (camaraActiva) return;

  scannerContainer.style.display = "flex";
  // Mostrar instrucciones visuales y una guía de escaneo
  const instrucciones = document.createElement("p");
  instrucciones.textContent = "📷 Apuntá con la cámara al código de barras hasta que se lea automáticamente.";
  instrucciones.style.color = "white";
  instrucciones.style.marginTop = "12px";
  document.getElementById("scannerContainer").appendChild(instrucciones);

  html5QrCode = new Html5Qrcode("qr-reader");

  Html5Qrcode.getCameras()
    .then((cameras) => {
      if (cameras && cameras.length) {
        // Crear el select y botón de inicio
        const selectCam = document.createElement("select");
        selectCam.id = "selectorCamara";
        cameras.forEach((cam, index) => {
          const option = document.createElement("option");
          option.value = cam.id;
          option.textContent = cam.label || `Cámara ${index + 1}`;
          selectCam.appendChild(option);
        });

        const btnIniciar = document.createElement("button");
        btnIniciar.textContent = "Iniciar escaneo";
        btnIniciar.onclick = () => {
          const camaraElegida = selectCam.value;
          // Configuración de cámara trasera con enfoque y otros parámetros
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            videoConstraints: {
              facingMode: { exact: "environment" }
            }
          };
          html5QrCode.start(
            { deviceId: camaraElegida },
            config,
            (codigo) => {
              procesarCodigo(codigo);
              cerrarScanner();
            },
            (error) => {
              console.warn("Error escaneando:", error);
            }
          );
          camaraActiva = true;
          selectCam.remove();
          btnIniciar.remove();
        };

        // Insertar select y botón debajo de #qr-reader
        qrReader.parentElement.appendChild(selectCam);
        qrReader.parentElement.appendChild(btnIniciar);

        // Aplicar estilos al select de cámaras
        selectCam.style.padding = "8px 12px";
        selectCam.style.marginTop = "16px";
        selectCam.style.borderRadius = "8px";
        selectCam.style.border = "1px solid #ccc";
        selectCam.style.backgroundColor = "#fff";
        selectCam.style.fontSize = "16px";
        selectCam.style.color = "#333";
        selectCam.style.width = "100%";
        selectCam.style.maxWidth = "300px";

        // Aplicar estilos al botón iniciar
        btnIniciar.style.marginTop = "12px";
        btnIniciar.style.padding = "10px 20px";
        btnIniciar.style.borderRadius = "8px";
        btnIniciar.style.border = "none";
        btnIniciar.style.backgroundColor = "#c94f7c";
        btnIniciar.style.color = "#fff";
        btnIniciar.style.fontSize = "16px";
        btnIniciar.style.cursor = "pointer";
        btnIniciar.style.transition = "background-color 0.3s ease";

        btnIniciar.onmouseover = () => btnIniciar.style.backgroundColor = "#a03a60";
        btnIniciar.onmouseout = () => btnIniciar.style.backgroundColor = "#c94f7c";
      } else {
        mostrarAviso("No se detectó cámara.");
      }
    })
    .catch((err) => {
      mostrarError(err);
    });
}

// Cerrar escáner
function cerrarScanner() {
  const scannerContainer = document.getElementById("scannerContainer");
  scannerContainer.style.display = "none";
  if (html5QrCode && camaraActiva) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      camaraActiva = false;
    }).catch((err) => {
      console.warn("Error cerrando escáner:", err);
    });
  }
}

// Procesar código de barras escaneado
function procesarCodigo(codigo) {
  const productosRef = firebaseRef("productosPorLista/general");

  productosRef.once("value", (snapshot) => {
    const productos = snapshot.val() || {};
    const encontrado = Object.values(productos).find(p => p.codigoBarras === codigo);

    if (encontrado) {
      mostrarProductoEscaneado(encontrado);
    } else {
      mostrarPopupAsociarCodigo(codigo);
    }
  });
}

// Mostrar tarjeta del producto escaneado
function mostrarProductoEscaneado(producto) {
  const contenedor = document.getElementById("productoEscaneado");
  contenedor.innerHTML = `
    <h3>${producto.producto}</h3>
    <p><strong>Código:</strong> ${producto.codigoBarras}</p>
    <p><strong>Categoría:</strong> ${producto.categoria}</p>
    <p><strong>Stock:</strong> ${calcularTotalUnidades(producto)} unidades</p>
    <p><strong>Precio:</strong> ${formatearMoneda(producto.precioPorUnidad)}</p>
    <div class="acciones">
      <button onclick="editarProductoDesdeEscaneado('${producto.codigoBarras}')">Editar</button>
      <button onclick="cerrarTarjetaEscaneado()">Cerrar</button>
    </div>
  `;
  contenedor.style.display = "block";
}

// Cerrar tarjeta de producto escaneado
function cerrarTarjetaEscaneado() {
  document.getElementById("productoEscaneado").style.display = "none";
}

// Cargar producto al formulario desde el escáner
function editarProductoDesdeEscaneado(codigo) {
  const productosRef = firebaseRef("productosPorLista/general");

  productosRef.once("value", (snapshot) => {
    const productos = snapshot.val() || {};
    const producto = Object.values(productos).find(p => p.codigoBarras === codigo);

    if (producto) {
      cargarFormularioEdicion(producto);
      cerrarTarjetaEscaneado();
      mostrarFormulario();
    }
  });
}

// Mostrar popup para asociar código escaneado a producto existente
function mostrarPopupAsociarCodigo(codigo) {
  const popup = document.getElementById("popupAsociarCodigo");
  const texto = document.getElementById("codigoEscaneadoTexto");
  const select = document.getElementById("selectProductoExistente");

  if (!popup || !texto || !select) return;

  texto.textContent = `Código escaneado: ${codigo}`;
  popup.dataset.codigo = codigo;

  // Limpiar select
  select.innerHTML = "";

  // Cargar opciones de productos ordenadas alfabéticamente
  if (window.productos && Array.isArray(window.productos)) {
    const productosOrdenados = [...window.productos].sort((a, b) => {
      return (a.producto || "").localeCompare(b.producto || "");
    });

    productosOrdenados.forEach(p => {
      const option = document.createElement("option");
      option.value = p.idUnico;
      option.textContent = p.producto;
      select.appendChild(option);
    });

    // Hacer el select editable con datalist
    const datalistId = "datalistProductosAsociar";
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      productosOrdenados.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.producto;
        datalist.appendChild(opt);
      });
      document.body.appendChild(datalist);
    }

    // Reemplazar select por input con datalist
    const nuevoInput = document.createElement("input");
    nuevoInput.type = "text";
    nuevoInput.id = "inputProductoAsociar";
    nuevoInput.setAttribute("list", datalistId);
    nuevoInput.style.width = "100%";
    nuevoInput.style.marginTop = "10px";

    // Insertar input editable y eliminar el select
    select.parentNode.replaceChild(nuevoInput, select);
    nuevoInput.dataset.codigo = popup.dataset.codigo;
    popup.dataset.inputAsociar = "true";

    // Asignar comportamiento de selección con coincidencia exacta
    nuevoInput.addEventListener("change", () => {
      const seleccionado = window.productos.find(p => p.producto === nuevoInput.value);
      if (seleccionado) {
        nuevoInput.dataset.idUnico = seleccionado.idUnico;
      } else {
        nuevoInput.dataset.idUnico = "";
      }
    });
  }

  popup.style.display = "block";

  // Agregar botón de crear producto nuevo
  const crearBtn = document.createElement("button");
  crearBtn.textContent = "Crear nuevo producto";
  crearBtn.style.marginTop = "10px";
  crearBtn.onclick = () => {
    cerrarPopupAsociar();
    abrirPopupAgregar();
    const inputCodigo = document.querySelector("#popupAgregar input#codigoBarras");
    if (inputCodigo) inputCodigo.value = codigo;
  };
  // Asegurar que el botón no se duplique si la función se llama varias veces
  const popupDiv = popup.querySelector("div");
  if (popupDiv && !popupDiv.querySelector("button[data-crear-nuevo]")) {
    crearBtn.setAttribute("data-crear-nuevo", "true");
    popupDiv.appendChild(crearBtn);
  }
}
// Confirmar asociación del código escaneado con un producto existente
function confirmarAsociacionCodigo() {
  const popup = document.getElementById("popupAsociarCodigo");
  // Usar el nuevo input en vez del select
  const input = document.getElementById("inputProductoAsociar");
  const codigo = popup.dataset.codigo;

  const productoId = input?.dataset.idUnico;
  if (!productoId || !codigo) return mostrarAviso("Seleccioná un producto válido", "error");

  const ref = firebaseRef(`productosPorLista/general`);

  firebaseGet(ref).then((snapshot) => {
    const productos = snapshot.val() || [];
    // Buscar el producto por idUnico
    const producto = Object.values(productos).find(p => p && p.idUnico === productoId);
    if (!producto) {
      return mostrarAviso("Producto no encontrado", "error");
    }
    producto.codigoBarras = codigo;

    // Guardar el producto actualizado en el array sobrescribiendo su posición
    firebaseGet(firebaseRef("productosPorLista/general")).then(snapshot => {
      const data = snapshot.val() || [];
      const index = data.findIndex(p => p && p.idUnico === producto.idUnico);
      if (index !== -1) {
        data[index] = producto;
        firebaseSet(firebaseRef("productosPorLista/general"), data)
          .then(() => {
            mostrarAviso("Código vinculado correctamente", "ok");
            cerrarPopupAsociar();
          })
          .catch((err) => {
            console.error("Error al vincular código:", err);
            mostrarAviso("No se pudo vincular el código", "error");
          });
      } else {
        mostrarAviso("No se pudo encontrar el producto en base de datos", "error");
      }
    });
  });
}

// Cerrar el popup de asociación
function cerrarPopupAsociar() {
  const popup = document.getElementById("popupAsociarCodigo");
  if (popup) popup.style.display = "none";
}

// Exponer función al global
window.confirmarAsociacionCodigo = confirmarAsociacionCodigo;
window.cerrarPopupAsociar = cerrarPopupAsociar;
// --- Captura automática de lector de código de barras (input por teclado) ---
let bufferCodigo = "";
let temporizadorLectura = null;

document.addEventListener("keydown", function (e) {
  // Ignorar si está enfocado un input o textarea
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
    return;
  }

  // Ignorar teclas especiales salvo Enter
  if (e.key.length > 1 && e.key !== "Enter") return;

  if (temporizadorLectura) {
    clearTimeout(temporizadorLectura);
  }

  if (e.key === "Enter") {
    if (bufferCodigo.length > 4) {
      procesarCodigoDesdeTeclado(bufferCodigo.trim());
    }
    bufferCodigo = "";
    return;
  }

  bufferCodigo += e.key;

  temporizadorLectura = setTimeout(() => {
    bufferCodigo = "";
  }, 100);
});

function procesarCodigoDesdeTeclado(codigo) {
  const productosRef = firebaseRef("productosPorLista/general");

  productosRef.once("value", (snapshot) => {
    const productos = snapshot.val() || {};
    const encontrado = Object.values(productos).find(p => p.codigoBarras === codigo);

    if (encontrado) {
      mostrarProductoEscaneado(encontrado);
    } else {
      mostrarPopupAsociarCodigo(codigo);
    }
  });
}