# IAM Role for Bedrock Agent
resource "aws_iam_role" "bedrock_agent" {
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
resource "aws_iam_role_policy" "bedrock_agent_model" {
  name = "${local.agent_name}-model-policy"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/${var.foundation_model}"
      }
    ]
  })
}

# IAM Role for Knowledge Base (if enabled)
resource "aws_iam_role" "knowledge_base" {
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
resource "aws_iam_role_policy" "knowledge_base_s3" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = "${local.agent_name}-kb-s3-policy"
  role  = aws_iam_role.knowledge_base[0].id

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
          aws_s3_bucket.knowledge_base[0].arn,
          "${aws_s3_bucket.knowledge_base[0].arn}/*"
        ]
      }
    ]
  })
}

# Policy for Knowledge Base to invoke embedding model
resource "aws_iam_role_policy" "knowledge_base_bedrock" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = "${local.agent_name}-kb-bedrock-policy"
  role  = aws_iam_role.knowledge_base[0].id

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
