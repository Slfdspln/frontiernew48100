# 🏗️ PRODUCTION DEPLOYMENT GUIDE
# Frontier Tower Apple Wallet System - Enterprise Edition

This guide covers the complete production deployment of the Frontier Tower Apple Wallet system with enterprise-grade security, monitoring, and compliance features.

## 🎯 OVERVIEW

The production system includes:
- **Enterprise Security**: Multi-layer authentication, encryption, audit trails
- **Comprehensive Monitoring**: Real-time health checks, performance metrics, alerting
- **Compliance Features**: GDPR compliance, audit logging, data retention
- **Disaster Recovery**: Automated backups, failover procedures
- **Scalability**: Rate limiting, performance optimization, load balancing

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Certificate Requirements
- [ ] Apple Developer Account with Pass Type ID certificate
- [ ] Apple WWDR CA G4 certificate downloaded
- [ ] Private key exported from Keychain
- [ ] Certificates uploaded to secure server location
- [ ] Certificate expiry monitoring configured

### 2. Infrastructure Requirements
- [ ] Supabase Pro/Team plan (for production features)
- [ ] Vercel Pro plan (for production deployment)
- [ ] SSL/TLS certificates configured
- [ ] CDN configured for global performance
- [ ] Monitoring system (DataDog, New Relic, or similar)
- [ ] Backup storage solution
- [ ] Alert notification system (PagerDuty, Slack, etc.)

### 3. Security Requirements
- [ ] Secrets management system (Vercel Secrets, AWS Secrets Manager)
- [ ] VPN access configured for sensitive operations
- [ ] Multi-factor authentication enabled for all admin accounts
- [ ] Security scanning tools configured
- [ ] Penetration testing completed

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Database Setup

```sql
-- Apply the production schema
-- Connect to your Supabase production database and run:
```

```bash
# Navigate to Supabase dashboard > SQL Editor
# Copy and paste contents of:
# /supabase/migrations/20250829_production_apple_wallet_system.sql
```

**Verify Database Setup:**
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'apple_wallet_passes',
  'pass_usage_log', 
  'security_incidents',
  'system_performance_metrics',
  'apple_certificates'
);

-- Test security configuration
SELECT * FROM security_config WHERE setting_key = 'apple_wallet_enabled';

-- Verify functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_production_guest_pass',
  'log_security_incident',
  'system_health_check'
);
```

### Step 2: Environment Configuration

**Production Environment Variables:**
```bash
# Core Application
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NODE_ENV=production

# Apple Wallet Security
APPLE_WALLET_SECRET=your_ultra_secure_64_character_secret_key_here_change_this
APPLE_CERT_PASSPHRASE=your_certificate_passphrase_if_any

# Supabase Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Security & Compliance
SESSION_SECRET=your_session_secret_64_characters_minimum_length
QR_JWT_SECRET=your_jwt_secret_for_qr_codes_64_characters_minimum

# Building Information
BUILDING_LAT=37.7749
BUILDING_LNG=-122.4194

# Monitoring & Alerts
DATADOG_API_KEY=your_datadog_api_key
SLACK_WEBHOOK_URL=your_slack_alert_webhook
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key

# Backup & Storage
AWS_S3_BACKUP_BUCKET=frontier-tower-backups
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Rate Limiting
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Step 3: Certificate Deployment

**Secure Certificate Upload:**
```bash
# Create secure certificates directory on server
mkdir -p /secure/certificates
chmod 700 /secure/certificates

# Upload certificates securely
scp -r certificates/* server:/secure/certificates/
chmod 600 /secure/certificates/*

# Verify certificates
openssl x509 -in /secure/certificates/FrontierTowerPassV3.cer -text -noout
```

**Certificate Monitoring Setup:**
```bash
# Add certificate expiry monitoring
echo "0 9 * * * /path/to/check_certificate_expiry.sh" | crontab -
```

### Step 4: Application Deployment

**Vercel Production Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Configure custom domain
vercel domains add your-domain.com

# Set environment variables
vercel env add APPLE_WALLET_SECRET production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... (add all production environment variables)
```

**Health Check Verification:**
```bash
# Test health endpoint
curl https://your-domain.com/api/health/apple-wallet

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-08-29T...",
  "checks": {
    "certificates": { "status": "healthy" },
    "database": { "status": "healthy" },
    "performance": { "status": "healthy" },
    "security": { "status": "healthy" },
    "environment": { "status": "healthy" }
  }
}
```

### Step 5: Monitoring Setup

**Database Monitoring:**
```sql
-- Enable Supabase monitoring
-- Go to Supabase Dashboard > Settings > Monitoring
-- Enable all monitoring options

-- Set up custom alerts
INSERT INTO security_config VALUES (
  'alert_webhook_url', 'https://hooks.slack.com/your-webhook',
  'Slack webhook for security alerts'
);
```

**Performance Monitoring:**
```javascript
// Add to your Next.js config
module.exports = {
  // ... existing config
  experimental: {
    instrumentationHook: true,
  },
  
  // Add monitoring headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Monitoring-Enabled',
            value: 'true',
          },
        ],
      },
    ];
  },
};
```

**Automated Backup Setup:**
```bash
#!/bin/bash
# backup_script.sh - Run daily at 2 AM

# Database backup
pg_dump $DATABASE_URL > /backups/db_$(date +%Y%m%d).sql

# Certificate backup
tar -czf /backups/certs_$(date +%Y%m%d).tar.gz /secure/certificates/

