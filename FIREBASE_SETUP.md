# Firebase Push Notifications Setup Guide

## Overview
This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in your SmartConnect Dashboard.

## Prerequisites
- Firebase project: `gas-station-app-nomard`
- Supabase database with proper tables
- Next.js application running

## Configuration Status
✅ **Firebase Project**: `gas-station-app-nomard`  
✅ **VAPID Key**: `BNIUQjDSA49fZ4vYvg4btss-NHIVFX4aBj6-H4z7-dwiBxXP5Tw0FOt__fAamvlQBGe6yNK8vHYxRjVMyhq91SM`  
✅ **Service Account**: Configured with admin SDK credentials  
✅ **Database Schema**: FCM tokens table with RLS policies  

## Setup Steps

### 1. Database Setup
Run the following SQL script in your Supabase dashboard:

\`\`\`sql
-- This creates the fcm_tokens table with proper RLS policies
-- File: scripts/create-fcm-tokens-table.sql
\`\`\`

### 2. Environment Variables (Optional)
All configuration is embedded in the code, but you can optionally use environment variables:

\`\`\`env
# Optional - already configured in code
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAN-5uwnoJp6yPPwoO_1WvyUumtWYvnnhw
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gas-station-app-nomard
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=11390145105
NEXT_PUBLIC_FIREBASE_APP_ID=1:11390145105:web:39344910ac97696ae55e70
\`\`\`

### 3. Service Worker
The service worker is already configured at `/public/firebase-messaging-sw.js` with your Firebase configuration.

### 4. Testing
1. Start your development server
2. Open the application in a browser
3. Allow notification permissions when prompted
4. Check browser console for "FCM Token obtained" message
5. Use the test notification buttons in the chat interface

## API Endpoints

### Register FCM Token
\`\`\`
POST /api/fcm/register
{
  "userId": "user-uuid",
  "token": "fcm-token",
  "deviceInfo": {}
}
\`\`\`

### Send Notification
\`\`\`
POST /api/fcm/send
{
  "userId": "user-uuid",
  "title": "Notification Title",
  "body": "Notification message",
  "data": {}
}
\`\`\`

## Features

### ✅ Implemented Features
- **Token Registration**: Automatic FCM token registration
- **Database Storage**: Secure token storage in Supabase
- **Push Notifications**: Send notifications to specific users
- **Background Notifications**: Service worker handles background messages
- **Foreground Notifications**: Toast notifications when app is open
- **Token Management**: Automatic cleanup of invalid tokens
- **Real-time Integration**: Works with existing chat system
- **Test Functionality**: Built-in test notification system

### 🔧 Technical Details
- **Dynamic Imports**: Prevents SSR issues with Firebase messaging
- **Error Handling**: Comprehensive error handling and logging
- **Browser Support**: Checks for notification support
- **Permission Management**: Handles notification permissions gracefully
- **RLS Security**: Row-level security for token storage

## Troubleshooting

### Common Issues
1. **"Service messaging is not available"**: Fixed with dynamic imports
2. **Permission denied**: User needs to allow notifications in browser
3. **No tokens found**: User hasn't registered for notifications yet
4. **Failed to send**: Check Firebase service account configuration

### Debug Steps
1. Check browser console for error messages
2. Verify notification permissions in browser settings
3. Check Supabase logs for database errors
4. Test with different browsers/devices

## Browser Support
- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)  
- ✅ Edge (Desktop)
- ✅ Safari (macOS 16.4+, iOS 16.4+)
- ❌ Safari (older versions)

## Security Notes
- FCM tokens are stored securely in Supabase with RLS
- Service account credentials are used server-side only
- VAPID key is public and safe to expose client-side
- All API endpoints validate user permissions

## Next Steps
1. Run the database migration script
2. Test notifications in your browser
3. Integrate with your chat system
4. Add user notification preferences
5. Monitor notification delivery rates
