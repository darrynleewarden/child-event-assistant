"use client"

import { ChatMessage } from "@/app/components/chat/ChatMessage"
import { ActionButton } from "@/app/components/chat/ActionButton"
import { QuickReplyButton } from "@/app/components/chat/QuickReplyButton"
import { ChatInput } from "@/app/components/chat/ChatInput"

export default function ChatPage() {
  const handleSend = (message: string) => {
    console.log("Sent:", message)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="space-y-6">
          {/* First Message */}
          <div className="space-y-4">
            <ChatMessage variant="bot">
              <p>
                I'll guide you if I need more info, and you can tap buttons
                instead of typing if that's quicker. 😊✨
              </p>
              <p>Ready to try it out?</p>
            </ChatMessage>

            <div className="flex gap-3">
              <ActionButton>Start Logging</ActionButton>
              <ActionButton>Edit</ActionButton>
            </div>
          </div>

          {/* User Response */}
          <div>
            <QuickReplyButton>Learn more</QuickReplyButton>
          </div>

          {/* Second Message */}
          <div className="space-y-4">
            <ChatMessage variant="bot">
              <p>
                <span className="inline-block">✅</span> I can help you log:
              </p>
              <ul className="ml-4 mt-2 space-y-1">
                <li>• Toileting events</li>
                <li>• Sleep checks</li>
                <li>• Nutrition (meals/snacks)</li>
                <li>• Sunscreen applications</li>
                <li>• Medical events (like puffers or ointments)</li>
              </ul>
              <p className="mt-4">
                <span className="inline-block">💬</span> I understand natural
                language, so you can type casually — like you would in a
                message.
              </p>
              <p className="mt-4">
                <span className="inline-block">⏱️</span> Everything gets
                time-stamped and logged instantly. No forms, no fuss.
              </p>
              <p className="mt-4">
                <span className="inline-block">💡</span> Tip: You can log
                multiple children at once — like "Applied sunscreen to Tom,
                Lily, and Ava."
              </p>
            </ChatMessage>

            <div>
              <ActionButton>Got it - Let's go!</ActionButton>
            </div>
          </div>

          {/* User Response */}
          <div>
            <QuickReplyButton>Got it - Let's go!</QuickReplyButton>
          </div>

          {/* Third Message */}
          <div>
            <ChatMessage variant="bot">
              <p>
                Awesome! <span className="inline-block">🙌</span> I'm ready
                whenever you are.
              </p>
              <p className="mt-3">
                Just type or use the microphone to tell me what happened — for
                example:
              </p>
              <ul className="ml-4 mt-2 space-y-1">
                <li>• "Changed Ava's nappy"</li>
                <li>• "Lunch for Tom — he ate everything"</li>
                <li>• "Sleep check for Leo at 1:30, asleep"</li>
              </ul>
            </ChatMessage>
          </div>
        </div>
      </div>

      {/* Fixed Input at Bottom */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-4">
          <ChatInput onSend={handleSend} />
        </div>
      </div>
    </div>
  )
}
