export const environment = {
  production: true,
  useMockAuth: false,
  // TODO: Replace with your actual Firebase production config
  firebase: {
    apiKey: 'YOUR_PROD_API_KEY',
    authDomain: 'YOUR_PROD_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROD_PROJECT_ID',
    storageBucket: 'YOUR_PROD_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_PROD_SENDER_ID',
    appId: 'YOUR_PROD_APP_ID'
  },
  apiBaseUrl: 'https://fitness-tracker-api.onrender.com'
};
