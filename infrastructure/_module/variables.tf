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

variable "location_foundation_model" {
  description = "The foundation model to use for the location agent"
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

variable "allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allow_credentials" {
  description = "Whether to allow credentials in CORS requests. Set to false when using wildcard origins."
  type        = bool
  default     = false
}

variable "memory_storage_days" {
  description = "Number of days to store conversation memory/context. Set to 0 to disable persistent memory."
  type        = number
  default     = 30
}

# =============================================================================
# Database Configuration
# =============================================================================

variable "enable_database" {
  description = "Enable RDS PostgreSQL database"
  type        = bool
  default     = false
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "child_event_assistant"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "postgres"
}

variable "db_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = number
  default     = 100
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_publicly_accessible" {
  description = "Whether the database should be publicly accessible"
  type        = bool
  default     = true
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the database"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_meal_agent" {
  description = "Enable separate Bedrock agent for meal planning"
  type        = bool
  default     = true
}

variable "enable_location_agent" {
  description = "Enable separate Bedrock agent for location suburb analysis"
  type        = bool
  default     = true
}

variable "enable_reporting_agent" {
  description = "Enable separate Bedrock agent for report generation"
  type        = bool
  default     = true
}
