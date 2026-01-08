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
  EOT

  foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

  # Knowledge base is optional - set to true if you want to use it
  enable_knowledge_base       = false
  knowledge_base_description = "Knowledge base for child event planning and safety guidelines"

  idle_session_ttl = 600

  allowed_origins = ["http://localhost:3000", "http://localhost:3001"]

  tags = {
    Application = "ChildEventManager"
    Component   = "BedrockAgent"
  }
}
