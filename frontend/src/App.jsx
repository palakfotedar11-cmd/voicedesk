
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bot,
  Headphones,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  ShoppingBag,
  Volume2,
  Wifi
} from 'lucide-react'

// Live Render backend
const API_URL = 'https://voicedesk-backend-o32s.onrender.com'

function clock() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your VoiceDesk support assistant. Ask me about an order, delivery, return, or refund.",
      time: clock()
    }
  ])

  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiStatus, setApiStatus] = useState('Checking...')
  const [lastIntent, setLastIntent] = useState('general_support')

  const recognitionRef = useRef(null)
  const bottomRef = useRef(null)

  // Check live backend connection
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(response => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(() => setApiStatus('Connected'))
      .catch(() => setApiStatus('Offline — check backend'))

    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Automatically scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages, busy])

  // Send message to live backend
  async function sendMessage(text = input) {
    const clean = text.trim()

    if (!clean || busy) return

    setInput('')

    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        text: clean,
        time: clock()
      }
    ])

    setBusy(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: clean
        })
      })

      if (!response.ok) {
        throw new Error('Backend returned an error')
      }

      const data = await response.json()

      setLastIntent(data.intent || 'general_support')

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          time: clock()
        }
      ])

      // Automatically speak the assistant response
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(data.reply)
        utterance.lang = 'en-IN'
        utterance.rate = 1

        window.speechSynthesis.speak(utterance)
      }

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not reach the VoiceDesk server. Please try again in a moment.',
          time: clock()
        }
      ])
    } finally {
      setBusy(false)
    }
  }

  // Start microphone and recognize speech
  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Speech recognition is not supported by this browser. Please use Google Chrome or Microsoft Edge.',
          time: clock()
        }
      ])
      return
    }

    if (!window.isSecureContext) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Please open VoiceDesk using a secure HTTPS connection to enable microphone access.',
          time: clock()
        }
      ])
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognition()

    recognition.lang = 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setInput('')
    }

    recognition.onresult = event => {
      let transcript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        transcript += result[0].transcript

        if (result.isFinal) {
          finalTranscript += result[0].transcript
        }
      }

      setInput(transcript)

      if (finalTranscript.trim()) {
        recognitionRef.current = null
        setListening(false)
        sendMessage(finalTranscript)
      }
    }

    recognition.onerror = event => {
      setListening(false)
      recognitionRef.current = null

      let errorMessage = `Microphone error: ${event.error}.`

      if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access was denied. Open the site settings beside the browser address bar and allow microphone access.'
      } else if (event.error === 'no-speech') {
        errorMessage = 'I could not hear anything. Please click Start listening and speak again.'
      } else if (event.error === 'network') {
        errorMessage = 'Speech recognition could not connect to its service. Check your internet connection and try again.'
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone was detected. Check that your microphone is connected and available.'
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: errorMessage,
          time: clock()
        }
      ])
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      recognitionRef.current = null
      setListening(false)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Could not start microphone: ${error.message}`,
          time: clock()
        }
      ])
    }
  }

  // Stop microphone
  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // Speak latest assistant response manually
  function speakLastReply() {
    const last = [...messages]
      .reverse()
      .find(message => message.role === 'assistant')

    if (!last || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(last.text)
    utterance.lang = 'en-IN'
    utterance.rate = 1

    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="app-shell">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Headphones size={22} />
          </div>

          <div>
            <strong>VoiceDesk</strong>
            <span>AI SUPPORT PLATFORM</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={18} />
          Live assistant
        </div>

        <div className="nav-item">
          <ShoppingBag size={18} />
          Order lookup
          <span className="nav-tag">DEMO</span>
        </div>

        <div className="nav-item">
          <ShieldCheck size={18} />
          Safety & handoff
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">AI</div>

          <div>
            <strong>Support workspace</strong>
            <span>Prototype environment</span>
          </div>
        </div>
      </aside>

      <main className="main">

        <header className="topbar">
          <div>
            <div className="eyebrow">
              CUSTOMER EXPERIENCE / OVERVIEW
            </div>

            <h1>Voice support assistant</h1>

            <p>Talk naturally. Get answers. Resolve requests.</p>
          </div>

          <div className={`status-pill ${apiStatus === 'Connected' ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {apiStatus}
          </div>
        </header>

        <section className="metrics">

          <div className="metric-card">
            <div className="metric-top">
              <span>Assistant status</span>
              <Bot size={18} />
            </div>

            <div className="metric-value">Ready to help</div>

            <div className="metric-note">
              <span className="green-text">●</span>
              Demo assistant
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Voice input</span>
              <Mic size={18} />
            </div>

            <div className="metric-value">
              {listening ? 'Listening…' : 'Browser microphone'}
            </div>

            <div className="metric-note">
              Permission required on first use
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Current intent</span>
              <Activity size={18} />
            </div>

            <div className="metric-value intent-value">
              {lastIntent.replaceAll('_', ' ')}
            </div>

            <div className="metric-note">
              Detected from latest request
            </div>
          </div>

        </section>

        <section className="workspace">

          <div className="conversation panel">

            <div className="panel-header">
              <div className="assistant-avatar">
                <Bot size={20} />
              </div>

              <div className="panel-title">
                <strong>Customer conversation</strong>
                <span>Ask a question using your voice or text</span>
              </div>

              <div className="live-label">
                <span />
                LIVE
              </div>
            </div>

            <div className="messages">

              <div className="date-divider">
                <span>SESSION STARTED</span>
              </div>

              {messages.map((message, index) => (
                <div
                  className={`message-row ${message.role}`}
                  key={index}
                >
                  {message.role === 'assistant' && (
                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>
                  )}

                  <div className="message-content">
                    <div className="bubble">
                      {message.text}
                    </div>

                    <div className="message-time">
                      {message.role === 'user' ? 'You' : 'VoiceDesk AI'}
                      {' · '}
                      {message.time}
                    </div>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="typing">
                  <span />
                  <span />
                  <span />
                  Assistant is thinking…
                </div>
              )}

              <div ref={bottomRef} />

            </div>

            <div className="composer">

              <div className="input-row">
                <input
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') sendMessage()
                  }}
                  placeholder="Type your question here…"
                  aria-label="Your message"
                />

                <button
                  className="send-button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || busy}
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </div>

              <div className="composer-bottom">
                <span>
                  <Wifi size={14} />
                  Connected to VoiceDesk API
                </span>

                <span>Demo data only</span>
              </div>

            </div>

          </div>

          <aside className="right-column">

            <div className="panel voice-panel">

              <div className="section-heading">
                <div>
                  <span className="eyebrow">VOICE CONTROLS</span>
                  <h2>Speak to the assistant</h2>
                </div>

                <div className="mic-icon">
                  <Mic size={20} />
                </div>
              </div>

              <div className={`voice-orb ${listening ? 'listening' : ''}`}>
                <div className="orb-ring ring-one" />
                <div className="orb-ring ring-two" />

                <div className="orb-core">
                  <Mic size={29} />
                </div>
              </div>

              <p className="voice-status">
                {listening ? 'Listening to your voice…' : 'Ready when you are'}
              </p>

              <p className="voice-help">
                {listening
                  ? 'Speak clearly, then pause to send.'
                  : 'Tap the button and ask a question naturally.'}
              </p>

              <button
                className={`primary-button ${listening ? 'recording' : ''}`}
                onClick={listening ? stopListening : startListening}
                disabled={busy}
              >
                {listening
                  ? <><MicOff size={17} /> Stop listening</>
                  : <><Mic size={17} /> Start listening</>}
              </button>

              <button
                className="secondary-button"
                onClick={speakLastReply}
              >
                <Volume2 size={17} />
                Speak latest response
              </button>

              <div className="privacy-note">
                <ShieldCheck size={16} />

                <span>
                  Microphone is used only after you click Start listening.
                  This is a demo; don't enter sensitive personal data.
                </span>
              </div>

            </div>

            <div className="panel examples-panel">

              <div className="section-heading">
                <div>
                  <span className="eyebrow">TRY A QUESTION</span>
                  <h2>Example requests</h2>
                </div>
              </div>

              <button
                className="example"
                onClick={() => sendMessage('Where is order 1001?')}
              >
                <span className="example-icon">
                  <ShoppingBag size={16} />
                </span>

                <span>
                  <strong>Track an order</strong>
                  <small>“Where is order 1001?”</small>
                </span>

                <span className="example-arrow">↗</span>
              </button>

              <button
                className="example"
                onClick={() => sendMessage('I need a refund')}
              >
                <span className="example-icon">
                  <Activity size={16} />
                </span>

                <span>
                  <strong>Ask about a refund</strong>
                  <small>“I need a refund.”</small>
                </span>

                <span className="example-arrow">↗</span>
              </button>

              <button
                className="example"
                onClick={() => sendMessage('I want to speak to a human representative')}
              >
                <span className="example-icon">
                  <Headphones size={16} />
                </span>

                <span>
                  <strong>Request a person</strong>
                  <small>“Can I talk to a human?”</small>
                </span>

                <span className="example-arrow">↗</span>
              </button>

            </div>

          </aside>

        </section>

        <footer>
          VOICEDESK PROTOTYPE
          <span>•</span>
          React + FastAPI
          <span>•</span>
          Sample data only
        </footer>

      </main>
    </div>
  )
}
