module "bedrock_agent" {
  source = "../_module"

  name        = "child-event-manager"
  environment = "dev"
  random_name = true

  agent_description = "AI assistant for child event management powered by Claude 3.5"
  agent_instruction = <<-EOT
    You are a helpful AI assistant for managing child events and activities.

    IMPORTANT: You have full access to a PostgreSQL database with real child and event data.
    You can both READ and WRITE to the database using your action group.

    Available database operations:

    READ operations:
    - get-children: Retrieve all children or filter by user ID or name
    - get-child-details: Get detailed information about a specific child including events
    - get-child-events: Get all events for a specific child
    - get-event-statistics: Get aggregate statistics about events

    WRITE operations:
    - create-child: Add a new child to the database (requires: firstName, dateOfBirth, userId)
    - update-child: Update child information (requires: childId, plus any fields to update)
    - delete-child: Remove a child and all their events (requires: childId)
    - create-event: Add a new event for a child (requires: childId, name, eventType)
    - update-event: Update event information (requires: eventId, plus any fields to update)
    - delete-event: Remove an event (requires: eventId)

    When creating or updating records:
    - For dates, use YYYY-MM-DD format
    - For event types, use: Medical, Education, Sports, Arts, Social, or Celebration
    - Always confirm with the user before deleting any data
    - After creating/updating/deleting, report back what was changed

    You can help with:
    - Querying and reporting on children in the database
    - Creating and managing child records
    - Creating and managing event records
    - Viewing and analyzing child events
    - Event planning and scheduling recommendations
    - Activity suggestions for different age groups
    - Safety considerations and guidelines
    - Parent communication and updates

    Always provide accurate, safe, and age-appropriate recommendations.
    Be friendly, professional, and considerate of children's needs.

    IMPORTANT: You have conversation memory enabled. Use context from previous messages
    in this session to provide more personalized and contextual responses. Remember
    details the user shares about their children, preferences, and ongoing plans.
  EOT

  foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

  # Knowledge base is optional - set to true if you want to use it
  enable_knowledge_base      = false
  knowledge_base_description = "Knowledge base for child event planning and safety guidelines"

  idle_session_ttl    = 600
  memory_storage_days = 7 # Store conversation context for 7 days in dev

  # CORS Configuration
  allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
  ]
  cors_allow_credentials = true

  # =============================================================================
  # Database Configuration
  # =============================================================================
  enable_database            = true
  db_name                    = "child_event_assistant"
  db_username                = "postgres"
  db_instance_class          = "db.t3.micro" # Free tier eligible
  db_allocated_storage       = 20
  db_max_allocated_storage   = 50
  db_backup_retention_period = 7
  db_publicly_accessible     = true # Allow access from local machine

  # IMPORTANT: Restrict this to your IP address for security
  # You can find your IP at https://whatismyipaddress.com/
  db_allowed_cidr_blocks = ["0.0.0.0/0"] # TODO: Replace with your IP/32 for security

  tags = {
    Application = "ChildEventManager"
    Component   = "BedrockAgent"
  }
}
