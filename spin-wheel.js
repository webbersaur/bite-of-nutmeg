/* Spin Wheel - "Can't Decide?" cuisine picker modal */
(function () {
    const WHEEL_CATEGORIES = [
        { label: 'American', color: '#1e3a6e', matches: ['American', 'Bar & Grill', 'Bar'] },
        { label: 'Pizza', color: '#f0b323', matches: ['Pizza'] },
        { label: 'Italian', color: '#2a4a8a', matches: ['Italian'] },
        { label: 'Seafood', color: '#d9a01f', matches: ['Seafood'] },
        { label: 'Asian', color: '#152a52', matches: ['Chinese', 'Japanese', 'Asian', 'Thai', 'Vietnamese', 'Asian Fusion'] },
        { label: 'Mexican & Latin', color: '#f5c94d', matches: ['Mexican', 'Latin American', 'Latin', 'Caribbean'] },
        { label: 'Cafe & Bakery', color: '#1e3a6e', matches: ['Cafe & Bakery', 'Cafe', 'Bakery', 'Dessert', 'Deli'] },
        { label: 'Indian & Med.', color: '#e8a515', matches: ['Indian', 'Mediterranean', 'European'] },
        { label: 'Fast Food', color: '#2a4a8a', matches: ['Fast Food'] },
        { label: 'Greek', color: '#c8930e', matches: ['Greek'] },
        { label: 'Fine Dining', color: '#152a52', matches: ['French', 'Fine Dining', 'Steakhouse'] },
        { label: 'Brewery & BBQ', color: '#f0b323', matches: ['Wine Bar', 'Brewery', 'BBQ', 'Vegan', 'Vegetarian'] }
    ];

    const SEGMENT_COUNT = WHEEL_CATEGORIES.length;
    const ARC = (2 * Math.PI) / SEGMENT_COUNT;

    let canvas, ctx, spinBtn, spinAgainBtn, showMoreBtn, resultsDiv, townFilter, modal;
    let currentRotation = 0;
    let spinning = false;
    let currentMatches = [];
    let showCount = 6;

    function init() {
        canvas = document.getElementById('spinCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        spinBtn = document.getElementById('spinBtn');
        spinAgainBtn = document.getElementById('spinAgainBtn');
        showMoreBtn = document.getElementById('spinShowMore');
        resultsDiv = document.getElementById('spinResults');
        townFilter = document.getElementById('spinTownFilter');
        modal = document.getElementById('spinModal');

        drawWheel(0);

        // Spin button
        spinBtn.addEventListener('click', startSpin);
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
            ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(WHEEL_CATEGORIES[i].label, radius - 14, 5);
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

        // Center text
        ctx.fillStyle = '#1e3a6e';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPIN', center, center + 4);
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
        spinBtn.disabled = true;
        resultsDiv.style.display = 'none';

        // Ensure data is loaded (reuses app.js lazy loader)
        if (typeof loadRestaurants === 'function') {
            await loadRestaurants();
        }

        // Random target: at least 5 full spins + random landing
        const extraSpins = 5 * 2 * Math.PI;
        const randomAngle = Math.random() * 2 * Math.PI;
        const targetRotation = currentRotation + extraSpins + randomAngle;

        const startRotation = currentRotation;
        const totalDelta = targetRotation - startRotation;
        const duration = 4500;
        const startTime = performance.now();

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Cubic ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            currentRotation = startRotation + totalDelta * eased;

            drawWheel(currentRotation);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                currentRotation = targetRotation;
                spinning = false;
                spinBtn.disabled = false;
                showResults();
            }
        }

        requestAnimationFrame(animate);
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
                return c.toLowerCase().includes(m.toLowerCase());
            });
        });
    }

    function showResults() {
        const winIndex = getWinningIndex();
        const wheelCat = WHEEL_CATEGORIES[winIndex];
        const town = townFilter.value;

        var restaurants = (typeof allRestaurants !== 'undefined' ? allRestaurants : []);
        currentMatches = restaurants.filter(function (r) {
            if (!matchesCategory(r, wheelCat)) return false;
            if (town && r.town !== town) return false;
            return true;
        });

        // Shuffle
        for (var i = currentMatches.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = currentMatches[i];
            currentMatches[i] = currentMatches[j];
            currentMatches[j] = temp;
        }

        showCount = 6;

        var categoryEl = document.getElementById('spinResultCategory');
        categoryEl.textContent = wheelCat.label + '!';

        if (currentMatches.length === 0) {
            var countEl = document.getElementById('spinResultCount');
            var cardsEl = document.getElementById('spinResultCards');
            countEl.textContent = '';
            var msg = 'No ' + wheelCat.label + ' restaurants found';
            if (town) msg += ' in ' + town + '. Try "All Towns" or spin again!';
            else msg += '. Spin again!';
            cardsEl.innerHTML = '<div class="spin-no-results">' + msg + '</div>';
            showMoreBtn.style.display = 'none';
        } else {
            renderCards();
        }

        resultsDiv.style.display = 'block';
    }

    function renderCards() {
        var display = currentMatches.slice(0, showCount);
        var town = townFilter.value;

        var countEl = document.getElementById('spinResultCount');
        var cardsEl = document.getElementById('spinResultCards');

        countEl.textContent = 'Showing ' + display.length + ' of ' + currentMatches.length + ' options' + (town ? ' in ' + town : '');

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
