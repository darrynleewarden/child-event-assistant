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
