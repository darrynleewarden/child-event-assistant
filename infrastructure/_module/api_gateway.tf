# API Gateway HTTP API
resource "aws_apigatewayv2_api" "child_event_manager_main" {
  name          = "${local.agent_name}-api"
  protocol_type = "HTTP"
  description   = "API Gateway for Child Event Manager Bedrock Agent"

  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    expose_headers    = ["Content-Type", "X-Amz-Date", "X-Api-Key"]
    allow_credentials = var.cors_allow_credentials
    max_age           = 300
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-api"
      Environment = var.environment
    }
  )
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "child_event_manager_default" {
  api_id      = aws_apigatewayv2_api.child_event_manager_main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.child_event_manager_api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-api-stage"
      Environment = var.environment
    }
  )
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "child_event_manager_api_logs" {
  name              = "/aws/apigateway/${local.agent_name}"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-api-logs"
      Environment = var.environment
    }
  )
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "child_event_manager_lambda" {
  api_id           = aws_apigatewayv2_api.child_event_manager_main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.child_event_manager_bedrock_invoker.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# API Route for POST /invoke
resource "aws_apigatewayv2_route" "child_event_manager_invoke" {
  api_id    = aws_apigatewayv2_api.child_event_manager_main.id
  route_key = "POST /invoke"
  target    = "integrations/${aws_apigatewayv2_integration.child_event_manager_lambda.id}"
}
