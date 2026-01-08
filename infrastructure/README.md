# AWS Bedrock Agent Infrastructure

This Terraform infrastructure creates an AWS Bedrock Agent powered by Claude 3.5 Sonnet for the Child Event Assistant application.

## Architecture Overview

The infrastructure creates:

- **Bedrock Agent**: AI agent using Claude 3.5 Sonnet model
- **Agent Alias**: Environment-specific alias for the agent
- **IAM Roles & Policies**: Secure access for Bedrock services
- **Knowledge Base** (optional): Vector database for custom knowledge
- **OpenSearch Serverless**: Backend for knowledge base
- **S3 Bucket**: Storage for knowledge base documents

## Project Structure

```
infrastructure/
├── _module/                          # Reusable Terraform module
│   ├── main.tf                       # Data sources and locals
│   ├── variables.tf                  # Input variables
│   ├── outputs.tf                    # Output values
│   ├── bedrock_agent.tf              # Bedrock agent resources
│   ├── bedrock_knowledge_base.tf     # Knowledge base & OpenSearch
│   ├── iam.tf                        # IAM roles and policies
│   └── s3.tf                         # S3 bucket for knowledge base
├── dev/                              # Development environment
│   ├── provider.tf                   # AWS provider configuration
│   ├── main.tf                       # Module invocation
│   └── outputs.tf                    # Environment outputs
├── staging/                          # Staging environment
│   ├── provider.tf
│   ├── main.tf
│   └── outputs.tf
└── prod/                             # Production environment
    ├── provider.tf
    ├── main.tf
    └── outputs.tf
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **AWS CLI** configured with credentials
4. **Bedrock Model Access**: Request access to Claude 3.5 Sonnet in AWS Console
   - Navigate to AWS Bedrock Console
   - Go to "Model access"
   - Request access for `anthropic.claude-3-5-sonnet-20241022-v2:0`

## Getting Started

### 1. Request Bedrock Model Access

Before deploying, ensure you have access to the Claude 3.5 Sonnet model in your AWS account:

```bash
# Check current model access (optional)
aws bedrock list-foundation-models --region us-east-1 \
  --by-provider anthropic \
  --query 'modelSummaries[*].[modelId,modelName]' \
  --output table
```

### 2. Initialize Terraform

Navigate to your environment folder:

```bash
cd infrastructure/dev
terraform init
```

### 3. Review the Plan

```bash
terraform plan
```

### 4. Deploy the Infrastructure

```bash
terraform apply
```

Review the changes and type `yes` to confirm.

## Environment Configuration

### Development

- Random naming enabled for resource uniqueness
- Knowledge base disabled by default
- Shorter session timeout (10 minutes)

```bash
cd infrastructure/dev
terraform apply
```

### Staging

- Random naming enabled
- Knowledge base disabled by default
- Used for testing before production

```bash
cd infrastructure/staging
terraform apply
```

### Production

- Consistent naming (no random suffix)
- Knowledge base **enabled** by default
- Longer session timeout (15 minutes)
- Additional production-grade tags

```bash
cd infrastructure/prod
terraform apply
```

## Using the Knowledge Base

If `enable_knowledge_base = true`, you can upload documents to the S3 bucket:

### 1. Get the S3 Bucket Name

```bash
terraform output s3_bucket_name
```

### 2. Upload Documents

```bash
aws s3 cp your-document.pdf s3://$(terraform output -raw s3_bucket_name)/
```

### 3. Sync the Knowledge Base

```bash
KNOWLEDGE_BASE_ID=$(terraform output -raw knowledge_base_id)
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KNOWLEDGE_BASE_ID \
  --data-source-id $(terraform output -raw data_source_id)
```

Supported document formats:
- PDF
- TXT
- MD
- HTML
- DOC/DOCX
- CSV

## Invoking the Agent

### Using AWS CLI

```bash
AGENT_ID=$(terraform output -raw agent_id)
AGENT_ALIAS_ID=$(terraform output -raw agent_alias_id)

aws bedrock-agent-runtime invoke-agent \
  --agent-id $AGENT_ID \
  --agent-alias-id $AGENT_ALIAS_ID \
  --session-id "test-session-$(date +%s)" \
  --input-text "Help me plan a birthday party for a 5-year-old"
```

### Using AWS SDK (Node.js)

```javascript
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const command = new InvokeAgentCommand({
  agentId: "YOUR_AGENT_ID",
  agentAliasId: "YOUR_ALIAS_ID",
  sessionId: `session-${Date.now()}`,
  inputText: "Help me plan a birthday party for a 5-year-old",
});

const response = await client.send(command);
```

## Customization

### Modify Agent Instructions

Edit the `agent_instruction` in `main.tf`:

```hcl
agent_instruction = <<-EOT
  Your custom instructions here...
EOT
```

### Change Foundation Model

Update the `foundation_model` variable:

```hcl
foundation_model = "anthropic.claude-3-5-sonnet-20241022-v2:0"
```

Available Claude models:
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (recommended)
- `anthropic.claude-3-5-haiku-20241022-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`

### Enable/Disable Knowledge Base

Set in environment `main.tf`:

```hcl
enable_knowledge_base = true  # or false
```

## Outputs

After deployment, Terraform provides these outputs:

- `agent_id`: Bedrock agent ID
- `agent_arn`: Agent ARN
- `agent_name`: Agent name
- `agent_alias_id`: Alias ID
- `agent_alias_arn`: Alias ARN
- `agent_role_arn`: IAM role ARN
- `knowledge_base_id`: Knowledge base ID (if enabled)
- `s3_bucket_name`: S3 bucket name (if knowledge base enabled)

View outputs:

```bash
terraform output
```

## Cost Considerations

### Estimated Monthly Costs

**Without Knowledge Base:**
- Bedrock Agent: Pay per request
- Claude 3.5 Sonnet: ~$3/1M input tokens, ~$15/1M output tokens

**With Knowledge Base:**
- OpenSearch Serverless: ~$700/month (0.5 OCU minimum)
- S3 Storage: ~$0.023/GB/month
- Vector embeddings: Pay per request

**Cost Optimization:**
- Use knowledge base only in production
- Delete unused environments
- Monitor usage with AWS Cost Explorer

## Cleanup

To destroy the infrastructure:

```bash
cd infrastructure/dev  # or staging/prod
terraform destroy
```

**Warning**: This will delete all resources including S3 buckets and knowledge base data.

## Security Best Practices

1. **IAM Roles**: Least privilege access configured
2. **S3 Encryption**: Server-side encryption enabled
3. **Public Access**: Blocked on S3 buckets
4. **Resource Tags**: All resources tagged for governance
5. **Session Timeouts**: Configured per environment

## Troubleshooting

### Model Access Error

```
Error: AccessDeniedException: You don't have access to the model
```

**Solution**: Request model access in Bedrock console

### Knowledge Base Ingestion Failed

Check CloudWatch logs:

```bash
aws logs tail /aws/bedrock/knowledge-base/$KNOWLEDGE_BASE_ID --follow
```

### Agent Not Responding

1. Check agent status:
```bash
aws bedrock-agent get-agent --agent-id $AGENT_ID
```

2. Verify IAM role permissions
3. Check CloudWatch logs

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Claude 3.5 Model Card](https://www.anthropic.com/claude)

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review Terraform state
3. Consult AWS Bedrock documentation
