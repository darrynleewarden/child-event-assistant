terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "ap-southeast-2"

  default_tags {
    tags = {
      Project     = "child-event-assistant"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}
