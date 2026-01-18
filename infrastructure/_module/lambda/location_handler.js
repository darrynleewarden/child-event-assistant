/**
 * Lambda function for handling real estate suburb data queries
 * This function is invoked by the Bedrock Real Estate Agent
 * 
 * Note: This is a mock implementation. In production, you would integrate with:
 * - Domain.com.au API
 * - CoreLogic API
 * - REA API
 * - SQM Research
 * Or other real estate data providers
 */

// Mock data for demonstration purposes
const MOCK_SUBURB_DATA = {
    'melbourne': {
        state: 'VIC',
        medianHousePrice: 1050000,
        medianUnitPrice: 620000,
        rentalPriceHouse: 550,
        rentalPriceUnit: 420,
        vacancyRate: 1.8,
        lastUpdated: '2026-01-15'
    },
    'sydney': {
        state: 'NSW',
        medianHousePrice: 1450000,
        medianUnitPrice: 780000,
        rentalPriceHouse: 650,
        rentalPriceUnit: 520,
        vacancyRate: 2.1,
        lastUpdated: '2026-01-15'
    },
    'brisbane': {
        state: 'QLD',
        medianHousePrice: 850000,
        medianUnitPrice: 520000,
        rentalPriceHouse: 480,
        rentalPriceUnit: 380,
        vacancyRate: 1.5,
        lastUpdated: '2026-01-15'
    },
    'perth': {
        state: 'WA',
        medianHousePrice: 720000,
        medianUnitPrice: 450000,
        rentalPriceHouse: 420,
        rentalPriceUnit: 340,
        vacancyRate: 1.2,
        lastUpdated: '2026-01-15'
    },
    'adelaide': {
        state: 'SA',
        medianHousePrice: 680000,
        medianUnitPrice: 420000,
        rentalPriceHouse: 390,
        rentalPriceUnit: 320,
        vacancyRate: 1.4,
        lastUpdated: '2026-01-15'
    },
    'bondi': {
        state: 'NSW',
        medianHousePrice: 3200000,
        medianUnitPrice: 1150000,
        rentalPriceHouse: 1200,
        rentalPriceUnit: 750,
        vacancyRate: 2.3,
        lastUpdated: '2026-01-15'
    },
    'carlton': {
        state: 'VIC',
        medianHousePrice: 1350000,
        medianUnitPrice: 680000,
        rentalPriceHouse: 620,
        rentalPriceUnit: 450,
        vacancyRate: 1.9,
        lastUpdated: '2026-01-15'
    },
    'southbank': {
        state: 'QLD',
        medianHousePrice: 920000,
        medianUnitPrice: 580000,
        rentalPriceHouse: 520,
        rentalPriceUnit: 420,
        vacancyRate: 1.6,
        lastUpdated: '2026-01-15'
    }
};

/**
 * Get suburb real estate data
 */
function getSuburbData(suburbName) {
    const normalizedName = suburbName.toLowerCase().trim();

    const data = MOCK_SUBURB_DATA[normalizedName];

    if (!data) {
        return {
            success: false,
            error: `Sorry, I don't have data for "${suburbName}" at the moment. This is a demonstration with limited suburb data. Please try: Melbourne, Sydney, Brisbane, Perth, Adelaide, Bondi, Carlton, or Southbank.`
        };
    }

    // Calculate rental yields
    const houseYield = ((data.rentalPriceHouse * 52) / data.medianHousePrice * 100).toFixed(2);
    const unitYield = ((data.rentalPriceUnit * 52) / data.medianUnitPrice * 100).toFixed(2);

    return {
        success: true,
        suburb: suburbName,
        state: data.state,
        medianHousePrice: data.medianHousePrice,
        medianUnitPrice: data.medianUnitPrice,
        rentalPriceHouse: data.rentalPriceHouse,
        rentalPriceUnit: data.rentalPriceUnit,
        vacancyRate: data.vacancyRate,
        houseRentalYield: houseYield,
        unitRentalYield: unitYield,
        lastUpdated: data.lastUpdated,
        formattedResponse: formatSuburbData(suburbName, data, houseYield, unitYield)
    };
}

/**
 * Format suburb data into a readable response
 */
