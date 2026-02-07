// Guilford Page JavaScript
// Handles featured restaurants, category tabs, search, and map

let data = null;
let currentCategory = 'All';
let searchTerm = '';
let map = null;
let markers = [];
const townName = 'Guilford';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    addMobileScrollHints();
    renderCategoryTabs();
    renderFeaturedRestaurants();
    renderRestaurantList();
    initSearch();
    initNearMe();
    initMap();
    initMapToggle();
});

// Add mobile scroll hints
function addMobileScrollHints() {
    // Add "scroll down" hint below map section
    const mapSection = document.querySelector('.map-section');
    if (mapSection && !document.querySelector('.scroll-down-hint')) {
        const scrollDownHint = document.createElement('p');
        scrollDownHint.className = 'scroll-down-hint';
        scrollDownHint.textContent = 'Scroll down to view cuisine types ↓';
        mapSection.after(scrollDownHint);
    }
}

// Load restaurant data
async function loadData() {
    try {
        const response = await fetch('guilford-restaurants.json');
        data = await response.json();
    } catch (error) {
        console.error('Error loading restaurant data:', error);
        data = { featured: [], restaurants: [], categories: [] };
    }
}

// Render category tabs
function renderCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');

    // Add mobile scroll hint before tabs
    let scrollHint = document.querySelector('.category-scroll-hint');
    if (!scrollHint) {
        scrollHint = document.createElement('p');
        scrollHint.className = 'category-scroll-hint';
        scrollHint.textContent = 'Swipe to see more cuisines →';
        tabsContainer.parentNode.insertBefore(scrollHint, tabsContainer);
    }

    tabsContainer.innerHTML = data.categories.map(category => `
        <button class="category-tab ${category === currentCategory ? 'active' : ''}"
                data-category="${category}">
            ${category}
        </button>
    `).join('');

    // Add click handlers
    tabsContainer.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentCategory = tab.dataset.category;
            updateActiveTabs();
            renderRestaurantList();
        });
    });
}

// Update active tab styling
function updateActiveTabs() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === currentCategory);
    });
}

// Render featured restaurants
function renderFeaturedRestaurants() {
    const grid = document.getElementById('featuredGrid');

    grid.innerHTML = data.featured.map(restaurant => `
        <a href="${restaurant.website || '#'}" class="featured-card" target="_blank" rel="noopener noreferrer">
            <div class="card-image ${restaurant.darkBg ? 'dark-bg' : ''}">
                <span class="featured-badge">FEATURED</span>
                ${restaurant.image
                    ? `<img src="${restaurant.image}" alt="${restaurant.name}" loading="lazy">`
                    : `<span class="placeholder-logo">${restaurant.name.charAt(0)}</span>`
                }
            </div>
            <div class="card-content">
                <h3>${restaurant.name}</h3>
                <span class="category-tag">${restaurant.category}</span>
                <div class="info-row">
                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    ${restaurant.address}
                </div>
                <div class="info-row">
                    <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    ${restaurant.phone}
                </div>
                <span class="visit-link">Visit Website →</span>
            </div>
        </a>
    `).join('');
}

// Filter restaurants based on category and search term
function getFilteredRestaurants() {
    return data.restaurants.filter(restaurant => {
        // Category filter
        const matchesCategory = currentCategory === 'All' ||
            (Array.isArray(restaurant.category)
                ? restaurant.category.includes(currentCategory)
                : restaurant.category === currentCategory);

        // Search filter
        const matchesSearch = searchTerm.length === 0 || (() => {
            const term = searchTerm.toLowerCase();
            const cat = Array.isArray(restaurant.category) ? restaurant.category.join(', ') : restaurant.category;
            return restaurant.name.toLowerCase().includes(term) ||
                cat.toLowerCase().includes(term);
        })();

        return matchesCategory && matchesSearch;
    });
}

// Render restaurant list
function renderRestaurantList() {
    const list = document.getElementById('restaurantList');
    const countElement = document.getElementById('resultsCount');

    const filtered = getFilteredRestaurants();

    // Sort: For specific categories, Featured first, then Premium, then alphabetical
    // For "All", just Premium first, then alphabetical
    filtered.sort((a, b) => {
        const aFeatured = data.featured && data.featured.some(f => f.name === a.name) ? 2 : 0;
        const bFeatured = data.featured && data.featured.some(f => f.name === b.name) ? 2 : 0;
        const aEnhanced = a.enhanced === true ? 1 : 0;
        const bEnhanced = b.enhanced === true ? 1 : 0;

        if (currentCategory !== 'All') {
            // Featured (2) > Premium (1) > Regular (0)
            const aScore = aFeatured || aEnhanced;
            const bScore = bFeatured || bEnhanced;
            if (bScore !== aScore) return bScore - aScore;
        } else {
            // Just Premium first for "All"
            if (bEnhanced !== aEnhanced) return bEnhanced - aEnhanced;
        }
        return a.name.localeCompare(b.name);
    });

    countElement.textContent = filtered.length;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">
                <h3 style="color: #333; margin-bottom: 0.5rem;">No restaurants found</h3>
                <p>Try a different category or search term.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(restaurant => {
        const isFeatured = data.featured && data.featured.some(f => f.name === restaurant.name);
        const isEnhanced = restaurant.enhanced === true;

        let badgeHtml = '';
        let itemClass = 'restaurant-item';

        if (isFeatured) {
            badgeHtml = '<span class="list-badge featured">Featured</span>';
            itemClass += ' featured-highlight';
        } else if (isEnhanced) {
            badgeHtml = '<span class="list-badge enhanced">Premium</span>';
            itemClass += ' enhanced-highlight';
        }

        // Get website from featured data if available, otherwise from restaurant data
        const featuredData = isFeatured ? data.featured.find(f => f.name === restaurant.name) : null;
        const website = featuredData?.website || restaurant.website;
        const showExtras = isFeatured || isEnhanced;

        return `
        <div class="${itemClass}">
            <div class="item-header">
                <h3>${restaurant.name}</h3>
                ${badgeHtml}
            </div>
            <span class="category">${Array.isArray(restaurant.category) ? restaurant.category.join(' & ') : restaurant.category}</span>
            <div class="item-actions">
                <a href="tel:${restaurant.phone.replace(/[^0-9]/g, '')}" class="phone">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#2EA3F2"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    ${restaurant.phone}
                </a>
                ${showExtras && website ? `<a href="${website}" target="_blank" rel="noopener noreferrer" class="website-link">Visit Website →</a>` : ''}
            </div>
        </div>
    `}).join('');
}

