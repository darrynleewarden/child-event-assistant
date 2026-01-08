# S3 Bucket for Knowledge Base Data
resource "aws_s3_bucket" "knowledge_base" {
  count  = var.enable_knowledge_base ? 1 : 0
  bucket = "${local.agent_name}-kb-data"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-kb-data"
      Environment = var.environment
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "knowledge_base" {
  count  = var.enable_knowledge_base ? 1 : 0
  bucket = aws_s3_bucket.knowledge_base[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "knowledge_base" {
  count  = var.enable_knowledge_base ? 1 : 0
  bucket = aws_s3_bucket.knowledge_base[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "knowledge_base" {
  count  = var.enable_knowledge_base ? 1 : 0
  bucket = aws_s3_bucket.knowledge_base[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for Bedrock
resource "aws_s3_bucket_policy" "knowledge_base" {
  count  = var.enable_knowledge_base ? 1 : 0
  bucket = aws_s3_bucket.knowledge_base[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBedrockKnowledgeBase"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.knowledge_base[0].arn,
          "${aws_s3_bucket.knowledge_base[0].arn}/*"
        ]
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
}
