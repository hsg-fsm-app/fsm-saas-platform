/**
 * Admin Dashboard - Theme Color Settings
 * 
 * Flow: Admin sets colors → clicks Save → website theme updates
 * Color picker and text input mirror each other bidirectionally
 */
document.addEventListener('DOMContentLoaded', () => {
    const colorPickers = document.querySelectorAll('.cs-color-input[data-css-var]');
    const textInputs = document.querySelectorAll('.cs-color-text[data-css-var]');
    const saveBtn = document.getElementById('save-theme-btn');

    // On load: restore saved colors to inputs
    const saved = ThemeManager.getSavedTheme();
    if (saved) {
        colorPickers.forEach(picker => {
            const cssVar = picker.dataset.cssVar;
            if (saved[cssVar]) {
                picker.value = saved[cssVar];
            }
        });
        textInputs.forEach(text => {
            const cssVar = text.dataset.cssVar;
            if (saved[cssVar]) {
                text.value = saved[cssVar];
            }
        });
    }

    // Color picker → update text input + live preview
    colorPickers.forEach(picker => {
        picker.addEventListener('input', () => {
            const cssVar = picker.dataset.cssVar;
            const textInput = document.querySelector(`.cs-color-text[data-css-var="${cssVar}"]`);
            if (textInput) textInput.value = picker.value;
            ThemeManager.updateColor(cssVar, picker.value);
        });
    });

    // Text input → update color picker + live preview
    textInputs.forEach(text => {
        text.addEventListener('input', () => {
            let val = text.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            const cssVar = text.dataset.cssVar;
            const picker = document.querySelector(`.cs-color-input[data-css-var="${cssVar}"]`);
            
            // Only update if valid hex
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                if (picker) picker.value = val;
                ThemeManager.updateColor(cssVar, val);
            }
        });
    });

    // Save button → persist all colors
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const colors = {};
            colorPickers.forEach(picker => {
                colors[picker.dataset.cssVar] = picker.value;
            });
            ThemeManager.saveTheme(colors);
            
            // Visual feedback
            saveBtn.textContent = 'Saved!';
            saveBtn.style.backgroundColor = '#22c55e';
            setTimeout(() => {
                saveBtn.textContent = 'Save Changes';
                saveBtn.style.backgroundColor = '';
            }, 2000);
        });
    }
});