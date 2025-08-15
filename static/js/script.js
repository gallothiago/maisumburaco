// Variáveis globais
let map, geocoder, directionsService, directionsRenderer, infoWindow;
let allReports = [];
let reportMarkers = [];
let floodAlertCircles = [];
let selectedLocation = null;
const problemIconUrl = 'http://googleusercontent.com/maps/google.com/0';

// Ponto de entrada
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/config')
        .then(response => response.ok ? response.json() : Promise.reject('Falha ao buscar config.'))
        .then(config => loadGoogleMapsScript(config.googleMapsApiKey))
        .catch(error => {
            console.error(error);
            const mapDiv = document.getElementById('map');
            if (mapDiv) mapDiv.textContent = 'Erro ao carregar o mapa.';
        });
});

function loadGoogleMapsScript(apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    window.initMap = initMap;
    document.head.appendChild(script);
}

// Inicialização do mapa
function initMap() {
    const hasMap = document.getElementById('map-container');
    const hasResolvedList = document.getElementById('resolved-list-container');

    if (hasMap) {
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: -9.6658, lng: -35.7351 },
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
        });
        geocoder = new google.maps.Geocoder();
        infoWindow = new google.maps.InfoWindow();
        loadAndDisplayFloodAlerts();
    }
    if (document.getElementById('header-weather-widget')) {
        loadWeather();
    }
    if (document.getElementById('route-search-container')) {
        initRoutePage();
    }
    if (document.getElementById('report-form-container')) {
        initReportPage();
    }
    if (document.getElementById('reports-list-container')) {
        loadReports();
    }
    if (hasResolvedList) {
        loadResolvedReports();
    }
}

function initRoutePage() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    const maceioBounds = new google.maps.LatLngBounds(new google.maps.LatLng(-9.75, -35.8), new google.maps.LatLng(-9.55, -35.65));
    const options = { bounds: maceioBounds, strictBounds: false, componentRestrictions: { country: 'br' } };
    new google.maps.places.Autocomplete(document.getElementById('start-address'), options);
    new google.maps.places.Autocomplete(document.getElementById('end-address'), options);
    document.getElementById('verify-route-btn').addEventListener('click', calculateAndDisplayRoute);
    document.getElementById('clear-route-btn').addEventListener('click', clearRoute);
    loadReports();
}

function initReportPage() {
    const maceioBounds = new google.maps.LatLngBounds(new google.maps.LatLng(-9.75, -35.8), new google.maps.LatLng(-9.55, -35.65));
    const options = { bounds: maceioBounds, strictBounds: false, componentRestrictions: { country: 'br' } };
    const problemAddressAutocomplete = new google.maps.places.Autocomplete(document.getElementById('problem-address'), options);
    problemAddressAutocomplete.addListener('place_changed', () => {
        const place = problemAddressAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
            placeMarkerForReport(place.geometry.location);
            map.panTo(place.geometry.location);
            map.setZoom(17);
        }
    });
    document.getElementById('report-form').addEventListener('submit', handleReportSubmit);
    map.addListener('click', (event) => {
        document.getElementById('problem-address').value = '';
        placeMarkerForReport(event.latLng);
    });
}

async function loadWeather() {
    const widget = document.getElementById('header-weather-widget');
    try {
        const response = await fetch('/api/weather');
        if (!response.ok) {
            throw new Error("Não foi possível buscar a previsão.");
        }
        const data = await response.json();
        const currentForecast = data.forecasts[0];
        widget.innerHTML = `
            <img src="https://openweathermap.org/img/wn/${currentForecast.icon}.png" alt="${currentForecast.description}" title="${currentForecast.description}">
            <div class="header-weather-details">
                <span class="header-temp">${Math.round(currentForecast.temp)}°C</span>
                <span class="header-desc">${currentForecast.description}</span>
            </div>
        `;
    } catch (error) {
        console.error("Erro ao carregar previsão do tempo:", error);
        widget.innerHTML = `<p style="font-size:0.8rem;">Clima indisponível</p>`;
    }
}

