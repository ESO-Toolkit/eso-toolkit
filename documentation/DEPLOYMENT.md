# Production Deployment Guide

This guide covers production deployment options for the ESO Log Aggregator scribing analysis system.

## Deployment Options

### 1. GitHub Pages (Current Default)

The application is automatically deployed to GitHub Pages on push to the `master` branch.

**Pros:**
- Automatic deployment via GitHub Actions
- Free hosting for static sites
- SSL/TLS certificates included
- CDN distribution

**Cons:**
- Static hosting only (no server-side API)
- Limited to public repositories (unless GitHub Pro)

### 2. Docker Container Deployment

For full-featured deployment with potential backend API support.

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Quick Start
```bash
# Clone repository
git clone https://github.com/bkrupa/eso-log-aggregator.git
cd eso-log-aggregator

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Build and start
docker-compose up -d --build

# Check health
curl http://localhost/health
```

#### Environment Variables
```bash
# Required
VITE_BASE_URL=/
VITE_RELEASE_VERSION=1.0.0
NODE_ENV=production

# Optional
PORT=80
DOMAIN=yourdomain.com
SENTRY_DSN=your_sentry_dsn
GRAFANA_PASSWORD=secure_password
```

### 3. Manual Deployment

For custom deployment scenarios or integration with existing infrastructure.

#### Build Process
```bash
# Install dependencies
npm ci

# Generate GraphQL types
npm run codegen

# Build production assets
npm run build

# Run deployment checks
node scripts/deploy.cjs validate
```

#### Web Server Configuration

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/eso-log-aggregator/build;
    index index.html;

    # Include the nginx.conf from docker/nginx.conf
    # for complete security headers and caching rules
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Apache Example:**
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/eso-log-aggregator/build
    
    <Directory /var/www/eso-log-aggregator/build>
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Deployment Checklist

### Pre-deployment
- [ ] Run full test suite: `npm run test:all`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Generate coverage report: `npm run test:coverage`
- [ ] Validate code quality: `npm run validate`
- [ ] Build production assets: `npm run build`
- [ ] Run deployment validation: `node scripts/deploy.cjs validate`

### Post-deployment
- [ ] Health check: `curl https://yourdomain.com/health`
- [ ] Performance check: Load time < 2 seconds
- [ ] Functionality check: Core features working
- [ ] Monitor error rates in Sentry (if configured)
- [ ] Verify analytics tracking (if configured)

## Monitoring and Observability

### Built-in Endpoints

**Health Check:**
```
GET /health
Response: "healthy"
```

**Version Information:**
```
GET /version
Response: {
  "version": "1.0.0",
  "buildTime": "2025-10-05T12:00:00Z",
  "gitCommit": "abc123"
}
```

**Deployment Metadata:**
```
GET /deployment
Response: {
  "deploymentTime": "2025-10-05T12:00:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Error Monitoring

**Sentry Integration:**
Set `SENTRY_DSN` environment variable to enable error tracking.

**Log Aggregation:**
Application logs are output in JSON format suitable for log aggregation systems.

### Performance Monitoring

**Metrics Available:**
- Page load times
- Bundle size analysis
- Resource loading performance
- User interaction metrics

**Monitoring Tools:**
- Browser DevTools Performance tab
- Lighthouse CI integration
- Custom performance middleware

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple container instances behind a load balancer
- Use sticky sessions if needed for user state
- Consider CDN for static asset distribution

### Vertical Scaling
- Increase container memory for large log processing
- Optimize build process for faster deployments
- Enable HTTP/2 for better resource loading

### Database Scaling
Currently uses static JSON files. For high-volume usage:
- Consider migrating to PostgreSQL or MongoDB
- Implement caching layer (Redis)
- Add database connection pooling

## Security Hardening

### Container Security
```dockerfile
# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

### Network Security
- Use HTTPS in production (TLS 1.3 minimum)
- Implement Content Security Policy headers
- Enable HSTS headers
- Consider rate limiting for API endpoints

### Data Security
- Sanitize log data during processing
- Implement proper CORS headers
- Validate all user inputs
- Use environment variables for sensitive configuration

## Backup and Recovery

### Static Deployment
- Source code is version controlled (Git)
- Build artifacts can be recreated from source
- Configuration stored in environment variables

### Data Backup
- ESO log data should be backed up separately
- Analysis results can be regenerated
- Consider automated backup scripts for user data

### Disaster Recovery
1. Restore from Git repository
2. Rebuild production assets
3. Redeploy using standard process
4. Verify all endpoints and functionality

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm ci

# Rebuild with clean slate
npm run clean
npm run build
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

**Health Check Failures:**
```bash
# Check container logs
docker logs eso-log-aggregator

# Check nginx configuration
docker exec eso-log-aggregator nginx -t

# Manual health check
curl -v http://localhost/health
```

### Support Contacts
- **Development Team:** GitHub Issues
- **Infrastructure:** DevOps team
- **Security Issues:** security@yourdomain.com

---

For additional deployment scenarios or custom requirements, consult the development team or create a GitHub issue.