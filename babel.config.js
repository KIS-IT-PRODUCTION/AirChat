module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ...інші плагіни, якщо вони є
      'react-native-reanimated/plugin', // <-- Додайте цей рядок
    ],
  };
};