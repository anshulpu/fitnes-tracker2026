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
  supabaseUrl: 'https://bocsuatdeumbithkdfqv.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvY3N1YXRkZXVtYml0aGtkZnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODk4MzMsImV4cCI6MjA5NDI2NTgzM30.0JKCqqD7rCBU-imEhHBCLm3RaHMmhEnJsStSV_zNSgA'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
