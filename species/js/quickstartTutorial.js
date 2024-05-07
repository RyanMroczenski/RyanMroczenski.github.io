/* Example from Leaflet Quick Start Guide*/

function quickstart(){
var map = L.map('map').setView([51.505, -0.09], 13);

//add tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//add a marker to the map 
var marker = L.marker([51.5, -0.09]).addTo(map);

//add circle to the map with specific properties 
var circle = L.circle([51.508, -0.11], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,    radius: 500
}).addTo(map);

//add polygon to the map with specific properties 
var polygon = L.polygon([
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]).addTo(map);

//bing a popup to the marker 
marker.bindPopup("<strong>Hello world!</strong><br />I am a popup.").openPopup();
//bind a popup to the circle 
circle.bindPopup("I am a circle.");
//bind a popup to the polygon
polygon.bindPopup("I am a polygon.");

//create a standalone popup
var popup = L.popup()
    .setLatLng([51.5, -0.09])
    .setContent("I am a standalone popup.")
    .openOn(map);

var popup = L.popup();

//define function to handle map clicks and display popup
function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

map.on('click', onMapClick);
}
window.onload = quickstart;
