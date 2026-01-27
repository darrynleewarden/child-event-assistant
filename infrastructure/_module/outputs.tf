output "agent_id" {
  description = "The ID of the Bedrock agent"
  value       = aws_bedrockagent_agent.child_event_manager_main.id
}

output "agent_arn" {
  description = "The ARN of the Bedrock agent"
  value       = aws_bedrockagent_agent.child_event_manager_main.agent_arn
}

output "agent_name" {
  description = "The name of the Bedrock agent"
  value       = aws_bedrockagent_agent.child_event_manager_main.agent_name
}

output "agent_alias_id" {
  description = "The ID of the agent alias"
  value       = aws_bedrockagent_agent_alias.child_event_manager_main.agent_alias_id
}

output "agent_alias_arn" {
  description = "The ARN of the agent alias"
  value       = aws_bedrockagent_agent_alias.child_event_manager_main.agent_alias_arn
}

output "agent_role_arn" {
  description = "The ARN of the agent IAM role"
  value       = aws_iam_role.child_event_manager_bedrock_agent.arn
}

output "knowledge_base_id" {
  description = "The ID of the knowledge base (if enabled)"
  value       = var.enable_knowledge_base ? aws_bedrockagent_knowledge_base.child_event_manager_main[0].id : null
}

output "knowledge_base_arn" {
  description = "The ARN of the knowledge base (if enabled)"
  value       = var.enable_knowledge_base ? aws_bedrockagent_knowledge_base.child_event_manager_main[0].arn : null
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket for knowledge base data (if enabled)"
  value       = var.enable_knowledge_base ? aws_s3_bucket.child_event_manager_knowledge_base[0].id : null
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.child_event_manager_main.api_endpoint
}

output "api_invoke_url" {
  description = "Full API invoke URL for POST /invoke endpoint"
  value       = "${aws_apigatewayv2_api.child_event_manager_main.api_endpoint}/invoke"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.child_event_manager_bedrock_invoker.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.child_event_manager_bedrock_invoker.arn
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = var.enable_database ? aws_db_instance.child_event_manager_main[0].endpoint : null
}

output "db_address" {
  description = "RDS instance address (hostname)"
  value       = var.enable_database ? aws_db_instance.child_event_manager_main[0].address : null
}

output "db_port" {
  description = "RDS instance port"
  value       = var.enable_database ? aws_db_instance.child_event_manager_main[0].port : null
}

output "db_name" {
  description = "Database name"
  value       = var.enable_database ? aws_db_instance.child_event_manager_main[0].db_name : null
}

output "db_username" {
  description = "Database master username"
  value       = var.enable_database ? aws_db_instance.child_event_manager_main[0].username : null
}

output "db_secret_arn" {
  description = "ARN of the Secrets Manager secret containing database credentials"
  value       = var.enable_database ? aws_secretsmanager_secret.child_event_manager_db[0].arn : null
}

output "database_url" {
  description = "Full database connection URL (without password - retrieve from Secrets Manager)"
  value       = var.enable_database ? "postgresql://${var.db_username}:<password>@${aws_db_instance.child_event_manager_main[0].address}:5432/${var.db_name}" : null
  sensitive   = false
}

output "vpc_id" {
  description = "VPC ID (if database is enabled)"
  value       = var.enable_database ? aws_vpc.child_event_manager_main[0].id : null
}

output "db_lambda_function_name" {
  description = "Database Lambda function name"
  value       = var.enable_database ? aws_lambda_function.child_event_manager_database_handler[0].function_name : null
}

output "db_lambda_function_arn" {
  description = "Database Lambda function ARN"
  value       = var.enable_database ? aws_lambda_function.child_event_manager_database_handler[0].arn : null
}

output "bedrock_action_group_id" {
  description = "Bedrock Agent Action Group ID for database actions"
  value       = var.enable_database ? aws_bedrockagent_agent_action_group.child_event_manager_database[0].id : null
}

