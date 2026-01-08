module "bedrock_agent" {
  source = "../_module"

  name        = "child-event-manager"
  environment = "dev"
  random_name = true

  agent_description = "AI assistant for child event management powered by Claude 3.5"
  agent_instruction = <<-EOT
    You are a helpful AI assistant for managing child events and activities.
    You can help with:
    - Event planning and scheduling
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

  tags = {
    Application = "ChildEventManager"
    Component   = "BedrockAgent"
  }
}
