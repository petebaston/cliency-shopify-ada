const fs = require('fs');
const path = require('path');

// Fix Settings.tsx
function fixSettings() {
  const filePath = path.join(__dirname, 'client', 'src', 'pages', 'Settings.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix Card sectioned
  content = content.replace(/<Card sectioned title="Data & Privacy">/g, '<Card>\n            <Box padding="400">\n              <Text variant="headingMd" as="h3">Data & Privacy</Text>');
  content = content.replace(/<Card sectioned title="App Information">/g, '<Card>\n            <Box padding="400">\n              <Text variant="headingMd" as="h3">App Information</Text>');
  
  // Fix Text color prop
  content = content.replace(/color="subdued"/g, 'tone="subdued"');
  
  // Fix Button destructive
  content = content.replace(/<Button destructive/g, '<Button variant="primary" tone="critical"');
  
  // Fix Layout.Section secondary
  content = content.replace(/<Layout.Section secondary>/g, '<Layout.Section>');
  
  // Fix Badge status
  content = content.replace(/status="success"/g, 'tone="success"');
  
  // Add missing 'as' prop to Text
  content = content.replace(/<Text variant="bodyMd">([^<]*)<\/Text>/g, '<Text variant="bodyMd" as="p">$1</Text>');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed Settings.tsx');
}

// Fix SubscriptionList.tsx
function fixSubscriptionList() {
  const filePath = path.join(__dirname, 'client', 'src', 'pages', 'SubscriptionList.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Box import if missing
  if (!content.includes("import {") || !content.includes("Box")) {
    content = content.replace(
      "} from '@shopify/polaris';",
      ", Box } from '@shopify/polaris';"
    );
  }
  
  // Fix Card.Section
  content = content.replace(/<Card\.Section>/g, '<Box padding="400">');
  content = content.replace(/<\/Card\.Section>/g, '</Box>');
  
  // Remove selectable prop
  content = content.replace(/\s+selectable\s+/g, '\n            // selectable removed in newer version\n            ');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed SubscriptionList.tsx');
}

// Fix EnhancedDashboard.tsx
function fixEnhancedDashboard() {
  const filePath = path.join(__dirname, 'client', 'src', 'pages', 'EnhancedDashboard.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix Grid.Cell columnSpan - max is 6 in new Polaris
  content = content.replace(/columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}/g, 
    'columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}');
  
  // Fix Text color prop
  content = content.replace(/color="subdued"/g, 'tone="subdued"');
  
  // Fix Icon color prop
  content = content.replace(/<Icon source={([^}]+)} color="([^"]+)"/g, '<Icon source={$1} tone="$2"');
  
  // Fix Badge status and size
  content = content.replace(/status="success"/g, 'tone="success"');
  content = content.replace(/status="neutral"/g, 'tone="base"');
  content = content.replace(/status={([^}]+)}/g, 'tone={$1}');
  content = content.replace(/size="small"/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed EnhancedDashboard.tsx');
}

console.log('🔧 Fixing remaining TypeScript errors...\n');

try {
  fixSettings();
  fixSubscriptionList();
  fixEnhancedDashboard();
  console.log('\n✨ All fixes applied!');
} catch (error) {
  console.error('Error:', error);
}