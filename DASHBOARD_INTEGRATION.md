# Dashboard API Integration Guide

This document explains how your FSM SaaS Platform integrates with the Dashboard API to dynamically control styling and configuration.

## 🎯 Overview

Your webapp now fetches configuration from the Dashboard API server and automatically applies:
- **Theme colors** (Primary, Secondary, Accent/Header colors)
- **Company information** (Name, Phone, Email, Address)
- **Module visibility** (Show/hide features based on enabled status)

## 🏗️ Architecture

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Admin Dashboard    │         │  Express Server  │         │  Your Webapp    │
│  (React/Vite)       │◄────────┤  (site-config)   │────────►│  (This Site)    │
│  localhost:5173     │  Saves  │  localhost:3000  │  Reads  │  src/           │
└─────────────────────┘         └──────────────────┘         └─────────────────┘
```

## 📁 Files Added/Modified

### New File
- **`src/assets/js/site-config-integration.js`**
  - Fetches config from API on page load
  - Applies CSS variable overrides
  - Updates company info in DOM
  - Handles module visibility

### Modified File
- **`src/_includes/layouts/base.html`**
  - Added script tag to load integration on every page

## 🚀 How It Works

### 1. Page Load Sequence

```javascript
Page loads
  ↓
Integration script loads
  ↓
Fetches from: http://localhost:3000/api/site-config
  ↓
Applies configuration:
  - CSS variables (--primary, --secondary, --headerColor)
  - Company information
  - Module visibility
  ↓
Site displays with dashboard-controlled values
```

### 2. CSS Variable Override

The script overrides these SCSS variables from [root.scss](src/assets/sass/root.scss):

| SCSS Variable | Dashboard Control | Applied Via |
|--------------|-------------------|-------------|
| `--primary` | `theme.primaryColor` | JavaScript |
| `--secondary` | `theme.secondaryColor` | JavaScript |
| `--primaryLight` | `theme.secondaryColor` | JavaScript |
| `--secondaryLight` | `theme.secondaryColor` | JavaScript |
| `--headerColor` | `theme.accentColor` | JavaScript |

**Example:**
```javascript
// Dashboard sets: primaryColor = "#ff0000"
// JavaScript applies: document.documentElement.style.setProperty('--primary', '#ff0000')
// Result: All buttons, links, and accents using var(--primary) turn red
```

## 🎨 Using Dynamic Configuration

### In HTML/Templating

Add data attributes to automatically update company information:

```html
<!-- Company Name -->
<h1 class="company-name">Default Name</h1>
<span data-company="name">Default Name</span>

<!-- Phone Number -->
<a href="tel:555-1234" data-company="phone">555-1234</a>

<!-- Email -->
<a href="mailto:info@company.com" data-company="email">info@company.com</a>

<!-- Address -->
<address data-company="address">123 Main St</address>
```

### Module Visibility

Control which sections appear based on dashboard toggles:

```html
<!-- This section will show/hide based on projectEstimator.enabled -->
<section data-module="projectEstimator">
    <h2>Project Estimator</h2>
    <a href="/estimator/">Get an Estimate</a>
</section>

<!-- This section will show/hide based on clientPortal.enabled -->
<section data-module="clientPortal">
    <h2>Client Portal</h2>
    <a href="/portal/">Access Portal</a>
</section>
```

### Available Modules

Based on your dashboard configuration, these modules are available:

- `projectEstimator` - Project estimation tool
- `clientPortal` - Client login and dashboard
- `jobManagement` - Job tracking system
- `crmSystem` - Customer relationship management
- `advancedAnalytics` - Analytics dashboard (locked)
- `emailMarketing` - Email campaigns (locked)
- `schedulingCalendar` - Scheduling system (locked)
- `invoicePayments` - Payment processing (locked)

## 🔌 API Endpoints

Your site connects to these endpoints:

### GET `/api/site-config`
Returns full configuration JSON:

```json
{
  "theme": {
    "primaryColor": "#ff6a3e",
    "secondaryColor": "#ffba43",
    "accentColor": "#1a1a1a"
  },
  "company": {
    "name": "Your Company",
    "phone": "(555) 123-4567",
    "email": "info@company.com",
    "address": "123 Main St, City, ST 12345"
  },
  "modules": {
    "projectEstimator": {
      "enabled": true,
      "path": "/estimator/"
    }
  }
}
```

### GET `/api/site-config/css`
Returns CSS variables directly:

```css
:root {
  --primary: #ff6a3e;
  --secondary: #ffba43;
  --headerColor: #1a1a1a;
}
```

## 🧪 Testing the Integration

### 1. Start Both Servers

```bash
# Terminal 1 - Dashboard API Server
cd /path/to/dashboard
npm run server
# Running on http://localhost:3000

