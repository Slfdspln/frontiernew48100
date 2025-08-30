/**
 * PRODUCTION HEALTH MONITORING API
 * Comprehensive health checks for Apple Wallet system
 * with real-time monitoring and alerting capabilities
 */

import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CERT_PATHS = {
  wwdr: path.join(process.cwd(), 'certificates/AppleWWDRCAG4.cer'),
  signerCert: path.join(process.cwd(), 'certificates/FrontierTowerPassV3.cer'),
  signerKey: path.join(process.cwd(), 'certificates/FrontierTowerPassV3_private.key')
};

/**
 * Check certificate health and expiry
 */
async function checkCertificateHealth() {
  const results = {
    status: 'healthy',
    certificates: {},
    warnings: [],
    errors: []
  };

  for (const [name, filePath] of Object.entries(CERT_PATHS)) {
    try {
      if (!fs.existsSync(filePath)) {
        results.errors.push(`Certificate missing: ${name}`);
        results.status = 'critical';
        continue;
      }

      const stats = fs.statSync(filePath);
      const cert = fs.readFileSync(filePath);
      
      results.certificates[name] = {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        readable: cert.length > 0
      };

      // Check if certificate is valid (basic validation)
      if (name === 'signerCert') {
        try {
          // Extract certificate validity (simplified - in production use crypto library)
          const certBase64 = cert.toString('base64');
          const fingerprint = crypto.createHash('sha256').update(cert).digest('hex').substring(0, 16);
          
          results.certificates[name].fingerprint = fingerprint;
          results.certificates[name].base64Length = certBase64.length;
          
          // Warning if certificate might expire soon (placeholder logic)
          const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceModified > 300) { // 300 days old
            results.warnings.push(`Certificate ${name} may be approaching expiration`);
            results.status = results.status === 'healthy' ? 'warning' : results.status;
          }
        } catch (err) {
          results.errors.push(`Certificate ${name} validation failed: ${err.message}`);
          results.status = 'critical';
        }
      }

    } catch (error) {
      results.errors.push(`Certificate ${name} check failed: ${error.message}`);
      results.status = 'critical';
    }
  }

  return results;
}

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();
  const results = {
    status: 'healthy',
    connectivity: false,
    responseTime: 0,
    tableChecks: {},
    warnings: [],
    errors: []
  };

  try {
    const supabase = getSupa();
    
    // Basic connectivity test
    const { data, error } = await supabase
      .from('security_config')
      .select('setting_key, setting_value')
      .eq('setting_key', 'apple_wallet_enabled')
      .single();

    results.responseTime = Date.now() - startTime;
    results.connectivity = !error;

    if (error) {
      results.errors.push(`Database connectivity failed: ${error.message}`);
      results.status = 'critical';
      return results;
    }

    // Check critical tables exist and are accessible
    const criticalTables = [
      'guest_passes',
      'apple_wallet_passes', 
      'pass_usage_log',
      'security_incidents',
      'system_performance_metrics'
    ];

    for (const table of criticalTables) {
      try {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        results.tableChecks[table] = {
          accessible: !tableError,
          recordCount: count || 0,
          error: tableError?.message
        };

        if (tableError) {
          results.errors.push(`Table ${table}: ${tableError.message}`);
          results.status = 'critical';
        }
      } catch (err) {
        results.tableChecks[table] = {
          accessible: false,
          error: err.message
        };
        results.errors.push(`Table ${table} check failed: ${err.message}`);
        results.status = 'critical';
      }
    }

    // Performance warnings
    if (results.responseTime > 1000) {
      results.warnings.push(`Database response time high: ${results.responseTime}ms`);
      results.status = results.status === 'healthy' ? 'warning' : results.status;
    }

  } catch (error) {
    results.errors.push(`Database health check failed: ${error.message}`);
    results.status = 'critical';
  }

  return results;
}

/**
 * Check system performance metrics
 */
