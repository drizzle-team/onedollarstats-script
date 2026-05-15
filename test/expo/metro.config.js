const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import', 'react-native', 'browser', 'default'];

module.exports = config;
