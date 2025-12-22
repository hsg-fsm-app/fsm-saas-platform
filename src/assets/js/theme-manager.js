/**
 * ThemeManager - Updates CSS variables and persists to localStorage
 * Attached to window so all scripts can access it
 */
window.ThemeManager = {
    updateColor(variable, value) {
        document.documentElement.style.setProperty(variable, value);
    },

    saveTheme(settings) {
        localStorage.setItem('siteTheme', JSON.stringify(settings));
    },

    loadTheme() {
        const saved = localStorage.getItem('siteTheme');
        if (saved) {
            const settings = JSON.parse(saved);
            Object.entries(settings).forEach(([key, value]) => {
                this.updateColor(key, value);
            });
        }
    },

    getSavedTheme() {
        const saved = localStorage.getItem('siteTheme');
        return saved ? JSON.parse(saved) : null;
    }
};