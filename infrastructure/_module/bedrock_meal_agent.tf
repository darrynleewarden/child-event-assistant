# Bedrock Meal Planner Agent
resource "aws_bedrockagent_agent" "child_event_manager_meal_planner" {
  count                       = var.enable_meal_agent ? 1 : 0
  agent_name                  = "${local.agent_name}-meal-planner"
  agent_resource_role_arn     = aws_iam_role.child_event_manager_bedrock_agent.arn
  description                 = "AI agent specialized in meal planning and weekly menu creation"
  foundation_model            = var.foundation_model
  idle_session_ttl_in_seconds = var.idle_session_ttl

  instruction = <<-EOT
You are a helpful meal planning assistant for families with children. Your role is to help users:

1. **Create and manage meals**: Help users build a library of meals with ingredients, prep times, and allergy information
2. **Plan weekly menus**: Create meal plans for specific date ranges (typically Monday-Sunday)
3. **Organize meal schedules**: Add meals to specific days and times (breakfast, lunch, dinner, snack)
4. **Consider dietary needs**: Pay attention to allergy information and dietary restrictions

**Important Guidelines:**
- Always get user confirmation before creating, updating, or deleting data
- When creating meal plans, suggest the current week's Monday-Sunday dates
- Help organize meals by category (breakfast, lunch, dinner, snack)
- Consider prep time when suggesting meals for busy days
- Track allergy information carefully and highlight it when relevant

**Your capabilities:**
- Get and search meals by category or template status
- Create new meals with full details (ingredients, prep time, allergens)
- Update existing meals
- Delete meals (with warnings if used in plans)
- Get and filter meal plans
- Create new weekly meal plans
- Add meals to specific days/times in a plan

Always be friendly, practical, and help families create realistic, healthy meal plans that work for their schedules.
EOT

  # Enable memory to maintain conversation context
  memory_configuration {
    enabled_memory_types = ["SESSION_SUMMARY"]
    storage_days         = var.memory_storage_days
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-meal-planner"
      Environment = var.environment
      Purpose     = "MealPlanning"
    }
  )
}

# Meal Agent Action Group
resource "aws_bedrockagent_agent_action_group" "child_event_manager_meals" {
  count                      = var.enable_meal_agent ? 1 : 0
  action_group_name          = "meal-planner-actions"
  agent_id                   = aws_bedrockagent_agent.child_event_manager_meal_planner[0].id
  agent_version              = "DRAFT"
  description                = "Action group for meal and meal plan management"
  skip_resource_in_use_check = true

  action_group_executor {
    lambda = var.enable_database ? aws_lambda_function.child_event_manager_database_handler[0].arn : ""
  }

  api_schema {
    payload = file("${path.module}/schemas/meals_actions.json")
  }
}

# Meal Agent Alias
resource "aws_bedrockagent_agent_alias" "child_event_manager_meal_planner" {
  count            = var.enable_meal_agent ? 1 : 0
  agent_alias_name = "${var.environment}-meal-alias"
  agent_id         = aws_bedrockagent_agent.child_event_manager_meal_planner[0].id
  description      = "Alias for ${var.environment} meal planner agent"

  depends_on = [
    aws_bedrockagent_agent_action_group.child_event_manager_meals
  ]

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-meal-planner-alias"
      Environment = var.environment
      Purpose     = "MealPlanning"
    }
  )

  lifecycle {
    replace_triggered_by = [
      aws_bedrockagent_agent.child_event_manager_meal_planner,
      aws_bedrockagent_agent_action_group.child_event_manager_meals
    ]
  }
}