# =============================================================================
# Meal Planner Agent Outputs
# =============================================================================

output "meal_agent_id" {
  description = "The ID of the Meal Planner Bedrock agent"
  value       = var.enable_meal_agent ? aws_bedrockagent_agent.child_event_manager_meal_planner[0].id : null
}

output "meal_agent_arn" {
  description = "The ARN of the Meal Planner Bedrock agent"
  value       = var.enable_meal_agent ? aws_bedrockagent_agent.child_event_manager_meal_planner[0].agent_arn : null
}

output "meal_agent_name" {
  description = "The name of the Meal Planner Bedrock agent"
  value       = var.enable_meal_agent ? aws_bedrockagent_agent.child_event_manager_meal_planner[0].agent_name : null
}

output "meal_agent_alias_id" {
  description = "The ID of the meal planner agent alias"
  value       = var.enable_meal_agent ? aws_bedrockagent_agent_alias.child_event_manager_meal_planner[0].agent_alias_id : null
}

output "meal_agent_alias_arn" {
  description = "The ARN of the meal planner agent alias"
  value       = var.enable_meal_agent ? aws_bedrockagent_agent_alias.child_event_manager_meal_planner[0].agent_alias_arn : null
}

# =============================================================================
# Location Agent Outputs
# =============================================================================

output "location_agent_id" {
  description = "The ID of the Location Bedrock agent"
  value       = var.enable_location_agent ? aws_bedrockagent_agent.child_event_manager_location[0].id : null
}

output "location_agent_arn" {
  description = "The ARN of the Location Bedrock agent"
  value       = var.enable_location_agent ? aws_bedrockagent_agent.child_event_manager_location[0].agent_arn : null
}

output "location_agent_name" {
  description = "The name of the Location Bedrock agent"
  value       = var.enable_location_agent ? aws_bedrockagent_agent.child_event_manager_location[0].agent_name : null
}

output "location_agent_alias_id" {
  description = "The ID of the location agent alias"
  value       = var.enable_location_agent ? aws_bedrockagent_agent_alias.child_event_manager_location[0].agent_alias_id : null
}

output "location_agent_alias_arn" {
  description = "The ARN of the location agent alias"
  value       = var.enable_location_agent ? aws_bedrockagent_agent_alias.child_event_manager_location[0].agent_alias_arn : null
}

# =============================================================================
# Reporting Agent Outputs
# =============================================================================

output "reporting_agent_id" {
  description = "The ID of the Reporting Bedrock agent"
  value       = var.enable_reporting_agent ? aws_bedrockagent_agent.child_event_manager_reporting[0].id : null
}

output "reporting_agent_arn" {
  description = "The ARN of the Reporting Bedrock agent"
  value       = var.enable_reporting_agent ? aws_bedrockagent_agent.child_event_manager_reporting[0].agent_arn : null
}

output "reporting_agent_name" {
  description = "The name of the Reporting Bedrock agent"
  value       = var.enable_reporting_agent ? aws_bedrockagent_agent.child_event_manager_reporting[0].agent_name : null
}

output "reporting_agent_alias_id" {
  description = "The ID of the reporting agent alias"
  value       = var.enable_reporting_agent ? aws_bedrockagent_agent_alias.child_event_manager_reporting[0].agent_alias_id : null
}

output "reporting_agent_alias_arn" {
  description = "The ARN of the reporting agent alias"
  value       = var.enable_reporting_agent ? aws_bedrockagent_agent_alias.child_event_manager_reporting[0].agent_alias_arn : null
}

output "reports_bucket_name" {
  description = "The name of the S3 bucket for reports (if enabled)"
  value       = var.enable_reporting_agent ? aws_s3_bucket.child_event_manager_reports[0].id : null
}

output "reports_bucket_arn" {
  description = "The ARN of the S3 bucket for reports (if enabled)"
  value       = var.enable_reporting_agent ? aws_s3_bucket.child_event_manager_reports[0].arn : null
}
