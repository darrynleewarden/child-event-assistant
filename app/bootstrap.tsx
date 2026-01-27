/**
 * Bootstrap file for Module Federation
 * This file is loaded asynchronously to ensure shared modules are available
 */

import React from "react"
import { createRoot } from "react-dom/client"

// Now we can safely import the app
const App = () => {
    if (typeof window !== "undefined") {
        // Client-side only code
        return <div>Module Federation Bootstrap Ready</div>
    }
    return null
}

export default App
