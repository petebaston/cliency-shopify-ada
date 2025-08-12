const fs = require('fs');
const path = require('path');

// Icon mapping from old names to new names
const iconMapping = {
  // Major icons
  'HomeMajor': 'HomeIcon',
  'DiscountsMajor': 'DiscountIcon',
  'OrdersMajor': 'OrderIcon',
  'AnalyticsMajor': 'ChartLineIcon',
  'SettingsMajor': 'SettingsIcon',
  'ChatMajor': 'ChatIcon',
  'CircleTickMajor': 'CheckCircleIcon',
  'CashDollarMajor': 'CashDollarIcon',
  'TipsMajor': 'LightbulbIcon',
  'CircleInformationMajor': 'InfoIcon',
  'DiamondAlertMajor': 'AlertDiamondIcon',
  'ClockMajor': 'ClockIcon',
  'TrendingUpMajor': 'ChartLineIcon',
  'ConfettiMajor': 'ConfettiIcon',
  'LightBulbMajor': 'LightbulbIcon',
  'CircleAlertMajor': 'AlertCircleIcon',
  'EmailMajor': 'EmailIcon',
  'CustomersMajor': 'PersonIcon',
  'NotificationMajor': 'NotificationIcon',
  'PhoneMajor': 'PhoneIcon',
  
  // Minor icons
  'StarFilledMinor': 'StarFilledIcon',
  'StarOutlineMinor': 'StarIcon',
  'ChevronDownMinor': 'ChevronDownIcon',
  'ChevronUpMinor': 'ChevronUpIcon',
  'ChevronRightMinor': 'ChevronRightIcon',
  'ChevronLeftMinor': 'ChevronLeftIcon',
  'ExportMinor': 'ExportIcon',
  'RefreshMinor': 'RefreshIcon',
  'PlusMinor': 'PlusIcon',
  'MinusMinor': 'MinusIcon',
  'CheckMinor': 'CheckIcon',
  'XMinor': 'XIcon',
};

// Files to process
const directories = [
  path.join(__dirname, 'client', 'src', 'components'),
  path.join(__dirname, 'client', 'src', 'pages'),
  path.join(__dirname, 'client', 'src', 'providers'),
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace each icon import
  for (const [oldName, newName] of Object.entries(iconMapping)) {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.includes(oldName)) {
      content = content.replace(regex, newName);
      modified = true;
      console.log(`  Replacing ${oldName} → ${newName} in ${path.basename(filePath)}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else {
      processFile(filePath);
    }
  }
}

console.log('🔧 Fixing icon imports...\n');

for (const dir of directories) {
  console.log(`Processing ${dir}...`);
  processDirectory(dir);
}

console.log('\n✨ Icon imports fixed!');