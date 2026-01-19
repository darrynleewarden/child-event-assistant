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
        cityDistrict: 'Melbourne City',
        medianHousePrice: 1050000,
        medianUnitPrice: 620000,
        rentalPriceHouse: 550,
        rentalPriceUnit: 420,
        vacancyRate: 1.8,
        schools: 'Primary Schools: Melbourne City Primary (ICSEA: 1180, Top 5% in Melbourne City, 0.5km), Royal Park Primary (ICSEA: 1165, Top 10% in Melbourne City, 1.2km). High Schools: University High School (ICSEA: 1195, Top 3% in Melbourne, Selective Entry, 2km), Melbourne High School (ICSEA: 1210, Top 1% in Victoria, Selective Entry, 3km)',
        lastUpdated: '2026-01-15'
    },
    'sydney': {
        state: 'NSW',
        cityDistrict: 'Sydney City',
        medianHousePrice: 1450000,
        medianUnitPrice: 780000,
        rentalPriceHouse: 650,
        rentalPriceUnit: 520,
        vacancyRate: 2.1,
        schools: 'Primary Schools: Sydney City Public School (ICSEA: 1175, Top 5% in Sydney, 0.8km), Crown Street Public School (ICSEA: 1160, Top 10% in Sydney, 1.5km). High Schools: Sydney Boys High School (ICSEA: 1205, Top 1% in NSW, Selective Entry, 3km), Sydney Girls High School (ICSEA: 1208, Top 1% in NSW, Selective Entry, 3.2km)',
        lastUpdated: '2026-01-15'
    },
    'brisbane': {
        state: 'QLD',
        cityDistrict: 'Brisbane City',
        medianHousePrice: 850000,
        medianUnitPrice: 520000,
        rentalPriceHouse: 480,
        rentalPriceUnit: 380,
        vacancyRate: 1.5,
        schools: 'Primary Schools: Brisbane Central State School (ICSEA: 1150, Top 8% in Brisbane City, 1km), Petrie Terrace State School (ICSEA: 1140, Top 12% in Brisbane City, 1.8km). High Schools: Brisbane State High School (ICSEA: 1170, Top 5% in Queensland, 2.5km), Brisbane Grammar School (ICSEA: 1195, Top 2% in Queensland, Private, 2km)',
        lastUpdated: '2026-01-15'
    },
    'perth': {
        state: 'WA',
        cityDistrict: 'City of Perth',
        medianHousePrice: 720000,
        medianUnitPrice: 450000,
        rentalPriceHouse: 420,
        rentalPriceUnit: 340,
        vacancyRate: 1.2,
        schools: 'Primary Schools: Perth Modern Primary School (ICSEA: 1165, Top 7% in Perth, 1.5km), West Leederville Primary (ICSEA: 1155, Top 10% in Perth, 2km). High Schools: Perth Modern School (ICSEA: 1185, Top 3% in WA, Selective Entry, 1.5km), Shenton College (ICSEA: 1170, Top 8% in WA, 3km)',
        lastUpdated: '2026-01-15'
    },
    'adelaide': {
        state: 'SA',
        cityDistrict: 'Adelaide City',
        medianHousePrice: 680000,
        medianUnitPrice: 420000,
        rentalPriceHouse: 390,
        rentalPriceUnit: 320,
        vacancyRate: 1.4,
        schools: 'Primary Schools: Adelaide Botanic High School Primary (ICSEA: 1160, Top 8% in Adelaide, 0.8km), Whitefriars School (ICSEA: 1145, Top 12% in Adelaide, Catholic, 1.5km). High Schools: Adelaide High School (ICSEA: 1175, Top 5% in SA, 1.2km), Adelaide Botanic High School (ICSEA: 1180, Top 4% in SA, 0.8km)',
        lastUpdated: '2026-01-15'
    },
    'bondi': {
        state: 'NSW',
        cityDistrict: 'Eastern Suburbs, Sydney',
        medianHousePrice: 3200000,
        medianUnitPrice: 1150000,
        rentalPriceHouse: 1200,
        rentalPriceUnit: 750,
        vacancyRate: 2.3,
        schools: 'Primary Schools: Bondi Beach Public School (ICSEA: 1185, Top 3% in Eastern Suburbs, 0.3km), Bondi Public School (ICSEA: 1175, Top 5% in Eastern Suburbs, 1km). High Schools: Dover Heights Public School (ICSEA: 1170, Top 8% in Eastern Suburbs, 2.5km), Rose Bay Secondary College (ICSEA: 1165, Top 10% in Eastern Suburbs, 3km)',
        lastUpdated: '2026-01-15'
    },
    'carlton': {
        state: 'VIC',
        cityDistrict: 'Inner Melbourne',
        medianHousePrice: 1350000,
        medianUnitPrice: 680000,
        rentalPriceHouse: 620,
        rentalPriceUnit: 450,
        vacancyRate: 1.9,
        schools: 'Primary Schools: Carlton Primary School (ICSEA: 1170, Top 6% in Inner Melbourne, 0.5km), Princes Hill Primary (ICSEA: 1185, Top 4% in Inner Melbourne, 1.5km). High Schools: University High School (ICSEA: 1195, Top 3% in Melbourne, Selective Entry, 2km), MacRobertson Girls High School (ICSEA: 1205, Top 1% in Victoria, Selective Entry, 3.5km)',
        lastUpdated: '2026-01-15'
    },
    'southbank': {
        state: 'QLD',
        cityDistrict: 'South Brisbane',
        medianHousePrice: 920000,
        medianUnitPrice: 580000,
        rentalPriceHouse: 520,
        rentalPriceUnit: 420,
        vacancyRate: 1.6,
        schools: 'Primary Schools: South Brisbane State School (ICSEA: 1155, Top 9% in South Brisbane, 0.6km), West End State School (ICSEA: 1150, Top 10% in South Brisbane, 1.2km). High Schools: Brisbane State High School (ICSEA: 1170, Top 5% in Queensland, 1.5km), Somerville House (ICSEA: 1190, Top 3% in Queensland, Private Girls, 2km)',
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
        cityDistrict: data.cityDistrict,
        medianHousePrice: data.medianHousePrice,
        medianUnitPrice: data.medianUnitPrice,
        rentalPriceHouse: data.rentalPriceHouse,
        rentalPriceUnit: data.rentalPriceUnit,
        vacancyRate: data.vacancyRate,
        schools: data.schools,
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
**${suburbName.charAt(0).toUpperCase() + suburbName.slice(1)}, ${data.state}** - Comprehensive Suburb Profile

📍 **Location:**
• City/District: ${data.cityDistrict}

🏫 **Schools & Education:**
${data.schools}

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

Would you like me to add all this information to your database?
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
