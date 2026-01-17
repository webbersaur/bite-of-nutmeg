// Report a Problem Modal - Shared across all pages
(function() {
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

        // Get default town from current page if possible
        const defaultTown = document.body.className.match(/(\w+)-page/)?.[1] || '';
        const townMap = {
            'branford': 'Branford',
            'guilford': 'Guilford',
            'madison': 'Madison',
            'clinton': 'Clinton',
            'westbrook': 'Westbrook',
            'easthaven': 'East Haven',
            'oldsaybrook': 'Old Saybrook'
        };
        const selectedTown = townMap[defaultTown.replace('-', '')] || '';

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
                            <option value="East Haven"${selectedTown === 'East Haven' ? ' selected' : ''}>East Haven</option>
                            <option value="Branford"${selectedTown === 'Branford' ? ' selected' : ''}>Branford</option>
                            <option value="Guilford"${selectedTown === 'Guilford' ? ' selected' : ''}>Guilford</option>
                            <option value="Madison"${selectedTown === 'Madison' ? ' selected' : ''}>Madison</option>
                            <option value="Clinton"${selectedTown === 'Clinton' ? ' selected' : ''}>Clinton</option>
                            <option value="Westbrook"${selectedTown === 'Westbrook' ? ' selected' : ''}>Westbrook</option>
                            <option value="Old Saybrook"${selectedTown === 'Old Saybrook' ? ' selected' : ''}>Old Saybrook</option>
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReportModal);
    } else {
        initReportModal();
    }
})();
