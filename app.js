const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación
const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

let marcadorUsuario = null;
let circuloPrecision = null;
function mostrarInfo(texto) {
    document.getElementById('info').textContent = texto;
}
function ubicarUsuario() {
    if (!('geolocation' in navigator)) {
        mostrarInfo('Tu navegador no soporta geolocalización.');
        return;
    }
    mostrarInfo('Buscando tu ubicación...');
    navigator.geolocation.getCurrentPosition(
    (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const punto = [latitude, longitude];
        if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
        if (circuloPrecision) mapa.removeLayer(circuloPrecision);
        marcadorUsuario = L.marker(punto).addTo(mapa).bindPopup('Estás aquí').openPopup();
        circuloPrecision = L.circle(punto, { radius: accuracy, fillOpacity: 0.1}).addTo(mapa);
        mapa.setView(punto, 17);
        mostrarInfo(`Ubicación encontrada (precisión: ${Math.round(accuracy)} m). Haz clic para dibujar.`);
    },
    (err) => {
        const mensajes = {
            1: 'Permiso denegado. Activa la ubicación en el navegador.',
            2: 'No se pudo determinar la ubicación.',
            3: 'Se agotó el tiempo de espera.'
        };
        mostrarInfo(mensajes[err.code] || 'Error desconocido.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}
document.getElementById('btnUbicar').addEventListener('click', ubicarUsuario);
ubicarUsuario();