async function checkSystemPerformance() {
  const results = {
    status: 'healthy',
    metrics: {},
    warnings: [],
    errors: []
  };

  try {
    const supabase = getSupa();
    
    // Recent performance data (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: metrics, error } = await supabase
      .from('system_performance_metrics')
      .select('metric_name, metric_value, measured_at')
      .gte('measured_at', oneHourAgo.toISOString())
      .eq('component', 'apple_wallet');

    if (error) {
      results.errors.push(`Performance metrics query failed: ${error.message}`);
      results.status = 'critical';
      return results;
    }

    // Analyze metrics
    const metricGroups = {};
    metrics.forEach(metric => {
      if (!metricGroups[metric.metric_name]) {
        metricGroups[metric.metric_name] = [];
      }
      metricGroups[metric.metric_name].push(metric.metric_value);
    });

    // Calculate averages and check thresholds
    Object.entries(metricGroups).forEach(([name, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      results.metrics[name] = {
        average: Math.round(avg * 100) / 100,
        maximum: max,
        minimum: min,
        sampleCount: values.length
      };

      // Performance thresholds
      if (name.includes('response_time') && avg > 2000) {
        results.warnings.push(`High average response time for ${name}: ${Math.round(avg)}ms`);
        results.status = results.status === 'healthy' ? 'warning' : results.status;
      }
      
      if (name.includes('pass_generation') && avg > 5000) {
        results.warnings.push(`Slow pass generation: ${Math.round(avg)}ms average`);
        results.status = results.status === 'healthy' ? 'warning' : results.status;
      }
    });

  } catch (error) {
    results.errors.push(`Performance check failed: ${error.message}`);
    results.status = 'critical';
  }

  return results;
}

/**
 * Check recent security incidents
 */
async function checkSecurityHealth() {
  const results = {
    status: 'healthy',
    recentIncidents: 0,
    highSeverityIncidents: 0,
    openIncidents: 0,
    warnings: [],
    errors: []
  };

  try {
    const supabase = getSupa();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Recent incidents
    const { count: recentCount } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .gte('detected_at', oneHourAgo.toISOString());

    // High severity incidents (last 24h)
    const { count: highSevCount } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .gte('detected_at', oneDayAgo.toISOString())
      .gte('severity_level', 4);

    // Open incidents
    const { count: openCount } = await supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating']);

    results.recentIncidents = recentCount || 0;
    results.highSeverityIncidents = highSevCount || 0;
    results.openIncidents = openCount || 0;

    // Security alerts
    if (results.recentIncidents > 5) {
      results.warnings.push(`High incident rate: ${results.recentIncidents} incidents in last hour`);
      results.status = 'warning';
    }

    if (results.highSeverityIncidents > 0) {
      results.warnings.push(`${results.highSeverityIncidents} high-severity incidents in last 24h`);
      results.status = 'warning';
    }

    if (results.openIncidents > 10) {
      results.warnings.push(`${results.openIncidents} open security incidents`);
      results.status = 'warning';
    }

  } catch (error) {
    results.errors.push(`Security health check failed: ${error.message}`);
    results.status = 'critical';
  }

  return results;
}

/**
 * Check environment configuration
 */
async function checkEnvironmentHealth() {
  const results = {
    status: 'healthy',
    environment: {},
    warnings: [],
    errors: []
  };

  const requiredEnvVars = {
    'APPLE_WALLET_SECRET': 'Apple Wallet security secret',
    'NEXT_PUBLIC_SITE_URL': 'Site URL for pass web service',
    'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key',
    'SUPABASE_URL': 'Supabase URL',
    'BUILDING_LAT': 'Building latitude',
    'BUILDING_LNG': 'Building longitude'
  };

  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    const value = process.env[key];
    results.environment[key] = {
      configured: !!value,
      description: description,
      length: value ? value.length : 0
    };

    if (!value) {
      results.errors.push(`Missing environment variable: ${key} (${description})`);
      results.status = 'critical';
    } else if (key === 'APPLE_WALLET_SECRET' && value.length < 32) {
      results.warnings.push(`Weak security secret: ${key} should be at least 32 characters`);
      results.status = results.status === 'healthy' ? 'warning' : results.status;
    }
  });

  return results;
}

/**
 * Generate comprehensive health report
 */
async function generateHealthReport() {
  const startTime = Date.now();
  
  const [
    certificateHealth,
    databaseHealth,
    performanceHealth,
    securityHealth,
    environmentHealth
  ] = await Promise.all([
    checkCertificateHealth(),
    checkDatabaseHealth(),
    checkSystemPerformance(),
    checkSecurityHealth(),
    checkEnvironmentHealth()
  ]);

  const overallStatus = [
    certificateHealth.status,
    databaseHealth.status,
    performanceHealth.status,
    securityHealth.status,
    environmentHealth.status
  ].includes('critical') ? 'critical' : 
    [
      certificateHealth.status,
      databaseHealth.status,
      performanceHealth.status,
      securityHealth.status,
      environmentHealth.status
    ].includes('warning') ? 'warning' : 'healthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checkDuration: Date.now() - startTime,
    version: '2.0',
    component: 'apple_wallet_system',
    
    checks: {
      certificates: certificateHealth,
      database: databaseHealth,
      performance: performanceHealth,
      security: securityHealth,
      environment: environmentHealth
    },
    
    summary: {
      totalErrors: [
        certificateHealth.errors,
        databaseHealth.errors,
        performanceHealth.errors,
        securityHealth.errors,
        environmentHealth.errors
      ].flat().length,
      
      totalWarnings: [
        certificateHealth.warnings,
        databaseHealth.warnings,
        performanceHealth.warnings,
        securityHealth.warnings,
        environmentHealth.warnings
      ].flat().length,
      
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }
  };
}

/**
 * Health check API endpoint
 */
export async function GET(request) {
  try {
    const healthReport = await generateHealthReport();
    
    // Log health check to performance metrics
    const supabase = getSupa();
    await supabase.from('system_performance_metrics').insert({
      metric_name: 'health_check_duration',
      metric_value: healthReport.checkDuration,
      metric_unit: 'milliseconds',
      component: 'health_monitoring',
      endpoint: '/api/health/apple-wallet'
    }).catch(err => {
      console.error('Failed to log health check metric:', err);
    });

    // Return appropriate HTTP status based on health
    const httpStatus = healthReport.status === 'critical' ? 503 : 
                      healthReport.status === 'warning' ? 200 : 200;

    return NextResponse.json(healthReport, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Health-Status': healthReport.status,
        'X-Health-Check-Duration': healthReport.checkDuration.toString()
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'critical',
      error: 'Health check system failure',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}