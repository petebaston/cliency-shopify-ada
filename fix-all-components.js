const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  fixes.forEach(fix => {
    if (fix.regex) {
      content = content.replace(fix.regex, fix.replacement);
    } else {
      content = content.split(fix.find).join(fix.replace);
    }
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${path.basename(filePath)}`);
  }
}

const clientPath = path.join(__dirname, 'client');

// Fix all Text color props to tone
const textColorFix = [
  { regex: /color="subdued"/g, replacement: 'tone="subdued"' },
  { regex: /color="success"/g, replacement: 'tone="success"' },
  { regex: /color="critical"/g, replacement: 'tone="critical"' },
  { regex: /color="warning"/g, replacement: 'tone="warning"' },
];

// Fix all Icon color props to tone
const iconColorFix = [
  { regex: /<Icon source={([^}]+)} color="([^"]+)"/g, replacement: '<Icon source={$1} tone="$2"' },
];

// Fix all Banner status props to tone
const bannerFix = [
  { regex: /<Banner status="([^"]+)"/g, replacement: '<Banner tone="$1"' },
  { regex: /status="info"/g, replacement: 'tone="info"' },
];

// Fix all Badge status props to tone
const badgeFix = [
  { regex: /<Badge status="([^"]+)">/g, replacement: '<Badge tone="$1">' },
  { regex: /status="attention"/g, replacement: 'tone="attention"' },
  { regex: /status="success"/g, replacement: 'tone="success"' },
  { regex: /status="critical"/g, replacement: 'tone="critical"' },
  { regex: /status="warning"/g, replacement: 'tone="warning"' },
  { regex: /status="neutral"/g, replacement: 'tone="base"' },
];

// Fix Card sectioned props
const cardFix = [
  { regex: /<Card sectioned>/g, replacement: '<Card>' },
  { regex: /<Card sectioned title="([^"]+)">/g, replacement: '<Card>\n            <Box padding="400">\n              <Text variant="headingMd" as="h3">$1</Text>\n            </Box>\n            <Box padding="400">' },
  { regex: /subdued={[^}]+}\s+sectioned/g, replacement: '' },
];

// Fix Button props
const buttonFix = [
  { regex: /\sprimary\s/g, replacement: ' variant="primary" ' },
  { regex: /\sprimary>/g, replacement: ' variant="primary">' },
  { regex: /\sdestructive\s/g, replacement: ' variant="primary" tone="critical" ' },
  { regex: /\sdestructive>/g, replacement: ' variant="primary" tone="critical">' },
];

// Fix TextField step prop (should be number not string)
const textFieldFix = [
  { regex: /step="([^"]+)"/g, replacement: 'step={$1}' },
];

// Files to fix
const filesToFix = [
  'src/components/OnboardingWizard.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/Layout.tsx',
  'src/components/SupportChat.tsx',
  'src/pages/EnhancedDashboard.tsx',
  'src/pages/Settings.tsx',
  'src/pages/EditSubscription.tsx',
  'src/pages/SubscriptionList.tsx',
];

console.log('🔧 Applying Polaris compatibility fixes...\n');

// Apply fixes to each file
filesToFix.forEach(file => {
  const filePath = path.join(clientPath, file);
  const allFixes = [
    ...textColorFix,
    ...iconColorFix,
    ...bannerFix,
    ...badgeFix,
    ...cardFix,
    ...buttonFix,
    ...textFieldFix,
  ];
  
  fixFile(filePath, allFixes);
});

// Special fixes for specific files

// Fix EditSubscription.tsx - remove breadcrumbs and fix CircleCancelMajor
fixFile(path.join(clientPath, 'src/pages/EditSubscription.tsx'), [
  { find: 'breadcrumbs={[{ content: \'Subscriptions\', url: \'/subscriptions\' }]}\n      ', replace: '' },
  { find: 'CircleCancelMajor', replace: 'XCircleIcon' },
  { find: 'import { CircleCancelMajor }', replace: 'import { XCircleIcon }' },
]);

// Fix EnhancedDashboard.tsx - Card.Section and background prop
fixFile(path.join(clientPath, 'src/pages/EnhancedDashboard.tsx'), [
  { find: '<Card.Section>', replace: '<Box padding="400">' },
  { find: '</Card.Section>', replace: '</Box>' },
  { find: 'background="bg-subdued"', replace: 'background="bg-surface-secondary"' },
  { find: '\'neutral\'', replace: '\'base\'' },
]);

// Fix Settings.tsx - add missing data to api.post
fixFile(path.join(clientPath, 'src/pages/Settings.tsx'), [
  { find: 'await api.post(\'/settings/reset\');', replace: 'await api.post(\'/settings/reset\', {});' },
]);

// Fix Layout.tsx - TopBar.UserMenu props
fixFile(path.join(clientPath, 'src/components/Layout.tsx'), [
  { regex: /<TopBar\.UserMenu\s+name/g, replacement: '<TopBar.UserMenu\n      open={false}\n      onToggle={() => {}}\n      name' },
]);

// Fix SubscriptionList.tsx - remove loading prop from DataTable
fixFile(path.join(clientPath, 'src/pages/SubscriptionList.tsx'), [
  { find: '            rows={rows}\n            loading={loading}', replace: '            rows={rows}' },
]);

console.log('\n✨ All Polaris compatibility fixes applied!');
console.log('\n📝 Note: Some components may need Box imports added if not present.');