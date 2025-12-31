// A Bite of Nutmeg - Town Page JavaScript
// Handles individual town pages

let restaurants = [];
let townRestaurants = [];
let map = null;
let markers = [];

// Get the town name from the script tag's data attribute
const scriptTag = document.querySelector('script[data-town]');
const townName = scriptTag ? scriptTag.getAttribute('data-town') : '';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadRestaurants();
    filterByTown();
    initMap();
    renderRestaurants();
});

// Load restaurant data from JSON file
async function loadRestaurants() {
    try {
        const response = await fetch('restaurants.json');
        restaurants = await response.json();
    } catch (error) {
        console.error('Error loading restaurants:', error);
        restaurants = [];
    }
}

// Filter restaurants by the current town
function filterByTown() {
    townRestaurants = restaurants.filter(r => r.town === townName);
}

// Initialize the Leaflet map
function initMap() {
    // Calculate center from town restaurants, or use a default
    let centerLat = 41.28;
    let centerLng = -72.62;

    if (townRestaurants.length > 0) {
        const lats = townRestaurants.map(r => r.lat);
        const lngs = townRestaurants.map(r => r.lng);
        centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    }

    map = L.map('mapContainer').setView([centerLat, centerLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add markers for town restaurants
    addMarkersToMap();
}

// Add markers to the map
function addMarkersToMap() {
    // Custom marker icon using the navy/gold colors
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: #1e3a6e;
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #f0b323;
            display: flex;
            align-items: center;
            justify-content: center;
        "><span style="
            transform: rotate(45deg);
            color: white;
            font-size: 14px;
        ">🍴</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });

    townRestaurants.forEach(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            const marker = L.marker([restaurant.lat, restaurant.lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <h4>${restaurant.name}</h4>
                        <p class="popup-cuisine">${restaurant.cuisine} • ${restaurant.price}</p>
                        <p>${restaurant.address}</p>
                    </div>
                `);

            markers.push(marker);
        }
    });

    // Fit map to show all markers if there are any
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
}

// Render restaurant cards to the grid
function renderRestaurants() {
    const grid = document.getElementById('restaurantGrid');
    const countElement = document.getElementById('resultsCount');

    countElement.textContent = townRestaurants.length;

    if (townRestaurants.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>We're still adding restaurants for ${townName}. Check back soon!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = townRestaurants.map(restaurant => `
        <article class="restaurant-card">
            <div class="card-header">
                <h3>${restaurant.name}</h3>
                <span class="cuisine">${restaurant.cuisine}</span>
            </div>
            <div class="card-body">
                <span class="town">${restaurant.town}</span>
                <p class="address">${restaurant.address}</p>
                <p class="phone">${restaurant.phone}</p>
                <span class="price">${restaurant.price}</span>
                <p class="description">${restaurant.description}</p>
            </div>
            ${restaurant.website ? `
            <div class="card-footer">
                <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer">Visit Website</a>
            </div>
            ` : ''}
        </article>
    `).join('');
}
