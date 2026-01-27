output "agent_id" {
  description = "The ID of the Bedrock agent"
  value       = module.bedrock_agent.agent_id
}

output "agent_arn" {
  description = "The ARN of the Bedrock agent"
  value       = module.bedrock_agent.agent_arn
}

output "agent_name" {
  description = "The name of the Bedrock agent"
  value       = module.bedrock_agent.agent_name
}

output "agent_alias_id" {
  description = "The ID of the agent alias"
  value       = module.bedrock_agent.agent_alias_id
}

output "agent_alias_arn" {
  description = "The ARN of the agent alias"
  value       = module.bedrock_agent.agent_alias_arn
}

output "agent_role_arn" {
  description = "The ARN of the agent IAM role"
  value       = module.bedrock_agent.agent_role_arn
}

output "knowledge_base_id" {
  description = "The ID of the knowledge base (if enabled)"
  value       = module.bedrock_agent.knowledge_base_id
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket for knowledge base data (if enabled)"
  value       = module.bedrock_agent.s3_bucket_name
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.bedrock_agent.api_endpoint
}

output "api_invoke_url" {
  description = "Full API invoke URL"
  value       = module.bedrock_agent.api_invoke_url
}

# =============================================================================
# Database Outputs
# =============================================================================

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = module.bedrock_agent.db_endpoint
}

output "db_address" {
  description = "RDS instance address (hostname)"
  value       = module.bedrock_agent.db_address
}

output "db_name" {
  description = "Database name"
  value       = module.bedrock_agent.db_name
}

output "db_username" {
  description = "Database master username"
  value       = module.bedrock_agent.db_username
}

output "db_secret_arn" {
  description = "ARN of the Secrets Manager secret containing database credentials"
  value       = module.bedrock_agent.db_secret_arn
}

output "database_url_template" {
  description = "Database URL template (retrieve password from Secrets Manager)"
  value       = module.bedrock_agent.database_url
}

# =============================================================================
# Specialized Agents Outputs
# =============================================================================

output "meal_agent_id" {
  description = "The ID of the Meal Planner agent"
  value       = module.bedrock_agent.meal_agent_id
}

output "meal_agent_alias_id" {
  description = "The alias ID of the Meal Planner agent"
  value       = module.bedrock_agent.meal_agent_alias_id
}

output "location_agent_id" {
  description = "The ID of the Location agent"
  value       = module.bedrock_agent.location_agent_id
}

output "location_agent_alias_id" {
  description = "The alias ID of the Location agent"
  value       = module.bedrock_agent.location_agent_alias_id
}

output "reporting_agent_id" {
  description = "The ID of the Reporting agent"
  value       = module.bedrock_agent.reporting_agent_id
}

output "reporting_agent_alias_id" {
  description = "The alias ID of the Reporting agent"
  value       = module.bedrock_agent.reporting_agent_alias_id
}
