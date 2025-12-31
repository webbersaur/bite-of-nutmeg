// Branford Page JavaScript
// Handles featured restaurants, category tabs, and search

let data = null;
let currentCategory = 'All';
let searchTerm = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderCategoryTabs();
    renderFeaturedRestaurants();
    renderRestaurantList();
    initSearch();
});

// Load restaurant data
async function loadData() {
    try {
        const response = await fetch('branford-restaurants.json');
        data = await response.json();
    } catch (error) {
        console.error('Error loading restaurant data:', error);
        data = { featured: [], restaurants: [], categories: [] };
    }
}

// Render category tabs
function renderCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');

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
                    ? `<img src="${restaurant.image}" alt="${restaurant.name}">`
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

// Filter restaurants based on category only
function getFilteredRestaurants() {
    return data.restaurants.filter(restaurant => {
        return currentCategory === 'All' ||
            restaurant.category === currentCategory ||
            restaurant.category.includes(currentCategory);
    });
}

// Render restaurant list
function renderRestaurantList() {
    const list = document.getElementById('restaurantList');
    const countElement = document.getElementById('resultsCount');

    const filtered = getFilteredRestaurants();
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

    list.innerHTML = filtered.map(restaurant => `
        <div class="restaurant-item">
            <h3>${restaurant.name}</h3>
            <span class="category">${restaurant.category}</span>
            <a href="tel:${restaurant.phone.replace(/[^0-9]/g, '')}" class="phone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#2EA3F2"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                ${restaurant.phone}
            </a>
        </div>
    `).join('');
}

// Initialize search
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderSearchResults();
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Show search results when focusing on input (if there's a search term)
    searchInput.addEventListener('focus', () => {
        if (searchTerm.length > 0) {
            renderSearchResults();
        }
    });
}

// Render search results dropdown
function renderSearchResults() {
    const searchResults = document.getElementById('searchResults');

    if (searchTerm.length === 0) {
        searchResults.classList.remove('active');
        return;
    }

    const filtered = data.restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    searchResults.classList.add('active');

    if (filtered.length === 0) {
        searchResults.innerHTML = `<div class="no-results-msg">No restaurants found for "${searchTerm}"</div>`;
        return;
    }

    searchResults.innerHTML = filtered.slice(0, 8).map(restaurant => `
        <a href="tel:${restaurant.phone.replace(/[^0-9]/g, '')}" class="result-item">
            <div class="result-info">
                <h4>${restaurant.name}</h4>
                <span class="result-category">${restaurant.category}</span>
            </div>
            <span class="result-phone">${restaurant.phone}</span>
        </a>
    `).join('');
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
