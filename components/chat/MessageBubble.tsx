export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Task 5c: true while a live simulation is in flight and this bubble's
   * text is a STAGE label ("Parsing the disruption…") rather than a final
   * reply,  see ChatDock.tsx's staged loading sequence. Styled distinctly
   * (muted + a quiet pulse) so it reads as "still working," not as a
   * completed answer; it gets replaced by the real reply once the request
   * resolves, never left behind as if it were one. */
  pending?: boolean;
  /** Task 8e: a subtle "ANSWER" eyebrow label distinguishing a Q&A reply
   * from a disruption-injection confirmation -- optional, cosmetic only
   * (the text itself is honest either way; this is just a quick visual
   * cue for which of the chat's two jobs produced this bubble). */
  kind?: "answer";
}

/** Plain, restrained bubbles -- no color coding beyond alignment
 * (user right, assistant left). The design system's red is reserved for
 * disruption references elsewhere (map/timeline markers); an honest
 * "I don't have that" miss is not an error state, so it gets the same
 * neutral treatment as every other assistant line. `whitespace-pre-line`
 * lets a multi-line interpretation ("I understood this as: 1) ... 2) ...")
 * actually render its line breaks instead of collapsing to one line. */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        data-testid="chat-message"
        data-role={message.role}
        data-pending={message.pending ?? false}
        data-kind={message.kind ?? ""}
        className={`max-w-[88%] rounded-md px-2.5 py-1.5 text-sm leading-snug whitespace-pre-line state-transition ${
          isUser
            ? "bg-elevated text-aubergine"
            : message.pending
              ? "border border-border text-muted italic animate-pulse"
              : "border border-border text-aubergine"
        }`}
      >
        {message.kind === "answer" && <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine-soft mb-0.5">Answer</p>}
        {message.text}
      </div>
    </div>
  );
}
