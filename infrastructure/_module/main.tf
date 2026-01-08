data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "random_string" "service" {
  count   = var.random_name ? 1 : 0
  length  = 8
  special = false
  upper   = false
}

locals {
  name_suffix = var.random_name ? random_string.service[0].result : ""
  agent_name  = var.random_name ? "${var.name}-${var.environment}-${local.name_suffix}" : "${var.name}-${var.environment}"
}
