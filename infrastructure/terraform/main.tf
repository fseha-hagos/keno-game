terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

# 1. AWS KMS Key for Financial Ledger & Audit Encryption
resource "aws_kms_key" "keno_encryption_key" {
  description             = "KMS Key for Keno Platform Database and S3 Ledger Encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# 2. VPC & Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "keno-${var.environment}-vpc"
    Environment = var.environment
  }
}

# 3. RDS PostgreSQL (Multi-AZ with KMS Encryption)
resource "aws_db_instance" "postgres" {
  identifier              = "keno-${var.environment}-db"
  allocated_storage       = 100
  max_allocated_storage   = 1000
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = "db.r6g.xlarge"
  multi_az                = true
  db_name                 = "keno_db"
  username                = "keno_master"
  kms_key_id              = aws_kms_key.keno_encryption_key.arn
  storage_encrypted       = true
  deletion_protection     = true
  skip_final_snapshot     = false
  backup_retention_period = 35
}

# 4. ElastiCache Redis (Session Store & Real-time Pub/Sub)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "keno-${var.environment}-redis"
  description                = "Redis cluster for Keno WebSocket and Sessions"
  node_type                  = "cache.m6g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.keno_encryption_key.arn
}

# 5. ECS Fargate Cluster & Service
resource "aws_ecs_cluster" "main" {
  name = "keno-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# 6. S3 Bucket for Immutable Audit & Regulatory Logs
resource "aws_s3_bucket" "audit_logs" {
  bucket = "keno-${var.environment}-regulatory-audit-logs"
}

resource "aws_s3_bucket_versioning" "audit_versioning" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit_encryption" {
  bucket = aws_s3_bucket.audit_logs.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.keno_encryption_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}
