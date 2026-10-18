const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación
const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
 maxZoom: 19,
 attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);
