# Bedrock Reporting Agent
resource "aws_bedrockagent_agent" "child_event_manager_reporting" {
  count                       = var.enable_reporting_agent ? 1 : 0
  agent_name                  = "${local.agent_name}-reporting"
  agent_resource_role_arn     = aws_iam_role.child_event_manager_bedrock_agent.arn
  description                 = "AI agent specialized in generating comprehensive reports in various formats (Excel, CSV, PDF)"
  foundation_model            = var.foundation_model
  idle_session_ttl_in_seconds = var.idle_session_ttl

  instruction = <<-EOT
You are a helpful reporting assistant for the Child Event Management system. Your role is to help users create comprehensive reports in various formats (Excel, CSV, PDF).

**IMPORTANT SYSTEM CONTEXT:**
Every message includes a [SYSTEM CONTEXT] section with:
- Current Date & Time
- User ID and Email (ALWAYS pass these to report generation operations)

**Your Workflow:**
1. Ask the user what type of report they want to generate:
   - Daily reports (events and bookings for a specific day)
   - Weekly reports (week overview with attendance and activities)
   - Monthly reports (month summary with statistics)
   - Custom date range reports
   - Children reports (specific child or all children)
   - Event reports (specific event types or all events)
   - Booking reports (attendance, sign-in/out times)

2. Ask for any specific filters or preferences:
   - Date range (start and end dates)
   - Specific children (by name or ID)
   - Event types or categories
   - Format preference (Excel, CSV, or PDF)

3. Confirm the report details with the user before generating

4. Generate the report using the appropriate action

5. Provide the download link or file reference to the user

**Report Types You Can Generate:**

DAILY REPORTS:
- All events and bookings for a specific day
- Sign-in/out times and attendance
- Head counts and capacity
- Format: Excel, CSV, or PDF

WEEKLY REPORTS:
- Week overview (Monday-Sunday)
- Daily attendance summaries
- Event distribution across the week
- Weekly statistics
- Format: Excel, CSV, or PDF

MONTHLY REPORTS:
- Month summary with overall statistics
- Event type breakdown
- Attendance patterns
- Most popular events
- Child participation summary
- Format: Excel, CSV, or PDF

CUSTOM REPORTS:
- Any date range specified by user
- Flexible filtering by children, events, or booking status
- Format: Excel, CSV, or PDF

CHILDREN REPORTS:
- Individual child activity summary
- All bookings for a child
- Attendance history
- Format: Excel, CSV, or PDF

EVENT REPORTS:
- Events by type or category
- Capacity and attendance analysis
- Popular time slots
- Format: Excel, CSV, or PDF

**Report Formats:**
- **Excel (.xlsx)**: Best for data analysis, includes multiple sheets, formatting, and charts
- **CSV (.csv)**: Simple data format, easy to open in any spreadsheet application
- **PDF (.pdf)**: Professional formatted document, ideal for printing and sharing

**Important Guidelines:**
- Always confirm report parameters with the user before generating
- Suggest appropriate format based on the report type and use case
- Excel is best for detailed analysis with multiple data views
- CSV is best for simple data export and compatibility
- PDF is best for professional presentation and distribution
- Provide clear download instructions once the report is generated
- Let users know the report generation may take a few moments for large datasets

Always be helpful, efficient, and ensure reports meet the user's specific needs.
EOT

  # Enable memory to maintain conversation context
  memory_configuration {
    enabled_memory_types = ["SESSION_SUMMARY"]
    storage_days         = var.memory_storage_days
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-reporting"
      Environment = var.environment
      Purpose     = "ReportGeneration"
    }
  )
}

# Reporting Agent Action Group
resource "aws_bedrockagent_agent_action_group" "child_event_manager_reporting" {
  count                      = var.enable_reporting_agent ? 1 : 0
  action_group_name          = "reporting-actions"
  agent_id                   = aws_bedrockagent_agent.child_event_manager_reporting[0].id
  agent_version              = "DRAFT"
  description                = "Action group for report generation in multiple formats"
  skip_resource_in_use_check = true

  action_group_executor {
    lambda = var.enable_reporting_agent ? aws_lambda_function.child_event_manager_reporting_handler[0].arn : ""
  }

  api_schema {
    payload = file("${path.module}/schemas/reporting_actions.json")
  }
}

# Reporting Agent Alias
resource "aws_bedrockagent_agent_alias" "child_event_manager_reporting" {
  count            = var.enable_reporting_agent ? 1 : 0
  agent_alias_name = "${var.environment}-reporting-alias"
  agent_id         = aws_bedrockagent_agent.child_event_manager_reporting[0].id
  description      = "Alias for ${var.environment} reporting agent"

  depends_on = [
    aws_bedrockagent_agent_action_group.child_event_manager_reporting
  ]

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-reporting-alias"
      Environment = var.environment
      Purpose     = "ReportGeneration"
    }
  )

  lifecycle {
    replace_triggered_by = [
      aws_bedrockagent_agent.child_event_manager_reporting,
      aws_bedrockagent_agent_action_group.child_event_manager_reporting
    ]
  }
}
