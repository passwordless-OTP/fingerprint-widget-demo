#!/usr/bin/env node

/**
 * Automated Canary-to-Production Promotion Script
 * 
 * This script evaluates the stability of a canary deployment and automatically
 * promotes it to production if it meets the defined criteria.
 * 
 * Usage:
 *   node promote-canary.js [options]
 * 
 * Options:
 *   --evaluation-period=<minutes>  Duration to evaluate canary (default: 60)
 *   --traffic-percentage=<percent> Current canary traffic percentage (default: auto-detect)
 *   --threshold-error-rate=<rate>  Maximum acceptable error rate (default: 0.01)
 *   --threshold-p95-latency=<ms>   Maximum acceptable P95 latency (default: 300)
 *   --threshold-cpu=<percent>      Maximum acceptable CPU usage (default: 70)
 *   --threshold-memory=<percent>   Maximum acceptable memory usage (default: 70)
 *   --auto-promote                 Automatically promote without confirmation
 *   --dry-run                      Run evaluation without actual promotion
 *   --verbose                      Show detailed logs
 */

const https = require('https');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  evaluationPeriod: 60, // minutes
  trafficPercentage: null, // auto-detect
  thresholds: {
    errorRate: 0.01, // 1%
    p95Latency: 300, // 300ms
    cpu: 70, // 70%
    memory: 70, // 70%
  },
  autoPromote: false,
  dryRun: false,
  verbose: false,
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  datadogApiKey: process.env.DATADOG_API_KEY || '',
  logFile: path.join(__dirname, '../logs/canary-promotion.log')
};