async function loadAndDisplayFloodAlerts() {
    try {
        const response = await fetch('/api/flood-alerts');
        if (!response.ok) throw new Error('Falha ao buscar alertas de alagamento.');
        const alerts = await response.json();
        clearFloodAlerts();
        alerts.forEach(alert => {
            const alertCircle = new google.maps.Circle({
                strokeColor: '#FF0000', strokeOpacity: 0.8, strokeWeight: 2,
                fillColor: '#FF0000', fillOpacity: 0.35, map: map,
                center: { lat: alert.latitude, lng: alert.longitude }, radius: 150
            });
            const infoContent = `<div style="padding: 10px;"><h4>Alerta de Alagamento</h4><p><strong>Risco:</strong> ${alert.risk_level}</p><p><strong>Endereço do problema:</strong><br>${alert.address || 'Não informado'}</p></div>`;
            alertCircle.addListener('click', () => {
                infoWindow.setContent(infoContent);
                infoWindow.setPosition(alertCircle.getCenter());
                infoWindow.open(map);
            });
            floodAlertCircles.push(alertCircle);
        });
    } catch (error) {
        console.error("Erro ao carregar alertas de alagamento:", error);
    }
}

function clearFloodAlerts() {
    floodAlertCircles.forEach(circle => circle.setMap(null));
    floodAlertCircles = [];
}

function calculateAndDisplayRoute() {
    const start = document.getElementById('start-address').value;
    const end = document.getElementById('end-address').value;
    if (!start || !end) return alert('Por favor, preencha os endereços de partida e destino.');
    directionsService.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'BR'
    }, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            const routePolyline = new google.maps.Polyline({ path: response.routes[0].overview_path });
            filterAndDisplayReportsAlongRoute(routePolyline);
        } else { alert('Não foi possível traçar a rota: ' + status); }
    });
}

function filterAndDisplayReportsAlongRoute(routePolyline) {
    const reportsOnRoute = allReports.filter(report => {
        const reportLatLng = new google.maps.LatLng(report.latitude, report.longitude);
        return google.maps.geometry.poly.isLocationOnEdge(reportLatLng, routePolyline, 50 / 100000);
    });
    updateUIForRouteAnalysis(reportsOnRoute);
}

function updateUIForRouteAnalysis(reportsOnRoute) {
    document.getElementById('route-search-container').style.display = 'none';
    document.getElementById('route-results-container').style.display = 'block';
    document.getElementById('route-summary').textContent = `Análise da Rota: ${reportsOnRoute.length} problema(s) encontrado(s)`;
    const routeReportsList = document.getElementById('route-reports-list');
    routeReportsList.innerHTML = reportsOnRoute.length ? '' : '<p>Nenhum problema no trajeto.</p>';
    reportsOnRoute.forEach(report => addReportToList(report, routeReportsList, true));
    const onRouteIds = new Set(reportsOnRoute.map(r => r.id));
    reportMarkers.forEach(marker => {
        if (onRouteIds.has(marker.reportId)) {
            marker.setIcon(problemIconUrl);
            marker.setOpacity(1.0);
        } else {
            marker.setIcon(null);
            marker.setOpacity(0.4);
        }
    });
}

function clearRoute() {
    directionsRenderer.setDirections({ routes: [] });
    document.getElementById('start-address').value = '';
    document.getElementById('end-address').value = '';
    document.getElementById('route-search-container').style.display = 'block';
    document.getElementById('route-results-container').style.display = 'none';
    reportMarkers.forEach(marker => {
        marker.setIcon(null);
        marker.setOpacity(1.0);
    });
}

async function placeMarkerForReport(location) {
    if (selectedLocation) selectedLocation.marker.setMap(null);
    const marker = new google.maps.Marker({ position: location, map: map, animation: google.maps.Animation.DROP });
    selectedLocation = { marker, lat: location.lat(), lng: location.lng() };
    try {
        const response = await geocoder.geocode({ location });
        if (response.results[0]) {
            selectedLocation.address = response.results[0].formatted_address;
            document.getElementById('selected-address').textContent = `Endereço: ${selectedLocation.address}`;
        }
    } catch (e) { console.error('Geocoder failed: ' + e); }
}

async function handleReportSubmit(event) {
    event.preventDefault();
    if (!selectedLocation) return alert('Selecione um local no mapa ou digite um endereço válido.');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    const reportData = {
        type: document.getElementById('problem-type').value,
        description: document.getElementById('problem-description').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address || 'Endereço não disponível',
        timestamp: new Date().toISOString()
    };
    try {
        const response = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reportData) });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no envio do relato.');
        }
        alert('Relato enviado com sucesso! Você será redirecionado para a página inicial.');
        window.location.href = '/';
    } catch (error) {
        alert(error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Relato';
    }
}

async function loadReports() {
    try {
        const response = await fetch('/api/reports');
        const data = await response.json();
        allReports = data;
        clearMarkers();
        const reportsList = document.getElementById('reports-list');
        if (reportsList) {
            reportsList.innerHTML = data.length ? '' : '<p>Nenhuma ocorrência registrada.</p>';
            data.forEach(report => {
                addReportToList(report, reportsList, false);
            });
        }
        data.forEach(addReportToMap);
    } catch (error) { console.error("Erro ao carregar relatos:", error); }
}

