/**
 * FSM Dashboard API Integration
 * Fetches site configuration from the Express API server and applies it to the webapp
 * This overrides the default SCSS variables with values from the dashboard
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Fetch and apply site configuration
 */
async function loadSiteConfig() {
    try {
        console.log('[Site Config] Fetching configuration from API...');
        
        const response = await fetch(`${API_BASE_URL}/api/site-config`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const config = await response.json();
        console.log('[Site Config] Configuration loaded:', config);
        
        // Apply theme colors to CSS variables
        applyThemeColors(config.theme);
        
        // Update company information
        applyCompanyInfo(config.company);
        
        // Handle module visibility
        applyModuleSettings(config.modules);
        
        // Store config globally for other scripts to access
        window.siteConfig = config;
        
        console.log('[Site Config] Configuration applied successfully');
        
        // Dispatch custom event for other scripts
        window.dispatchEvent(new CustomEvent('siteConfigLoaded', { detail: config }));
        
    } catch (error) {
        console.error('[Site Config] Failed to load configuration:', error);
        console.log('[Site Config] Using default SCSS values as fallback');
    }
}

/**
 * Apply theme colors to CSS variables
 * Overrides the default :root variables from root.scss
 */
function applyThemeColors(theme) {
    if (!theme) return;
    
    const root = document.documentElement;
    
    if (theme.primaryColor) {
        root.style.setProperty('--primary', theme.primaryColor);
        console.log('[Theme] Primary color set to:', theme.primaryColor);
    }
    
    if (theme.secondaryColor) {
        root.style.setProperty('--secondary', theme.secondaryColor);
        root.style.setProperty('--primaryLight', theme.secondaryColor);
        root.style.setProperty('--secondaryLight', theme.secondaryColor);
        console.log('[Theme] Secondary color set to:', theme.secondaryColor);
    }
    
    if (theme.accentColor) {
        root.style.setProperty('--headerColor', theme.accentColor);
        console.log('[Theme] Accent/Header color set to:', theme.accentColor);
    }
    
    // Optional: Apply logo URLs if needed
    // Disabled by default - uncomment only if you want to override logos via dashboard
    // if (theme.logoUrl) {
    //     updateLogo('.cs-logo img:not(.cs-dark)', theme.logoUrl);
    // }
    // 
    // if (theme.logoDarkUrl) {
    //     updateLogo('.cs-logo img.cs-dark', theme.logoDarkUrl);
    // }
}

/**
 * Update company information in the DOM
 */
function applyCompanyInfo(company) {
    if (!company) return;
    
    // Update company name
    if (company.name) {
        updateTextContent('.company-name', company.name);
        updateTextContent('[data-company="name"]', company.name);
    }
    
    // Update phone number
    if (company.phone) {
        updateTextContent('.company-phone', company.phone);
        updateAttribute('[data-company="phone"]', 'href', `tel:${company.phone}`);
        updateTextContent('[data-company="phone"]', company.phone);
    }
    
    // Update email
    if (company.email) {
        updateTextContent('.company-email', company.email);
        updateAttribute('[data-company="email"]', 'href', `mailto:${company.email}`);
        updateTextContent('[data-company="email"]', company.email);
    }
    
    // Update address
    if (company.address) {
        updateTextContent('.company-address', company.address);
        updateTextContent('[data-company="address"]', company.address);
    }
    
    console.log('[Company] Company information updated');
}

/**
 * Apply module settings (show/hide based on enabled status)
 */
function applyModuleSettings(modules) {
    if (!modules) return;
    
    Object.entries(modules).forEach(([moduleKey, moduleConfig]) => {
        const elements = document.querySelectorAll(`[data-module="${moduleKey}"]`);
        
        elements.forEach(element => {
            if (moduleConfig.enabled) {
                element.style.display = '';
                element.classList.remove('module-disabled');
            } else {
                element.style.display = 'none';
                element.classList.add('module-disabled');
            }
        });
        
        if (elements.length > 0) {
            console.log(`[Module] ${moduleKey}: ${moduleConfig.enabled ? 'enabled' : 'disabled'}`);
        }
    });
}

/**
 * Helper function to update text content
 */
function updateTextContent(selector, content) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        element.textContent = content;
    });
}

/**
 * Helper function to update element attributes
 */
function updateAttribute(selector, attribute, value) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        element.setAttribute(attribute, value);
    });
}

/**
 * Helper function to update logo image sources
 */
function updateLogo(selector, url) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        element.src = url;
    });
}

/**
 * Alternative: Load CSS directly from the API
 * This can be used instead of or in addition to the JavaScript approach
 */
function loadCSSFromAPI() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${API_BASE_URL}/api/site-config/css`;
    link.id = 'site-config-css';
    
    link.onerror = () => {
        console.error('[Site Config] Failed to load CSS from API');
    };
    
    link.onload = () => {
        console.log('[Site Config] CSS loaded from API successfully');
    };
    
    document.head.appendChild(link);
}

/**
 * Initialize configuration loading
 * Can be called with different strategies
 */
function initSiteConfig(strategy = 'both') {
    if (strategy === 'css-only') {
        // Just load CSS from API endpoint
        loadCSSFromAPI();
    } else if (strategy === 'js-only') {
        // Just use JavaScript to apply config
        loadSiteConfig();
    } else {
        // Load both (recommended for full control)
        loadCSSFromAPI();
        loadSiteConfig();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSiteConfig('both');
    });
} else {
    initSiteConfig('both');
}

// Expose functions globally for manual control if needed
window.siteConfigIntegration = {
    loadSiteConfig,
    loadCSSFromAPI,
    initSiteConfig,
    API_BASE_URL
};
