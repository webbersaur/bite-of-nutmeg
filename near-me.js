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
    let currentFilter = '';

    // Check if a restaurant's category matches a search query
    function categoryMatchesQuery(category, query) {
        if (!category || !query) return true;
        if (Array.isArray(category)) return category.some(c => c.toLowerCase().includes(query));
        return category.toLowerCase().includes(query);
    }

    // Inject modal HTML if not present
    function injectModalHTML() {
        if (document.getElementById('nearMeModal')) return;

        const modalHTML = `
            <div id="nearMeModal" class="near-me-modal">
                <div class="near-me-modal-content">
                    <button class="near-me-close" id="nearMeClose">&times;</button>
                    <h2>Restaurants Near You</h2>
                    <div id="nearMeFilterPill" class="near-me-active-filter" style="display:none;">
                        Filtered by: "<span></span>" <button id="clearNearMeFilter">&times;</button>
                    </div>
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

        // Clear filter button re-renders without the filter
        document.getElementById('clearNearMeFilter').addEventListener('click', () => {
            currentFilter = '';
            document.getElementById('nearMeFilterPill').style.display = 'none';
            // Re-render with the last known position or town
            if (lastUserLat !== null) {
                findNearbyRestaurants(lastUserLat, lastUserLng);
            } else if (lastTownName) {
                showTownRestaurants(lastTownName);
            }
        });
    }

    let lastUserLat = null;
    let lastUserLng = null;
    let lastTownName = null;

    // Load all restaurant data
    async function loadAllData() {
        if (dataLoaded) return;

        try {
            // Load featured restaurants
            const featuredResponse = await fetch('/featured-restaurants.json');
            if (featuredResponse.ok) {
                const featuredData = await featuredResponse.json();
                featuredRestaurants = featuredData.featured || [];
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
        // Capture active search filter from whichever page we're on
        const searchInput = document.getElementById('heroSearch') || document.getElementById('searchInput');
        currentFilter = searchInput ? searchInput.value.trim().toLowerCase() : '';

        injectModalHTML();
        const modal = document.getElementById('nearMeModal');
        modal.classList.add('show');

        // Show or hide the filter pill
        const filterPill = document.getElementById('nearMeFilterPill');
        if (filterPill) {
            if (currentFilter) {
                filterPill.style.display = 'flex';
                filterPill.querySelector('span').textContent = currentFilter;
            } else {
                filterPill.style.display = 'none';
            }
        }

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

    // Show error message with town selector fallback
    function showNearMeError(message) {
        const loading = document.getElementById('nearMeLoading');
        const error = document.getElementById('nearMeError');

        loading.style.display = 'none';
        error.style.display = 'block';
        error.innerHTML = `
            <p>${message}</p>
            <p style="margin-top: 1rem; font-weight: 600; color: #333;">Or browse by town:</p>
            <div class="near-me-town-selector">
                ${townFiles.map(t => `
                    <button class="near-me-town-btn" data-town="${t.town}">${t.town}</button>
                `).join('')}
            </div>
        `;

        // Attach click handlers to town buttons
        error.querySelectorAll('.near-me-town-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showTownRestaurants(btn.dataset.town);
            });
        });
    }

    // Show restaurants from a selected town (fallback when location unavailable)
    function showTownRestaurants(townName) {
        lastTownName = townName;
        lastUserLat = null;
        lastUserLng = null;

        const error = document.getElementById('nearMeError');
        const results = document.getElementById('nearMeResults');
        const featuredContainer = document.getElementById('nearMeFeatured');
        const othersContainer = document.getElementById('nearMeOthers');

        error.style.display = 'none';
        results.style.display = 'block';

        // Filter restaurants by town
        const townRestaurants = allRestaurants
            .filter(r => r.town === townName)
            .map(r => {
                const featured = isFeaturedRestaurant(r.name);
                const featuredData = featured ? featuredRestaurants.find(f => f.name === r.name) : null;
                return {
                    ...r,
                    website: featuredData?.website || r.website,
                    isFeatured: featured,
                    isEnhanced: r.enhanced === true
                };
            })
            .sort((a, b) => {
                // Featured first, then enhanced, then alphabetical
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                if (a.isEnhanced && !b.isEnhanced) return -1;
                if (!a.isEnhanced && b.isEnhanced) return 1;
                return a.name.localeCompare(b.name);
            });

        // Apply search filter to the full list (featured section stays unfiltered)
        const filtered = currentFilter
            ? townRestaurants.filter(r =>
                r.name.toLowerCase().includes(currentFilter) ||
                categoryMatchesQuery(r.category, currentFilter))
            : townRestaurants;

        // Get featured restaurants for this town (unfiltered)
        const townFeatured = featuredRestaurants.filter(r => r.town === townName);

        // Render featured restaurants for this town
        if (townFeatured.length > 0) {
            featuredContainer.innerHTML = `
                <div class="near-me-section-header">
                    <h3>Featured in ${townName}</h3>
                    <button class="near-me-section-close" id="closeFeatured">&times;</button>
                </div>
                ${townFeatured.map(r => `
                <div class="near-me-card featured">
                    ${r.image ? `<img src="${r.image}" alt="${r.name}" class="near-me-img${r.darkBg ? ' dark-bg' : ''}" loading="lazy">` : ''}
                    <div class="near-me-info">
                        <h4>${r.name}</h4>
                        <p class="near-me-cuisine">${formatCategory(r.category || r.cuisine)}</p>
                        <p class="near-me-town">${r.town}</p>
                        ${r.address ? `<p class="near-me-address">${r.address}</p>` : ''}
                        ${r.phone ? `<p class="near-me-phone">${r.phone}</p>` : ''}
                        <div class="near-me-actions">
                            ${r.website ? `<a href="${r.website}" target="_blank" rel="noopener noreferrer" class="near-me-link">Website</a>` : ''}
                            ${r.lat && r.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener noreferrer" class="near-me-link directions">Directions</a>` : ''}
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

        // Render filtered restaurants for this town
        if (filtered.length > 0) {
            const heading = currentFilter
                ? `"${currentFilter}" in ${townName} (${filtered.length})`
                : `All ${townName} Restaurants (${filtered.length})`;
            othersContainer.innerHTML = `
                <h3>${heading}</h3>
                <div class="near-me-list">
                    ${filtered.map(r => {
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
                                <p class="near-me-meta">${formatCategory(r.category)}</p>
                                ${showPhone && r.phone ? `<p class="near-me-phone-visible">${r.phone}</p>` : ''}
                                ${r.website ? `<a href="${r.website}" target="_blank" rel="noopener noreferrer" class="near-me-link">Website</a>` : ''}
                                ${r.lat && r.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener noreferrer" class="near-me-link directions">Directions</a>` : ''}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
        } else {
            othersContainer.innerHTML = currentFilter
                ? `<p>No "${currentFilter}" restaurants found in ${townName}.</p>`
                : '<p>No restaurants found for this town.</p>';
        }
    }

    // Find nearby restaurants
    function findNearbyRestaurants(userLat, userLng) {
        lastUserLat = userLat;
        lastUserLng = userLng;
        lastTownName = null;

        const loading = document.getElementById('nearMeLoading');
        const results = document.getElementById('nearMeResults');
        const featuredContainer = document.getElementById('nearMeFeatured');
        const othersContainer = document.getElementById('nearMeOthers');

        // Calculate distances for featured restaurants (never filtered)
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

        // Apply search filter to the full list (featured section stays unfiltered)
        const filtered = currentFilter
            ? othersWithDistance.filter(r =>
                r.name.toLowerCase().includes(currentFilter) ||
                categoryMatchesQuery(r.category, currentFilter))
            : othersWithDistance;

        loading.style.display = 'none';
        results.style.display = 'block';

        // Render featured restaurants (unfiltered)
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

        // Render filtered restaurants by distance
        if (filtered.length > 0) {
            const heading = currentFilter
                ? `"${currentFilter}" Restaurants by Distance (${filtered.length})`
                : `All Restaurants by Distance (${filtered.length})`;
            othersContainer.innerHTML = `
                <h3>${heading}</h3>
                <div class="near-me-list">
                    ${filtered.map(r => {
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
            othersContainer.innerHTML = currentFilter
                ? `<p>No "${currentFilter}" restaurants found nearby.</p>`
                : '<p>No restaurants found with location data.</p>';
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

        // Handle Near Me button clicks (town pages)
        const townNearMeBtn = document.getElementById('townNearMeBtn');
        if (townNearMeBtn) {
            townNearMeBtn.addEventListener('click', openNearMe);
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
