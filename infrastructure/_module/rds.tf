# RDS PostgreSQL Database

# Create a VPC for the database (if not using existing)
resource "aws_vpc" "child_event_manager_main" {
  count      = var.enable_database ? 1 : 0
  cidr_block = var.vpc_cidr

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-vpc"
      Environment = var.environment
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "child_event_manager_main" {
  count  = var.enable_database ? 1 : 0
  vpc_id = aws_vpc.child_event_manager_main[0].id

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-igw"
      Environment = var.environment
    }
  )
}

# Public Subnets (for database access)
resource "aws_subnet" "child_event_manager_public_a" {
  count                   = var.enable_database ? 1 : 0
  vpc_id                  = aws_vpc.child_event_manager_main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, 0)
  availability_zone       = "${data.aws_region.current.name}a"
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-public-subnet-a"
      Environment = var.environment
    }
  )
}

resource "aws_subnet" "child_event_manager_public_b" {
  count                   = var.enable_database ? 1 : 0
  vpc_id                  = aws_vpc.child_event_manager_main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, 1)
  availability_zone       = "${data.aws_region.current.name}b"
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-public-subnet-b"
      Environment = var.environment
    }
  )
}

# Route Table
resource "aws_route_table" "child_event_manager_public" {
  count  = var.enable_database ? 1 : 0
  vpc_id = aws_vpc.child_event_manager_main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.child_event_manager_main[0].id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-public-rt"
      Environment = var.environment
    }
  )
}

# Route Table Associations
resource "aws_route_table_association" "child_event_manager_public_a" {
  count          = var.enable_database ? 1 : 0
  subnet_id      = aws_subnet.child_event_manager_public_a[0].id
  route_table_id = aws_route_table.child_event_manager_public[0].id
}

resource "aws_route_table_association" "child_event_manager_public_b" {
  count          = var.enable_database ? 1 : 0
  subnet_id      = aws_subnet.child_event_manager_public_b[0].id
  route_table_id = aws_route_table.child_event_manager_public[0].id
}

# DB Subnet Group
resource "aws_db_subnet_group" "child_event_manager_main" {
  count = var.enable_database ? 1 : 0
  name  = "${local.agent_name}-db-subnet-group"

  subnet_ids = [
    aws_subnet.child_event_manager_public_a[0].id,
    aws_subnet.child_event_manager_public_b[0].id
  ]

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-db-subnet-group"
      Environment = var.environment
    }
  )
}

# Security Group for RDS
resource "aws_security_group" "child_event_manager_rds" {
  count       = var.enable_database ? 1 : 0
  name        = "${local.agent_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.child_event_manager_main[0].id

  # Allow PostgreSQL access from allowed CIDR blocks
  ingress {
    description = "PostgreSQL from allowed IPs"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidr_blocks
  }

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
      Name        = "${local.agent_name}-rds-sg"
      Environment = var.environment
    }
  )
}

# Generate random password for database
resource "random_password" "child_event_manager_db" {
  count   = var.enable_database ? 1 : 0
  length  = 32
  special = false
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "child_event_manager_main" {
  count = var.enable_database ? 1 : 0

  identifier = "${local.agent_name}-postgres"

  # Engine configuration
  engine                = "postgres"
  engine_version        = var.db_engine_version
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.child_event_manager_db[0].result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.child_event_manager_main[0].name
  vpc_security_group_ids = [aws_security_group.child_event_manager_rds[0].id]
  publicly_accessible    = var.db_publicly_accessible

  # Backup configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  performance_insights_enabled = var.environment == "prod" ? true : false
  monitoring_interval          = var.environment == "prod" ? 60 : 0

  # Deletion protection
  deletion_protection       = var.environment == "prod" ? true : false
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.agent_name}-final-snapshot" : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-postgres"
      Environment = var.environment
    }
  )
}

# Store database credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "child_event_manager_db" {
  count = var.enable_database ? 1 : 0
  name  = "${local.agent_name}-db-credentials"

  tags = merge(
    var.tags,
    {
      Name        = "${local.agent_name}-db-credentials"
      Environment = var.environment
    }
  )
}

resource "aws_secretsmanager_secret_version" "child_event_manager_db" {
  count     = var.enable_database ? 1 : 0
  secret_id = aws_secretsmanager_secret.child_event_manager_db[0].id

  secret_string = jsonencode({
    username = var.db_username
    password = random_password.child_event_manager_db[0].result
    host     = aws_db_instance.child_event_manager_main[0].address
    port     = 5432
    dbname   = var.db_name
    url      = "postgresql://${var.db_username}:${random_password.child_event_manager_db[0].result}@${aws_db_instance.child_event_manager_main[0].address}:5432/${var.db_name}"
  })
}
