const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación
const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
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

let puntos = []; // array de [lat, lng]
let vertices = []; // marcadores visibles de cada vértice
let poligono = null;
const lineaGuia = L.polyline([], { color: '#e67e22', dashArray: '6 6' }).addTo(mapa);

mapa.on('click', (e) => {
    if (poligono) return; // si ya está cerrado, no se agregan más puntos
    const { lat, lng } = e.latlng;
    puntos.push([lat, lng]);
    const v = L.circleMarker([lat, lng], { radius: 6, color: '#e67e22', fillOpacity: 1}).addTo(mapa);
    vertices.push(v);
    lineaGuia.setLatLngs(puntos);
    actualizarBotones();
    actualizarTabla();
    mostrarInfo(`${puntos.length} vértice(s). Necesitas al menos 3 para cerrar.`);
});

function actualizarBotones() {
    document.getElementById('btnCerrar').disabled = puntos.length < 3 || poligono !== null;
    document.getElementById('btnDeshacer').disabled = puntos.length === 0 || poligono !== null;
    document.getElementById('btnExportar').disabled = poligono === null;
}

function actualizarTabla() {
    const tbody = document.querySelector('#tablaVertices tbody');
    tbody.innerHTML = '';
    puntos.forEach(([lat, lng], i) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `<td>${i + 1}</td><td>${lat.toFixed(6)}</td><td>${lng.toFixed(6)}</td>`;
        tbody.appendChild(fila);
    });
}

function aGeoJSON() {
    const anillo = puntos.map(([lat, lng]) => [lng, lat]);
    anillo.push(anillo[0]); // cerrar el anillo
    return turf.polygon([anillo], { nombre: 'Mi polígono', creado: new Date().toISOString() });
}

function medir() {
    const geo = aGeoJSON();
    const area = turf.area(geo); // metros cuadrados
    const perimetro = turf.length(turf.polygonToLine(geo), { units: 'meters' });
    return { area, perimetro };
}

function verificarUbicacionEnPoligono() {
    if (!marcadorUsuario) {
        mostrarInfo("Primero debes obtener tu ubicación.");
        return;
    }
    const posicion = marcadorUsuario.getLatLng();
    const puntoUsuario = turf.point([posicion.lng, posicion.lat]);
    const geo = aGeoJSON();
    const dentro = turf.booleanPointInPolygon(puntoUsuario, geo);

    if (dentro) {
        mostrarInfo("¡Estás DENTRO del polígono!");
    } else {
        mostrarInfo("Estás FUERA del polígono.");
    }

    marcadorUsuario.setPopupContent(
        dentro ? "Estás dentro del polígono" : "Estás fuera del polígono"
    ).openPopup();
}

function cerrarPoligono() {
    poligono = L.polygon(puntos, { color: document.getElementById('colorPoligono').value, fillOpacity: 0.35 }).addTo(mapa);
    lineaGuia.setLatLngs([]);
    mapa.fitBounds(poligono.getBounds());
    const { area, perimetro } = medir();
    poligono.bindPopup(`Área: ${area.toFixed(1)} m²<br>Perímetro: ${perimetro.toFixed(1)} m`).openPopup();

    actualizarBotones();
    verificarUbicacionEnPoligono();
}

document.getElementById('btnCerrar').addEventListener('click', cerrarPoligono);

function deshacerPunto() {
    puntos.pop();
    mapa.removeLayer(vertices.pop());
    lineaGuia.setLatLngs(puntos);
    actualizarBotones();
    actualizarTabla();
    mostrarInfo(`${puntos.length} vértice(s).`);
}

function limpiar() {
    puntos = [];
    vertices.forEach((v) => mapa.removeLayer(v));
    vertices = [];
    lineaGuia.setLatLngs([]);
    if (poligono) {
        mapa.removeLayer(poligono);
        poligono = null;
    }
    actualizarBotones();
    actualizarTabla();
    mostrarInfo('Mapa limpio. Haz clic para empezar de nuevo.');
}

document.getElementById('btnDeshacer').addEventListener('click', deshacerPunto);
document.getElementById('btnLimpiar').addEventListener('click', limpiar);

function exportar() {
    const texto = JSON.stringify(aGeoJSON(), null, 2);
    const blob = new Blob([texto], { type: 'application/geo+json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'poligono.geojson';
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

document.getElementById('btnExportar').addEventListener('click', exportar);

document.getElementById('colorPoligono').addEventListener('input', (e) => {
    if (poligono) {
        poligono.setStyle({ color: e.target.value });
    }
});