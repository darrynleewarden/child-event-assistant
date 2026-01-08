module "bedrock_agent" {
  source = "../_module"

  name        = "child-event-manager"
  environment = "staging"
  random_name = true

  agent_description = "AI assistant for child event management powered by Claude 3.5 (Staging)"
  agent_instruction = <<-EOT
    You are a helpful AI assistant for managing child events and activities.
    You can help with:
    - Event planning and scheduling
    - Activity suggestions for different age groups
    - Safety considerations and guidelines
    - Parent communication and updates

    Always provide accurate, safe, and age-appropriate recommendations.
    Be friendly, professional, and considerate of children's needs.

    This is the STAGING environment for testing purposes.
  EOT

  foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

  enable_knowledge_base       = false
  knowledge_base_description = "Knowledge base for child event planning and safety guidelines (Staging)"

  idle_session_ttl = 600

  allowed_origins = ["https://staging.child-event-manager.com"]

  tags = {
    Application = "ChildEventManager"
    Component   = "BedrockAgent"
  }
}
