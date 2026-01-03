// A Bite of Nutmeg - CT Shoreline Dining Guide
// Main Application JavaScript

let featuredRestaurants = [];
let allRestaurants = [];
let map = null;
let markers = [];
let userLocation = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadRestaurants();
    initMap();
    renderRestaurants(featuredRestaurants);
});

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
        const cuisine = restaurant.category || restaurant.cuisine;
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

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format distance for display
function formatDistance(miles) {
    if (miles < 0.1) {
        return Math.round(miles * 5280) + ' ft';
    } else if (miles < 10) {
        return miles.toFixed(1) + ' mi';
    } else {
        return Math.round(miles) + ' mi';
    }
}

// Sort restaurants by distance from user
function sortByDistance(restaurants, userLat, userLng) {
    return restaurants
        .filter(r => r.lat && r.lng)
        .map(r => ({
            ...r,
            distance: calculateDistance(userLat, userLng, r.lat, r.lng)
        }))
        .sort((a, b) => a.distance - b.distance);
}

// Render restaurants with distance
function renderRestaurantsWithDistance(restaurantList) {
    const grid = document.getElementById('restaurantGrid');
    const countElement = document.getElementById('resultsCount');
    const headerText = document.querySelector('.restaurants h2');

    countElement.textContent = restaurantList.length;

    if (headerText) {
        headerText.textContent = 'Restaurants Near You';
    }

    if (restaurantList.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No restaurants found nearby</h3>
                <p>Try expanding your search area.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = restaurantList.map(restaurant => {
        const cuisine = restaurant.category || restaurant.cuisine;
        const distanceText = restaurant.distance !== undefined ? formatDistance(restaurant.distance) : '';
        return `
        <article class="restaurant-card">
            ${restaurant.image ? `
            <div class="card-logo${restaurant.darkBg ? ' dark-bg' : ''}">
                <img src="${restaurant.image}" alt="${restaurant.name} logo">
            </div>
            ` : ''}
            <div class="card-header">
                <h3>${restaurant.name}${distanceText ? `<span class="distance-badge">${distanceText}</span>` : ''}</h3>
                <span class="cuisine">${cuisine}</span>
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
    `}).join('');
}

// Near Me functionality
function initNearMe() {
    const nearMeBtn = document.getElementById('nearMeBtn');
    if (!nearMeBtn) return;

    nearMeBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        nearMeBtn.classList.add('loading');
        nearMeBtn.textContent = '📍 Locating...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Sort featured restaurants by distance
                const sorted = sortByDistance(featuredRestaurants, userLocation.lat, userLocation.lng);

                // Render with distance
                renderRestaurantsWithDistance(sorted);
                addMarkersToMap(sorted);

                // Add user location marker to map
                const userIcon = L.divIcon({
                    className: 'user-marker',
                    html: `<div style="
                        background-color: #4285f4;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                    .addTo(map)
                    .bindPopup('📍 You are here');

                // Scroll to results
                document.getElementById('restaurants').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                nearMeBtn.classList.remove('loading');
                nearMeBtn.textContent = '📍 Near Me';
            },
            (error) => {
                nearMeBtn.classList.remove('loading');
                nearMeBtn.textContent = '📍 Near Me';

                let message = 'Unable to get your location.';
                if (error.code === 1) {
                    message = 'Please allow location access to use this feature.';
                } else if (error.code === 2) {
                    message = 'Location unavailable. Please try again.';
                } else if (error.code === 3) {
                    message = 'Location request timed out. Please try again.';
                }
                alert(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // Cache location for 5 minutes
            }
        );
    });
}

// Initialize Near Me after DOM loads
document.addEventListener('DOMContentLoaded', initNearMe);
