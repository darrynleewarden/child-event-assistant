# Knowledge Base
resource "aws_bedrockagent_knowledge_base" "main" {
  count       = var.enable_knowledge_base ? 1 : 0
  name        = "${local.agent_name}-kb"
  description = var.knowledge_base_description
  role_arn    = aws_iam_role.knowledge_base[0].arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v1"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.main[0].arn
      vector_index_name = "bedrock-knowledge-base-index"
      field_mapping {
        metadata_field = "AMAZON_BEDROCK_METADATA"
        text_field     = "AMAZON_BEDROCK_TEXT_CHUNK"
        vector_field   = "bedrock-knowledge-base-default-vector"
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-kb"
      Environment = var.environment
    }
  )

  depends_on = [
    aws_opensearchserverless_access_policy.main,
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]
}

# Data Source for Knowledge Base
resource "aws_bedrockagent_data_source" "main" {
  count             = var.enable_knowledge_base ? 1 : 0
  knowledge_base_id = aws_bedrockagent_knowledge_base.main[0].id
  name              = "${local.agent_name}-datasource"
  description       = "S3 data source for knowledge base"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = aws_s3_bucket.knowledge_base[0].arn
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = 300
        overlap_percentage = 20
      }
    }
  }
}

# OpenSearch Serverless Collection
resource "aws_opensearchserverless_collection" "main" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = replace("${local.agent_name}-kb", "_", "-")
  type  = "VECTORSEARCH"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-kb-collection"
      Environment = var.environment
    }
  )

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]
}

# OpenSearch Serverless Encryption Policy
resource "aws_opensearchserverless_security_policy" "encryption" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = replace("${local.agent_name}-kb-encryption", "_", "-")
  type  = "encryption"

  policy = jsonencode({
    Rules = [
      {
        ResourceType = "collection"
        Resource = [
          "collection/${replace("${local.agent_name}-kb", "_", "-")}"
        ]
      }
    ]
    AWSOwnedKey = true
  })
}

# OpenSearch Serverless Network Policy
resource "aws_opensearchserverless_security_policy" "network" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = replace("${local.agent_name}-kb-network", "_", "-")
  type  = "network"

  policy = jsonencode([
    {
      Rules = [
        {
          ResourceType = "collection"
          Resource = [
            "collection/${replace("${local.agent_name}-kb", "_", "-")}"
          ]
        },
        {
          ResourceType = "dashboard"
          Resource = [
            "collection/${replace("${local.agent_name}-kb", "_", "-")}"
          ]
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# OpenSearch Serverless Access Policy
resource "aws_opensearchserverless_access_policy" "main" {
  count = var.enable_knowledge_base ? 1 : 0
  name  = replace("${local.agent_name}-kb-access", "_", "-")
  type  = "data"

  policy = jsonencode([
    {
      Rules = [
        {
          ResourceType = "collection"
          Resource = [
            "collection/${replace("${local.agent_name}-kb", "_", "-")}"
          ]
          Permission = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
        },
        {
          ResourceType = "index"
          Resource = [
            "index/${replace("${local.agent_name}-kb", "_", "-")}/*"
          ]
          Permission = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
        }
      ]
      Principal = [
        aws_iam_role.knowledge_base[0].arn
      ]
    }
  ])
}
