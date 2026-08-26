// content.js - Customized for your university portal with #11458A
(function() {
    'use strict';

    // Define the 6 rating options with new emojis
    const RATINGS = [
        { value: 'very_bad', label: 'Very Bad', emoji: '🤮', color: '#dc3545' },
        { value: 'bad', label: 'Bad', emoji: '🤢', color: '#fd7e14' },
        { value: 'average', label: 'Average', emoji: '😐', color: '#ffc107' },
        { value: 'good', label: 'Good', emoji: '🙂', color: '#20c997' },
        { value: 'very_good', label: 'Very Good', emoji: '🫡', color: '#17a2b8' },
        { value: 'excellent', label: 'Excellent', emoji: '👏😱', color: '#007bff' }
    ];

    // Map rating text to option values
    const ratingValueMap = {
        'very bad': 'very_bad',
        'bad': 'bad',
        'average': 'average',
        'good': 'good',
        'very good': 'very_good',
        'excellent': 'excellent'
    };

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'batchRate') {
            const ratingValue = request.rating;
            const result = batchRateAllSheets(ratingValue);
            sendResponse(result);
        } else if (request.action === 'getSheetCount') {
            const count = findAllRatingSelects().length;
            sendResponse({ count: count });
        }
        return true;
    });

    // Find all rating select dropdowns on the page
    function findAllRatingSelects() {
        const selects = document.querySelectorAll('select[id*="materialReviewModal"][id$="Rating"]');
        
        if (selects.length === 0) {
            const fallbackSelects = document.querySelectorAll('select[name="rating"]');
            return fallbackSelects;
        }
        
        return selects;
    }

    // Find the submit/save button for each rating
    function findSubmitButton(selectElement) {
        const modal = selectElement.closest('.modal, .modal-content, form');
        if (!modal) return null;
        
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.btn-submit',
            '.btn-primary',
            '.btn-success',
            '.modal-footer button:last-child'
        ];
        
        for (let selector of submitSelectors) {
            try {
                const btn = modal.querySelector(selector);
                if (btn) return btn;
            } catch (e) {
                continue;
            }
        }
        
        const buttons = modal.querySelectorAll('button');
        for (let btn of buttons) {
            const text = btn.innerText.toLowerCase();
            if (text.includes('submit') || text.includes('save') || text.includes('rate') || text.includes('ok')) {
                return btn;
            }
        }
        
        return null;
    }

    // Main function to rate all sheets
    function batchRateAllSheets(ratingValue) {
        const selects = findAllRatingSelects();
        let successCount = 0;
        let failCount = 0;
        const details = [];
        const submittedModals = new Set();

        const targetValue = ratingValueMap[ratingValue.toLowerCase().trim()];
        
        // Find the emoji for the selected rating
        const selectedRating = RATINGS.find(r => r.value === targetValue);
        const emoji = selectedRating ? selectedRating.emoji : '⭐';
        
        if (!targetValue) {
            return {
                total: selects.length,
                success: 0,
                failed: selects.length,
                details: ['Invalid rating value. Use: very_bad, bad, average, good, very_good, excellent'],
                submitted: 'No rating selected'
            };
        }

        if (selects.length === 0) {
            const modalSelects = document.querySelectorAll('.modal select[name="rating"], .modal-content select[name="rating"]');
            if (modalSelects.length > 0) {
                return processSelects(modalSelects, targetValue, emoji);
            }
            return {
                total: 0,
                success: 0,
                failed: 0,
                details: ['No rating dropdowns found on the page. Make sure you\'re on the lecture sheet page.'],
                submitted: 'No forms found'
            };
        }

        return processSelects(selects, targetValue, emoji);

        function processSelects(selectElements, targetVal, emojiIcon) {
            let success = 0;
            let failed = 0;
            const detailMessages = [];
            const formsToSubmit = new Set();

            selectElements.forEach((select, index) => {
                try {
                    select.value = targetVal;
                    
                    const changeEvent = new Event('change', { bubbles: true });
                    select.dispatchEvent(changeEvent);
                    
                    const inputEvent = new Event('input', { bubbles: true });
                    select.dispatchEvent(inputEvent);
                    
                    const form = select.closest('form');
                    if (form) {
                        formsToSubmit.add(form);
                    }
                    
                    const submitBtn = findSubmitButton(select);
                    if (submitBtn && !submittedModals.has(submitBtn)) {
                        submittedModals.add(submitBtn);
                        setTimeout(() => {
                            submitBtn.click();
                            console.log(`%c${emojiIcon} Sheet ${index + 1}: Rated "${targetVal}"`, 'color: #11458A; font-weight: bold;');
                        }, 300 * index);
                        detailMessages.push(`${emojiIcon} Sheet ${index + 1}: Rated "${targetVal}" and submitted`);
                    } else {
                        detailMessages.push(`${emojiIcon} Sheet ${index + 1}: Rated "${targetVal}" (manual submit may be needed)`);
                    }
                    
                    success++;
                } catch (error) {
                    failed++;
                    detailMessages.push(`❌ Sheet ${index + 1}: Error - ${error.message}`);
                }
            });

            if (submittedModals.size === 0 && formsToSubmit.size > 0) {
                formsToSubmit.forEach(form => {
                    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .btn-primary, .btn-success');
                    if (submitBtn) {
                        setTimeout(() => {
                            submitBtn.click();
                        }, 500);
                        detailMessages.push('📨 Submitted the form');
                    }
                });
            }

            return {
                total: selectElements.length,
                success: success,
                failed: failed,
                details: detailMessages,
                submitted: submittedModals.size > 0 ? `${submittedModals.size} form(s) submitted` : 'No forms submitted - check manually'
            };
        }
    }

    // Function to scan for modals
    function scanForModals() {
        const modals = document.querySelectorAll('.modal, .modal-content, [role="dialog"]');
        const results = [];
        modals.forEach(modal => {
            if (modal.offsetParent !== null) {
                const select = modal.querySelector('select[name="rating"]');
                if (select) {
                    results.push(select);
                }
            }
        });
        return results;
    }

    // Expose functions for debugging
    window.batchRater = {
        findAll: findAllRatingSelects,
        rateAll: batchRateAllSheets,
        scanModals: scanForModals,
        RATINGS: RATINGS
    };

    // Log with university color
    const count = findAllRatingSelects().length;
    console.log(`%c🎯 Batch Rater loaded. Found ${count} rating dropdown(s) on this page.`, 'color: #11458A; font-weight: bold; font-size: 14px;');
    console.log('%c📊 Available ratings:', 'color: #11458A; font-weight: bold;');
    RATINGS.forEach(r => {
        console.log(`%c  ${r.emoji} ${r.label} → ${r.value}`, `color: ${r.color};`);
    });
    
    if (count === 0) {
        console.log('%c💡 Tip: Your portal might use modals. Try clicking on a lecture sheet to open the rating modal first.', 'color: #6c757d;');
    }
})();