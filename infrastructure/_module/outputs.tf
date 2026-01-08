output "agent_id" {
  description = "The ID of the Bedrock agent"
  value       = aws_bedrockagent_agent.main.id
}

output "agent_arn" {
  description = "The ARN of the Bedrock agent"
  value       = aws_bedrockagent_agent.main.agent_arn
}

output "agent_name" {
  description = "The name of the Bedrock agent"
  value       = aws_bedrockagent_agent.main.agent_name
}

output "agent_alias_id" {
  description = "The ID of the agent alias"
  value       = aws_bedrockagent_agent_alias.main.agent_alias_id
}

output "agent_alias_arn" {
  description = "The ARN of the agent alias"
  value       = aws_bedrockagent_agent_alias.main.agent_alias_arn
}

output "agent_role_arn" {
  description = "The ARN of the agent IAM role"
  value       = aws_iam_role.bedrock_agent.arn
}

output "knowledge_base_id" {
  description = "The ID of the knowledge base (if enabled)"
  value       = var.enable_knowledge_base ? aws_bedrockagent_knowledge_base.main[0].id : null
}

output "knowledge_base_arn" {
  description = "The ARN of the knowledge base (if enabled)"
  value       = var.enable_knowledge_base ? aws_bedrockagent_knowledge_base.main[0].arn : null
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket for knowledge base data (if enabled)"
  value       = var.enable_knowledge_base ? aws_s3_bucket.knowledge_base[0].id : null
}
