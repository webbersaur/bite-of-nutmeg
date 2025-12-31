// A Bite of Nutmeg - CT Shoreline Dining Guide
// Main Application JavaScript

let restaurants = [];
let map = null;
let markers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadRestaurants();
    initMap();
    renderRestaurants(restaurants);
});

// Load featured restaurant data from JSON file
async function loadRestaurants() {
    try {
        const response = await fetch('featured-restaurants.json');
        const data = await response.json();
        restaurants = data.featured || [];
    } catch (error) {
        console.error('Error loading restaurants:', error);
        restaurants = [];
    }
}

// Initialize the Leaflet map
function initMap() {
    // Center on the CT shoreline (roughly Guilford area)
    const centerLat = 41.28;
    const centerLng = -72.62;

    map = L.map('mapContainer').setView([centerLat, centerLng], 11);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add markers for all restaurants
    addMarkersToMap(restaurants);
}

// Add markers to the map
function addMarkersToMap(restaurantList) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

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

    restaurantList.forEach(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            const marker = L.marker([restaurant.lat, restaurant.lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <h4>${restaurant.name}</h4>
                        <p class="popup-cuisine">${restaurant.category}</p>
                        <p>${restaurant.town}</p>
                        <p>${restaurant.address}</p>
                        ${restaurant.website ? `<a href="${restaurant.website}" target="_blank" rel="noopener noreferrer" style="color: #2EA3F2; text-decoration: none;">Visit Website →</a>` : ''}
                    </div>
                `);

            markers.push(marker);
        }
    });

    // Fit map to show all markers if there are any
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Render restaurant cards to the grid
function renderRestaurants(restaurantList) {
    const grid = document.getElementById('restaurantGrid');
    const countElement = document.getElementById('resultsCount');

    countElement.textContent = restaurantList.length;

    if (restaurantList.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>Check back soon for featured restaurants.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = restaurantList.map(restaurant => `
        <article class="restaurant-card">
            ${restaurant.image ? `
            <div class="card-logo${restaurant.darkBg ? ' dark-bg' : ''}">
                <img src="${restaurant.image}" alt="${restaurant.name} logo">
            </div>
            ` : ''}
            <div class="card-header">
                <h3>${restaurant.name}</h3>
                <span class="cuisine">${restaurant.category}</span>
            </div>
            <div class="card-body">
                <span class="town">${restaurant.town}</span>
                <p class="address">${restaurant.address}</p>
                <p class="phone">${restaurant.phone}</p>
            </div>
            ${restaurant.website ? `
            <div class="card-footer">
                <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer">Visit Website</a>
            </div>
            ` : ''}
        </article>
    `).join('');
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Hero search functionality
function initHeroSearch() {
    const searchInput = document.getElementById('heroSearch');
    const searchBtn = document.getElementById('heroSearchBtn');

    if (!searchInput || !searchBtn) return;

    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            renderRestaurants(restaurants);
            addMarkersToMap(restaurants);
            return;
        }

        const filtered = restaurants.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.category.toLowerCase().includes(query) ||
            r.town.toLowerCase().includes(query)
        );

        renderRestaurants(filtered);
        addMarkersToMap(filtered);

        // Scroll to results
        document.getElementById('restaurants').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

// Initialize search after DOM loads
document.addEventListener('DOMContentLoaded', initHeroSearch);
