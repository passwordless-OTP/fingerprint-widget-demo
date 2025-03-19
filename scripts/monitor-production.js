/**
 * Production Deployment Monitor
 * 
 * This script monitors a production deployment by checking various metrics:
 * - Error rates
 * - Response times
 * - User engagement
 * - System resources
 * 
 * It will alert if thresholds are exceeded.
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Monitoring settings
  duration: process.env.MONITORING_DURATION || 60 * 60 * 1000, // 60 minutes
  interval: process.env.CHECK_INTERVAL || 60 * 1000, // 60 seconds
  
  // Thresholds
  errorRateThreshold: 0.02, // 2% error rate
  p95LatencyThreshold: 400, // 400ms
  p99LatencyThreshold: 800, // 800ms
  cpuThreshold: 70, // 70% CPU usage
  memoryThreshold: 70, // 70% memory usage
  
  // Minimum sample size before making decisions
  minSampleSize: 50,
  
  // Endpoints to check
  endpoints: [
    { url: 'https://widget.passwordless-otp.com/health', name: 'Health Check' },
    { url: 'https://widget.passwordless-otp.com/api/status', name: 'API Status' },
    { url: 'https://widget.passwordless-otp.com/api/auth/check', name: 'Auth Check' },
    { url: 'https://widget.passwordless-otp.com/', name: 'Homepage' }
  ],
  
  // Slack notification
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  
  // Datadog API
  datadogApiKey: process.env.DATADOG_API_KEY || '',
  
  // Log file
  logFile: path.join(__dirname, '../logs/production-monitor.log')
};

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Metrics storage
const metrics = {
  requests: 0,
  errors: 0,
  latencies: [],
  cpuUsage: [],
  memoryUsage: [],
  userEngagement: {
    sessions: 0,
    bounceRate: 0,
    avgSessionDuration: 0
  },
  // Store metrics by endpoint
  byEndpoint: {}
};

// Initialize metrics for each endpoint
config.endpoints.forEach(endpoint => {
  metrics.byEndpoint[endpoint.name] = {
    requests: 0,
    errors: 0,
    latencies: []
  };
});

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  }
};

// Send notification to Slack
const sendNotification = (message, color = 'good') => {
  if (!config.slackWebhook) return;
  
  const payload = JSON.stringify({
    attachments: [{
      color: color,
      text: message,
      fields: [
        {
          title: 'Error Rate',
          value: `${(metrics.errors / metrics.requests * 100).toFixed(2)}%`,
          short: true
        },
        {
          title: 'P95 Latency',
          value: `${calculatePercentile(metrics.latencies, 95)}ms`,
          short: true
        },
        {
          title: 'CPU Usage',
          value: `${calculateAverage(metrics.cpuUsage).toFixed(2)}%`,
          short: true
        },
        {
          title: 'Memory Usage',
          value: `${calculateAverage(metrics.memoryUsage).toFixed(2)}%`,
          short: true
        }
      ]
    }]
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  
  const req = https.request(config.slackWebhook, options);
  req.on('error', (error) => logger.error(`Failed to send Slack notification: ${error.message}`));
  req.write(payload);
  req.end();
};

// Send metrics to Datadog
const sendMetricsToDatadog = () => {
  if (!config.datadogApiKey) return;
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  const metrics = [
    {
      metric: 'widget.production.error_rate',
      points: [[timestamp, metrics.errors / metrics.requests]],
      type: 'gauge',
      tags: ['env:production', 'service:widget']
    },
    {
      metric: 'widget.production.latency.p95',
      points: [[timestamp, calculatePercentile(metrics.latencies, 95)]],
      type: 'gauge',
      tags: ['env:production', 'service:widget']
    },
    {
      metric: 'widget.production.latency.p99',
      points: [[timestamp, calculatePercentile(metrics.latencies, 99)]],
      type: 'gauge',
      tags: ['env:production', 'service:widget']
    },
    {
      metric: 'widget.production.cpu_usage',
      points: [[timestamp, calculateAverage(metrics.cpuUsage)]],
      type: 'gauge',
      tags: ['env:production', 'service:widget']
    },
    {
      metric: 'widget.production.memory_usage',
      points: [[timestamp, calculateAverage(metrics.memoryUsage)]],
      type: 'gauge',
      tags: ['env:production', 'service:widget']
    }
  ];
  
  // Add endpoint-specific metrics
  Object.entries(metrics.byEndpoint).forEach(([endpointName, endpointMetrics]) => {
    if (endpointMetrics.requests > 0) {
      metrics.push({
        metric: `widget.production.endpoint.error_rate`,
        points: [[timestamp, endpointMetrics.errors / endpointMetrics.requests]],
        type: 'gauge',
        tags: ['env:production', 'service:widget', `endpoint:${endpointName}`]
      });
      
      metrics.push({
        metric: `widget.production.endpoint.latency.p95`,
        points: [[timestamp, calculatePercentile(endpointMetrics.latencies, 95)]],
        type: 'gauge',
        tags: ['env:production', 'service:widget', `endpoint:${endpointName}`]
      });
    }
  });
  
  const payload = JSON.stringify({ series: metrics });
  
  const options = {
    method: 'POST',
    hostname: 'api.datadoghq.com',
    path: '/api/v1/series',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': config.datadogApiKey
    }
  };
  
  const req = https.request(options, (res) => {
    if (res.statusCode === 202) {
      logger.log('Metrics sent to Datadog successfully');
    } else {
      logger.error(`Failed to send metrics to Datadog: ${res.statusCode}`);
    }
  });
  
  req.on('error', (error) => logger.error(`Failed to send metrics to Datadog: ${error.message}`));
  req.write(payload);
  req.end();
};

// Check an endpoint
const checkEndpoint = async (endpoint) => {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const req = https.get(endpoint.url, (res) => {
      const latency = Date.now() - startTime;
      metrics.latencies.push(latency);
      metrics.requests++;
      
      // Update endpoint-specific metrics
      metrics.byEndpoint[endpoint.name].latencies.push(latency);
      metrics.byEndpoint[endpoint.name].requests++;
      
      if (res.statusCode !== 200) {
        metrics.errors++;
        metrics.byEndpoint[endpoint.name].errors++;
        logger.error(`${endpoint.name} returned status ${res.statusCode} (${latency}ms)`);
        resolve(false);
      } else {
        logger.log(`${endpoint.name} check passed (${latency}ms)`);
        resolve(true);
      }
    });
    
    req.on('error', (error) => {
      metrics.errors++;
      metrics.requests++;
      metrics.byEndpoint[endpoint.name].errors++;
      metrics.byEndpoint[endpoint.name].requests++;
      logger.error(`${endpoint.name} check failed: ${error.message}`);
      resolve(false);
    });
    
    // Set timeout
    req.setTimeout(10000, () => {
      metrics.errors++;
      metrics.requests++;
      metrics.byEndpoint[endpoint.name].errors++;
      metrics.byEndpoint[endpoint.name].requests++;
      logger.error(`${endpoint.name} check timed out after 10000ms`);
      req.destroy();
      resolve(false);
    });
  });
};

// Check system resources
const checkSystemResources = () => {
  try {
    // Get CPU usage
    const cpuInfo = execSync('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'').toString().trim();
    const cpuUsage = parseFloat(cpuInfo);
    metrics.cpuUsage.push(cpuUsage);
    
    // Get memory usage
    const memInfo = execSync('free | grep Mem | awk \'{print $3/$2 * 100.0}\'').toString().trim();
    const memoryUsage = parseFloat(memInfo);
    metrics.memoryUsage.push(memoryUsage);
    
    logger.log(`System resources: CPU ${cpuUsage.toFixed(2)}%, Memory ${memoryUsage.toFixed(2)}%`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to check system resources: ${error.message}`);
    return false;
  }
};

// Check user engagement metrics from Firebase Analytics
const checkUserEngagement = async () => {
  // In a real implementation, this would query Firebase Analytics
  // For this demo, we'll simulate some metrics
  metrics.userEngagement = {
    sessions: Math.floor(Math.random() * 100) + 50,
    bounceRate: Math.random() * 30, // 0-30%
    avgSessionDuration: Math.floor(Math.random() * 180) + 60 // 60-240 seconds
  };
  
  logger.log(`User engagement: ${metrics.userEngagement.sessions} sessions, ${metrics.userEngagement.bounceRate.toFixed(2)}% bounce rate, ${metrics.userEngagement.avgSessionDuration}s avg duration`);
  
  return true;
};

// Helper functions
const calculatePercentile = (array, percentile) => {
  if (array.length === 0) return 0;
  
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil(percentile / 100 * sorted.length) - 1;
  return sorted[index];
};

const calculateAverage = (array) => {
  if (array.length === 0) return 0;
  return array.reduce((sum, value) => sum + value, 0) / array.length;
};

// Check if we should alert
const shouldAlert = () => {
  // Only make decisions after minimum sample size
  if (metrics.requests < config.minSampleSize) {
    return false;
  }
  
  // Check error rate
  const errorRate = metrics.errors / metrics.requests;
  if (errorRate > config.errorRateThreshold) {
    logger.error(`Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(config.errorRateThreshold * 100).toFixed(2)}%`);
    return true;
  }
  
  // Check latency
  const p95Latency = calculatePercentile(metrics.latencies, 95);
  const p99Latency = calculatePercentile(metrics.latencies, 99);
  
  if (p95Latency > config.p95LatencyThreshold) {
    logger.error(`P95 latency ${p95Latency}ms exceeds threshold ${config.p95LatencyThreshold}ms`);
    return true;
  }
  
  if (p99Latency > config.p99LatencyThreshold) {
    logger.error(`P99 latency ${p99Latency}ms exceeds threshold ${config.p99LatencyThreshold}ms`);
    return true;
  }
  
  // Check system resources
  const avgCpu = calculateAverage(metrics.cpuUsage);
  const avgMemory = calculateAverage(metrics.memoryUsage);
  
  if (avgCpu > config.cpuThreshold) {
    logger.error(`Average CPU usage ${avgCpu.toFixed(2)}% exceeds threshold ${config.cpuThreshold}%`);
    return true;
  }
  
  if (avgMemory > config.memoryThreshold) {
    logger.error(`Average memory usage ${avgMemory.toFixed(2)}% exceeds threshold ${config.memoryThreshold}%`);
    return true;
  }
  
  return false;
};

// Print metrics summary
const printMetricsSummary = () => {
  const summary = {
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: `${(metrics.errors / metrics.requests * 100).toFixed(2)}%`,
    p50Latency: `${calculatePercentile(metrics.latencies, 50)}ms`,
    p95Latency: `${calculatePercentile(metrics.latencies, 95)}ms`,
    p99Latency: `${calculatePercentile(metrics.latencies, 99)}ms`,
    avgCpu: `${calculateAverage(metrics.cpuUsage).toFixed(2)}%`,
    avgMemory: `${calculateAverage(metrics.memoryUsage).toFixed(2)}%`,
    userEngagement: metrics.userEngagement,
    byEndpoint: {}
  };
  
  // Add endpoint-specific summaries
  Object.entries(metrics.byEndpoint).forEach(([endpointName, endpointMetrics]) => {
    if (endpointMetrics.requests > 0) {
      summary.byEndpoint[endpointName] = {
        requests: endpointMetrics.requests,
        errors: endpointMetrics.errors,
        errorRate: `${(endpointMetrics.errors / endpointMetrics.requests * 100).toFixed(2)}%`,
        p95Latency: `${calculatePercentile(endpointMetrics.latencies, 95)}ms`
      };
    }
  });
  
  logger.log('Metrics Summary:');
  logger.log(JSON.stringify(summary, null, 2));
};

// Main monitoring function
const monitorProduction = async () => {
  const startTime = Date.now();
  const endTime = startTime + parseInt(config.duration);
  
  logger.log(`Starting production monitoring for ${config.duration / 60000} minutes...`);
  sendNotification('🔍 Production monitoring started', 'warning');
  
  // Main monitoring loop
  while (Date.now() < endTime) {
    // Check all endpoints
    for (const endpoint of config.endpoints) {
      await checkEndpoint(endpoint);
    }
    
    // Check system resources
    checkSystemResources();
    
    // Check user engagement every 5 minutes
    if (Date.now() % (5 * 60 * 1000) < config.interval) {
      await checkUserEngagement();
    }
    
    // Print current metrics
    if (metrics.requests > 0) {
      logger.log(`Current metrics: ${metrics.requests} requests, ${metrics.errors} errors, ${(metrics.errors / metrics.requests * 100).toFixed(2)}% error rate, ${calculatePercentile(metrics.latencies, 95)}ms P95 latency`);
    }
    
    // Send metrics to Datadog
    if (config.datadogApiKey && Date.now() % (5 * 60 * 1000) < config.interval) {
      sendMetricsToDatadog();
    }
    
    // Check if we should alert
    if (shouldAlert()) {
      sendNotification('⚠️ Production monitoring detected issues', 'danger');
    }
    
    // Wait for next check
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  // Monitoring completed successfully
  printMetricsSummary();
  
  if (metrics.errors === 0) {
    logger.log('✅ Monitoring completed successfully with no errors');
    sendNotification('✅ Production monitoring completed successfully with no errors', 'good');
  } else if (metrics.errors / metrics.requests <= config.errorRateThreshold / 2) {
    logger.log(`⚠️ Monitoring completed with acceptable error rate: ${metrics.errors}/${metrics.requests} failures (${(metrics.errors / metrics.requests * 100).toFixed(2)}%)`);
    sendNotification(`⚠️ Production monitoring completed with acceptable error rate: ${(metrics.errors / metrics.requests * 100).toFixed(2)}%`, 'warning');
  } else {
    logger.log(`❌ Monitoring completed with high error rate: ${metrics.errors}/${metrics.requests} failures (${(metrics.errors / metrics.requests * 100).toFixed(2)}%)`);
    sendNotification(`❌ Production monitoring completed with high error rate: ${(metrics.errors / metrics.requests * 100).toFixed(2)}%`, 'danger');
  }
};

// Run the monitoring
monitorProduction().catch(error => {
  logger.error(`Monitoring failed: ${error.message}`);
  sendNotification(`❌ Production monitoring failed: ${error.message}`, 'danger');
  process.exit(1);
}); 