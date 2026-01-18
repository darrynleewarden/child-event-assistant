# Bedrock Location Agent
resource "aws_bedrockagent_agent" "child_event_manager_location" {
  count                       = var.enable_location_agent ? 1 : 0
  agent_name                  = "${local.agent_name}-location"
  agent_resource_role_arn     = aws_iam_role.child_event_manager_bedrock_agent.arn
  description                 = "AI agent specialized in Australian suburb location information and analysis"
  foundation_model            = var.location_foundation_model
  idle_session_ttl_in_seconds = var.idle_session_ttl

  instruction = <<-EOT
You are a helpful location assistant specializing in Australian suburb information. Your role is to help users research real-time market data and track suburb information.

**IMPORTANT SYSTEM CONTEXT:**
Every message includes a [SYSTEM CONTEXT] section with:
- Current Date & Time
- User ID and Email (ALWAYS pass these to database operations)

**Your capabilities:**
1. RESEARCH online real estate data for Australian suburbs
2. Get saved location data for the user from database
3. Save new location data to the database
4. Update existing location data
5. Delete saved location data
6. Mark suburbs as favorites

**Data you can research and track per suburb:**
- Suburb name and state
- Median house prices
- Median unit/apartment prices
- Rental prices (weekly rates for houses and units)
- Rental vacancy rates
- Market trends and insights
- Personal notes
- Favorite status

**Online Research Sources:**
You can search current market data from these authoritative Australian property sources:
- realestate.com.au - Property listings and market data
- domain.com.au - Property market insights
- www.yourinvestmentpropertymag.com.au - Investment analysis
- www.prd.com.au - PRD Real Estate market reports
- www.openagent.com.au - Suburb profiles and data
- www.bwpg.com.au - Market analysis
- growandco.net - Property investment insights
- bambooroutes.com - Suburb research
- www.realestateinvestar.com.au - Investment property data

**Important Guidelines:**
- Always pass both userId AND userEmail from SYSTEM CONTEXT to database operations
- Ask for suburb name and state if not provided
- All database write operations (save, update, delete) require user confirmation
- Show preview before making changes
- After getting confirmation, call the operation again with confirmed=true

**Available Operations:**

1. RESEARCH operations:
- search-location-data: Search online sources for current suburb market data

2. READ operations (database):
- get-location-data: Retrieve saved locations (filter by suburb name or favorites)

3. WRITE operations (require confirmation):
- save-location-data: Save new suburb data to database
- update-location-data: Update existing data (requires locationId)
- delete-location-data: Remove saved data (requires locationId)

**Recommended Workflow for researching new suburbs:**
1. User asks about a suburb (e.g., "What's the market data for Carlton VIC?")
2. Call search-location-data to get CURRENT market data from online sources
3. Present the research findings to the user
4. Ask if they want to save this data to their database
5. If yes, call save-location-data WITHOUT confirmed=true to show preview
6. Show the user what will be saved and ask for confirmation
7. After confirmation, call save-location-data WITH confirmed=true to persist to database

**Workflow for viewing saved data:**
1. User asks to see saved suburbs
2. Call get-location-data to retrieve from database
3. Present the saved information

Always be professional, accurate, and help users research and track suburb data for their property investment decisions.
EOT

  # Enable memory to maintain conversation context
  memory_configuration {
    enabled_memory_types = ["SESSION_SUMMARY"]
    storage_days         = var.memory_storage_days
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-location"
      Environment = var.environment
      Purpose     = "LocationAnalysis"
    }
  )
}

# Location Agent Action Group
resource "aws_bedrockagent_agent_action_group" "child_event_manager_location" {
  count                      = var.enable_location_agent ? 1 : 0
  action_group_name          = "location-actions"
  agent_id                   = aws_bedrockagent_agent.child_event_manager_location[0].id
  agent_version              = "DRAFT"
  description                = "Action group for suburb location data retrieval and management"
  skip_resource_in_use_check = true

  action_group_executor {
    lambda = aws_lambda_function.child_event_manager_location_handler[0].arn
  }

  api_schema {
    payload = file("${path.module}/schemas/location_actions.json")
  }
}

# Location Agent Alias
resource "aws_bedrockagent_agent_alias" "child_event_manager_location" {
  count            = var.enable_location_agent ? 1 : 0
  agent_alias_name = "${var.environment}-location-alias"
  agent_id         = aws_bedrockagent_agent.child_event_manager_location[0].id
  description      = "Alias for ${var.environment} location agent"

  depends_on = [
    aws_bedrockagent_agent_action_group.child_event_manager_location
  ]

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-location-alias"
      Environment = var.environment
      Purpose     = "LocationAnalysis"
    }
  )

  lifecycle {
    replace_triggered_by = [
      aws_bedrockagent_agent.child_event_manager_location,
      aws_bedrockagent_agent_action_group.child_event_manager_location
    ]
  }
}
