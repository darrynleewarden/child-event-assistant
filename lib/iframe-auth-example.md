# Iframe Authentication Setup

This application now supports authentication when embedded in an iframe. The parent window can pass user login data securely using the `postMessage` API.

## How It Works

1. **Detection**: The app automatically detects if it's running in an iframe
2. **Request**: On load, the app requests user data from the parent window
3. **Reception**: The parent sends user data via `postMessage`
4. **Storage**: User data is stored in `sessionStorage` for the session
5. **Authentication**: The app uses this data for authentication instead of traditional login

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
# Enable iframe authentication mode
NEXT_PUBLIC_IFRAME_AUTH=true

# Optional: Restrict which parent domains can send auth data (comma-separated)
NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS=https://parent-app.com,https://staging.parent-app.com
```

### Security Notes

- If `NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS` is not set, all origins are allowed (less secure)
- Always set allowed origins in production for security
- The app validates the message structure before accepting user data

## Parent Window Integration

The parent application needs to send user data to the iframe. Here's how:

### Example: Parent Window Code

```html
<!DOCTYPE html>
<html>
<head>
  <title>Parent Application</title>
</head>
<body>
  <h1>Parent Application</h1>

  <!-- Embed your child app -->
  <iframe
    id="childApp"
    src="http://localhost:3000"
    width="100%"
    height="600px"
    allow="clipboard-write"
  ></iframe>

  <script>
    // Your user data (e.g., from your authentication system)
    const currentUser = {
      id: "user-123",
      email: "john.doe@example.com",
      name: "John Doe",
      image: "https://example.com/avatar.jpg"
    };

    // Wait for iframe to load
    const iframe = document.getElementById('childApp');

    iframe.addEventListener('load', () => {
      // Send user data to iframe
      sendUserDataToIframe(currentUser);
    });

    // Listen for requests from iframe
    window.addEventListener('message', (event) => {
      // Verify the origin for security
      if (event.origin !== 'http://localhost:3000') return;

      if (event.data.type === 'REQUEST_USER_DATA') {
        sendUserDataToIframe(currentUser);
      }
    });

    function sendUserDataToIframe(userData) {
      iframe.contentWindow.postMessage({
        type: 'AUTH_USER_DATA',
        data: {
          id: userData.id,
          email: userData.email,
          name: userData.name || null,
          image: userData.image || null
        },
        timestamp: Date.now()
      }, 'http://localhost:3000'); // Replace with your iframe origin
    }
  </script>
</body>
</html>
```

### React Parent Application Example

```tsx
import { useEffect, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

function ParentApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Your current user (from your auth system)
  const currentUser: User = {
    id: 'user-123',
    email: 'john.doe@example.com',
    name: 'John Doe',
    image: 'https://example.com/avatar.jpg'
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendUserData = () => {
      iframe.contentWindow?.postMessage({
        type: 'AUTH_USER_DATA',
        data: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name || null,
          image: currentUser.image || null
        },
        timestamp: Date.now()
      }, 'http://localhost:3000'); // Replace with your iframe origin
    };

    // Send on load
    iframe.addEventListener('load', sendUserData);

    // Listen for requests
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'http://localhost:3000') return;
      if (event.data.type === 'REQUEST_USER_DATA') {
        sendUserData();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      iframe.removeEventListener('load', sendUserData);
      window.removeEventListener('message', handleMessage);
    };
  }, [currentUser]);

  return (
    <div>
      <h1>Parent Application</h1>
      <iframe
        ref={iframeRef}
        src="http://localhost:3000"
        width="100%"
        height="600px"
        allow="clipboard-write"
      />
    </div>
  );
}
```

## Message Format

### Request from Child (Optional - automatic)
```javascript
{
  type: "REQUEST_USER_DATA",
  timestamp: 1234567890
}
```

### Response from Parent (Required)
```javascript
{
  type: "AUTH_USER_DATA",
  data: {
    id: "user-123",           // Required
    email: "user@example.com", // Required
    name: "John Doe",         // Optional
    image: "https://..."      // Optional
  },
  timestamp: 1234567890
}
```

## Testing

### Test if iframe detection works:
```javascript
// In browser console when app is loaded in iframe
console.log(document.documentElement.getAttribute('data-is-iframed')); // Should be "true"
```

### Test if user data is received:
```javascript
// In browser console
console.log(document.documentElement.getAttribute('data-has-iframe-user')); // Should be "true"
console.log(sessionStorage.getItem('iframe_user_data')); // Should show user data
```

## Utilities

The following utilities are available for advanced use cases:

```typescript
import {
  isInIframe,
  requestUserDataFromParent,
  listenForParentUserData,
  storeIframeUserData,
  getIframeUserData,
  clearIframeUserData
} from '@/lib/iframe-auth';

// Check if in iframe
if (isInIframe()) {
  console.log('Running in iframe');
}

// Manually request data from parent
requestUserDataFromParent('https://parent-app.com');

// Listen for user data with custom callback
const cleanup = listenForParentUserData((userData) => {
  console.log('Received:', userData);
}, ['https://parent-app.com']);

// Clean up listener
cleanup();

// Get stored user data
const userData = getIframeUserData();

// Clear stored user data
clearIframeUserData();
```

## Troubleshooting

### User data not received
1. Check browser console for CORS or origin warnings
2. Verify `NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS` matches parent origin
3. Ensure parent is sending correct message format
4. Check network tab for iframe load

### Authentication not working
1. Verify `NEXT_PUBLIC_IFRAME_AUTH=true` is set
2. Check that user data is stored: `sessionStorage.getItem('iframe_user_data')`
3. Verify data attributes: `data-is-iframed` and `data-has-iframe-user`

### Security warnings
1. Always set `NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS` in production
2. Use HTTPS in production
3. Validate origins on both parent and child sides
4. Never accept user data from untrusted origins