function addReportToMap(report) {
    const marker = new google.maps.Marker({ position: { lat: report.latitude, lng: report.longitude }, map: map, title: report.type, reportId: report.id });
    const contentString = `<div><h4>${report.type}</h4><p>${report.description}</p><p><i>${report.address}</i></p><small>${new Date(report.timestamp).toLocaleString('pt-BR')}</small></div>`;
    marker.addListener('click', () => { infoWindow.setContent(contentString); infoWindow.open(map, marker); });
    reportMarkers.push(marker);
}

function addReportToList(report, listElement, isOnRoute) {
    const item = document.createElement('div');
    item.className = isOnRoute ? 'report-item report-item-on-route' : 'report-item';
    item.innerHTML = `
        <p><strong>Tipo:</strong> ${report.type}</p>
        <p><strong>Descrição:</strong> ${report.description}</p>
        <p class="address"><strong>Endereço:</strong> ${report.address || 'Não informado'}</p>
        <p><small>${new Date(report.timestamp).toLocaleString('pt-BR')}</small></p>
        <button class="resolve-button" data-id="${report.id}">Ocorrência Resolvida</button>
    `;
    item.addEventListener('click', e => {
        if (e.target.classList.contains('resolve-button')) return;
        map.panTo({ lat: report.latitude, lng: report.longitude });
        map.setZoom(17);
        const markerToOpen = reportMarkers.find(m => m.reportId === report.id);
        if (markerToOpen) {
            infoWindow.setContent(`<div><h4>${report.type}</h4><p>${report.description}</p><p><i>${report.address}</i></p></div>`);
            infoWindow.open(map, markerToOpen);
        }
    });
    item.querySelector('.resolve-button').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Mover esta ocorrência para o arquivo de resolvidos?')) return;
        await fetch(`/api/report/resolve/${report.id}`, { method: 'POST' });
        await loadReports();
        const startAddress = document.getElementById('start-address')?.value;
        const endAddress = document.getElementById('end-address')?.value;
        if (isOnRoute && startAddress && endAddress) await calculateAndDisplayRoute();
    });
    listElement.appendChild(item);
}

function clearMarkers() {
    reportMarkers.forEach(marker => marker.setMap(null));
    reportMarkers = [];
}

async function loadResolvedReports() {
    try {
        const response = await fetch('/api/reports/resolved');
        const resolvedReports = await response.json();
        const listElement = document.getElementById('resolved-list');
        listElement.innerHTML = '';
        if (resolvedReports.length === 0) {
            listElement.innerHTML = '<p>Nenhuma ocorrência resolvida encontrada.</p>';
            return;
        }
        resolvedReports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'report-item';
            const reportedDate = new Date(report.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const resolvedDate = new Date(report.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            item.innerHTML = `
                <p><strong>Tipo:</strong> ${report.type}</p>
                <p><strong>Endereço:</strong> ${report.address || 'Não informado'}</p>
                <p><strong>Descrição:</strong> ${report.description}</p>
                <p><small>Reportado em: ${reportedDate} | Resolvido em: ${resolvedDate}</small></p>
                <div class="resolved-actions">
                    <button class="undo-button" data-id="${report.id}">Desfazer</button>
                    <button class="delete-permanently-button" data-id="${report.id}">Excluir Permanentemente</button>
                </div>
            `;
            listElement.appendChild(item);
        });
        addEventListenersToResolvedButtons();
    } catch (error) {
        console.error("Erro ao carregar ocorrências resolvidas:", error);
        document.getElementById('resolved-list').innerHTML = '<p style="color:red;">Erro ao carregar ocorrências.</p>';
    }
}

function addEventListenersToResolvedButtons() {
    document.querySelectorAll('.undo-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const resolvedId = e.target.dataset.id;
            if (confirm('Restaurar esta ocorrência para a lista principal?')) {
                await fetch(`/api/report/undo/${resolvedId}`, { method: 'POST' });
                loadResolvedReports();
            }
        });
    });
    document.querySelectorAll('.delete-permanently-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const resolvedId = e.target.dataset.id;
            if (confirm('ATENÇÃO: Ação irreversível! Excluir permanentemente?')) {
                await fetch(`/api/report/resolved/${resolvedId}`, { method: 'DELETE' });
                loadResolvedReports();
            }
        });
    });
}