/* phone-search.js — Autocomplete dropdown for restaurant search
   Drop onto any page with id="searchInput". Shows matching restaurant
   names as you type; click one to go to its town page. */
(function() {
    var townFiles = [
        { file: 'branford-restaurants.json', town: 'Branford', slug: 'branford' },
        { file: 'guilford-restaurants.json', town: 'Guilford', slug: 'guilford' },
        { file: 'easthaven-restaurants.json', town: 'East Haven', slug: 'east-haven' },
        { file: 'madison-restaurants.json', town: 'Madison', slug: 'madison' },
        { file: 'clinton-restaurants.json', town: 'Clinton', slug: 'clinton' },
        { file: 'westbrook-restaurants.json', town: 'Westbrook', slug: 'westbrook' },
        { file: 'old-saybrook-restaurants.json', town: 'Old Saybrook', slug: 'old-saybrook' }
    ];

    var allRestaurants = [];
    var loaded = false;

    async function loadAll() {
        if (loaded) return;
        loaded = true;
        var responses = await Promise.all(
            townFiles.map(function(t) { return fetch('/' + t.file).then(function(r) { return r.json(); }).catch(function() { return null; }); })
        );
        responses.forEach(function(data, i) {
            if (!data || !data.restaurants) return;
            data.restaurants.forEach(function(r) {
                allRestaurants.push({
                    name: r.name,
                    town: townFiles[i].town,
                    slug: townFiles[i].slug,
                    category: Array.isArray(r.category) ? r.category.join(' & ') : (r.category || '')
                });
            });
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function init() {
        var input = document.getElementById('searchInput');
        if (!input) return;

        // Inject styles
        var style = document.createElement('style');
        style.textContent =
            '.ac-wrap{position:relative}' +
            '.ac-dropdown{position:absolute;top:100%;left:0;right:0;background:#fff;border-radius:0 0 12px 12px;box-shadow:0 8px 24px rgba(0,0,0,.15);max-height:320px;overflow-y:auto;z-index:1000;display:none}' +
            '.ac-item{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;text-decoration:none;color:inherit;border-bottom:1px solid #f0f0f0;transition:background .15s}' +
            '.ac-item:last-child{border-bottom:none}' +
            '.ac-item:hover,.ac-item.ac-active{background:#f8f5ec}' +
            '.ac-name{font-family:"Playfair Display",serif;font-size:1rem;color:#1e3a6e;font-weight:600}' +
            '.ac-town{font-family:Montserrat,sans-serif;font-size:.8rem;color:#999;white-space:nowrap;margin-left:1rem}' +
            '.ac-empty{padding:14px 16px;font-family:Montserrat,sans-serif;font-size:.9rem;color:#999;text-align:center}';
        document.head.appendChild(style);

        // Wrap the search box and inject dropdown
        var searchBox = input.closest('.town-hero-search-box') || input.closest('.error-search-box') || input.parentElement;
        var wrapper = document.createElement('div');
        wrapper.className = 'ac-wrap';
        searchBox.parentNode.insertBefore(wrapper, searchBox);
        wrapper.appendChild(searchBox);

        var dropdown = document.createElement('div');
        dropdown.className = 'ac-dropdown';
        wrapper.appendChild(dropdown);

        var debounceTimer = null;
        var activeIndex = -1;

        function getItems() {
            return dropdown.querySelectorAll('.ac-item');
        }

        function setActive(index) {
            var items = getItems();
            items.forEach(function(el) { el.classList.remove('ac-active'); });
            activeIndex = index;
            if (index >= 0 && index < items.length) {
                items[index].classList.add('ac-active');
                items[index].scrollIntoView({ block: 'nearest' });
            }
        }

        async function doSearch() {
            await loadAll();
            var query = input.value.trim().toLowerCase();
            activeIndex = -1;

            if (!query || query.length < 2) {
                dropdown.style.display = 'none';
                return;
            }

            var matches = allRestaurants.filter(function(r) {
                var words = r.name.toLowerCase().split(/[\s\u2019'&\-\/]+/);
                var nameMatch = words.some(function(w) { return w.indexOf(query) === 0; }) || r.name.toLowerCase().indexOf(query) === 0;
                return nameMatch;
            });

            matches.sort(function(a, b) { return a.name.localeCompare(b.name); });

            // Limit to 8 results
            var display = matches.slice(0, 8);

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="ac-empty">No restaurants found</div>';
            } else {
                dropdown.innerHTML = display.map(function(r) {
                    return '<a class="ac-item" href="/restaurants-in-' + r.slug + '">' +
                        '<span class="ac-name">' + escapeHtml(r.name) + '</span>' +
                        '<span class="ac-town">' + escapeHtml(r.town) + '</span>' +
                        '</a>';
                }).join('');
            }

            dropdown.style.display = 'block';
        }

        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(doSearch, 150);
        });

        input.addEventListener('keydown', function(e) {
            var items = getItems();
            if (!items.length || dropdown.style.display === 'none') return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(Math.min(activeIndex + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                items[activeIndex].click();
            }
        });

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Re-show on focus if there's a query
        input.addEventListener('focus', function() {
            if (input.value.trim().length >= 2 && dropdown.innerHTML) {
                dropdown.style.display = 'block';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
