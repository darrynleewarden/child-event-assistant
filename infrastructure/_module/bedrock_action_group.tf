# Private Subnets for Lambda (needed for VPC access to RDS)
resource "aws_subnet" "child_event_manager_private_a" {
  count             = var.enable_database ? 1 : 0
  vpc_id            = aws_vpc.child_event_manager_main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, 2)
  availability_zone = "${data.aws_region.current.name}a"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-private-subnet-a"
      Environment = var.environment
    }
  )
}

resource "aws_subnet" "child_event_manager_private_b" {
  count             = var.enable_database ? 1 : 0
  vpc_id            = aws_vpc.child_event_manager_main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, 3)
  availability_zone = "${data.aws_region.current.name}b"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-private-subnet-b"
      Environment = var.environment
    }
  )
}

# NAT Gateway for Lambda to access Secrets Manager
resource "aws_eip" "child_event_manager_nat" {
  count  = var.enable_database ? 1 : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-nat-eip"
      Environment = var.environment
    }
  )
}

resource "aws_nat_gateway" "child_event_manager_main" {
  count         = var.enable_database ? 1 : 0
  allocation_id = aws_eip.child_event_manager_nat[0].id
  subnet_id     = aws_subnet.child_event_manager_public_a[0].id

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-nat"
      Environment = var.environment
    }
  )

  depends_on = [aws_internet_gateway.child_event_manager_main]
}

# Route Table for Private Subnets
resource "aws_route_table" "child_event_manager_private" {
  count  = var.enable_database ? 1 : 0
  vpc_id = aws_vpc.child_event_manager_main[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.child_event_manager_main[0].id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-private-rt"
      Environment = var.environment
    }
  )
}

# Route Table Associations for Private Subnets
resource "aws_route_table_association" "child_event_manager_private_a" {
  count          = var.enable_database ? 1 : 0
  subnet_id      = aws_subnet.child_event_manager_private_a[0].id
  route_table_id = aws_route_table.child_event_manager_private[0].id
}

resource "aws_route_table_association" "child_event_manager_private_b" {
  count          = var.enable_database ? 1 : 0
  subnet_id      = aws_subnet.child_event_manager_private_b[0].id
  route_table_id = aws_route_table.child_event_manager_private[0].id
}

# Security Group for Lambda Function
resource "aws_security_group" "child_event_manager_lambda_db" {
  count       = var.enable_database ? 1 : 0
  name        = "${local.agent_name}-lambda-db-sg"
  description = "Security group for Lambda function accessing RDS"
  vpc_id      = aws_vpc.child_event_manager_main[0].id

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-lambda-db-sg"
      Environment = var.environment
    }
  )
}

# Update RDS Security Group to allow Lambda access
resource "aws_security_group_rule" "child_event_manager_rds_from_lambda" {
  count                    = var.enable_database ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.child_event_manager_lambda_db[0].id
  security_group_id        = aws_security_group.child_event_manager_rds[0].id
  description              = "Allow Lambda function to access RDS"
}

# IAM Role for Database Lambda Function
resource "aws_iam_role" "child_event_manager_lambda_db" {
  count = var.enable_database ? 1 : 0
  name  = "${local.agent_name}-lambda-db-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-lambda-db-role"
      Environment = var.environment
    }
  )
}

# Policy for Lambda to access Secrets Manager
resource "aws_iam_role_policy" "child_event_manager_lambda_db_secrets" {
  count = var.enable_database ? 1 : 0
  name  = "${local.agent_name}-lambda-db-secrets-policy"
  role  = aws_iam_role.child_event_manager_lambda_db[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.child_event_manager_db[0].arn
      }
    ]
  })
}