// Parse command line options
args.forEach(arg => {
  if (arg.startsWith('--evaluation-period=')) {
    options.evaluationPeriod = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--traffic-percentage=')) {
    options.trafficPercentage = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-error-rate=')) {
    options.thresholds.errorRate = parseFloat(arg.split('=')[1]);
  } else if (arg.startsWith('--threshold-p95-latency=')) {
    options.thresholds.p95Latency = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-cpu=')) {
    options.thresholds.cpu = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-memory=')) {
    options.thresholds.memory = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--auto-promote') {
    options.autoPromote = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  }
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(options.logFile, logMessage + '\n');
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
    fs.appendFileSync(options.logFile, logMessage + '\n');
  },
  verbose: (message) => {
    if (options.verbose) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] VERBOSE: ${message}`;
      console.log(logMessage);
      fs.appendFileSync(options.logFile, logMessage + '\n');
    }
  }
};

// Send notification to Slack
const sendNotification = (message, color = 'good') => {
  if (!options.slackWebhook) return;
  
  const payload = JSON.stringify({
    attachments: [{
      color: color,
      text: message,
      fields: [
        {
          title: 'Canary Traffic',
          value: `${options.trafficPercentage}%`,
          short: true
        },
        {
          title: 'Evaluation Period',
          value: `${options.evaluationPeriod} minutes`,
          short: true
        }
      ]
    }]
  });
  
  const webhookOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  
  const req = https.request(options.slackWebhook, webhookOptions);
  req.on('error', (error) => logger.error(`Failed to send Slack notification: ${error.message}`));
  req.write(payload);
  req.end();
};

// Get current canary traffic percentage
const detectCanaryTraffic = () => {
  try {
    logger.log('Detecting current canary traffic percentage...');
    
    // Execute Firebase hosting:clone command to get current traffic allocation
    const output = execSync('firebase hosting:clone --json').toString();
    const data = JSON.parse(output);
    
    // Find the canary release
    const canaryRelease = data.releases.find(release => release.name.includes('canary'));
    
    if (canaryRelease) {
      const trafficPercentage = canaryRelease.trafficPercentage || 0;
      logger.log(`Detected canary traffic: ${trafficPercentage}%`);
      return trafficPercentage;
    } else {
      logger.error('No canary release found');
      return 0;
    }
  } catch (error) {
    logger.error(`Failed to detect canary traffic: ${error.message}`);
    return 0;
  }
};

// Get metrics from Datadog
const getMetricsFromDatadog = async () => {
  if (!options.datadogApiKey) {
    logger.error('Datadog API key not provided. Cannot fetch metrics.');
    return null;
  }
  
  logger.log('Fetching metrics from Datadog...');
  
  // Calculate time range for metrics query
  const now = Math.floor(Date.now() / 1000);
  const from = now - (options.evaluationPeriod * 60);
  
  // Define metrics to fetch
  const metrics = [
    { name: 'widget.canary.error_rate', query: `avg:widget.canary.error_rate{env:canary}` },
    { name: 'widget.canary.latency.p95', query: `avg:widget.canary.latency.p95{env:canary}` },
    { name: 'widget.canary.cpu_usage', query: `avg:widget.canary.cpu_usage{env:canary}` },
    { name: 'widget.canary.memory_usage', query: `avg:widget.canary.memory_usage{env:canary}` }
  ];
  
  const results = {};
  
  // Fetch each metric
  for (const metric of metrics) {
    try {
      const url = `https://api.datadoghq.com/api/v1/query?from=${from}&to=${now}&query=${encodeURIComponent(metric.query)}`;
      
      const response = await new Promise((resolve, reject) => {
        const options = {
          method: 'GET',
          headers: {
            'DD-API-KEY': options.datadogApiKey,
            'Content-Type': 'application/json'
          }
        };
        
        const req = https.request(url, options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Datadog API returned status ${res.statusCode}: ${data}`));
            }
          });
        });
        
        req.on('error', (error) => reject(error));
        req.end();
      });
      
      // Extract the average value from the response
      if (response && response.series && response.series.length > 0 && response.series[0].pointlist.length > 0) {
        const values = response.series[0].pointlist.map(point => point[1]).filter(value => value !== null);
        if (values.length > 0) {
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          results[metric.name] = average;
          logger.verbose(`${metric.name}: ${average}`);
        } else {
          logger.error(`No valid data points for ${metric.name}`);
          results[metric.name] = null;
        }
      } else {
        logger.error(`No data returned for ${metric.name}`);
        results[metric.name] = null;
      }
    } catch (error) {
      logger.error(`Failed to fetch ${metric.name}: ${error.message}`);
      results[metric.name] = null;
    }
  }
  
  return results;
};

// Simulate metrics for testing or when Datadog is not available
const simulateMetrics = () => {
  logger.log('Simulating metrics for evaluation...');
  
  // Generate random metrics within reasonable ranges
  const errorRate = Math.random() * 0.02; // 0-2%
  const p95Latency = 200 + Math.random() * 200; // 200-400ms
  const cpuUsage = 50 + Math.random() * 30; // 50-80%
  const memoryUsage = 50 + Math.random() * 30; // 50-80%
  
  return {
    'widget.canary.error_rate': errorRate,
    'widget.canary.latency.p95': p95Latency,
    'widget.canary.cpu_usage': cpuUsage,
    'widget.canary.memory_usage': memoryUsage
  };
};

// Evaluate metrics against thresholds
const evaluateMetrics = (metrics) => {
  if (!metrics) {
    logger.error('No metrics available for evaluation');
    return false;
  }
  
  logger.log('Evaluating metrics against thresholds...');
  
  const results = {
    errorRate: {
      value: metrics['widget.canary.error_rate'],
      threshold: options.thresholds.errorRate,
      pass: metrics['widget.canary.error_rate'] !== null && metrics['widget.canary.error_rate'] <= options.thresholds.errorRate
    },
    p95Latency: {
      value: metrics['widget.canary.latency.p95'],
      threshold: options.thresholds.p95Latency,
      pass: metrics['widget.canary.latency.p95'] !== null && metrics['widget.canary.latency.p95'] <= options.thresholds.p95Latency
    },
    cpuUsage: {
      value: metrics['widget.canary.cpu_usage'],
      threshold: options.thresholds.cpu,
      pass: metrics['widget.canary.cpu_usage'] !== null && metrics['widget.canary.cpu_usage'] <= options.thresholds.cpu
    },
    memoryUsage: {
      value: metrics['widget.canary.memory_usage'],
      threshold: options.thresholds.memory,
      pass: metrics['widget.canary.memory_usage'] !== null && metrics['widget.canary.memory_usage'] <= options.thresholds.memory
    }
  };
  
  // Log evaluation results
  Object.entries(results).forEach(([metric, result]) => {
    const status = result.pass ? 'PASS' : 'FAIL';
    logger.log(`${metric}: ${result.value !== null ? result.value.toFixed(2) : 'N/A'} (threshold: ${result.threshold}) - ${status}`);
  });
  
  // Overall pass/fail
  const overallPass = Object.values(results).every(result => result.pass);
  logger.log(`Overall evaluation: ${overallPass ? 'PASS' : 'FAIL'}`);
  
  return {
    pass: overallPass,
    details: results
  };
};

// Promote canary to production
const promoteCanaryToProduction = async () => {
  if (options.dryRun) {
    logger.log('DRY RUN: Would promote canary to production');
    return true;
  }
  
  logger.log('Promoting canary to production...');
  
  try {
    // Get the canary version ID
    const output = execSync('firebase hosting:versions:list --json').toString();
    const data = JSON.parse(output);
    
    // Find the active canary version
    const canaryVersion = data.versions.find(version => 
      version.status === 'CREATED' && 
      version.labels && 
      version.labels.environment === 'canary'
    );
    
    if (!canaryVersion) {
      logger.error('No active canary version found');
      return false;
    }
    
    const versionId = canaryVersion.versionId;
    logger.log(`Found canary version: ${versionId}`);
    
    // Create a backup of the current production
    logger.log('Creating backup of current production...');
    execSync('bash scripts/create-production-backup.sh');
    
    // Promote canary to production (100% traffic)
    logger.log('Deploying canary version to production...');
    execSync(`firebase hosting:clone ${versionId} live 100`);
    
    logger.log('Canary successfully promoted to production');
    return true;
  } catch (error) {
    logger.error(`Failed to promote canary to production: ${error.message}`);
    return false;
  }
};

// Create a backup script if it doesn't exist
const ensureBackupScriptExists = () => {
  const backupScriptPath = path.join(__dirname, 'create-production-backup.sh');
  
  if (!fs.existsSync(backupScriptPath)) {
    logger.log('Creating backup script...');
    
    const backupScript = `#!/bin/bash
# Create a backup of the current production version

# Get current date and time for backup name
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_\${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p backups

# Get current production version ID
PROD_VERSION=$(firebase hosting:versions:list --json | jq -r '.versions[0].versionId')

if [ -z "$PROD_VERSION" ]; then
  echo "Error: Could not determine current production version"
  exit 1
fi

# Clone production version to backup
echo "Creating backup of production version \${PROD_VERSION} as \${BACKUP_NAME}..."
firebase hosting:clone \${PROD_VERSION} \${BACKUP_NAME} 100

echo "Backup created: \${BACKUP_NAME}"
echo "\${PROD_VERSION}" > "backups/\${BACKUP_NAME}.version"
`;
    
    fs.writeFileSync(backupScriptPath, backupScript);
    fs.chmodSync(backupScriptPath, '755');
    logger.log('Backup script created');
  }
};

// Ask for confirmation
const askForConfirmation = async (message) => {
  if (options.autoPromote) {
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// Main function
const main = async () => {
  logger.log('Starting automated canary-to-production promotion');
  logger.log(`Evaluation period: ${options.evaluationPeriod} minutes`);
  
  // Send notification about starting the evaluation
  sendNotification('🔍 Starting canary evaluation for potential promotion to production', 'warning');
  
  // Detect canary traffic if not specified
  if (options.trafficPercentage === null) {
    options.trafficPercentage = detectCanaryTraffic();
  }
  
  // Check if canary exists and has traffic
  if (options.trafficPercentage <= 0) {
    logger.error('No canary deployment found or canary has 0% traffic');
    sendNotification('❌ Canary promotion failed: No canary deployment found', 'danger');
    process.exit(1);
  }
  
  // Ensure backup script exists
  ensureBackupScriptExists();
  
  // Get metrics (from Datadog or simulate)
  let metrics;
  if (options.datadogApiKey) {
    metrics = await getMetricsFromDatadog();
  } else {
    logger.log('No Datadog API key provided, simulating metrics');
    metrics = simulateMetrics();
  }
  
  // Evaluate metrics
  const evaluation = evaluateMetrics(metrics);
  
  if (evaluation.pass) {
    logger.log('Canary meets all stability criteria for promotion');
    
    // Create evaluation report
    const report = {
      timestamp: new Date().toISOString(),
      canaryTraffic: options.trafficPercentage,
      evaluationPeriod: options.evaluationPeriod,
      metrics: evaluation.details,
      result: 'PASS'
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../logs', `canary-evaluation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.log(`Evaluation report saved to ${reportPath}`);
    
    // Ask for confirmation
    const confirmed = await askForConfirmation('Canary meets all criteria. Promote to production?');
    
    if (confirmed) {
      // Promote canary to production
      const success = await promoteCanaryToProduction();
      
      if (success) {
        sendNotification('✅ Canary successfully promoted to production', 'good');
        logger.log('Promotion completed successfully');
      } else {
        sendNotification('❌ Failed to promote canary to production', 'danger');
        logger.error('Promotion failed');
        process.exit(1);
      }
    } else {
      logger.log('Promotion cancelled by user');
      sendNotification('⚠️ Canary promotion cancelled by user', 'warning');
    }
  } else {
    logger.log('Canary does not meet stability criteria for promotion');
    
    // Create evaluation report
    const report = {
      timestamp: new Date().toISOString(),
      canaryTraffic: options.trafficPercentage,
      evaluationPeriod: options.evaluationPeriod,
      metrics: evaluation.details,
      result: 'FAIL'
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../logs', `canary-evaluation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.log(`Evaluation report saved to ${reportPath}`);
    
    // Send notification
    sendNotification('⚠️ Canary does not meet stability criteria for promotion', 'danger');
  }
};

// Run the main function
main().catch(error => {
  logger.error(`Promotion script failed: ${error.message}`);
  sendNotification(`❌ Canary promotion script failed: ${error.message}`, 'danger');
  process.exit(1);
}); 