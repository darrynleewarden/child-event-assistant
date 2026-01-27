/**
 * Module Federation Initialization
 * This file ensures shared modules are loaded before the app starts
 */

// Import the bootstrap asynchronously
import("./bootstrap").catch((err) => {
    console.error("Failed to load bootstrap:", err)
})
