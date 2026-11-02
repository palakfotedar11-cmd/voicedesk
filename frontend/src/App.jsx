
import { useEffect, useRef, useState } from 'react'
import {
  Activity, Bot, Headphones, Mic, MicOff, Send,
  ShieldCheck, ShoppingBag, Volume2, Wifi,
  ArrowLeft, PackageCheck, AlertCircle, Search,
  CheckCircle2, UserRound
} from 'lucide-react'

const API_URL = 'https://voicedesk-backend-o32s.onrender.com'

function clock() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const sampleOrders = {
  '1001': {
    status: 'Shipped',
    item: 'Wireless Headphones',
    delivery: 'Expected within 2 days',
    location: 'In transit'
  },
  '1002': {
    status: 'Processing',
    item: 'Smart Watch',
    delivery: 'Expected within 4 days',
    location: 'Order confirmed'
  },
  '1003': {
    status: 'Delivered',
    item: 'Bluetooth Speaker',
    delivery: 'Delivered yesterday',
    location: 'Delivered'
  }
}

export default function App() {
  const [activeView, setActiveView] = useState('live')
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
  const [orderId, setOrderId] = useState('')
  const [orderResult, setOrderResult] = useState(null)
  const [orderSearched, setOrderSearched] = useState(false)
  const [handoffRequested, setHandoffRequested] = useState(false)

  const recognitionRef = useRef(null)
  const bottomRef = useRef(null)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function sendMessage(text = input) {
    const clean = text.trim()
    if (!clean || busy) return

    setInput('')
    setMessages(prev => [
      ...prev,
      { role: 'user', text: clean, time: clock() }
    ])
    setBusy(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean })
      })

      if (!response.ok) throw new Error('Backend error')

      const data = await response.json()
      setLastIntent(data.intent || 'general_support')

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'I could not generate a response.',
          time: clock()
        }
      ])

      if ('speechSynthesis' in window && data.reply) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(data.reply)
        utterance.lang = 'en-IN'
        window.speechSynthesis.speak(utterance)
      }
    } catch {
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

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported. Please use Chrome or Edge.')
      return
    }

    if (!window.isSecureContext) {
      alert('Please open VoiceDesk using HTTPS to use the microphone.')
      return
    }

    recognitionRef.current?.abort()

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
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
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
      alert(`Microphone error: ${event.error}. Check browser microphone permissions.`)
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
      alert(`Could not start microphone: ${error.message}`)
    }
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function speakLastReply() {
    const last = [...messages].reverse().find(m => m.role === 'assistant')
    if (!last || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(last.text)
    utterance.lang = 'en-IN'
    window.speechSynthesis.speak(utterance)
  }

  function lookupOrder(event) {
    event.preventDefault()
    const id = orderId.trim()
    setOrderSearched(true)
    setOrderResult(sampleOrders[id] || null)
  }

  function requestHandoff() {
    setHandoffRequested(true)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Headphones size={22} /></div>
          <div>
            <strong>VoiceDesk</strong>
            <span>AI SUPPORT PLATFORM</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${activeView === 'live' ? 'active' : ''}`}
          onClick={() => setActiveView('live')}
        >
          <Activity size={18} />
          Live assistant
        </button>

        <button
          className={`nav-item ${activeView === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveView('orders')}
        >
          <ShoppingBag size={18} />
          Order lookup
          <span className="nav-tag">DEMO</span>
        </button>

        <button
          className={`nav-item ${activeView === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveView('safety')}
        >
          <ShieldCheck size={18} />
          Safety & handoff
        </button>

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
            <div className="eyebrow">CUSTOMER EXPERIENCE / OVERVIEW</div>
            <h1>
              {activeView === 'live' && 'Voice support assistant'}
              {activeView === 'orders' && 'Order lookup'}
              {activeView === 'safety' && 'Safety & handoff'}
            </h1>
            <p>
              {activeView === 'live' && 'Talk naturally. Get answers. Resolve requests.'}
              {activeView === 'orders' && 'Find order information using sample order records.'}
              {activeView === 'safety' && 'Review escalation and customer safety options.'}
            </p>
          </div>

          <div className={`status-pill ${apiStatus === 'Connected' ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {apiStatus}
          </div>
        </header>

        {activeView === 'live' && (
          <>
            <section className="metrics">
              <div className="metric-card">
                <div className="metric-top">
                  <span>Assistant status</span><Bot size={18} />
                </div>
                <div className="metric-value">Ready to help</div>
                <div className="metric-note"><span className="green-text">●</span> Demo assistant</div>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span>Voice input</span><Mic size={18} />
                </div>
                <div className="metric-value">
                  {listening ? 'Listening…' : 'Browser microphone'}
                </div>
                <div className="metric-note">Permission required on first use</div>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span>Current intent</span><Activity size={18} />
                </div>
                <div className="metric-value intent-value">
                  {lastIntent.replaceAll('_', ' ')}
                </div>
                <div className="metric-note">Detected from latest request</div>
              </div>
            </section>

            <section className="workspace">
              <div className="conversation panel">
                <div className="panel-header">
                  <div className="assistant-avatar"><Bot size={20} /></div>
                  <div className="panel-title">
                    <strong>Customer conversation</strong>
                    <span>Ask a question using your voice or text</span>
                  </div>
                  <div className="live-label"><span />LIVE</div>
                </div>

                <div className="messages">
                  <div className="date-divider"><span>SESSION STARTED</span></div>

                  {messages.map((message, index) => (
                    <div className={`message-row ${message.role}`} key={index}>
                      {message.role === 'assistant' && (
                        <div className="message-avatar"><Bot size={16} /></div>
                      )}
                      <div className="message-content">
                        <div className="bubble">{message.text}</div>
                        <div className="message-time">
                          {message.role === 'user' ? 'You' : 'VoiceDesk AI'} · {message.time}
                        </div>
                      </div>
                    </div>
                  ))}

                  {busy && (
                    <div className="typing">
                      <span /><span /><span /> Assistant is thinking…
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
                    <span><Wifi size={14} /> {apiStatus === 'Connected' ? 'Connected to VoiceDesk API' : apiStatus}</span>
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
                    <div className="mic-icon"><Mic size={20} /></div>
                  </div>

                  <div className={`voice-orb ${listening ? 'listening' : ''}`}>
                    <div className="orb-ring ring-one" />
                    <div className="orb-ring ring-two" />
                    <div className="orb-core"><Mic size={29} /></div>
                  </div>

                  <p className="voice-status">{listening ? 'Listening to your voice…' : 'Ready when you are'}</p>
                  <p className="voice-help">
                    {listening ? 'Speak clearly, then pause to send.' : 'Tap the button and ask a question naturally.'}
                  </p>

                  <button
                    className={`primary-button ${listening ? 'recording' : ''}`}
                    onClick={listening ? stopListening : startListening}
                    disabled={busy}
                  >
                    {listening ? <><MicOff size={17} /> Stop listening</> : <><Mic size={17} /> Start listening</>}
                  </button>

                  <button className="secondary-button" onClick={speakLastReply}>
                    <Volume2 size={17} /> Speak latest response
                  </button>

                  <div className="privacy-note">
                    <ShieldCheck size={16} />
                    <span>Microphone is used only after you click Start listening. This is a demo; don't enter sensitive personal data.</span>
                  </div>
                </div>

                <div className="panel examples-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">TRY A QUESTION</span>
                      <h2>Example requests</h2>
                    </div>
                  </div>

                  <button className="example" onClick={() => sendMessage('Where is order 1001?')}>
                    <span className="example-icon"><ShoppingBag size={16} /></span>
                    <span><strong>Track an order</strong><small>“Where is order 1001?”</small></span>
                    <span className="example-arrow">↗</span>
                  </button>

                  <button className="example" onClick={() => sendMessage('I need a refund')}>
                    <span className="example-icon"><Activity size={16} /></span>
                    <span><strong>Ask about a refund</strong><small>“I need a refund.”</small></span>
                    <span className="example-arrow">↗</span>
                  </button>

                  <button className="example" onClick={() => sendMessage('I want to speak to a human representative')}>
                    <span className="example-icon"><Headphones size={16} /></span>
                    <span><strong>Request a person</strong><small>“Can I talk to a human?”</small></span>
                    <span className="example-arrow">↗</span>
                  </button>
                </div>
              </aside>
            </section>
          </>
        )}

        {activeView === 'orders' && (
          <section className="panel feature-panel">
            <div className="feature-icon"><ShoppingBag size={25} /></div>
            <span className="eyebrow">DEMO FEATURE</span>
            <h2>Find your order</h2>
            <p>Enter one of the sample order IDs to view its tracking information.</p>

            <form className="lookup-form" onSubmit={lookupOrder}>
              <input
                value={orderId}
                onChange={event => setOrderId(event.target.value)}
                placeholder="Enter order ID (e.g. 1001)"
                aria-label="Order ID"
                required
              />
              <button className="primary-button" type="submit">
                <Search size={17} /> Search order
              </button>
            </form>

            <div className="sample-hint">
              Sample IDs: <button onClick={() => setOrderId('1001')}>1001</button>
              <button onClick={() => setOrderId('1002')}>1002</button>
              <button onClick={() => setOrderId('1003')}>1003</button>
            </div>

            {orderSearched && (
              orderResult ? (
                <div className="order-result">
                  <div className="result-heading">
                    <PackageCheck size={22} />
                    <div><strong>Order #{orderId}</strong><span>Sample tracking record</span></div>
                    <span className="order-status">{orderResult.status}</span>
                  </div>
                  <div className="order-detail"><span>Item</span><strong>{orderResult.item}</strong></div>
                  <div className="order-detail"><span>Current location</span><strong>{orderResult.location}</strong></div>
                  <div className="order-detail"><span>Delivery estimate</span><strong>{orderResult.delivery}</strong></div>
                </div>
              ) : (
                <div className="not-found">
                  <AlertCircle size={20} />
                  No sample order found. Try order ID 1001, 1002 or 1003.
                </div>
              )
            )}
            <p className="demo-disclaimer">This feature uses fictional sample records. It is not connected to a real store or shipping provider.</p>
          </section>
        )}

        {activeView === 'safety' && (
          <section className="panel feature-panel">
            <div className="feature-icon"><ShieldCheck size={25} /></div>
            <span className="eyebrow">CUSTOMER SAFETY</span>
            <h2>Safety & human support</h2>
            <p>Some customer requests may need a human support representative instead of an automated response.</p>

            <div className="safety-list">
              <div><CheckCircle2 size={19} /><span><strong>Complex requests</strong><small>Requests the automated assistant cannot confidently resolve.</small></span></div>
              <div><CheckCircle2 size={19} /><span><strong>Billing or account concerns</strong><small>Cases that need secure account verification by an authorized team.</small></span></div>
              <div><CheckCircle2 size={19} /><span><strong>Customer requests a person</strong><small>Customers should have a clear way to request human assistance.</small></span></div>
            </div>

            {!handoffRequested ? (
              <button className="primary-button handoff-button" onClick={requestHandoff}>
                <UserRound size={17} /> Simulate human handoff
              </button>
            ) : (
              <div className="handoff-result">
                <CheckCircle2 size={21} />
                <div>
                  <strong>Handoff demonstration completed</strong>
                  <p>This is a simulated confirmation only. No real support agent has been contacted.</p>
                </div>
              </div>
            )}

            <p className="demo-disclaimer">Prototype only: this button does not send customer information or create a real support ticket.</p>
          </section>
        )}

        <footer>
          VOICEDESK PROTOTYPE <span>•</span> React + FastAPI <span>•</span> Sample data only
        </footer>
      </main>
    </div>
  )
}
