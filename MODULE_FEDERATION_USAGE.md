/**
 * Module Federation - Consumer Example
 * 
 * This example shows how another Next.js app can consume the exposed chat page.
 * 
 * IMPORTANT: To avoid "Shared module is not available for eager consumption" errors,
 * consumers must also set eager: false for shared modules.
 * 
 * 1. Add this to the consuming app's next.config.ts:
 * 
 * ```typescript
 * import type { NextConfig } from "next";
 * import webpack from "webpack";
 * 
 * const nextConfig: NextConfig = {
 *   webpack: (config, { isServer }) => {
 *     if (!isServer) {
 *       config.plugins.push(
 *         new webpack.container.ModuleFederationPlugin({
 *           name: "consumerApp",
 *           remotes: {
 *             childEventAssistant: "childEventAssistant@http://localhost:3000/_next/static/chunks/remoteEntry.js",
 *           },
 *           shared: {
 *             react: {
 *               singleton: true,
 *               requiredVersion: false,
 *               eager: false, // IMPORTANT: Prevents eager consumption error
 *             },
 *             "react-dom": {
 *               singleton: true,
 *               requiredVersion: false,
 *               eager: false,
 *             },
 *           },
 *         })
 *       );
 *     }
 *     return config;
 *   },
 * };
 * 
 * export default nextConfig;
 * ```
 * 
 * 2. Create a page in the consuming app:
 * 
 * ```tsx
 * "use client"
 * 
 * import dynamic from "next/dynamic"
 * import { Suspense } from "react"
 * 
 * const RemoteChatPage = dynamic(
 *   () => import("childEventAssistant/ChatPage"),
 *   {
 *     ssr: false,
 *     loading: () => <div>Loading chat...</div>,
 *   }
 * )
 * 
 * export default function ChatConsumerPage() {
 *   return (
 *     <div>
 *       <h1>Remote Chat Page</h1>
 *       <Suspense fallback={<div>Loading...</div>}>
 *         <RemoteChatPage />
 *       </Suspense>
 *     </div>
 *   )
 * }
 * ```
 * 
 * 3. Available remote modules:
 * 
 * - childEventAssistant/ChatPage - Full chat page component
 * - childEventAssistant/ChatMessage - Individual chat message component
 * - childEventAssistant/ChatInput - Chat input component
 * - childEventAssistant/AutoSpeakContext - Auto-speak context provider
 * 
 * 4. Running the apps:
 * 
 * - Start this app (host): npm run dev (on port 3000)
 * - Start consuming app (remote): npm run dev (on different port, e.g., 3001)
 * - The consuming app will load modules from http://localhost:3000
 * 
 * 5. Production deployment:
 * 
 * Replace localhost URLs with your production domain:
 * remotes: {
 *   childEventAssistant: "childEventAssistant@https://your-domain.com/_next/static/chunks/remoteEntry.js",
 * }
 */

export {}
