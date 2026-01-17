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

// Town colors for map markers
const townColors = {
    'East Haven': '#8B5CF6',
    'Branford': '#1e3a6e',
    'Guilford': '#059669',
    'Madison': '#EA580C',
    'Clinton': '#DC2626',
    'Westbrook': '#0891B2',
    'Old Saybrook': '#9F1239'
};

// Check if restaurant is featured
function isFeaturedRestaurant(name) {
    return featuredRestaurants.some(f => f.name === name);
}

// Create marker icon with town color and featured styling
function createMarkerIcon(town, isFeatured) {
    const townColor = townColors[town] || '#1e3a6e';
    const size = isFeatured ? 40 : 24;
    const color = isFeatured ? '#f0b323' : townColor;
    const borderColor = isFeatured ? townColor : '#f0b323';
    const dotSize = isFeatured ? 12 : 8;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: ${isFeatured ? '3px' : '2px'} solid ${borderColor};
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

    // Add markers for ALL restaurants (with town colors)
    addMarkersToMap(allRestaurants);
}

// Add markers to the map
function addMarkersToMap(restaurantList) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    restaurantList.forEach(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            const featured = isFeaturedRestaurant(restaurant.name);
            const icon = createMarkerIcon(restaurant.town, featured);
            const cuisine = restaurant.category || restaurant.cuisine;
            const marker = L.marker([restaurant.lat, restaurant.lng], {
                icon: icon,
                zIndexOffset: featured ? 1000 : 0
            })
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <h4>${restaurant.name}</h4>
                        ${featured ? '<p class="popup-featured">⭐ FEATURED</p>' : ''}
                        <p class="popup-cuisine">${cuisine}</p>
                        <p>${restaurant.town}</p>
                        ${restaurant.address ? `<p>${restaurant.address}</p>` : ''}
                        ${restaurant.phone ? `<p>${restaurant.phone}</p>` : ''}
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
                ${restaurant.phone ? `<p class="phone"><a href="tel:${restaurant.phone.replace(/[^0-9]/g, '')}">${restaurant.phone}</a></p>` : ''}
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

// Check if restaurant is enhanced (paid tier 2)
function isEnhancedRestaurant(name) {
    return allRestaurants.some(r => r.name === name && r.enhanced === true);
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
            const isFeatured = isFeaturedRestaurant(r.name);
            // If featured, get website from featured data
            const featuredData = isFeatured ? featuredRestaurants.find(f => f.name === r.name) : null;
            return {
                ...r,
                website: featuredData?.website || r.website,
                distance: calculateDistance(userLat, userLng, r.lat, r.lng),
                isFeatured: isFeatured,
                isEnhanced: r.enhanced === true
            };
        })
        .sort((a, b) => a.distance - b.distance);

    // Hide loading, show results
    loading.style.display = 'none';
    results.style.display = 'block';

    // Render 2 closest featured restaurants
    if (featuredWithDistance.length > 0) {
        const closestTwo = featuredWithDistance.slice(0, 2);
        featuredContainer.innerHTML = `
            <div class="near-me-section-header">
                <h3>Nearest Featured Restaurants</h3>
                <button class="near-me-section-close" id="closeFeatured">&times;</button>
            </div>
            ${closestTwo.map(r => `
            <div class="near-me-card featured">
                ${r.image ? `<img src="${r.image}" alt="${r.name}" class="near-me-img${r.darkBg ? ' dark-bg' : ''}">` : ''}
                <div class="near-me-info">
                    <h4>${r.name}</h4>
                    <span class="near-me-distance">${r.distance.toFixed(1)} miles away</span>
                    <p class="near-me-cuisine">${r.category || r.cuisine || ''}</p>
                    <p class="near-me-town">${r.town}</p>
                    ${r.address ? `<p class="near-me-address">${r.address}</p>` : ''}
                    ${r.phone ? `<p class="near-me-phone">${r.phone}</p>` : ''}
                    <div class="near-me-actions">
                        ${r.website ? `<a href="${r.website}" target="_blank" class="near-me-link">Website</a>` : ''}
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" class="near-me-link directions">Directions</a>
                    </div>
                </div>
            </div>
            `).join('')}
        `;
        // Add close button handler - expand others list when featured is closed
        document.getElementById('closeFeatured').addEventListener('click', () => {
            featuredContainer.style.display = 'none';
            // Expand the others list to use full space
            const othersList = document.querySelector('.near-me-list');
            if (othersList) {
                othersList.classList.add('expanded');
            }
        });
    } else {
        featuredContainer.innerHTML = '<p>No featured restaurants found with location data.</p>';
    }

    // Render other nearby restaurants with enhanced highlighting
    if (othersWithDistance.length > 0) {
        othersContainer.innerHTML = `
            <h3>All Restaurants by Distance (${othersWithDistance.length})</h3>
            <div class="near-me-list">
                ${othersWithDistance.map(r => {
                    // Determine card styling class
                    let cardClass = 'near-me-card small';
                    let badge = '';
                    if (r.isFeatured) {
                        cardClass += ' near-me-featured-highlight';
                        badge = '<span class="near-me-badge featured-badge">Featured</span>';
                    } else if (r.isEnhanced) {
                        cardClass += ' near-me-enhanced-highlight';
                        badge = '<span class="near-me-badge enhanced-badge">Premium</span>';
                    }

                    // Show phone for enhanced/featured, hide for regular
                    const showPhone = r.isFeatured || r.isEnhanced;

                    return `
                    <div class="${cardClass}">
                        <div class="near-me-info">
                            <h4>${r.name} ${badge}</h4>
                            <span class="near-me-distance">${r.distance.toFixed(1)} mi</span>
                            <p class="near-me-meta">${r.category || ''} · ${r.town}</p>
                            ${showPhone && r.phone ? `<p class="near-me-phone-visible">${r.phone}</p>` : ''}
                            ${r.website ? `<a href="${r.website}" target="_blank" class="near-me-link">Website</a>` : ''}
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" class="near-me-link directions">Directions</a>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    } else {
        othersContainer.innerHTML = '<p>No restaurants found with location data.</p>';
    }
}

