// Near Me Functionality - Standalone module for all pages
// This script can be included on any page to enable the Near Me feature

(function() {
    // Town data files
    const townFiles = [
        { file: 'easthaven-restaurants.json', town: 'East Haven' },
        { file: 'branford-restaurants.json', town: 'Branford' },
        { file: 'guilford-restaurants.json', town: 'Guilford' },
        { file: 'madison-restaurants.json', town: 'Madison' },
        { file: 'clinton-restaurants.json', town: 'Clinton' },
        { file: 'westbrook-restaurants.json', town: 'Westbrook' },
        { file: 'old-saybrook-restaurants.json', town: 'Old Saybrook' }
    ];

    let allRestaurants = [];
    let featuredRestaurants = [];
    let dataLoaded = false;

    // Inject modal HTML if not present
    function injectModalHTML() {
        if (document.getElementById('nearMeModal')) return;

        const modalHTML = `
            <div id="nearMeModal" class="near-me-modal">
                <div class="near-me-modal-content">
                    <button class="near-me-close" id="nearMeClose">&times;</button>
                    <h2>Restaurants Near You</h2>
                    <div id="nearMeLoading" class="near-me-loading">
                        <div class="spinner"></div>
                        <p>Finding your location...</p>
                    </div>
                    <div id="nearMeError" class="near-me-error" style="display: none;">
                        <p>Unable to get your location. Please enable location services and try again.</p>
                    </div>
                    <div id="nearMeResults" class="near-me-results" style="display: none;">
                        <div id="nearMeFeatured" class="near-me-featured"></div>
                        <div id="nearMeOthers" class="near-me-others"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Load all restaurant data
    async function loadAllData() {
        if (dataLoaded) return;

        try {
            // Load featured restaurants
            const featuredResponse = await fetch('/featured-restaurants.json');
            if (featuredResponse.ok) {
                featuredRestaurants = await featuredResponse.json();
            }

            // Load all town data
            const promises = townFiles.map(async ({ file, town }) => {
                try {
                    const response = await fetch('/' + file);
                    if (response.ok) {
                        const data = await response.json();
                        const restaurants = data.restaurants || [];
                        return restaurants.map(r => ({ ...r, town }));
                    }
                } catch (e) {
                    console.warn(`Could not load ${file}`);
                }
                return [];
            });

            const results = await Promise.all(promises);
            allRestaurants = results.flat();
            dataLoaded = true;
        } catch (e) {
            console.error('Error loading restaurant data:', e);
        }
    }

    // Calculate distance between two points using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Check if restaurant is featured
    function isFeaturedRestaurant(name) {
        return featuredRestaurants.some(r => r.name === name);
    }

    // Format category for display (handles arrays)
    function formatCategory(category) {
        if (!category) return '';
        if (Array.isArray(category)) return category.join(' & ');
        return category;
    }

    // Open Near Me modal
    function openNearMe() {
        injectModalHTML();
        const modal = document.getElementById('nearMeModal');
        modal.classList.add('show');

        // Setup close handlers
        const closeBtn = document.getElementById('nearMeClose');
        closeBtn.onclick = () => modal.classList.remove('show');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('show');
        };

        getUserLocation();
    }

    // Get user's location
    async function getUserLocation() {
        const loading = document.getElementById('nearMeLoading');
        const error = document.getElementById('nearMeError');
        const results = document.getElementById('nearMeResults');

        loading.style.display = 'flex';
        error.style.display = 'none';
        results.style.display = 'none';

        // Load data while getting location
        await loadAllData();

        if (!navigator.geolocation) {
            showNearMeError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                findNearbyRestaurants(position.coords.latitude, position.coords.longitude);
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
                distance: calculateDistance(userLat, userLng, r.lat, r.lng),
                isFeatured: true
            }))
            .sort((a, b) => a.distance - b.distance);

        // Calculate distances for all restaurants
        const othersWithDistance = allRestaurants
            .filter(r => r.lat && r.lng)
            .map(r => {
                const featured = isFeaturedRestaurant(r.name);
                const featuredData = featured ? featuredRestaurants.find(f => f.name === r.name) : null;
                return {
                    ...r,
                    website: featuredData?.website || r.website,
                    distance: calculateDistance(userLat, userLng, r.lat, r.lng),
                    isFeatured: featured,
                    isEnhanced: r.enhanced === true
                };
            })
            .sort((a, b) => a.distance - b.distance);

        loading.style.display = 'none';
        results.style.display = 'block';

        // Render featured restaurants
        if (featuredWithDistance.length > 0) {
            const closestTwo = featuredWithDistance.slice(0, 2);
            featuredContainer.innerHTML = `
                <div class="near-me-section-header">
                    <h3>Nearest Featured Restaurants</h3>
                    <button class="near-me-section-close" id="closeFeatured">&times;</button>
                </div>
                ${closestTwo.map(r => `
                <div class="near-me-card featured">
                    ${r.image ? `<img src="${r.image}" alt="${r.name}" class="near-me-img${r.darkBg ? ' dark-bg' : ''}" loading="lazy">` : ''}
                    <div class="near-me-info">
                        <h4>${r.name}</h4>
                        <span class="near-me-distance">${r.distance.toFixed(1)} miles away</span>
                        <p class="near-me-cuisine">${formatCategory(r.category || r.cuisine)}</p>
                        <p class="near-me-town">${r.town}</p>
                        ${r.address ? `<p class="near-me-address">${r.address}</p>` : ''}
                        ${r.phone ? `<p class="near-me-phone">${r.phone}</p>` : ''}
                        <div class="near-me-actions">
                            ${r.website ? `<a href="${r.website}" target="_blank" rel="noopener noreferrer" class="near-me-link">Website</a>` : ''}
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener noreferrer" class="near-me-link directions">Directions</a>
                        </div>
                    </div>
                </div>
                `).join('')}
            `;

            document.getElementById('closeFeatured').addEventListener('click', () => {
                featuredContainer.style.display = 'none';
                const othersList = document.querySelector('.near-me-list');
                if (othersList) othersList.classList.add('expanded');
            });
        } else {
            featuredContainer.innerHTML = '';
        }

        // Render all restaurants by distance
        if (othersWithDistance.length > 0) {
            othersContainer.innerHTML = `
                <h3>All Restaurants by Distance (${othersWithDistance.length})</h3>
                <div class="near-me-list">
                    ${othersWithDistance.map(r => {
                        let cardClass = 'near-me-card small';
                        let badge = '';
                        if (r.isEnhanced) {
                            cardClass += ' near-me-enhanced-highlight';
                            badge = '<span class="near-me-badge enhanced-badge">Premium</span>';
                        } else if (r.isFeatured) {
                            cardClass += ' near-me-featured-highlight';
                            badge = '<span class="near-me-badge featured-badge">Featured</span>';
                        }
                        const showPhone = r.isFeatured || r.isEnhanced;

                        return `
                        <div class="${cardClass}">
                            <div class="near-me-info">
                                <h4>${r.name} ${badge}</h4>
                                <span class="near-me-distance">${r.distance.toFixed(1)} mi</span>
                                <p class="near-me-meta">${formatCategory(r.category)} · ${r.town}</p>
                                ${showPhone && r.phone ? `<p class="near-me-phone-visible">${r.phone}</p>` : ''}
                                ${r.website ? `<a href="${r.website}" target="_blank" rel="noopener noreferrer" class="near-me-link">Website</a>` : ''}
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener noreferrer" class="near-me-link directions">Directions</a>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
        } else {
            othersContainer.innerHTML = '<p>No restaurants found with location data.</p>';
        }
    }

    // Initialize - attach click handlers to Near Me buttons/badges
    function init() {
        // Handle Near Me badge clicks (town pages)
        document.querySelectorAll('.near-me-badge').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                openNearMe();
            });
        });

        // Handle Near Me button clicks (homepage)
        const nearMeBtn = document.getElementById('nearMeBtn');
        if (nearMeBtn) {
            nearMeBtn.addEventListener('click', openNearMe);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose globally for direct calls
    window.openNearMe = openNearMe;
})();
