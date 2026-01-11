# Bedrock Agent
resource "aws_bedrockagent_agent" "child_event_manager_main" {
  agent_name                  = local.agent_name
  agent_resource_role_arn     = aws_iam_role.child_event_manager_bedrock_agent.arn
  description                 = var.agent_description
  foundation_model            = var.foundation_model
  instruction                 = var.agent_instruction
  idle_session_ttl_in_seconds = var.idle_session_ttl

  # Enable memory to maintain conversation context
  memory_configuration {
    enabled_memory_types = ["SESSION_SUMMARY"]
    storage_days         = var.memory_storage_days
  }

  tags = merge(
    var.tags,
    {
      Name        = local.agent_name
      Environment = var.environment
    }
  )
}

# Agent Alias
resource "aws_bedrockagent_agent_alias" "child_event_manager_main" {
  agent_alias_name = "${var.environment}-alias"
  agent_id         = aws_bedrockagent_agent.child_event_manager_main.id
  description      = "Alias for ${var.environment} environment"

  # This will create a new version and point the alias to it
  depends_on = [
    aws_bedrockagent_agent_action_group.child_event_manager_database
  ]

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-alias"
      Environment = var.environment
    }
  )

  lifecycle {
    replace_triggered_by = [
      aws_bedrockagent_agent.child_event_manager_main,
      aws_bedrockagent_agent_action_group.child_event_manager_database
    ]
  }
}

# Associate Knowledge Base with Agent (if enabled)
resource "aws_bedrockagent_agent_knowledge_base_association" "child_event_manager_main" {
  count                = var.enable_knowledge_base ? 1 : 0
  agent_id             = aws_bedrockagent_agent.child_event_manager_main.id
  agent_version        = "DRAFT"
  description          = "Association between agent and knowledge base"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.child_event_manager_main[0].id
  knowledge_base_state = "ENABLED"
}
