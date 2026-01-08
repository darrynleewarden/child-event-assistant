module "bedrock_agent" {
  source = "../_module"

  name        = "child-event-manager"
  environment = "prod"
  random_name = false  # Use consistent naming in production

  agent_description = "AI assistant for child event management powered by Claude 3.5 (Production)"
  agent_instruction = <<-EOT
    You are a helpful AI assistant for managing child events and activities.
    You can help with:
    - Event planning and scheduling
    - Activity suggestions for different age groups
    - Safety considerations and guidelines
    - Parent communication and updates

    Always provide accurate, safe, and age-appropriate recommendations.
    Be friendly, professional, and considerate of children's needs.
    Ensure all information is verified and appropriate for a production environment.
  EOT

  foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"

  enable_knowledge_base       = true
  knowledge_base_description = "Production knowledge base for child event planning and safety guidelines"

  idle_session_ttl = 900  # 15 minutes for production

  tags = {
    Application = "ChildEventManager"
    Component   = "BedrockAgent"
    CriticalityLevel = "High"
  }
}