// Initialize Near Me after DOM loads
document.addEventListener('DOMContentLoaded', initNearMe);

// ==========================================
// Report a Problem Feature
// ==========================================

function initReportModal() {
    const reportLink = document.getElementById('reportLink');
    const reportModal = document.getElementById('reportModal');
    const reportClose = document.getElementById('reportClose');
    const reportForm = document.getElementById('reportForm');

    if (!reportModal) return;

    // Open modal from footer link
    if (reportLink) {
        reportLink.addEventListener('click', (e) => {
            e.preventDefault();
            reportModal.classList.add('show');
        });
    }

    // Close modal
    if (reportClose) {
        reportClose.addEventListener('click', () => {
            reportModal.classList.remove('show');
        });
    }

    // Close on outside click
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            reportModal.classList.remove('show');
        }
    });

    // Handle form submission
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const restaurant = document.getElementById('reportRestaurant').value;
            const town = document.getElementById('reportTown').value;
            const type = document.getElementById('reportType').value;
            const details = document.getElementById('reportDetails').value;
            const email = document.getElementById('reportEmail').value;

            // Build email subject
            const subject = `Problem Report: ${restaurant} (${town})`;

            // Build email body
            let body = `Problem Report for A Bite of Nutmeg\n`;
            body += `${'='.repeat(40)}\n\n`;
            body += `Restaurant: ${restaurant}\n`;
            body += `Town: ${town}\n`;
            body += `Problem Type: ${type}\n\n`;
            body += `Details:\n${details || 'No additional details provided.'}\n\n`;
            if (email) {
                body += `Reporter Email: ${email}\n`;
            }
            body += `\n${'='.repeat(40)}\n`;
            body += `Submitted via A Bite of Nutmeg website`;

            // Create mailto link
            const mailto = `mailto:chrishauman@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            // Try to open email client
            window.location.href = mailto;

            // Show fallback after a short delay (in case mailto doesn't work)
            setTimeout(() => {
                showReportFallback(subject, body);
            }, 500);

            // Reset form but keep modal open until fallback shows
            reportForm.reset();
        });
    }
}

// Show fallback if email client doesn't open
function showReportFallback(subject, body) {
    const modalContent = document.querySelector('.report-modal-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <button class="report-close" id="reportCloseFallback">&times;</button>
        <h2>Thanks for Your Report!</h2>
        <p>If your email app didn't open, please send this report manually:</p>
        <div class="report-fallback">
            <div class="report-email-to">
                <strong>Email to:</strong>
                <a href="mailto:chrishauman@gmail.com">chrishauman@gmail.com</a>
                <button class="copy-btn" id="copyEmail" title="Copy email">Copy</button>
            </div>
            <div class="report-subject">
                <strong>Subject:</strong> ${subject}
            </div>
            <div class="report-body">
                <strong>Message:</strong>
                <pre>${body}</pre>
                <button class="copy-btn" id="copyBody">Copy Message</button>
            </div>
        </div>
        <button class="report-done" id="reportDone">Done</button>
    `;

    // Add event listeners for the new buttons
    document.getElementById('reportCloseFallback').addEventListener('click', resetReportModal);
    document.getElementById('reportDone').addEventListener('click', resetReportModal);

    document.getElementById('copyEmail').addEventListener('click', () => {
        navigator.clipboard.writeText('chrishauman@gmail.com');
        document.getElementById('copyEmail').textContent = 'Copied!';
        setTimeout(() => {
            document.getElementById('copyEmail').textContent = 'Copy';
        }, 2000);
    });

    document.getElementById('copyBody').addEventListener('click', () => {
        navigator.clipboard.writeText(body);
        document.getElementById('copyBody').textContent = 'Copied!';
        setTimeout(() => {
            document.getElementById('copyBody').textContent = 'Copy Message';
        }, 2000);
    });
}

