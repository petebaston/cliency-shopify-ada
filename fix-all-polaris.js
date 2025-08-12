const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  fixes.forEach(fix => {
    if (fix.regex) {
      content = content.replace(fix.regex, fix.replacement);
    } else {
      content = content.split(fix.find).join(fix.replace);
    }
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${path.basename(filePath)}`);
}

// Fix OnboardingWizard.tsx
fixFile(path.join(__dirname, 'client/src/components/OnboardingWizard.tsx'), [
  // Fix Text color prop
  { regex: /color="subdued"/g, replacement: 'tone="subdued"' },
  // Fix Icon color prop
  { regex: /<Icon source={([^}]+)} color="([^"]+)"/g, replacement: '<Icon source={$1} tone="$2"' },
  // Fix Banner status prop
  { regex: /<Banner status="([^"]+)"/g, replacement: '<Banner tone="$1"' },
  // Fix Badge status prop
  { regex: /<Badge status="([^"]+)">/g, replacement: '<Badge tone="$1">' },
  // Fix Card subdued and sectioned props
  { regex: /subdued={[^}]+}\s+sectioned/g, replacement: '' },
  { regex: /<Card sectioned>/g, replacement: '<Card>' },
  { regex: /<Card sectioned title="([^"]+)">/g, replacement: '<Card>\n              <Box padding="400">\n                <Text variant="headingMd" as="h3">$1</Text>\n              </Box>\n              <Box padding="400">' },
  { find: '</Card>', replace: '</Box>\n            </Card>' },
]);

// Fix ErrorBoundary.tsx
fixFile(path.join(__dirname, 'client/src/components/ErrorBoundary.tsx'), [
  { regex: /<Card sectioned>/g, replacement: '<Card>' },
  { regex: /<Banner status="([^"]+)"/g, replacement: '<Banner tone="$1"' },
]);

// Fix Layout.tsx
fixFile(path.join(__dirname, 'client/src/components/Layout.tsx'), [
  // This needs a more complex fix for TopBar.UserMenu
  { find: '<TopBar.UserMenu', replace: '<TopBar.UserMenu\n      open={false}\n      onToggle={() => {}}\n' },
]);

// Fix EnhancedDashboard.tsx
fixFile(path.join(__dirname, 'client/src/pages/EnhancedDashboard.tsx'), [
  { regex: /color="subdued"/g, replacement: 'tone="subdued"' },
  { regex: /<Icon source={([^}]+)} color="([^"]+)"/g, replacement: '<Icon source={$1} tone="$2"' },
  { regex: /<Badge status="([^"]+)">/g, replacement: '<Badge tone="$1">' },
  { regex: /<Banner status="([^"]+)"/g, replacement: '<Banner tone="$1"' },
]);

// Fix Settings.tsx (remaining issues)
fixFile(path.join(__dirname, 'client/src/pages/Settings.tsx'), [
  { regex: /<Card sectioned title="([^"]+)">/g, replacement: '<Card>\n            <Box padding="400">\n              <Text variant="headingMd" as="h3">$1</Text>\n            </Box>\n            <Box padding="400">' },
  { regex: /<Card sectioned>/g, replacement: '<Card>' },
]);

console.log('\n✨ All Polaris compatibility fixes applied!');