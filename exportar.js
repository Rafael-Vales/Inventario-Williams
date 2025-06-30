// exportar.js – Funciones para exportar e importar productos en Excel, PDF y JSON
// Exportar a Excel
function exportarExcel() {
  const tabla = document.querySelector("table");
  const wb = XLSX.utils.table_to_book(tabla, { sheet: "Inventario" });
  XLSX.writeFile(wb, "inventario.xlsx");
}

// Exportar tabla visible a PDF
function exportarExcelAPDF() {
  const tabla = document.querySelector(".tabla-contenedor");
  html2pdf().from(tabla).save("inventario.pdf");
}

// Exportar backup JSON
function exportarBackup() {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10); // formato YYYY-MM-DD
  const nombreArchivo = `backup-inventario-${fecha}.json`;

  firebase.database().ref("productosPorLista").once("value").then(snapshot => {
    const data = snapshot.val();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
  }).catch(error => {
    console.error("Error al exportar backup:", error);
    mostrarAviso("Error al exportar backup", "error");
  });
}

// Importar JSON desde input file
function importarJSON() {
  const archivo = document.getElementById("archivoJSON").files[0];
  if (!archivo) return mostrarAviso("No seleccionaste un archivo", "error");

  const lector = new FileReader();
  lector.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Estructura inválida");
      }
      const ref = firebaseRef("productos");
      firebaseGet(ref).then(snapshot => {
        const existentes = snapshot || {};
        const fusionados = { ...existentes, ...data };
        firebaseSet(ref, fusionados);
        mostrarAviso("Datos importados con éxito", "ok");
      }).catch(mostrarError);
    } catch (error) {
      mostrarError(error);
    }
  };
  lector.readAsText(archivo);
}

// Drag & Drop JSON
const dropArea = document.getElementById("dropArea");
if (dropArea) {
  ["dragenter", "dragover"].forEach(evento =>
    dropArea.addEventListener(evento, e => {
      e.preventDefault();
      dropArea.classList.add("dragover");
    })
  );

  ["dragleave", "drop"].forEach(evento =>
    dropArea.addEventListener(evento, e => {
      e.preventDefault();
      dropArea.classList.remove("dragover");
    })
  );

  dropArea.addEventListener("drop", e => {
    const archivo = e.dataTransfer.files[0];
    if (!archivo || !archivo.name.endsWith(".json")) {
      return mostrarAviso("El archivo debe ser .json", "error");
    }

    const lector = new FileReader();
    lector.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Estructura inválida");
        }
        const ref = firebaseRef("productos");
        firebaseGet(ref).then(snapshot => {
          const existentes = snapshot || {};
          const fusionados = { ...existentes, ...data };
          firebaseSet(ref, fusionados);
          mostrarAviso("Datos importados exitosamente", "ok");
        }).catch(mostrarError);
      } catch (err) {
        mostrarError(err);
      }
    };
    lector.readAsText(archivo);
  });
}

window.exportarExcel = exportarExcel;
window.exportarExcelAPDF = exportarExcelAPDF;
window.exportarBackup = exportarBackup;
window.importarJSON = importarJSON;