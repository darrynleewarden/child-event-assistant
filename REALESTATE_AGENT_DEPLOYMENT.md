# Real Estate Agent Deployment Guide

This guide explains how to deploy and use the Real Estate Suburb Analysis Agent.

## Overview

The Real Estate Agent is a specialized Bedrock agent that provides Australian suburb real estate market data including:
- Median house prices
- Median unit/apartment prices
- Rental prices (weekly rates for houses and units)
- Rental vacancy rates
- Calculated rental yields
- Market insights

## Architecture

The agent consists of:
1. **Bedrock Agent** (`bedrock_realestate_agent.tf`) - Claude 3.5 Sonnet agent specialized in real estate
2. **Lambda Function** (`lambda/realestate_handler.js`) - Handles data retrieval for suburbs
3. **API Schema** (`schemas/realestate_actions.json`) - Defines the getSuburbData action
4. **Routing Logic** - Keyword-based routing in the main Lambda invoker

## Keyword Trigger

The agent is automatically triggered when users include the keyword **`realestate`** in their chat messages.

Example triggers:
- "realestate tell me about Melbourne"
- "I need real estate info for Sydney"
- "What's the suburb data for Bondi?"

## Deployment Steps

### 1. Enable the Agent

The agent is enabled by default in the dev environment. If you need to disable it, set in `infrastructure/dev/main.tf`:

```terraform
enable_realestate_agent = false
```

### 2. Deploy Infrastructure

```bash
cd infrastructure/dev

# Initialize Terraform (first time only)
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply
```

### 3. Update Environment Variables

After deployment, Terraform will output the agent IDs. The Lambda invoker automatically receives these as environment variables:
- `REALESTATE_AGENT_ID`
- `REALESTATE_AGENT_ALIAS_ID`

### 4. Test the Agent

In the chat interface, type:

```
realestate tell me about Melbourne
```

Expected response includes:
- Median house and unit prices
- Rental prices and vacancy rates
- Rental yield calculations
- Market insights

## Available Suburbs (Demo Data)

The current implementation includes demo data for:
- Melbourne, VIC
- Sydney, NSW
- Brisbane, QLD
- Perth, WA
- Adelaide, SA
- Bondi, NSW
- Carlton, VIC
- Southbank, QLD

## Integrating Real Data

To integrate with real estate APIs, update `lambda/realestate_handler.js`:

### Option 1: Domain.com.au API
```javascript
// Install domain-api SDK in Lambda layer
const domain = require('domain-api');
```

### Option 2: CoreLogic API
```javascript
// Use CoreLogic RP Data API
const corelogic = require('corelogic-api');
```

### Option 3: REA (realestate.com.au) API
```javascript
// Contact REA for API access
```

### Option 4: SQM Research
```javascript
// Use SQM Research data feeds
```

### Implementation Steps:
1. Sign up for API access with your chosen provider
2. Store API keys in AWS Secrets Manager
3. Update Lambda IAM role to access the secret
4. Update `realestate_handler.js` to call the real API
5. Add error handling and caching

## Agent Configuration

### Agent Instructions
Located in `bedrock_realestate_agent.tf`, the agent is instructed to:
- Ask for suburb name if not provided
- Clarify state if multiple suburbs share the same name
- Provide accurate market data
- Explain data in practical terms
- Compare with nearby suburbs when relevant
- Highlight investment opportunities

### Action Schema
The agent has one action: `getSuburbData`

**Required Parameters:**
- `suburbName` (string) - Name of the Australian suburb

**Response Fields:**
- `medianHousePrice` - Median house price in AUD
- `medianUnitPrice` - Median unit price in AUD
- `rentalPriceHouse` - Weekly rental for houses
- `rentalPriceUnit` - Weekly rental for units
- `vacancyRate` - Percentage vacancy rate
- `houseRentalYield` - Calculated yield for houses
- `unitRentalYield` - Calculated yield for units
- `formattedResponse` - Pre-formatted response text

## Customization

### Adding More Suburbs
Edit `lambda/realestate_handler.js` and add to `MOCK_SUBURB_DATA`:

```javascript
'your-suburb': {
  state: 'VIC',
  medianHousePrice: 850000,
  medianUnitPrice: 520000,
  rentalPriceHouse: 450,
  rentalPriceUnit: 350,
  vacancyRate: 1.7,
  lastUpdated: '2026-01-15'
}
```

### Changing Trigger Keywords
Edit `lambda/bedrock_invoker.js` in the `determineAgent` function:

```javascript
if (lowercaseMessage.includes('realestate') || 
    lowercaseMessage.includes('property') || 
    lowercaseMessage.includes('suburb')) {
  return {
    agentId: process.env.REALESTATE_AGENT_ID,
    agentAliasId: process.env.REALESTATE_AGENT_ALIAS_ID,
    agentType: 'realestate'
  };
}
```

### Modifying Agent Personality
Edit the `instruction` field in `bedrock_realestate_agent.tf`:

```terraform
instruction = <<-EOT
  You are a [your custom personality]...
EOT
```

## Monitoring

### CloudWatch Logs
View Lambda execution logs:

```bash
aws logs tail /aws/lambda/child-event-manager-realestate-handler --follow
```

### Agent Metrics
Monitor in AWS Console:
- Bedrock > Agents > child-event-manager-realestate
- View invocation counts, latency, and errors

## Costs

Approximate AWS costs per 1000 requests:
- **Bedrock Agent Invocation**: ~$0.015 (Claude 3.5 Sonnet pricing)
- **Lambda Execution**: ~$0.0002 (based on 128MB, 1s execution)
- **Total**: ~$0.0152 per 1000 requests

## Troubleshooting

### Agent Not Triggered
- Check keyword in message (must include "realestate")
- Verify `REALESTATE_AGENT_ID` environment variable is set
- Check Lambda invoker logs

### No Data for Suburb
- Verify suburb name spelling
- Add suburb to `MOCK_SUBURB_DATA` or integrate real API
- Check Lambda handler logs for errors

### Permission Errors
- Verify IAM role has `bedrock:InvokeAgent` permission
- Check Lambda execution role has necessary permissions
- Ensure Bedrock agent can invoke the Lambda handler

## Future Enhancements

1. **Live Data Integration**
   - Connect to real estate APIs
   - Real-time price updates
   - Historical trend analysis

2. **Advanced Features**
   - Suburb comparisons
   - Investment analysis
   - School zone information
   - Transport accessibility scores
   - Crime statistics
   - Demographics data

3. **Caching**
   - Store suburb data in DynamoDB
   - Cache responses for 24 hours
   - Reduce API calls and costs

4. **User Preferences**
   - Save favorite suburbs
   - Custom alerts for price changes
   - Investment portfolio tracking

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review Terraform plan output
3. Verify environment variables
4. Test with simple suburb queries first

## License

This implementation is part of the Child Event Assistant project.
