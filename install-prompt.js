// Add to Home Screen prompt — detects device and shows appropriate install UI
(function() {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;

    // Don't show if user dismissed recently (7 days)
    const DISMISS_KEY = 'a2hs_dismissed';
    const DISMISS_DAYS = 7;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DAYS * 86400000) return;

    // Wait for page to settle before showing
    let deferredPrompt = null;

    // Detect platform
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg|OPR|Brave/.test(ua);

    // Android/Chrome: capture the native install prompt
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        showBanner('android');
    });

    // iOS Safari: show instructions banner after a short delay
    if (isSafari) {
        setTimeout(function() { showBanner('ios'); }, 2000);
    }

    function showBanner(platform) {
        // Build banner HTML
        const banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Add to home screen');

        let content;
        if (platform === 'ios') {
            content = `
                <div class="install-banner-icon">
                    <img src="/favicon-192.png" alt="" width="40" height="40">
                </div>
                <div class="install-banner-text">
                    <strong>Add Bite of Nutmeg to your phone</strong>
                    <span>Tap <svg width="16" height="16" viewBox="0 0 24 24" fill="#2EA3F2" style="vertical-align: -3px;"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg> then <strong>"Add to Home Screen"</strong></span>
                </div>
                <button class="install-banner-close" aria-label="Dismiss">&times;</button>
            `;
        } else {
            content = `
                <div class="install-banner-icon">
                    <img src="/favicon-192.png" alt="" width="40" height="40">
                </div>
                <div class="install-banner-text">
                    <strong>Add Bite of Nutmeg to your phone</strong>
                    <span>Quick access from your home screen</span>
                </div>
                <button class="install-banner-add">Add</button>
                <button class="install-banner-close" aria-label="Dismiss">&times;</button>
            `;
        }

        banner.innerHTML = content;

        // Inject styles
        if (!document.getElementById('installBannerStyles')) {
            const style = document.createElement('style');
            style.id = 'installBannerStyles';
            style.textContent = `
                #installBanner {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: #fff;
                    border-top: 3px solid #f0b323;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    animation: slideUpBanner 0.35s ease-out;
                }
                @keyframes slideUpBanner {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                #installBanner.hiding {
                    animation: slideDownBanner 0.25s ease-in forwards;
                }
                @keyframes slideDownBanner {
                    to { transform: translateY(100%); }
                }
                .install-banner-icon img {
                    border-radius: 10px;
                    display: block;
                }
                .install-banner-text {
                    flex: 1;
                    min-width: 0;
                }
                .install-banner-text strong {
                    display: block;
                    font-size: 0.95rem;
                    color: #1e3a6e;
                }
                .install-banner-text span {
                    font-size: 0.82rem;
                    color: #666;
                }
                .install-banner-add {
                    padding: 8px 20px;
                    background: #1e3a6e;
                    color: #fff;
                    border: none;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                }
                .install-banner-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #999;
                    cursor: pointer;
                    padding: 0 4px;
                    line-height: 1;
                }

                /* Ensure padding env for notched devices */
                @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    #installBanner {
                        padding-bottom: calc(14px + env(safe-area-inset-bottom));
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(banner);

        // Close handler
        banner.querySelector('.install-banner-close').addEventListener('click', function() {
            dismiss(banner);
        });

        // Android install handler
        var addBtn = banner.querySelector('.install-banner-add');
        if (addBtn && deferredPrompt) {
            addBtn.addEventListener('click', function() {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function() {
                    deferredPrompt = null;
                    dismiss(banner);
                });
            });
        }
    }

    function dismiss(banner) {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        banner.classList.add('hiding');
        banner.addEventListener('animationend', function() {
            banner.remove();
        });
    }
})();