// Initialize Near Me button
function initNearMe() {
    const nearMeBtn = document.getElementById('townNearMeBtn');
    if (nearMeBtn && typeof window.openNearMe === 'function') {
        nearMeBtn.addEventListener('click', () => {
            window.openNearMe();
        });
    }
}

// Scroll to results section, dismissing keyboard first on mobile
function scrollToResults() {
    document.activeElement?.blur();
    setTimeout(() => {
        const section = document.querySelector('.category-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Initialize search (filters restaurant list in place)
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const findBtn = document.getElementById('townSearchBtn');

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderRestaurantList();
    });

    if (findBtn) {
        findBtn.addEventListener('click', () => {
            searchTerm = searchInput.value;
            renderRestaurantList();
            scrollToResults();
        });
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchTerm = searchInput.value;
            renderRestaurantList();
            scrollToResults();
        }
    });
}

// Smooth scroll for nav links
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

// ==========================================
// Map Functionality
// ==========================================

// Map toggle for mobile
function initMapToggle() {
    const toggleBtn = document.getElementById('mapToggle');
    const mapContainer = document.getElementById('mapContainer');

    if (!toggleBtn || !mapContainer) return;

    toggleBtn.addEventListener('click', () => {
        const isShowing = mapContainer.classList.toggle('show');
        toggleBtn.textContent = isShowing ? 'Hide Map' : 'Show Map';

        if (isShowing && map) {
            setTimeout(() => {
                map.invalidateSize();
                if (markers.length > 0) {
                    const group = L.featureGroup(markers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }, 100);
        }
    });
}

// Initialize the Leaflet map
function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || typeof L === 'undefined') return;

    const restaurantsWithCoords = data.restaurants.filter(r => r.lat && r.lng);
    if (restaurantsWithCoords.length === 0) return;

    const avgLat = restaurantsWithCoords.reduce((sum, r) => sum + r.lat, 0) / restaurantsWithCoords.length;
    const avgLng = restaurantsWithCoords.reduce((sum, r) => sum + r.lng, 0) / restaurantsWithCoords.length;

    map = L.map('mapContainer').setView([avgLat, avgLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    addMarkersToMap(restaurantsWithCoords);
}

// Town color for Guilford
const townColor = '#059669';

// Create marker icon
function createMarkerIcon(isFeatured) {
    const size = isFeatured ? 40 : 30;
    const color = isFeatured ? '#f0b323' : townColor;
    const borderColor = isFeatured ? townColor : '#f0b323';
    const dotSize = isFeatured ? 12 : 10;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            ${isFeatured ? 'box-shadow: 0 3px 10px rgba(0,0,0,0.3);' : ''}
        "><span style="
            transform: rotate(45deg);
            width: ${dotSize}px;
            height: ${dotSize}px;
            background-color: ${isFeatured ? townColor : 'white'};
            border-radius: 50%;
        "></span></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size],
        popupAnchor: [0, -size]
    });
}

// Check if restaurant is featured
function isFeaturedRestaurant(name) {
    return data.featured && data.featured.some(f => f.name === name);
}

// Add markers to the map
function addMarkersToMap(restaurantList) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    restaurantList.forEach(restaurant => {
        const featured = isFeaturedRestaurant(restaurant.name);
        const icon = createMarkerIcon(featured);
        const marker = L.marker([restaurant.lat, restaurant.lng], { icon: icon, zIndexOffset: featured ? 1000 : 0 })
            .addTo(map)
            .bindPopup(`
                <div class="map-popup">
                    <h4>${restaurant.name}</h4>
                    ${featured ? '<p class="popup-featured">⭐ FEATURED</p>' : ''}
                    <p class="popup-cuisine">${restaurant.category}</p>
                    <p>${townName}</p>
                    ${restaurant.phone ? `<p>${restaurant.phone}</p>` : ''}
                </div>
            `);
        markers.push(marker);
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
