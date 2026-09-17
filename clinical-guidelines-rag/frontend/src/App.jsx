import { useEffect, useRef, useState } from "react";
import { askQuestion, getHealth } from "./api.js";

const SAMPLE_QUESTIONS = [
  "What are first-line treatments for moderate depression?",
  "What developmental milestones should a 2-year-old have?",
  "How is a first episode of psychosis managed when specialist care isn't available?",
  "What's the difference between generalized anxiety disorder and panic disorder?",
];

function Message({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="bubble">
        <p className="answer-text">{message.text}</p>
        {message.citations && message.citations.length > 0 && (
          <div className="citations">
            <div className="citations-title">Sources</div>
            <ol>
              {message.citations.map((c, i) => (
                <li key={i}>
                  <span className="citation-title">{c.title}</span>
                  {" — "}
                  <span className="citation-section">{c.section}</span>
                  {c.url && (
                    <>
                      {" · "}
                      <a href={c.url} target="_blank" rel="noreferrer">
                        source
                      </a>
                    </>
                  )}
                  <div className="citation-snippet">{c.snippet}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi! I answer questions using public-domain clinical guidance (WHO mhGAP, " +
        "CDC developmental milestones, NIMH fact sheets) and cite my sources. " +
        "This is an educational demo, not medical advice.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docCount, setDocCount] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    getHealth()
      .then((h) => setDocCount(h.documents_indexed))
      .catch(() => setDocCount(null));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const data = await askQuestion(q);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, citations: data.citations },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Clinical Guidelines Assistant</h1>
        <span className="doc-count">
          {docCount === null ? "connecting…" : `${docCount} passages indexed`}
        </span>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {loading && (
          <div className="message assistant">
            <div className="bubble typing">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <div className="samples">
        {SAMPLE_QUESTIONS.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a condition, symptoms, or treatment guidance…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

      <footer>
        Educational demo only — not a substitute for professional medical advice.
      </footer>
    </div>
  );
}
