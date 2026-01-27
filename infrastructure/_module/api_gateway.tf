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

  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.child_event_manager_api_key.id
}

# Lambda Authorizer for API Key validation
resource "aws_apigatewayv2_authorizer" "child_event_manager_api_key" {
  api_id           = aws_apigatewayv2_api.child_event_manager_main.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.child_event_manager_api_authorizer.invoke_arn
  identity_sources = ["$request.header.x-api-key"]
  name             = "${local.agent_name}-authorizer"

  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
}

# Lambda function for API key authorization
data "archive_file" "child_event_manager_authorizer_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda/api_authorizer.zip"

  source {
    content  = file("${path.module}/lambda/api_authorizer.js")
    filename = "index.js"
  }
}

resource "aws_lambda_function" "child_event_manager_api_authorizer" {
  filename         = data.archive_file.child_event_manager_authorizer_zip.output_path
  function_name    = "${local.agent_name}-api-authorizer"
  role             = aws_iam_role.child_event_manager_lambda.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.child_event_manager_authorizer_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      API_KEY = random_password.child_event_manager_api_key.result
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-api-authorizer"
      Environment = var.environment
    }
  )
}

# Permission for API Gateway to invoke the authorizer Lambda
resource "aws_lambda_permission" "child_event_manager_api_gateway_authorizer" {
  statement_id  = "AllowAPIGatewayAuthorizerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.child_event_manager_api_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.child_event_manager_main.execution_arn}/*/*"
}

# Generate a secure random API key
resource "random_password" "child_event_manager_api_key" {
  length           = 40
  special          = false
  override_special = ""
}

# Store API key in Secrets Manager
resource "aws_secretsmanager_secret" "child_event_manager_api_key" {
  name        = "${local.agent_name}-api-key"
  description = "API key for Child Event Manager API Gateway"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-api-key"
      Environment = var.environment
    }
  )
}

resource "aws_secretsmanager_secret_version" "child_event_manager_api_key" {
  secret_id     = aws_secretsmanager_secret.child_event_manager_api_key.id
  secret_string = random_password.child_event_manager_api_key.result
}