# Terminal 2 - Your Webapp
cd /Users/wanlindo/Dev/hsg/fsm-saas-platform
npm start
# Or whatever command builds/serves your site
```

### 2. Open Dashboard

```bash
# Terminal 3 - Dashboard Frontend (if needed)
cd /path/to/dashboard
npm run dev
# Running on http://localhost:5173
```

### 3. Make Changes

1. Open dashboard at http://localhost:5173
2. Change the primary color to blue (#0000ff)
3. Click "Save Changes"
4. Refresh your webapp
5. See blue buttons and accents instead of orange

### 4. Check Console Logs

Open browser DevTools and look for:

```
[Site Config] Fetching configuration from API...
[Site Config] Configuration loaded: {theme: {...}, company: {...}}
[Theme] Primary color set to: #ff6a3e
[Theme] Secondary color set to: #ffba43
[Theme] Accent/Header color set to: #1a1a1a
[Company] Company information updated
[Module] projectEstimator: enabled
[Site Config] Configuration applied successfully
```

## 🛠️ Advanced Usage

### Access Config in Your JavaScript

The configuration is stored globally:

```javascript
// Wait for config to load
window.addEventListener('siteConfigLoaded', (event) => {
    const config = event.detail;
    console.log('Site config:', config);
    
    // Use it in your code
    if (config.modules.projectEstimator.enabled) {
        initEstimator();
    }
});

// Or access directly (if already loaded)
if (window.siteConfig) {
    console.log('Primary color:', window.siteConfig.theme.primaryColor);
}
```

### Manual Integration Control

You can control how the integration works:

```javascript
// Load only CSS (faster, less control)
window.siteConfigIntegration.initSiteConfig('css-only');

// Load only JavaScript (more control)
window.siteConfigIntegration.initSiteConfig('js-only');

// Load both (default, recommended)
window.siteConfigIntegration.initSiteConfig('both');

// Reload configuration manually
window.siteConfigIntegration.loadSiteConfig();
```

### Change API URL

Edit `src/assets/js/site-config-integration.js`:

```javascript
// For production
const API_BASE_URL = 'https://api.yourdomain.com';

// For staging
const API_BASE_URL = 'https://staging-api.yourdomain.com';

// For development (default)
const API_BASE_URL = 'http://localhost:3000';
```

## 🚨 Troubleshooting

### Config Not Loading

**Symptoms:** Site uses default colors, console shows errors

**Solutions:**
1. Verify API server is running: `curl http://localhost:3000/api/site-config`
2. Check CORS settings in your API server
3. Check browser console for network errors
4. Verify script is loaded: View source and look for `site-config-integration.js`

### Colors Not Changing

**Symptoms:** Dashboard saves but site doesn't update

**Solutions:**
1. Hard refresh your browser (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Check if CSS specificity is overriding the variables
4. Verify CSS variables are used in SCSS: `color: var(--primary)`

### Company Info Not Updating

**Symptoms:** Colors work but text doesn't change

**Solutions:**
1. Add proper data attributes: `data-company="name"`
2. Or use class names: `class="company-name"`
3. Check console for JavaScript errors
4. Ensure elements exist in the DOM when script runs

### API Server Not Running

**Symptoms:** Console shows "Failed to fetch"

```bash
# Check if server is running
curl http://localhost:3000/api/site-config

# If not, start it
cd /path/to/dashboard
npm run server
```

## 📦 Production Deployment

### 1. Deploy Dashboard API

Deploy to Heroku, DigitalOcean, AWS, etc:

```bash
# Example: Heroku
heroku create your-app-api
git push heroku main
```

Note your production URL: `https://your-app-api.herokuapp.com`

### 2. Update Integration Script

Edit `src/assets/js/site-config-integration.js`:

```javascript
const API_BASE_URL = 'https://your-app-api.herokuapp.com';
```

### 3. Deploy Your Webapp

Deploy to Netlify, Vercel, etc. as usual. The script will now fetch from production API.

### 4. Update Dashboard

Point your dashboard's API URL to production in its environment variables.

## 🔒 Security Notes

### Public API Endpoints (Safe)
- ✅ `/api/site-config` - Read-only, safe to expose
- ✅ `/api/site-config/css` - Read-only, safe to expose

### Protected API Endpoints (Requires Auth)
- 🔒 `/api/site-config/save` - Should require authentication

**Important:** Never expose save endpoints without authentication in production!

## 📝 Next Steps

1. **Add More Customization**
   - Fonts, spacing, border radius
   - Additional company fields
   - Social media links

2. **Improve Performance**
   - Cache configuration in localStorage
   - Set cache headers on API
   - Use service workers for offline

3. **Add Visual Feedback**
   - Loading spinner while fetching config
   - Toast notifications when config updates
   - Preview mode before applying changes

4. **Enhance Error Handling**
   - Retry failed requests
   - Show user-friendly error messages
   - Log errors to monitoring service

---

## 📞 Support

If you encounter issues:

1. Check console logs for error messages
2. Verify both servers are running
3. Test API endpoints directly with `curl` or Postman
4. Check network tab in DevTools for failed requests

**Current Configuration:**
- API Server: `http://localhost:3000`
- Integration Script: `src/assets/js/site-config-integration.js`
- Base Template: `src/_includes/layouts/base.html`
