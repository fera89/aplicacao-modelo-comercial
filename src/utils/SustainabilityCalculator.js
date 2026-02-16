export const EMISSION_FACTORS = {
    // Emission factors in kg CO2 per km per passenger (approximate values)
    car_gasoline: 0.12, // Single occupancy
    car_ethanol: 0.04,
    bus: 0.03,
    motorcycle: 0.08,
    bicycle: 0,
    walk: 0,
    subway: 0.01,
    rideshare: 0.10, // Slightly improved over single car
};

export const WASTE_SAVINGS = {
    reusable_cup: 0.05, // kg CO2 saved per use (manufacturing + waste processing avoided)
    no_paper: 0.01, // kg CO2 saved per leaflet/flyer avoided
    biodegradable_plate: 0.02
}

/**
 * Calculates the CO2 emissions for a trip.
 * @param {string} mode - Mode of transport (key from EMISSION_FACTORS)
 * @param {number} distanceKm - Distance traveled in km
 * @param {number} passengers - Total people in vehicle (for carpooling logic)
 * @returns {number} - Total CO2 emissions in kg
 */
export const calculateTransportEmissions = (mode, distanceKm, passengers = 1) => {
    const factor = EMISSION_FACTORS[mode] || 0;

    // Basic carpooling logic: divide emissions by number of passengers for private vehicles
    let adjustedFactor = factor;
    if (['car_gasoline', 'car_ethanol', 'rideshare'].includes(mode) && passengers > 1) {
        adjustedFactor = factor / passengers;
    }

    return adjustedFactor * distanceKm;
};

/**
 * Calculates CO2 savings from sustainable habits.
 * @param {object} habits - Object containing boolean flags for habits (e.g., currently mostly reusable cup)
 * @returns {number} - Total CO2 saved in kg
 */
export const calculateHabitSavings = (habits) => {
    let savings = 0;
    if (habits.usedReusableCup) savings += WASTE_SAVINGS.reusable_cup;
    // Add more habit logic here
    return savings;
}
