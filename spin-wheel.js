/* Spin Wheel - "Can't Decide?" cuisine picker modal */
(function () {
    // Town configuration
    const TOWNS = [
        { name: 'East Haven', abbr: 'EH', file: 'easthaven-restaurants.json' },
        { name: 'Branford',   abbr: 'B',  file: 'branford-restaurants.json' },
        { name: 'Guilford',   abbr: 'G',  file: 'guilford-restaurants.json' },
        { name: 'Madison',    abbr: 'M',  file: 'madison-restaurants.json' },
        { name: 'Clinton',    abbr: 'C',  file: 'clinton-restaurants.json' },
        { name: 'Westbrook',  abbr: 'W',  file: 'westbrook-restaurants.json' },
        { name: 'Old Saybrook', abbr: 'OS', file: 'old-saybrook-restaurants.json' }
    ];

    // Detect page context from script tag data attribute
    var scriptEl = document.querySelector('script[src*="spin-wheel.js"]');
    var pageTown = scriptEl ? scriptEl.getAttribute('data-town') : null;
    var isHomepage = !pageTown || pageTown === 'all';

    // Default categories (used as fallback if config fails to load)
    const DEFAULT_CATEGORIES = [
        { label: 'American', color: '#1e3a6e', matches: ['American', 'Bar & Grill', 'Bar', 'Greek', 'Steakhouse'] },
        { label: 'Pizza', color: '#f0b323', matches: ['Pizza'] },
        { label: 'Italian', color: '#2a4a8a', matches: ['Italian'] },
        { label: 'Seafood', color: '#d9a01f', matches: ['Seafood'] },
        { label: 'Asian', color: '#152a52', matches: ['Chinese', 'Japanese', 'Asian', 'Thai', 'Vietnamese', 'Asian Fusion'] },
        { label: 'Mexican & Latin', color: '#f5c94d', matches: ['Mexican', 'Latin American', 'Latin', 'Caribbean'] },
        { label: 'Cafe & Bakery', color: '#1e3a6e', matches: ['Cafe & Bakery', 'Cafe', 'Bakery', 'Dessert', 'Deli'] },
        { label: 'Indian & Eur.', color: '#e8a515', matches: ['Indian', 'Mediterranean', 'European', 'French'] },
        { label: 'Brewery & BBQ', color: '#f0b323', matches: ['Wine Bar', 'Brewery', 'BBQ', 'Vegan', 'Vegetarian'] }
    ];

    let WHEEL_CATEGORIES = DEFAULT_CATEGORIES;
    let SEGMENT_COUNT = WHEEL_CATEGORIES.length;
    let ARC = (2 * Math.PI) / SEGMENT_COUNT;

    let canvas, ctx, spinBtn, spinAgainBtn, showMoreBtn, resultsDiv, modal;
    let currentRotation = 0;
    let spinning = false;
    let stopping = false;
    let spinSpeed = 0;
    let animFrameId = null;
    let currentMatches = [];
    let showCount = 6;

    // Restaurant data cache per town
    var townDataCache = {};

    async function loadTownData(townName) {
        if (townDataCache[townName]) return townDataCache[townName];
        var config = TOWNS.find(function (t) { return t.name === townName; });
        if (!config) return [];
        try {
            var resp = await fetch(config.file);
            var json = await resp.json();
            var featuredNames = {};
            (json.featured || []).forEach(function (r) { featuredNames[r.name] = true; });
            var all = (json.restaurants || []).map(function (r) {
                var tier = featuredNames[r.name] ? 'featured' : r.enhanced ? 'premium' : 'regular';
                return Object.assign({}, r, { town: townName, _tier: tier });
            });
            townDataCache[townName] = all;
            return all;
        } catch (e) {
            return [];
        }
    }

    function getSelectedTowns() {
        var badges = document.querySelectorAll('.spin-town-badge.active');
        return Array.prototype.map.call(badges, function (b) { return b.getAttribute('data-town'); });
    }

    async function getSelectedRestaurants() {
        var towns = getSelectedTowns();
        var arrays = await Promise.all(towns.map(loadTownData));
        return [].concat.apply([], arrays);
    }

    function buildModalHTML() {
        var optionsHTML = '<option value="">All Towns</option>' +
            TOWNS.map(function (t) {
                var selected = !isHomepage && t.name === pageTown ? ' selected' : '';
                return '<option value="' + t.name + '"' + selected + '>' + t.name + '</option>';
            }).join('');

        var badgesHTML = TOWNS.map(function (t) {
            var activeClass = isHomepage || t.name === pageTown ? ' active' : '';
            return '<button type="button" class="spin-town-badge' + activeClass + '" data-town="' + t.name + '">' +
                '<span class="badge-full">' + t.name + '</span>' +
                '<span class="badge-abbr">' + t.abbr + '</span>' +
                '</button>';
        }).join('');

        return '<div id="spinModal" class="spin-modal">' +
            '<div class="spin-modal-content">' +
                '<button class="spin-modal-close" id="spinModalClose">&times;</button>' +
                '<h2>Can\'t Decide?</h2>' +
                '<p class="spin-subtitle">Give the wheel a spin and let fate pick your cuisine!</p>' +
                '<div class="spin-container">' +
                    '<div class="spin-controls">' +
                        '<div class="spin-town-filter">' +
                            '<label for="spinTownFilter">Filter by town:</label>' +
                            '<select id="spinTownFilter">' + optionsHTML + '</select>' +
                        '</div>' +
                        '<button id="spinBtn" class="spin-btn">Spin the Wheel!</button>' +
                    '</div>' +
                    '<div class="spin-town-badges" id="spinTownBadges">' + badgesHTML + '</div>' +
                    '<div class="spin-wheel-wrapper">' +
                        '<div class="spin-pointer"></div>' +
                        '<canvas id="spinCanvas" width="400" height="400"></canvas>' +
                    '</div>' +
                    '<div id="spinResults" class="spin-results" style="display:none;">' +
                        '<h3 id="spinResultCategory"></h3>' +
                        '<p id="spinResultCount" class="spin-result-count"></p>' +
                        '<div id="spinResultCards" class="spin-result-cards"></div>' +
                        '<div class="spin-result-actions">' +
                            '<button id="spinAgainBtn" class="spin-again-btn">Spin Again</button>' +
                            '<button id="spinShowMore" class="spin-again-btn" style="display:none;">Show More</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    async function init() {
        // Inject modal HTML
        var wrapper = document.createElement('div');
        wrapper.innerHTML = buildModalHTML();
        document.body.appendChild(wrapper.firstChild);

        canvas = document.getElementById('spinCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        spinBtn = document.getElementById('spinBtn');
        spinAgainBtn = document.getElementById('spinAgainBtn');
        showMoreBtn = document.getElementById('spinShowMore');
        resultsDiv = document.getElementById('spinResults');
        modal = document.getElementById('spinModal');

        // Load config from JSON file
        try {
            var resp = await fetch('spin-wheel-config.json');
            var data = await resp.json();
            if (data.categories && data.categories.length > 0) {
                WHEEL_CATEGORIES = data.categories;
                SEGMENT_COUNT = WHEEL_CATEGORIES.length;
                ARC = (2 * Math.PI) / SEGMENT_COUNT;
            }
        } catch (e) {
            // Fall back to defaults
        }

        drawWheel(0);

        // Spin button (toggles between Spin and Stop)
        spinBtn.addEventListener('click', function () {
            if (spinning && !stopping) {
                stopSpin();
            } else if (!spinning) {
                startSpin();
            }
        });
        spinAgainBtn.addEventListener('click', function () {
            resultsDiv.style.display = 'none';
            currentMatches = [];
            showCount = 6;
            startSpin();
        });

        showMoreBtn.addEventListener('click', function () {
            showCount += 6;
            renderCards();
        });

        // Sync helpers
        var townFilter = document.getElementById('spinTownFilter');
        var badgeContainer = document.getElementById('spinTownBadges');

        function syncBadgesFromDropdown() {
            var val = townFilter.value;
            var badges = badgeContainer.querySelectorAll('.spin-town-badge');
            badges.forEach(function (b) {
                if (val === '') {
                    b.classList.add('active');
                } else {
                    b.classList.toggle('active', b.getAttribute('data-town') === val);
                }
            });
        }

        function syncDropdownFromBadges() {
            var active = badgeContainer.querySelectorAll('.spin-town-badge.active');
            if (active.length === TOWNS.length) {
                townFilter.value = '';
            } else if (active.length === 1) {
                townFilter.value = active[0].getAttribute('data-town');
            } else {
                // Multiple but not all — no exact dropdown match, keep as-is
                townFilter.value = '';
            }
        }

        // Dropdown change → update badges
        townFilter.addEventListener('change', syncBadgesFromDropdown);

        // Badge click → toggle and sync dropdown
        badgeContainer.addEventListener('click', function (e) {
            var badge = e.target.closest('.spin-town-badge');
            if (!badge) return;
            badge.classList.toggle('active');
            // Ensure at least one town remains selected
            var activeBadges = badgeContainer.querySelectorAll('.spin-town-badge.active');
            if (activeBadges.length === 0) {
                badge.classList.add('active');
            }
            syncDropdownFromBadges();
        });

        // Modal open
        var trigger = document.getElementById('spinWheelTrigger');
        if (trigger) {
            trigger.addEventListener('click', openModal);
        }

        // Modal close
        document.getElementById('spinModalClose').addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function drawWheel(rotation) {
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 4;

        ctx.clearRect(0, 0, size, size);

        for (let i = 0; i < SEGMENT_COUNT; i++) {
            const startAngle = rotation + i * ARC;
            const endAngle = startAngle + ARC;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = WHEEL_CATEGORIES[i].color;
            ctx.fill();

            // Segment border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + ARC / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = isLightColor(WHEEL_CATEGORIES[i].color) ? '#152a52' : '#ffffff';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
            var label = WHEEL_CATEGORIES[i].label;
            var maxWidth = radius - 44;
            if (ctx.measureText(label).width > maxWidth) {
                // Split into two lines
                var words = label.split(/[\s&]+/);
                var sep = label.includes('&') ? ' &' : '';
                var line1 = words[0] + sep;
                var line2 = words.slice(sep ? 2 : 1).join(' ');
                ctx.fillText(line1, radius - 14, -5);
                ctx.fillText(line2, radius - 14, 13);
            } else {
                ctx.fillText(label, radius - 14, 5);
            }
            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(center, center, 24, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#f0b323';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center icon - fork & knife
        ctx.save();
        ctx.translate(center, center);
        if (spinning && !stopping) {
            // Pulse effect while spinning
            var pulse = 1 + 0.08 * Math.sin(Date.now() / 150);
            ctx.scale(pulse, pulse);
        }
        ctx.fillStyle = '#1e3a6e';
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F374}', 0, 0);
        ctx.restore();
    }

    function isLightColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 150;
    }

    async function startSpin() {
        if (spinning) return;
        spinning = true;
        stopping = false;
        spinBtn.textContent = 'Stop!';
        spinBtn.classList.add('stop-mode');
        resultsDiv.style.display = 'none';

        // Pre-warm cache for selected towns
        await getSelectedRestaurants();

        // Spin continuously at a steady speed
        spinSpeed = 0.18; // radians per frame (~10 rad/s at 60fps)
        var lastTime = performance.now();

        function animate(now) {
            var dt = (now - lastTime) / 16.667; // normalize to 60fps
            lastTime = now;

            if (stopping) {
                // Decelerate gradually
                spinSpeed *= 0.97;
                if (spinSpeed < 0.001) {
                    spinSpeed = 0;
                    spinning = false;
                    stopping = false;
                    spinBtn.textContent = 'Spin the Wheel!';
                    spinBtn.classList.remove('stop-mode');
                    drawWheel(currentRotation);
                    showResults();
                    return;
                }
            }

            currentRotation += spinSpeed * dt;
            drawWheel(currentRotation);
            animFrameId = requestAnimationFrame(animate);
        }

        animFrameId = requestAnimationFrame(animate);

        // Auto-stop after 5 seconds if user doesn't hit stop
        setTimeout(function () {
            if (spinning && !stopping) {
                stopSpin();
            }
        }, 5000);
    }

    function stopSpin() {
        stopping = true;
        spinBtn.disabled = true;
        spinBtn.textContent = 'Stopping...';
        // Re-enable after wheel stops (handled in animate loop)
        var checkDone = setInterval(function () {
            if (!spinning) {
                clearInterval(checkDone);
                spinBtn.disabled = false;
            }
        }, 100);
    }

    function getWinningIndex() {
        const pointerAngle = -Math.PI / 2;
        let normalizedRotation = currentRotation % (2 * Math.PI);
        if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;

        for (let i = 0; i < SEGMENT_COUNT; i++) {
            let segStart = (normalizedRotation + i * ARC) % (2 * Math.PI);
            let segEnd = (segStart + ARC) % (2 * Math.PI);

            let pointer = pointerAngle;
            if (pointer < 0) pointer += 2 * Math.PI;

            if (segEnd > segStart) {
                if (pointer >= segStart && pointer < segEnd) return i;
            } else {
                if (pointer >= segStart || pointer < segEnd) return i;
            }
        }
        return 0;
    }

    function matchesCategory(restaurant, wheelCat) {
        const cat = restaurant.category || '';
        const cats = Array.isArray(cat) ? cat : [cat];
        return cats.some(function (c) {
            return wheelCat.matches.some(function (m) {
                return c.toLowerCase().trim() === m.toLowerCase();
            });
        });
    }

    async function showResults() {
        const winIndex = getWinningIndex();
        const wheelCat = WHEEL_CATEGORIES[winIndex];
        var selectedTowns = getSelectedTowns();

        var restaurants = await getSelectedRestaurants();

        // Get pinned restaurants for this category (show first)
        var pinned = wheelCat.pinnedRestaurants || [];
        var pinnedMatches = [];
        pinned.forEach(function (p) {
            var found = restaurants.filter(function (r) {
                return r.name === p.name && r.town === p.town;
            });
            if (found.length > 0) {
                pinnedMatches.push(found[0]);
            }
        });

        // Get category-matched restaurants (excluding pinned)
        var pinnedKeys = pinnedMatches.map(function (r) { return r.name + '|' + r.town; });
        var categoryMatches = restaurants.filter(function (r) {
            if (!matchesCategory(r, wheelCat)) return false;
            if (pinnedKeys.indexOf(r.name + '|' + r.town) !== -1) return false;
            return true;
        });

        // Split into featured, premium, and regular
        var featured = categoryMatches.filter(function (r) { return r._tier === 'featured'; });
        var premium = categoryMatches.filter(function (r) { return r._tier === 'premium'; });
        var regular = categoryMatches.filter(function (r) { return r._tier === 'regular'; });

        // Shuffle each group
        function shuffle(arr) {
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
            return arr;
        }
        shuffle(featured);
        shuffle(premium);
        shuffle(regular);

        // Pinned first, then featured, premium, then random regular
        currentMatches = pinnedMatches.concat(featured, premium, regular);

        showCount = 6;

        var categoryEl = document.getElementById('spinResultCategory');
        categoryEl.textContent = wheelCat.label + '!';

        if (currentMatches.length === 0) {
            var countEl = document.getElementById('spinResultCount');
            var cardsEl = document.getElementById('spinResultCards');
            countEl.textContent = '';
            var msg = 'No ' + wheelCat.label + ' restaurants found';
            if (selectedTowns.length < TOWNS.length) {
                msg += '. Try selecting more towns or spin again!';
            } else {
                msg += '. Spin again!';
            }
            cardsEl.innerHTML = '<div class="spin-no-results">' + msg + '</div>';
            showMoreBtn.style.display = 'none';
        } else {
            renderCards();
        }

        resultsDiv.style.display = 'block';
    }

    function renderCards() {
        var display = currentMatches.slice(0, showCount);
        var selectedTowns = getSelectedTowns();

        var countEl = document.getElementById('spinResultCount');
        var cardsEl = document.getElementById('spinResultCards');

        var townLabel = selectedTowns.length === TOWNS.length ? '' : ' in ' + selectedTowns.join(', ');
        countEl.textContent = 'Showing ' + display.length + ' of ' + currentMatches.length + ' options' + townLabel;

        cardsEl.innerHTML = display.map(function (r) {
            var category = Array.isArray(r.category) ? r.category.join(' & ') : (r.category || '');
            var phone = r.phone || '';
            var address = r.address || '';
            var rTown = r.town || '';
            return '<div class="spin-card">' +
                '<h4>' + escapeHtml(r.name) + '</h4>' +
                '<div class="spin-card-cuisine">' + escapeHtml(category) + '</div>' +
                '<span class="spin-card-town">' + escapeHtml(rTown) + '</span>' +
                (address ? '<div class="spin-card-address">' + escapeHtml(address) + '</div>' : '') +
                (phone ? '<div class="spin-card-phone"><a href="tel:' + phone.replace(/[^0-9]/g, '') + '">' + escapeHtml(phone) + '</a></div>' : '') +
                '</div>';
        }).join('');

        showMoreBtn.style.display = showCount < currentMatches.length ? 'inline-block' : 'none';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
