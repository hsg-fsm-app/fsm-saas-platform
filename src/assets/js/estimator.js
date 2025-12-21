/**
 * Home Services Cost Estimator Calculator
 *
 * This script calculates estimated project costs based on user selections:
 * - Service type (kitchen, bathroom, exterior, utility)
 * - Project size (small, medium, large)
 * - Material quality (basic, premium, luxury)
 * - Additional features (rush service, design consultation, permits, cleanup)
 *
 * The calculator updates the estimate in real-time as users toggle options.
 */

/**
 * BASE PRICE STRUCTURE
 *
 * Each service type has a base price range that varies by project size.
 * Format: { min: minimum cost, max: maximum cost }
 */
const basePrices = {
    kitchen: {
        small: { min: 5000, max: 8000 },      // Minor kitchen updates (fixtures, paint)
        medium: { min: 15000, max: 25000 },   // Standard kitchen renovation
        large: { min: 35000, max: 60000 }     // Complete kitchen overhaul
    },
    bathroom: {
        small: { min: 3000, max: 5000 },      // Bathroom refresh (fixtures, tile)
        medium: { min: 8000, max: 15000 },    // Full bathroom renovation
        large: { min: 18000, max: 30000 }     // Luxury bathroom remodel
    },
    exterior: {
        small: { min: 2000, max: 4000 },      // Minor repairs (siding, trim)
        medium: { min: 8000, max: 12000 },    // Moderate exterior work
        large: { min: 20000, max: 35000 }     // Major exterior renovation
    },
    utility: {
        small: { min: 1500, max: 3000 },      // Minor utility work
        medium: { min: 5000, max: 8000 },     // Standard utility maintenance
        large: { min: 12000, max: 20000 }     // Major utility upgrades
    }
};

/**
 * MATERIAL QUALITY MULTIPLIERS
 *
 * These multipliers adjust the base price based on material quality selection.
 * Basic = standard pricing, Premium = 30% increase, Luxury = 60% increase
 */
const qualityMultipliers = {
    basic: 1.0,      // No change to base price
    premium: 1.3,    // 30% increase for high-quality materials
    luxury: 1.6      // 60% increase for luxury materials
};

/**
 * ADDITIONAL FEATURE COSTS
 *
 * Fixed or percentage-based costs for optional features.
 * Some features (like rush service) are percentage-based on total cost.
 */
const additionalFeatures = {
    rush: { type: 'percentage', value: 0.15 },    // 15% surcharge for rush service
    design: { type: 'fixed', value: 500 },        // $500 flat fee for design consultation
    permits: { type: 'fixed', value: 300 },       // $300 flat fee for permit handling
    cleanup: { type: 'fixed', value: 200 }        // $200 flat fee for post-project cleanup
};

/**
 * CALCULATOR STATE
 *
 * Stores the current user selections. This object is updated
 * whenever the user changes any toggle or checkbox.
 */
let currentSelection = {
    serviceType: 'kitchen',     // Default service type
    projectSize: 'small',       // Default project size
    materialQuality: 'basic',   // Default material quality
    features: []                // Array of selected additional features
};

/**
 * INITIALIZE CALCULATOR
 *
 * Sets up all event listeners when the page loads.
 * This function runs once when the DOM is fully loaded.
 */
function initializeCalculator() {
    // Listen for service type changes (radio buttons)
    const serviceRadios = document.querySelectorAll('input[name="service-type"]');
    serviceRadios.forEach(radio => {
        radio.addEventListener('change', handleServiceChange);
    });

    // Listen for project size changes (radio buttons)
    const sizeRadios = document.querySelectorAll('input[name="project-size"]');
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', handleSizeChange);
    });

    // Listen for material quality changes (radio buttons)
    const qualityRadios = document.querySelectorAll('input[name="material-quality"]');
    qualityRadios.forEach(radio => {
        radio.addEventListener('change', handleQualityChange);
    });

    // Listen for additional feature toggles (checkboxes)
    const featureCheckboxes = document.querySelectorAll('input[name="features"]');
    featureCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFeatureChange);
    });

    // Calculate and display initial estimate on page load
    calculateEstimate();
}

/**
 * HANDLE SERVICE TYPE CHANGE
 *
 * Updates the calculator state when user selects a different service type.
 * @param {Event} event - The change event from the radio button
 */
function handleServiceChange(event) {
    currentSelection.serviceType = event.target.value;
    calculateEstimate();
}

