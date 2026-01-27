# IAM Role for Bedrock Agent
resource "aws_iam_role" "child_event_manager_bedrock_agent" {
  name = "${local.agent_name}-agent-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent/*"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-agent-role"
      Environment = var.environment
    }
  )
}

# Policy for Bedrock Agent to invoke foundation model
resource "aws_iam_role_policy" "child_event_manager_bedrock_agent_model" {
  name = "${local.agent_name}-model-policy"
  role = aws_iam_role.child_event_manager_bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/*",
          "arn:aws:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/*"
        ]
      }
    ]
  })
}

# IAM Role for Knowledge Base (if enabled)
resource "aws_iam_role" "child_event_manager_knowledge_base" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = "${local.agent_name}-kb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-kb-role"
      Environment = var.environment
    }
  )
}

# Policy for Knowledge Base to access S3
resource "aws_iam_role_policy" "child_event_manager_knowledge_base_s3" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = "${local.agent_name}-kb-s3-policy"
  role  = aws_iam_role.child_event_manager_knowledge_base[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.child_event_manager_knowledge_base[0].arn,
          "${aws_s3_bucket.child_event_manager_knowledge_base[0].arn}/*"
        ]
      }
    ]
  })
}

# Policy for Knowledge Base to invoke embedding model
resource "aws_iam_role_policy" "child_event_manager_knowledge_base_bedrock" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = "${local.agent_name}-kb-bedrock-policy"
  role  = aws_iam_role.child_event_manager_knowledge_base[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v1"
      }
    ]
  })
}

# IAM Role for Lambda Function
resource "aws_iam_role" "child_event_manager_lambda" {
  name = "${local.agent_name}-lambda-role"

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
      Name        = "${local.agent_name}-lambda-role"
      Environment = var.environment
    }
  )
}

# Policy for Lambda to invoke Bedrock Agent
resource "aws_iam_role_policy" "child_event_manager_lambda_bedrock" {
  name = "${local.agent_name}-lambda-bedrock-policy"
  role = aws_iam_role.child_event_manager_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent"
        ]
        Resource = concat(
          [
            aws_bedrockagent_agent.child_event_manager_main.agent_arn,
            "${aws_bedrockagent_agent.child_event_manager_main.agent_arn}/*",
            "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent-alias/${aws_bedrockagent_agent.child_event_manager_main.id}/*"
          ],
          var.enable_meal_agent ? [
            aws_bedrockagent_agent.child_event_manager_meal_planner[0].agent_arn,
            "${aws_bedrockagent_agent.child_event_manager_meal_planner[0].agent_arn}/*",
            "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent-alias/${aws_bedrockagent_agent.child_event_manager_meal_planner[0].id}/*"
          ] : [],
          var.enable_location_agent ? [
            aws_bedrockagent_agent.child_event_manager_location[0].agent_arn,
            "${aws_bedrockagent_agent.child_event_manager_location[0].agent_arn}/*",
            "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent-alias/${aws_bedrockagent_agent.child_event_manager_location[0].id}/*"
          ] : [],
          var.enable_reporting_agent ? [
            aws_bedrockagent_agent.child_event_manager_reporting[0].agent_arn,
            "${aws_bedrockagent_agent.child_event_manager_reporting[0].agent_arn}/*",
            "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent-alias/${aws_bedrockagent_agent.child_event_manager_reporting[0].id}/*"
          ] : []
        )
      }
    ]
  })
}

# Attach AWS managed policy for Lambda basic execution
resource "aws_iam_role_policy_attachment" "child_event_manager_lambda_basic" {
  role       = aws_iam_role.child_event_manager_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
