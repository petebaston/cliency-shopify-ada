#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * Run this before deploying to ensure everything is properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n🔍 Pre-Deployment Verification Starting...\n'));

let errors = [];
let warnings = [];
let successes = [];

// Helper functions
function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    successes.push(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    errors.push(`❌ ${description} missing: ${filePath}`);
    return false;
  }
}

function checkEnvVariable(variable, isRequired = true) {
  if (process.env[variable]) {
    successes.push(`✅ Environment variable set: ${variable}`);
    return true;
  } else {
    if (isRequired) {
      errors.push(`❌ Required environment variable missing: ${variable}`);
    } else {
      warnings.push(`⚠️  Optional environment variable missing: ${variable}`);
    }
    return false;
  }
}

function runCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    successes.push(`✅ ${description}`);
    return true;
  } catch (error) {
    errors.push(`❌ ${description} failed: ${error.message}`);
    return false;
  }
}

function checkPackageJson(filePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check required dependencies
    const requiredDeps = [
      '@shopify/shopify-api',
      '@shopify/shopify-app-express',
      'express',
      'pg',
      'decimal.js',
    ];

    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        successes.push(`✅ Required dependency: ${dep}`);
      } else {
        errors.push(`❌ Missing required dependency: ${dep}`);
      }
    });

    // Check scripts
    const requiredScripts = ['start', 'dev', 'test'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        successes.push(`✅ Script defined: ${script}`);
      } else {
        warnings.push(`⚠️  Missing script: ${script}`);
      }
    });

    return true;
  } catch (error) {
    errors.push(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

console.log(chalk.yellow('📁 Checking file structure...\n'));

// Check critical files
checkFileExists('.env', 'Environment configuration');
checkFileExists('package.json', 'Server package.json');
checkFileExists('client/package.json', 'Client package.json');
checkFileExists('server/index.js', 'Server entry point');
checkFileExists('server/database/schema.sql', 'Database schema');
checkFileExists('server/middleware/auth.js', 'Authentication middleware');
checkFileExists('server/routes/billing.js', 'Billing routes');
checkFileExists('server/routes/gdpr.js', 'GDPR routes');
checkFileExists('client/src/App.tsx', 'React App component');
checkFileExists('client/src/pages/Billing.tsx', 'Billing page');
checkFileExists('client/src/providers/AppBridgeProvider.tsx', 'App Bridge Provider');

console.log(chalk.yellow('\n🔑 Checking environment variables...\n'));

// Load .env file if it exists
if (fs.existsSync('.env')) {
  require('dotenv').config();
}

// Check required environment variables
checkEnvVariable('SHOPIFY_API_KEY');
checkEnvVariable('SHOPIFY_API_SECRET');
checkEnvVariable('SCOPES');
checkEnvVariable('HOST');
checkEnvVariable('DATABASE_URL');
checkEnvVariable('SHOPIFY_WEBHOOK_SECRET');
checkEnvVariable('JWT_SECRET');
checkEnvVariable('SESSION_SECRET');

// Check optional environment variables
checkEnvVariable('PORT', false);
checkEnvVariable('NODE_ENV', false);

console.log(chalk.yellow('\n📦 Checking dependencies...\n'));

// Check package.json
checkPackageJson('package.json');
checkPackageJson('client/package.json');

console.log(chalk.yellow('\n🗄️  Checking database...\n'));

// Check PostgreSQL connection
if (process.env.DATABASE_URL) {
  runCommand('pg_isready -d $DATABASE_URL', 'PostgreSQL connection');
} else {
  warnings.push('⚠️  Cannot test database connection without DATABASE_URL');
}

console.log(chalk.yellow('\n🧪 Running tests...\n'));

// Run server tests
runCommand('npm test -- --passWithNoTests', 'Server tests');

// Check if client build works
console.log(chalk.yellow('\n🏗️  Checking build process...\n'));

if (fs.existsSync('client/node_modules')) {
  successes.push('✅ Client dependencies installed');
} else {
  warnings.push('⚠️  Client dependencies not installed. Run: cd client && npm install');
}

console.log(chalk.yellow('\n🔒 Security checks...\n'));

// Check for security vulnerabilities
runCommand('npm audit --production --audit-level=high', 'Security audit (high severity)');

// Check for sensitive data in code
const sensitivePatterns = [
  /api[_-]?key\s*=\s*["'][^"']+["']/gi,
  /secret\s*=\s*["'][^"']+["']/gi,
  /password\s*=\s*["'][^"']+["']/gi,
];

const filesToCheck = [
  'server/index.js',
  'client/src/App.tsx',
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let hasSensitiveData = false;
    
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasSensitiveData = true;
      }
    });
    
    if (hasSensitiveData) {
      errors.push(`❌ Potential sensitive data found in ${file}`);
    } else {
      successes.push(`✅ No hardcoded secrets in ${file}`);
    }
  }
});

console.log(chalk.yellow('\n📋 Checking Shopify requirements...\n'));

// Check GDPR webhooks
checkFileExists('server/routes/gdpr.js', 'GDPR webhooks');

// Check billing integration
checkFileExists('server/routes/billing.js', 'Billing integration');

// Check App Bridge integration
checkFileExists('client/src/providers/AppBridgeProvider.tsx', 'App Bridge integration');

// Check for privacy policy and terms
if (fs.existsSync('server/routes/gdpr.js')) {
  const gdprContent = fs.readFileSync('server/routes/gdpr.js', 'utf8');
  if (gdprContent.includes('privacy-policy')) {
    successes.push('✅ Privacy policy endpoint found');
  } else {
    errors.push('❌ Privacy policy endpoint missing');
  }
  
  if (gdprContent.includes('terms-of-service')) {
    successes.push('✅ Terms of service endpoint found');
  } else {
    errors.push('❌ Terms of service endpoint missing');
  }
}

// Print results
console.log(chalk.blue.bold('\n📊 Verification Results:\n'));

if (successes.length > 0) {
  console.log(chalk.green.bold(`✅ Passed: ${successes.length} checks`));
  if (process.env.VERBOSE) {
    successes.forEach(s => console.log(chalk.green(s)));
  }
}

if (warnings.length > 0) {
  console.log(chalk.yellow.bold(`\n⚠️  Warnings: ${warnings.length}`));
  warnings.forEach(w => console.log(chalk.yellow(w)));
}

if (errors.length > 0) {
  console.log(chalk.red.bold(`\n❌ Errors: ${errors.length}`));
  errors.forEach(e => console.log(chalk.red(e)));
}

// Final verdict
console.log(chalk.blue.bold('\n🎯 Final Verdict:\n'));

if (errors.length === 0) {
  console.log(chalk.green.bold('✅ App is ready for deployment!'));
  console.log(chalk.green('\nNext steps:'));
  console.log(chalk.green('1. Run: npm run build'));
  console.log(chalk.green('2. Deploy to your hosting provider'));
  console.log(chalk.green('3. Configure webhooks in Shopify Partner Dashboard'));
  console.log(chalk.green('4. Test with a development store'));
  console.log(chalk.green('5. Submit for app review'));
  process.exit(0);
} else if (errors.length <= 3) {
  console.log(chalk.yellow.bold('⚠️  App has minor issues that should be fixed'));
  console.log(chalk.yellow('\nFix the errors above before deploying to production'));
  process.exit(1);
} else {
  console.log(chalk.red.bold('❌ App is NOT ready for deployment'));
  console.log(chalk.red('\nCritical issues must be resolved before deployment'));
  console.log(chalk.red('Run this script again after fixing the errors'));
  process.exit(1);
}