/**
 * HANDLE PROJECT SIZE CHANGE
 *
 * Updates the calculator state when user selects a different project size.
 * @param {Event} event - The change event from the radio button
 */
function handleSizeChange(event) {
    currentSelection.projectSize = event.target.value;
    calculateEstimate();
}

/**
 * HANDLE MATERIAL QUALITY CHANGE
 *
 * Updates the calculator state when user selects a different material quality.
 * @param {Event} event - The change event from the radio button
 */
function handleQualityChange(event) {
    currentSelection.materialQuality = event.target.value;
    calculateEstimate();
}

/**
 * HANDLE ADDITIONAL FEATURE CHANGE
 *
 * Updates the features array when user toggles an additional feature checkbox.
 * Adds the feature to the array if checked, removes it if unchecked.
 * @param {Event} event - The change event from the checkbox
 */
function handleFeatureChange(event) {
    const featureValue = event.target.value;

    if (event.target.checked) {
        // Add feature to array if checkbox is checked
        if (!currentSelection.features.includes(featureValue)) {
            currentSelection.features.push(featureValue);
        }
    } else {
        // Remove feature from array if checkbox is unchecked
        currentSelection.features = currentSelection.features.filter(
            feature => feature !== featureValue
        );
    }

    calculateEstimate();
}

/**
 * CALCULATE ESTIMATE
 *
 * Main calculation function that computes the final cost estimate.
 * This function is called whenever any option changes.
 *
 * Calculation steps:
 * 1. Get base price range for selected service and size
 * 2. Apply material quality multiplier
 * 3. Add fixed-cost additional features
 * 4. Apply percentage-based additional features (like rush service)
 * 5. Format and display the result
 */
function calculateEstimate() {
    // STEP 1: Get base price range
    const basePrice = basePrices[currentSelection.serviceType][currentSelection.projectSize];
    let minPrice = basePrice.min;
    let maxPrice = basePrice.max;

    // STEP 2: Apply material quality multiplier
    const qualityMultiplier = qualityMultipliers[currentSelection.materialQuality];
    minPrice *= qualityMultiplier;
    maxPrice *= qualityMultiplier;

    // STEP 3: Calculate fixed-cost feature additions
    let fixedFeatureCost = 0;
    currentSelection.features.forEach(feature => {
        const featureData = additionalFeatures[feature];
        if (featureData.type === 'fixed') {
            fixedFeatureCost += featureData.value;
        }
    });

    // Add fixed costs to both min and max prices
    minPrice += fixedFeatureCost;
    maxPrice += fixedFeatureCost;

    // STEP 4: Apply percentage-based features
    // Rush service is percentage-based and calculated on the adjusted total
    const hasRushService = currentSelection.features.includes('rush');
    if (hasRushService) {
        const rushMultiplier = 1 + additionalFeatures.rush.value; // 1.15 for 15% increase
        minPrice *= rushMultiplier;
        maxPrice *= rushMultiplier;
    }

    // STEP 5: Format and display the result
    displayEstimate(minPrice, maxPrice);
}

/**
 * DISPLAY ESTIMATE
 *
 * Formats the calculated prices and updates the DOM to show the estimate.
 * Prices are formatted with commas and rounded to nearest hundred.
 *
 * @param {number} min - Minimum estimated cost
 * @param {number} max - Maximum estimated cost
 */
function displayEstimate(min, max) {
    // Round to nearest hundred for cleaner display
    const roundedMin = Math.round(min / 100) * 100;
    const roundedMax = Math.round(max / 100) * 100;

    // Format numbers with commas (e.g., 15000 becomes "15,000")
    const formattedMin = roundedMin.toLocaleString('en-US');
    const formattedMax = roundedMax.toLocaleString('en-US');

    // Create the display string
    const estimateText = `$${formattedMin} - $${formattedMax}`;

    // Update the DOM element with the new estimate
    const estimateElement = document.getElementById('estimate-amount');
    if (estimateElement) {
        estimateElement.textContent = estimateText;

        // Add a subtle animation effect when the number changes
        estimateElement.style.opacity = '0.5';
        setTimeout(() => {
            estimateElement.style.opacity = '1';
        }, 150);
    }
}

/**
 * START THE CALCULATOR
 *
 * Wait for the DOM to be fully loaded before initializing the calculator.
 * This ensures all HTML elements are available for event listeners.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCalculator);
} else {
    // DOM is already loaded, initialize immediately
    initializeCalculator();
}
