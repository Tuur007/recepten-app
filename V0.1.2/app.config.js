// app.config.js extends app.json dynamically.
// Local binary assets (icon, splash) are only injected during EAS builds
// so that tools like Expo Snack (which cannot upload local binary assets)
// continue to work without errors.
const isEasBuild = process.env.EAS_BUILD === '1';

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  if (!isEasBuild) {
    return config;
  }

  return {
    ...config,
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#16a34a',
      },
    },
    web: {
      ...config.web,
      favicon: './assets/favicon.png',
    },
  };
};