// Reset the report modal to its original state
function resetReportModal() {
    const reportModal = document.getElementById('reportModal');
    const modalContent = document.querySelector('.report-modal-content');

    if (reportModal) {
        reportModal.classList.remove('show');
    }

    // Restore original form HTML
    if (modalContent) {
        modalContent.innerHTML = `
            <button class="report-close" id="reportClose">&times;</button>
            <h2>Report a Problem</h2>
            <p>Help us keep our directory accurate. Let us know if something's wrong.</p>
            <form id="reportForm">
                <div class="form-group">
                    <label for="reportRestaurant">Restaurant Name</label>
                    <input type="text" id="reportRestaurant" placeholder="e.g., Joe's Pizza" required>
                </div>
                <div class="form-group">
                    <label for="reportTown">Town</label>
                    <select id="reportTown" required>
                        <option value="">Select a town...</option>
                        <option value="East Haven">East Haven</option>
                        <option value="Branford">Branford</option>
                        <option value="Guilford">Guilford</option>
                        <option value="Madison">Madison</option>
                        <option value="Clinton">Clinton</option>
                        <option value="Westbrook">Westbrook</option>
                        <option value="Old Saybrook">Old Saybrook</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="reportType">Problem Type</label>
                    <select id="reportType" required>
                        <option value="">Select issue type...</option>
                        <option value="Permanently Closed">Restaurant permanently closed</option>
                        <option value="Wrong Phone">Wrong phone number</option>
                        <option value="Wrong Address">Wrong address</option>
                        <option value="Wrong Category">Wrong cuisine/category</option>
                        <option value="Duplicate Listing">Duplicate listing</option>
                        <option value="Missing Restaurant">Restaurant not listed</option>
                        <option value="Other">Other issue</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="reportDetails">Details</label>
                    <textarea id="reportDetails" rows="3" placeholder="Please provide any additional details..."></textarea>
                </div>
                <div class="form-group">
                    <label for="reportEmail">Your Email (optional)</label>
                    <input type="email" id="reportEmail" placeholder="your@email.com">
                </div>
                <button type="submit" class="report-submit">Submit Report</button>
            </form>
        `;

        // Re-attach event listeners
        initReportModal();
    }
}

// Initialize Report Modal after DOM loads
document.addEventListener('DOMContentLoaded', initReportModal);
