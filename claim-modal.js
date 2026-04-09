// "Is This Your Restaurant?" Claim Modal - Shared across town pages
(function() {
    function initClaimModal() {
        // Inject modal HTML
        var modal = document.createElement('div');
        modal.className = 'claim-modal';
        modal.id = 'claimModal';
        modal.innerHTML = `
            <div class="claim-modal-content">
                <button class="claim-modal-close" id="claimClose">&times;</button>
                <h2>Is this your restaurant?</h2>
                <p class="claim-restaurant-name" id="claimRestaurantName"></p>
                <p class="claim-description">Claim your listing to add your website, logo, and stand out to diners searching the CT shoreline.</p>
                <div class="claim-modal-actions">
                    <a href="/upgrade" class="claim-btn-yes" id="claimYes">Yes, this is mine!</a>
                    <button class="claim-btn-no" id="claimNo">No, just browsing</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        var STORAGE_KEY = 'claim_modal_dismissed';

        // Don't initialize if already dismissed
        if (localStorage.getItem(STORAGE_KEY)) return;

        var currentName = '';

        function showModal(name) {
            currentName = name;
            document.getElementById('claimRestaurantName').textContent = name;
            document.getElementById('claimYes').href = 'upgrade.html?restaurant=' + encodeURIComponent(name);
            modal.classList.add('show');
        }

        function closeModal() {
            localStorage.setItem(STORAGE_KEY, '1');
            modal.classList.remove('show');
            currentName = '';
            // Remove the click listener since we won't show again
            document.removeEventListener('click', handleCardClick);
        }

        function handleCardClick(e) {
            var card = e.target.closest('.restaurant-item');
            if (!card) return;

            // Don't intercept featured or premium cards
            if (card.classList.contains('featured-highlight') || card.classList.contains('enhanced-highlight')) return;

            // Don't intercept clicks on links (phone, etc.)
            if (e.target.closest('a')) return;

            var h3 = card.querySelector('h3');
            if (!h3) return;

            showModal(h3.textContent.trim());
        }

        // Event delegation for restaurant card clicks
        document.addEventListener('click', handleCardClick);

        // Close handlers
        document.getElementById('claimClose').addEventListener('click', closeModal);
        document.getElementById('claimNo').addEventListener('click', closeModal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClaimModal);
    } else {
        initClaimModal();
    }
})();
