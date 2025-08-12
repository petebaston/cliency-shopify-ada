# Icon Compatibility Fix

The newer version of @shopify/polaris-icons has renamed all icons from the "Major/Minor" naming convention to simpler names ending with "Icon".

## Quick Fix Mapping:

### Old → New
- HomeMajor → HomeIcon
- DiscountsMajor → DiscountIcon  
- OrdersMajor → OrderIcon
- AnalyticsMajor → ChartLineIcon
- SettingsMajor → SettingsIcon
- ChatMajor → ChatIcon
- CircleTickMajor → CheckCircleIcon
- CashDollarMajor → CashDollarIcon
- StarFilledMinor → StarFilledIcon
- TipsMajor → LightbulbIcon
- CircleInformationMajor → InfoIcon
- DiamondAlertMajor → AlertDiamondIcon
- ChevronDownMinor → ChevronDownIcon
- ChevronUpMinor → ChevronUpIcon
- ClockMajor → ClockIcon

## To fix all at once:
Use find/replace in your IDE:
1. Replace `Major` with `Icon`
2. Replace `Minor` with `Icon`
3. Check any that don't match the pattern above