function formatSuburbData(suburbName, data, houseYield, unitYield) {
    return `
**${suburbName.charAt(0).toUpperCase() + suburbName.slice(1)}, ${data.state}** - Real Estate Market Data

📊 **Property Prices:**
• Median House Price: $${data.medianHousePrice.toLocaleString()}
• Median Unit Price: $${data.medianUnitPrice.toLocaleString()}

🏠 **Rental Market:**
• House Rental (per week): $${data.rentalPriceHouse}
• Unit Rental (per week): $${data.rentalPriceUnit}
• Vacancy Rate: ${data.vacancyRate}%

💰 **Rental Yields:**
• House Yield: ${houseYield}%
• Unit Yield: ${unitYield}%

**Market Insights:**
${generateMarketInsights(data, houseYield, unitYield)}

*Data last updated: ${data.lastUpdated}*
*Note: This is demonstration data. Production would use live API data.*
  `.trim();
}

/**
 * Generate market insights based on the data
 */
function generateMarketInsights(data, houseYield, unitYield) {
    const insights = [];

    // Vacancy rate insights
    if (data.vacancyRate < 1.5) {
        insights.push('• Low vacancy rate indicates strong rental demand');
    } else if (data.vacancyRate > 2.5) {
        insights.push('• Higher vacancy rate suggests more rental options available');
    } else {
        insights.push('• Vacancy rate is within normal range');
    }

    // Rental yield insights
    if (parseFloat(houseYield) > 4.0) {
        insights.push('• House rental yield is attractive for investors');
    }
    if (parseFloat(unitYield) > 4.5) {
        insights.push('• Unit rental yield is strong');
    }

    // Price insights
    if (data.medianHousePrice > 1500000) {
        insights.push('• Premium suburb with high property values');
    } else if (data.medianHousePrice < 700000) {
        insights.push('• More affordable entry point for homebuyers');
    }

    return insights.join('\n');
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        // Extract action group and API path
        const { actionGroup, apiPath } = event;

        // Derive function name from apiPath
        // apiPath format: "/get-suburb-data" -> functionName: "getSuburbData"
        const functionName = apiPath
            ? apiPath.replace(/^\//, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase())
            : null;

        console.log('Action Group:', actionGroup);
        console.log('API Path:', apiPath);
        console.log('Function:', functionName);

        // Parse parameters from requestBody
        const params = {};
        if (event.requestBody?.content?.['application/json']?.properties) {
            event.requestBody.content['application/json'].properties.forEach(prop => {
                params[prop.name] = prop.value;
            });
        }

        console.log('Parameters:', params);

        let result;

        // Handle based on API path
        switch (apiPath) {
            case '/search-location-data':
            case '/get-location-data':
            case '/get-suburb-data':
                if (!params.suburbName) {
                    result = {
                        success: false,
                        error: 'Please provide a suburb name to get real estate data.'
                    };
                } else {
                    result = getSuburbData(params.suburbName);
                }
                break;

            case '/save-location-data':
                result = {
                    success: true,
                    message: 'Location data saved successfully (mock implementation)',
                    locationId: Math.random().toString(36).substring(7)
                };
                break;

            case '/update-location-data':
                result = {
                    success: true,
                    message: 'Location data updated successfully (mock implementation)'
                };
                break;

            case '/delete-location-data':
                result = {
                    success: true,
                    message: 'Location data deleted successfully (mock implementation)'
                };
                break;

            default:
                result = {
                    success: false,
                    error: `Unknown API path: ${apiPath}`
                };
        }

        console.log('Result:', JSON.stringify(result, null, 2));

        // Return in the format expected by Bedrock Agent
        return {
            messageVersion: '1.0',
            response: {
                actionGroup: actionGroup,
                apiPath: apiPath,
                httpMethod: event.httpMethod,
                httpStatusCode: 200,
                responseBody: {
                    'application/json': {
                        body: JSON.stringify(result)
                    }
                }
            }
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            messageVersion: '1.0',
            response: {
                actionGroup: event.actionGroup,
                apiPath: event.apiPath,
                httpMethod: event.httpMethod,
                httpStatusCode: 500,
                responseBody: {
                    'application/json': {
                        body: JSON.stringify({
                            success: false,
                            error: error.message || 'An error occurred processing your request'
                        })
                    }
                }
            }
        };
    }
};
