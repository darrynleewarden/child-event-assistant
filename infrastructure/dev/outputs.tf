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
