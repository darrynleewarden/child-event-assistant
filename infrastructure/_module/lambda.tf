# Create Lambda deployment package
data "archive_file" "child_event_manager_lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda/bedrock_invoker.zip"

  source {
    content  = file("${path.module}/lambda/bedrock_invoker.js")
    filename = "index.js"
  }
}

# Lambda Function to Invoke Bedrock Agent
resource "aws_lambda_function" "child_event_manager_bedrock_invoker" {
  filename         = data.archive_file.child_event_manager_lambda_zip.output_path
  function_name    = "${local.agent_name}-invoker"
  role             = aws_iam_role.child_event_manager_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  source_code_hash = data.archive_file.child_event_manager_lambda_zip.output_base64sha256

  environment {
    variables = {
      AGENT_ID                 = aws_bedrockagent_agent.child_event_manager_main.id
      AGENT_ALIAS_ID           = aws_bedrockagent_agent_alias.child_event_manager_main.agent_alias_id
      MEAL_AGENT_ID            = var.enable_meal_agent ? aws_bedrockagent_agent.child_event_manager_meal_planner[0].id : ""
      MEAL_AGENT_ALIAS_ID      = var.enable_meal_agent ? aws_bedrockagent_agent_alias.child_event_manager_meal_planner[0].agent_alias_id : ""
      LOCATION_AGENT_ID        = var.enable_location_agent ? aws_bedrockagent_agent.child_event_manager_location[0].id : ""
      LOCATION_AGENT_ALIAS_ID  = var.enable_location_agent ? aws_bedrockagent_agent_alias.child_event_manager_location[0].agent_alias_id : ""
      REPORTING_AGENT_ID       = var.enable_reporting_agent ? aws_bedrockagent_agent.child_event_manager_reporting[0].id : ""
      REPORTING_AGENT_ALIAS_ID = var.enable_reporting_agent ? aws_bedrockagent_agent_alias.child_event_manager_reporting[0].agent_alias_id : ""
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-invoker"
      Environment = var.environment
    }
  )
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "child_event_manager_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.child_event_manager_bedrock_invoker.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.child_event_manager_main.execution_arn}/*/*"
}

# =============================================================================
# Location Agent Lambda Function
# =============================================================================

# Create Location Lambda deployment package
data "archive_file" "child_event_manager_location_zip" {
  count       = var.enable_location_agent ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/location_handler.zip"

  source {
    content  = file("${path.module}/lambda/location_handler.js")
    filename = "index.js"
  }
}

# Lambda Function for Location Agent Actions
resource "aws_lambda_function" "child_event_manager_location_handler" {
  count            = var.enable_location_agent ? 1 : 0
  filename         = data.archive_file.child_event_manager_location_zip[0].output_path
  function_name    = "${local.agent_name}-location-handler"
  role             = aws_iam_role.child_event_manager_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  source_code_hash = data.archive_file.child_event_manager_location_zip[0].output_base64sha256

  environment {
    variables = {
      AGENT_TYPE = "location"
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-location-handler"
      Environment = var.environment
      Purpose     = "LocationActions"
    }
  )
}

# Lambda Permission for Bedrock Agent to invoke Location handler
resource "aws_lambda_permission" "child_event_manager_location_bedrock" {
  count         = var.enable_location_agent && var.enable_database ? 1 : 0
  statement_id  = "AllowLocationAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.child_event_manager_database_handler[0].function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.child_event_manager_location[0].agent_arn
}

# =============================================================================
# Reporting Agent Lambda Function
# =============================================================================

# Create Reporting Lambda deployment package
data "archive_file" "child_event_manager_reporting_zip" {
  count       = var.enable_reporting_agent ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/reporting_handler.zip"

  source {
    content  = file("${path.module}/lambda/reporting_handler.js")
    filename = "index.js"
  }
}

# Lambda Function for Reporting Agent Actions
resource "aws_lambda_function" "child_event_manager_reporting_handler" {
  count            = var.enable_reporting_agent ? 1 : 0
  filename         = data.archive_file.child_event_manager_reporting_zip[0].output_path
  function_name    = "${local.agent_name}-reporting-handler"
  role             = var.enable_database ? aws_iam_role.child_event_manager_lambda_db[0].arn : aws_iam_role.child_event_manager_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512
  source_code_hash = data.archive_file.child_event_manager_reporting_zip[0].output_base64sha256
  layers           = var.enable_database ? [aws_lambda_layer_version.child_event_manager_database_dependencies[0].arn] : []

  dynamic "vpc_config" {
    for_each = var.enable_database ? [1] : []
    content {
      subnet_ids = [
        aws_subnet.child_event_manager_private_a[0].id,
        aws_subnet.child_event_manager_private_b[0].id
      ]
      security_group_ids = [
        aws_security_group.child_event_manager_lambda_db[0].id
      ]
    }
  }

  environment {
    variables = {
      AGENT_TYPE            = "reporting"
      DB_SECRET_ARN         = var.enable_database ? aws_secretsmanager_secret.child_event_manager_db[0].arn : ""
      REPORTS_BUCKET        = var.enable_reporting_agent ? aws_s3_bucket.child_event_manager_reports[0].id : ""
      KNOWLEDGE_BASE_BUCKET = var.enable_knowledge_base ? aws_s3_bucket.child_event_manager_knowledge_base[0].id : ""
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-reporting-handler"
      Environment = var.environment
      Purpose     = "ReportGeneration"
    }
  )
}

# Lambda Permission for Bedrock Agent to invoke Reporting handler
resource "aws_lambda_permission" "child_event_manager_reporting_bedrock" {
  count         = var.enable_reporting_agent ? 1 : 0
  statement_id  = "AllowReportingAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.child_event_manager_reporting_handler[0].function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.child_event_manager_reporting[0].agent_arn
}
