# ScholarSync Deployment Guide

This guide provides step-by-step instructions for deploying the ScholarSync application to AWS.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js and npm installed
4. Git installed

## AWS Services Used

- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- AWS IAM

## Deployment Steps

### 1. Frontend Deployment

1. Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2. Create an S3 bucket:
```bash
aws s3 mb s3://scholarsync-frontend
```

3. Enable static website hosting:
```bash
aws s3 website s3://scholarsync-frontend --index-document index.html --error-document error.html
```

4. Upload the frontend files:
```bash
aws s3 sync build/ s3://scholarsync-frontend
```

### 2. Backend Deployment

1. Create DynamoDB tables:
```bash
aws dynamodb create-table \
    --table-name Users \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5

aws dynamodb create-table \
    --table-name Grades \
    --attribute-definitions \
        AttributeName=grade_id,AttributeType=S \
    --key-schema \
        AttributeName=grade_id,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5
```

2. Deploy Lambda functions:
```bash
cd backend/lambda
npm install
zip -r function.zip .
aws lambda create-function \
    --function-name scholarsync-auth \
    --runtime nodejs14.x \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --role arn:aws:iam::<account-id>:role/lambda-role
```

3. Create API Gateway:
```bash
aws apigateway create-rest-api \
    --name "ScholarSync API" \
    --description "API for ScholarSync application"
```

4. Configure API Gateway endpoints:
```bash
# Add resources and methods
aws apigateway create-resource \
    --rest-api-id <api-id> \
    --parent-id <parent-id> \
    --path-part "auth"

aws apigateway put-method \
    --rest-api-id <api-id> \
    --resource-id <resource-id> \
    --http-method POST \
    --authorization-type NONE
```

### 3. Environment Configuration

1. Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/prod
```

2. Update the config.js file with the new API endpoints:
```javascript
const config = {
    API_ENDPOINTS: {
        LOGIN: process.env.REACT_APP_API_URL + '/auth/login',
        GRADE: process.env.REACT_APP_API_URL + '/grade'
    }
};
```

### 4. Security Configuration

1. Create IAM roles:
```bash
aws iam create-role \
    --role-name scholarsync-lambda-role \
    --assume-role-policy-document file://lambda-role-policy.json
```

2. Attach policies:
```bash
aws iam attach-role-policy \
    --role-name scholarsync-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 5. Testing the Deployment

1. Test the frontend:
```bash
curl https://scholarsync-frontend.s3-website-<region>.amazonaws.com
```

2. Test the API:
```bash
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test@example.com","password":"password","isProfessor":true}'
```

## Monitoring and Maintenance

1. Set up CloudWatch alarms:
```bash
aws cloudwatch put-metric-alarm \
    --alarm-name scholarsync-api-errors \
    --alarm-description "Alarm when API errors exceed threshold" \
    --metric-name 5XXError \
    --namespace AWS/ApiGateway \
    --statistic Sum \
    --period 300 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1
```

2. Set up CloudWatch logs:
```bash
aws logs create-log-group --log-group-name /aws/lambda/scholarsync-auth
```

## Troubleshooting

### Common Issues

1. CORS errors:
   - Check API Gateway CORS configuration
   - Verify frontend origin in API Gateway

2. Lambda execution errors:
   - Check CloudWatch logs
   - Verify IAM permissions

3. S3 access issues:
   - Check bucket policy
   - Verify IAM permissions

### Debugging Tools

1. AWS CloudWatch Logs
2. AWS X-Ray
3. Browser Developer Tools

## Backup and Recovery

1. DynamoDB backup:
```bash
aws dynamodb create-backup \
    --table-name Users \
    --backup-name Users-Backup
```

2. S3 versioning:
```bash
aws s3api put-bucket-versioning \
    --bucket scholarsync-frontend \
    --versioning-configuration Status=Enabled
```

## Scaling

1. DynamoDB auto-scaling:
```bash
aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --scalable-dimension dynamodb:table:WriteCapacityUnits \
    --resource-id table/Users \
    --min-capacity 5 \
    --max-capacity 100
```

2. Lambda concurrency:
```bash
aws lambda put-function-concurrency \
    --function-name scholarsync-auth \
    --reserved-concurrent-executions 100
```

## Cost Optimization

1. Use AWS Cost Explorer to monitor expenses
2. Implement caching where appropriate
3. Use appropriate instance sizes
4. Clean up unused resources

## Security Best Practices

1. Enable AWS WAF
2. Use AWS Shield for DDoS protection
3. Implement proper IAM roles
4. Enable encryption at rest and in transit
5. Regular security audits 