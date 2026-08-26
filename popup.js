// popup.js
let selectedRating = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check how many sheets are on the page
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSheetCount' });
        const count = response.count || 0;
        
        if (count === 0) {
            document.getElementById('sheetCount').innerHTML = `
                ⚠️ No rating dropdowns found on this page.<br>
                <span style="font-size:12px;color:#6c757d;">
                    Make sure you're on the lecture sheet page.<br>
                    If ratings are in modals, click a sheet to open it first.
                </span>
            `;
        } else {
            document.getElementById('sheetCount').textContent = `📄 Found ${count} lecture sheet(s) to rate`;
        }
    } catch (e) {
        document.getElementById('sheetCount').innerHTML = `
            ⚠️ Could not connect to the page.<br>
            <span style="font-size:12px;color:#6c757d;">
                Refresh the page and try again.
            </span>
        `;
    }

    // Handle rating option clicks
    const options = document.querySelectorAll('.rating-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedRating = option.dataset.rating;
            
            const btn = document.getElementById('batchBtn');
            btn.disabled = false;
            
            // Get the emoji from the selected option
            const emoji = option.querySelector('.emoji').textContent;
            const label = option.querySelector('.label').textContent;
            btn.innerHTML = `${emoji} Rate All as "${label}"`;
        });
    });

    // Handle batch rate button click
    document.getElementById('batchBtn').addEventListener('click', async () => {
        if (!selectedRating) {
            showStatus('Please select a rating first.', 'info');
            return;
        }

        const btn = document.getElementById('batchBtn');
        const loader = document.getElementById('loader');
        const status = document.getElementById('status');

        btn.disabled = true;
        loader.classList.add('active');
        status.style.display = 'none';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'batchRate',
                rating: selectedRating
            });

            // Show results
            let resultHTML = '';
            
            if (response.total === 0) {
                resultHTML = `
                    <div style="color:#856404;font-weight:bold;">
                        ⚠️ No rating dropdowns found
                    </div>
                    <div style="font-size:12px;margin-top:8px;">
                        Try clicking on a lecture sheet to open the rating modal first, then try again.
                    </div>
                `;
            } else {
                // Get the emoji for the selected rating
                const selectedOption = document.querySelector(`.rating-option[data-rating="${selectedRating}"]`);
                const emoji = selectedOption ? selectedOption.querySelector('.emoji').textContent : '⭐';
                
                resultHTML = `
                    <div style="font-weight:bold;margin-bottom:8px;color:#11458A;">
                        ${emoji} Rated ${response.success} out of ${response.total} sheets
                        ${response.failed > 0 ? `(${response.failed} failed)` : ''}
                    </div>
                    <div style="font-size:12px;max-height:150px;overflow-y:auto;text-align:left;">
                `;
                
                response.details.forEach(detail => {
                    const isSuccess = detail.includes('✓') || detail.includes('📨') || detail.includes('🤮') || detail.includes('🤢') || detail.includes('😐') || detail.includes('🙂') || detail.includes('🫡') || detail.includes('👏');
                    const color = isSuccess ? '#155724' : '#721c24';
                    resultHTML += `<div style="color:${color};padding:2px 0;">${detail}</div>`;
                });
                
                if (response.submitted && !response.submitted.includes('No forms')) {
                    resultHTML += `<div style="color:#11458A;font-weight:bold;margin-top:8px;">📨 ${response.submitted}</div>`;
                } else if (response.submitted) {
                    resultHTML += `<div style="color:#856404;margin-top:8px;">⚠️ ${response.submitted}</div>`;
                }
                
                resultHTML += `</div>`;
            }
            
            showStatus(resultHTML, response.failed === 0 && response.total > 0 ? 'success' : 'error');

            // If success rate is high, show a celebratory message
            if (response.success > 0 && response.failed === 0) {
                setTimeout(() => {
                    const statusDiv = document.getElementById('status');
                    if (statusDiv) {
                        const existingContent = statusDiv.innerHTML;
                        const selectedOption = document.querySelector(`.rating-option[data-rating="${selectedRating}"]`);
                        const emoji = selectedOption ? selectedOption.querySelector('.emoji').textContent : '🎉';
                        statusDiv.innerHTML = `
                            ${existingContent}
                            <div style="margin-top:10px;font-size:14px;color:#11458A;font-weight:bold;">${emoji} All ratings submitted successfully!</div>
                        `;
                    }
                }, 500);
            }

        } catch (error) {
            showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            loader.classList.remove('active');
            // Restore button text with emoji
            const selectedOption = document.querySelector(`.rating-option[data-rating="${selectedRating}"]`);
            if (selectedOption) {
                const emoji = selectedOption.querySelector('.emoji').textContent;
                const label = selectedOption.querySelector('.label').textContent;
                btn.innerHTML = `${emoji} Rate All as "${label}"`;
            } else {
                btn.textContent = 'Select a rating first';
            }
        }
    });
});

function showStatus(html, type) {
    const status = document.getElementById('status');
    status.innerHTML = html;
    status.className = type;
    status.style.display = 'block';
}