variable "name" {
  description = "The name of the Bedrock agent. Also used as name part in other resources that require a name."
  type        = string
}

variable "environment" {
  description = "The environment for the resources (e.g., dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "random_name" {
  description = "Use a random name part in resource creation."
  type        = bool
  default     = false
}

variable "agent_description" {
  description = "Description for the Bedrock agent"
  type        = string
  default     = "AI assistant powered by Claude 3.5"
}

variable "agent_instruction" {
  description = "Instructions for the Bedrock agent"
  type        = string
  default     = "You are a helpful AI assistant. Answer questions accurately and concisely."
}

variable "foundation_model" {
  description = "The foundation model to use for the agent"
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}

variable "idle_session_ttl" {
  description = "Idle session TTL in seconds"
  type        = number
  default     = 600
}

variable "enable_knowledge_base" {
  description = "Enable knowledge base for the agent"
  type        = bool
  default     = false
}

variable "knowledge_base_description" {
  description = "Description for the knowledge base"
  type        = string
  default     = "Knowledge base for Bedrock agent"
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
