// Passo 1: Inicializar o mapa em Maceió
// Coordenadas de Maceió
const maceioCoords = [-9.6658, -35.7351];
const map = L.map('map').setView(maceioCoords, 13);

// Adicionar a camada de mapa do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variáveis para armazenar a localização do usuário e o marcador
let userLocation = null;
let userMarker = null;
const form = document.getElementById('report-form');

// Passo 2: Obter a geolocalização do usuário
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                userLocation = [latitude, longitude];

                // Centraliza o mapa na localização do usuário
                map.setView(userLocation, 15);

                // Adiciona um marcador para a localização do usuário
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                userMarker = L.marker(userLocation)
                    .addTo(map)
                    .bindPopup("Sua Localização")
                    .openPopup();

                // Preenche os campos ocultos do formulário
                document.getElementById('latitude').value = latitude;
                document.getElementById('longitude').value = longitude;
            },
            (error) => {
                console.error("Erro ao obter a localização: ", error);
                alert("Não foi possível obter sua localização. Por favor, clique no mapa para marcar o local do problema.");
            }
        );
    } else {
        alert("Geolocalização não é suportada por este navegador. Por favor, clique no mapa para marcar o local do problema.");
    }
}

getUserLocation();

// Passo 3: Permitir que o usuário clique no mapa para marcar a localização
map.on('click', function(e) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    userLocation = [e.latlng.lat, e.latlng.lng];
    userMarker = L.marker(userLocation)
        .addTo(map)
        .bindPopup("Local do Problema")
        .openPopup();

    // Preenche os campos ocultos do formulário com as coordenadas do clique
    document.getElementById('latitude').value = e.latlng.lat;
    document.getElementById('longitude').value = e.latlng.lng;
});

// Passo 4: Coletar os dados do formulário e enviar
form.addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    if (!userLocation) {
        alert("Por favor, selecione a localização do problema no mapa ou ative a geolocalização.");
        return;
    }

    const problemType = document.getElementById('problem-type').value;
    const description = document.getElementById('problem-description').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;

    const data = {
        type: problemType,
        description: description,
        latitude: latitude,
        longitude: longitude,
        timestamp: new Date().toISOString()
    };

    console.log("Dados a serem enviados:", data);
    alert("Relato enviado com sucesso! (Funcionalidade de backend ainda será implementada)");

    // Aqui, no futuro, enviaremos esses dados para o nosso backend (server.py)
    // Exemplo: fetch('/api/report', { method: 'POST', body: JSON.stringify(data) });
});