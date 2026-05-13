// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useMockAuth: false,
  firebase: {
    apiKey: 'YOUR_DEV_API_KEY',
    authDomain: 'YOUR_DEV_PROJECT.firebaseapp.com',
    projectId: 'YOUR_DEV_PROJECT_ID',
    storageBucket: 'YOUR_DEV_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_DEV_SENDER_ID',
    appId: 'YOUR_DEV_APP_ID'
  },
  apiBaseUrl: 'http://localhost:3000',
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