# Attach AWS managed policies for Lambda
resource "aws_iam_role_policy_attachment" "child_event_manager_lambda_db_basic" {
  count      = var.enable_database ? 1 : 0
  role       = aws_iam_role.child_event_manager_lambda_db[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "child_event_manager_lambda_db_vpc" {
  count      = var.enable_database ? 1 : 0
  role       = aws_iam_role.child_event_manager_lambda_db[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Policy for Reporting Lambda to write to S3
resource "aws_iam_role_policy" "child_event_manager_lambda_db_s3_write" {
  count = var.enable_database && var.enable_reporting_agent ? 1 : 0
  name  = "${local.agent_name}-lambda-s3-write-policy"
  role  = aws_iam_role.child_event_manager_lambda_db[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.child_event_manager_reports[0].arn}/*"
      }
    ]
  })
}

# Create Lambda deployment package for database handler
data "archive_file" "child_event_manager_lambda_db_zip" {
  count       = var.enable_database ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/database_handler.zip"

  source {
    content  = file("${path.module}/lambda/database_handler.js")
    filename = "index.js"
  }
}

# Lambda Layer for dependencies (pg, AWS SDK)
resource "null_resource" "child_event_manager_build_lambda_layer" {
  count = var.enable_database ? 1 : 0

  triggers = {
    package_json = filemd5("${path.module}/lambda/package.json")
  }

  provisioner "local-exec" {
    command     = "chmod +x build_layer.sh && ./build_layer.sh"
    working_dir = "${path.module}/lambda"
  }
}

resource "aws_lambda_layer_version" "child_event_manager_database_dependencies" {
  count               = var.enable_database ? 1 : 0
  filename            = "${path.module}/lambda/layer.zip"
  layer_name          = "${local.agent_name}-db-dependencies"
  compatible_runtimes = ["nodejs20.x"]
  description         = "PostgreSQL and AWS SDK dependencies for database handler"

  depends_on = [null_resource.child_event_manager_build_lambda_layer]
}

# Lambda Function for Database Queries
resource "aws_lambda_function" "child_event_manager_database_handler" {
  count            = var.enable_database ? 1 : 0
  filename         = data.archive_file.child_event_manager_lambda_db_zip[0].output_path
  function_name    = "${local.agent_name}-db-handler"
  role             = aws_iam_role.child_event_manager_lambda_db[0].arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512
  source_code_hash = data.archive_file.child_event_manager_lambda_db_zip[0].output_base64sha256

  layers = [
    aws_lambda_layer_version.child_event_manager_database_dependencies[0].arn
  ]

  vpc_config {
    subnet_ids = [
      aws_subnet.child_event_manager_private_a[0].id,
      aws_subnet.child_event_manager_private_b[0].id
    ]
    security_group_ids = [
      aws_security_group.child_event_manager_lambda_db[0].id
    ]
  }

  environment {
    variables = {
      DB_SECRET_ARN = aws_secretsmanager_secret.child_event_manager_db[0].arn
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-db-handler"
      Environment = var.environment
    }
  )
}

# Lambda Permission for Bedrock Agent to invoke
resource "aws_lambda_permission" "child_event_manager_bedrock_agent_invoke" {
  count         = var.enable_database ? 1 : 0
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.child_event_manager_database_handler[0].function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent/*"
}

# Bedrock Agent Action Group (Consolidated to 10 most critical APIs due to AWS limit)
resource "aws_bedrockagent_agent_action_group" "child_event_manager_database" {
  count                      = var.enable_database ? 1 : 0
  action_group_name          = "database-actions"
  agent_id                   = aws_bedrockagent_agent.child_event_manager_main.id
  agent_version              = "DRAFT"
  description                = "Action group for database operations (10 API limit)"
  skip_resource_in_use_check = true

  action_group_executor {
    lambda = aws_lambda_function.child_event_manager_database_handler[0].arn
  }

  api_schema {
    payload = file("${path.module}/schemas/consolidated_actions.json")
  }
}

# Update Bedrock Agent IAM Role to invoke Lambda
resource "aws_iam_role_policy" "child_event_manager_bedrock_agent_lambda" {
  count = var.enable_database ? 1 : 0
  name  = "${local.agent_name}-agent-lambda-policy"
  role  = aws_iam_role.child_event_manager_bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.child_event_manager_database_handler[0].arn
      }
    ]
  })
}
