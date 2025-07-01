// Configuración de Firebase para compatibilidad directa con el navegador
const firebaseConfig = {
  apiKey: "AIzaSyBtVMi942be7lIaVB0BnOohYsSEKf4Z9e8",
  authDomain: "inventario-williams.firebaseapp.com",
  databaseURL: "https://inventario-williams-default-rtdb.firebaseio.com",
  projectId: "inventario-williams",
  storageBucket: "inventario-williams.firebasestorage.app",
  messagingSenderId: "427187921441",
  appId: "1:427187921441:web:44e6279a675cd748e33960"
};

// Inicializar Firebase usando compat
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
window.firebaseDB = db;
window.firebaseRef = (path) => db.ref(path);
window.firebaseSet = (ref, value) => ref.set(value);
window.firebaseOnValue = (ref, callback) => ref.on("value", (snapshot) => callback(snapshot));
window.firebaseUpdate = (ref, value) => ref.update(value);
window.firebaseRemove = (ref) => ref.remove();
// Lectura puntual (no suscripción)
window.firebaseGet = (ref) => ref.get();