# Upload to secure storage
aws s3 cp /backups/ s3://frontier-tower-backups/ --recursive

# Clean old backups (keep 90 days)
find /backups -mtime +90 -delete
```

---

## 🔐 SECURITY HARDENING

### 1. Network Security
```bash
# Firewall rules
ufw allow 443/tcp  # HTTPS only
ufw allow 22/tcp   # SSH (restrict to specific IPs)
ufw deny 80/tcp    # Block HTTP
ufw enable

# SSL/TLS Configuration
# Ensure A+ rating on SSL Labs test
```

### 2. Application Security
```javascript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
];
```

### 3. Database Security
```sql
-- Enable row level security on all sensitive tables
ALTER TABLE apple_wallet_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- Create audit triggers
SELECT audit_table('apple_wallet_passes');
SELECT audit_table('guest_passes');

-- Set up automated security scans
SELECT cron.schedule('security-scan', '0 */6 * * *', 'SELECT run_security_scan();');
```

---

## 📊 MONITORING & ALERTING

### 1. Health Check Monitoring
```bash
# Add to crontab for continuous monitoring
*/5 * * * * curl -f https://your-domain.com/api/health/apple-wallet || echo "Health check failed" | mail -s "Alert" admin@your-domain.com
```

### 2. Performance Monitoring
```sql
-- Query for monitoring dashboard
SELECT 
  metric_name,
  AVG(metric_value) as avg_value,
  MAX(metric_value) as max_value,
  COUNT(*) as sample_count
FROM system_performance_metrics 
WHERE measured_at > NOW() - INTERVAL '1 hour'
GROUP BY metric_name;
```

### 3. Security Incident Alerts
```javascript
// Webhook for real-time alerts
export async function POST(request) {
  const incident = await request.json();
  
  if (incident.severity_level >= 4) {
    // Send immediate alert
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 CRITICAL SECURITY INCIDENT\nType: ${incident.incident_type}\nSeverity: ${incident.severity_level}\nDescription: ${incident.description}`
      })
    });
  }
}
```

---

## 🔄 DISASTER RECOVERY

### 1. Backup Strategy
- **Database**: Daily automated backups with 90-day retention
- **Certificates**: Weekly encrypted backups to secure storage
- **Application**: Git-based version control with tagged releases
- **Configuration**: Environment variables backed up securely

### 2. Recovery Procedures
```bash
# Database restore
pg_restore -h $NEW_DB_HOST -U $DB_USER -d $DB_NAME backup_file.sql

# Certificate restore
tar -xzf certs_backup.tar.gz -C /secure/certificates/
chmod 600 /secure/certificates/*

# Application redeploy
vercel --prod --force
```

### 3. Failover Testing
```bash
# Monthly failover test script
./scripts/test_failover.sh

# Verify all systems after failover
curl https://backup-domain.com/api/health/apple-wallet
```

---

## 📈 SCALING CONSIDERATIONS

### 1. Performance Optimization
- **CDN**: Use Vercel's Edge Network for global distribution
- **Database**: Enable read replicas for geographic distribution
- **Caching**: Implement Redis for session and API caching
- **Queue System**: Use background jobs for pass generation

### 2. Load Testing
```bash
# Use artillery for load testing
npm install -g artillery
artillery run load-test-config.yml
```

### 3. Auto-scaling Configuration
```yaml
# vercel.json
{
  "functions": {
    "app/api/production/apple-wallet/route.js": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1", "sfo1", "fra1"]
}
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Functional Testing
```bash
# Test complete Apple Wallet flow
./scripts/test_apple_wallet_flow.sh

# Verify all health checks pass
curl https://your-domain.com/api/health/apple-wallet | jq '.status'
# Should return: "healthy"
```

### 2. Security Testing
```bash
# Run security scan
nmap -sV -sC your-domain.com

# Check SSL configuration
ssllabs-scan --host your-domain.com
```

### 3. Performance Testing
```bash
# Load test
ab -n 1000 -c 10 https://your-domain.com/api/health/apple-wallet

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/production/apple-wallet
```

---

## 🆘 TROUBLESHOOTING

### Common Issues & Solutions

**Issue: Certificate validation fails**
```bash
# Check certificate integrity
openssl x509 -in certificate.cer -text -noout

# Verify certificate chain
openssl verify -CAfile AppleWWDRCAG4.cer FrontierTowerPassV3.cer
```

**Issue: Database connection fails**
```sql
-- Check connection limits
SELECT * FROM pg_stat_activity;

-- Verify user permissions
\du
```

**Issue: Performance degradation**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

---

## 📞 SUPPORT & MAINTENANCE

### Regular Maintenance Tasks
- **Daily**: Review security incident logs
- **Weekly**: Certificate expiry check
- **Monthly**: Performance optimization review
- **Quarterly**: Security audit and penetration testing
- **Annually**: Disaster recovery testing

### Support Contacts
- **Technical Issues**: tech-support@your-domain.com
- **Security Incidents**: security@your-domain.com  
- **Emergency**: +1-XXX-XXX-XXXX (24/7 on-call)

---

## 📚 ADDITIONAL RESOURCES

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

**🎉 CONGRATULATIONS!** 

Your enterprise-grade Apple Wallet system is now deployed with:
- ✅ Bank-level security
- ✅ Real-time monitoring  
- ✅ Compliance features
- ✅ Disaster recovery
- ✅ Enterprise scalability

**System Status**: PRODUCTION READY 🚀