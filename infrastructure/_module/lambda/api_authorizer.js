// Simple API Key Authorizer for API Gateway
exports.handler = async (event) => {
    console.log('Authorizer event:', JSON.stringify(event, null, 2));

    // Get API key from headers
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    const expectedApiKey = process.env.API_KEY;

    if (!apiKey) {
        console.log('No API key provided');
        return {
            isAuthorized: false
        };
    }

    // Validate API key
    const isValid = apiKey === expectedApiKey;

    console.log('API key validation:', isValid ? 'SUCCESS' : 'FAILED');

    return {
        isAuthorized: isValid
    };
};
