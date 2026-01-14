// A Bite of Nutmeg - CT Shoreline Dining Guide
// Main Application JavaScript

let featuredRestaurants = [];
let allRestaurants = [];
let map = null;
let markers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadRestaurants();
    initMap();
    renderRestaurants(featuredRestaurants);
    initMapToggle();
});

// Map toggle for mobile
function initMapToggle() {
    const toggleBtn = document.getElementById('mapToggle');
    const mapContainer = document.getElementById('mapContainer');

    if (!toggleBtn || !mapContainer) return;

    toggleBtn.addEventListener('click', () => {
        const isShowing = mapContainer.classList.toggle('show');
        toggleBtn.textContent = isShowing ? 'Hide Map' : 'Show Map';

        // Fix map rendering and zoom when shown
        if (isShowing && map) {
            setTimeout(() => {
                map.invalidateSize();
                // Re-fit bounds to show all markers
                if (markers.length > 0) {
                    const group = L.featureGroup(markers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }, 100);
        }
    });
}

// Town data files to load
const townFiles = [
    { file: 'branford-restaurants.json', town: 'Branford' },
    { file: 'guilford-restaurants.json', town: 'Guilford' },
    { file: 'easthaven-restaurants.json', town: 'East Haven' },
    { file: 'madison-restaurants.json', town: 'Madison' },
    { file: 'clinton-restaurants.json', town: 'Clinton' },
    { file: 'westbrook-restaurants.json', town: 'Westbrook' },
    { file: 'old-saybrook-restaurants.json', town: 'Old Saybrook' }
];

// Load restaurant data from JSON files
async function loadRestaurants() {
    try {
        // Load featured restaurants
        const featuredResponse = await fetch('featured-restaurants.json');
        const featuredData = await featuredResponse.json();
        featuredRestaurants = featuredData.featured || [];

        // Load all restaurants from each town file
        allRestaurants = [];
        for (const townData of townFiles) {
            try {
                const response = await fetch(townData.file);
                const data = await response.json();
                if (data.restaurants) {
                    // Add town name to each restaurant
                    const restaurantsWithTown = data.restaurants.map(r => ({
                        ...r,
                        town: townData.town
                    }));
                    allRestaurants = allRestaurants.concat(restaurantsWithTown);
                }
            } catch (e) {
                // Town file doesn't exist yet, skip it
                console.log(`No data file for ${townData.town} yet`);
            }
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        featuredRestaurants = [];
        allRestaurants = [];
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

    // Add markers for featured restaurants
    addMarkersToMap(featuredRestaurants);
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
            const cuisine = restaurant.category || restaurant.cuisine;
            const marker = L.marker([restaurant.lat, restaurant.lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <h4>${restaurant.name}</h4>
                        <p class="popup-cuisine">${cuisine}</p>
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
function renderRestaurants(restaurantList, isSearchResult = false) {
    const grid = document.getElementById('restaurantGrid');
    const countElement = document.getElementById('resultsCount');
    const headerText = document.querySelector('.restaurants h2');

    countElement.textContent = restaurantList.length;

    // Update header based on whether showing search results or featured
    if (headerText) {
        headerText.textContent = isSearchResult ? 'Search Results' : 'Featured Restaurants';
    }

    if (restaurantList.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>${isSearchResult ? 'Try a different search term.' : 'Check back soon for featured restaurants.'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = restaurantList.map(restaurant => {
        const cuisine = restaurant.category || restaurant.cuisine || '';
        return `
        <article class="restaurant-card">
            ${restaurant.image ? `
            <div class="card-logo${restaurant.darkBg ? ' dark-bg' : ''}">
                <img src="${restaurant.image}" alt="${restaurant.name} logo">
            </div>
            ` : ''}
            <div class="card-header">
                <h3>${restaurant.name}</h3>
                <span class="cuisine">${cuisine}</span>
            </div>
            <div class="card-body">
                ${restaurant.town ? `<span class="town">${restaurant.town}</span>` : ''}
                ${restaurant.address ? `<p class="address">${restaurant.address}</p>` : ''}
                ${restaurant.phone ? `<p class="phone">${restaurant.phone}</p>` : ''}
            </div>
            ${restaurant.website ? `
            <div class="card-footer">
                <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer">Visit Website</a>
            </div>
            ` : ''}
        </article>
    `}).join('');
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
            renderRestaurants(featuredRestaurants, false);
            addMarkersToMap(featuredRestaurants);
            return;
        }

        // Search ALL restaurants
        const filtered = allRestaurants.filter(r =>
            r.name.toLowerCase().includes(query) ||
            (r.cuisine && r.cuisine.toLowerCase().includes(query)) ||
            (r.category && r.category.toLowerCase().includes(query)) ||
            r.town.toLowerCase().includes(query)
        );

        renderRestaurants(filtered, true);
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

// ==========================================
// Near Me Feature
// ==========================================

// Haversine formula to calculate distance between two points in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Initialize Near Me functionality
function initNearMe() {
    const nearMeBtn = document.getElementById('nearMeBtn');
    const modal = document.getElementById('nearMeModal');
    const closeBtn = document.getElementById('nearMeClose');

    if (!nearMeBtn || !modal) return;

    nearMeBtn.addEventListener('click', () => {
        modal.classList.add('show');
        getUserLocation();
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

// Get user's location
function getUserLocation() {
    const loading = document.getElementById('nearMeLoading');
    const error = document.getElementById('nearMeError');
    const results = document.getElementById('nearMeResults');

    // Show loading, hide others
    loading.style.display = 'flex';
    error.style.display = 'none';
    results.style.display = 'none';

    if (!navigator.geolocation) {
        showNearMeError('Geolocation is not supported by your browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            findNearbyRestaurants(userLat, userLng);
        },
        (err) => {
            let message = 'Unable to get your location.';
            if (err.code === 1) {
                message = 'Location access denied. Please enable location services and try again.';
            } else if (err.code === 2) {
                message = 'Location unavailable. Please try again.';
            } else if (err.code === 3) {
                message = 'Location request timed out. Please try again.';
            }
            showNearMeError(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
}

// Show error message
function showNearMeError(message) {
    const loading = document.getElementById('nearMeLoading');
    const error = document.getElementById('nearMeError');

    loading.style.display = 'none';
    error.style.display = 'block';
    error.querySelector('p').textContent = message;
}

// Find nearby restaurants
function findNearbyRestaurants(userLat, userLng) {
    const loading = document.getElementById('nearMeLoading');
    const results = document.getElementById('nearMeResults');
    const featuredContainer = document.getElementById('nearMeFeatured');
    const othersContainer = document.getElementById('nearMeOthers');

    // Calculate distances for featured restaurants
    const featuredWithDistance = featuredRestaurants
        .filter(r => r.lat && r.lng)
        .map(r => ({
            ...r,
            distance: calculateDistance(userLat, userLng, r.lat, r.lng)
        }))
        .sort((a, b) => a.distance - b.distance);

    // Calculate distances for all restaurants (within 5 miles)
    const othersWithDistance = allRestaurants
        .filter(r => r.lat && r.lng)
        .map(r => ({
            ...r,
            distance: calculateDistance(userLat, userLng, r.lat, r.lng)
        }))
        .filter(r => r.distance <= 5)
        .sort((a, b) => a.distance - b.distance);

    // Hide loading, show results
    loading.style.display = 'none';
    results.style.display = 'block';

    // Render closest featured restaurant
    if (featuredWithDistance.length > 0) {
        const closest = featuredWithDistance[0];
        featuredContainer.innerHTML = `
            <h3>Closest Featured Restaurant</h3>
            <div class="near-me-card featured">
                ${closest.image ? `<img src="${closest.image}" alt="${closest.name}" class="near-me-img${closest.darkBg ? ' dark-bg' : ''}">` : ''}
                <div class="near-me-info">
                    <h4>${closest.name}</h4>
                    <span class="near-me-distance">${closest.distance.toFixed(1)} miles away</span>
                    <p class="near-me-cuisine">${closest.category || closest.cuisine || ''}</p>
                    <p class="near-me-town">${closest.town}</p>
                    ${closest.address ? `<p class="near-me-address">${closest.address}</p>` : ''}
                    ${closest.phone ? `<p class="near-me-phone">${closest.phone}</p>` : ''}
                    <div class="near-me-actions">
                        ${closest.website ? `<a href="${closest.website}" target="_blank" class="near-me-link">Website</a>` : ''}
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${closest.lat},${closest.lng}" target="_blank" class="near-me-link directions">Directions</a>
                    </div>
                </div>
            </div>
        `;
    } else {
        featuredContainer.innerHTML = '<p>No featured restaurants found with location data.</p>';
    }

    // Render other nearby restaurants
    if (othersWithDistance.length > 0) {
        othersContainer.innerHTML = `
            <h3>Other Restaurants Within 5 Miles (${othersWithDistance.length})</h3>
            <div class="near-me-list">
                ${othersWithDistance.map(r => `
                    <div class="near-me-card small">
                        <div class="near-me-info">
                            <h4>${r.name}</h4>
                            <span class="near-me-distance">${r.distance.toFixed(1)} mi</span>
                            <p class="near-me-meta">${r.category || ''} · ${r.town}</p>
                            ${r.phone ? `<p class="near-me-phone">${r.phone}</p>` : ''}
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" class="near-me-link directions">Directions</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        othersContainer.innerHTML = '<p>No other restaurants found within 5 miles.</p>';
    }
}

// Initialize Near Me after DOM loads
document.addEventListener('DOMContentLoaded', initNearMe);
