import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

const API = "http://localhost:8000/api/v1";

type RequestOut = { id: number; category: string; confidence: number; language: string; is_emergency: boolean; status: string; };
type OpenRequest = { id: number; text: string; category: string; address: string; status: string; };
type Offer = { id: number; request_id: number; worker_name: string; price: number; message: string; status: string; };
type Message = { id: number; sender_name: string; role: string; message_type: string; content: string; media_url: string; };

export default function App() {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [role, setRole] = useState<"client" | "worker">((localStorage.getItem("role") as "client" | "worker") || "client");
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  
  const [text, setText] = useState("");
  const [lastRequest, setLastRequest] = useState<RequestOut | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([]);
  const [workerJobs, setWorkerJobs] = useState<OpenRequest[]>([]);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg, setOfferMsg] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completionFileRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [dir, i18n.language]);

  // Load active client request on login/refresh
  useEffect(() => {
    if (token && role === "client" && !lastRequest) {
      fetch(`${API}/requests/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (data.length > 0) {
            // Get the most recent request
            const latestReq = data[0];
            // If it's not cancelled or expired, show it
            setLastRequest(latestReq);
            fetchOffers(latestReq.id);
            fetchMessages(latestReq.id);
          }
        });
    }
  }, [token, role, lastRequest]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (role === "client" && lastRequest) {
        fetchOffers(lastRequest.id);
        fetchMessages(lastRequest.id);
      } else if (role === "worker") {
        fetchOpenRequests();
        fetchWorkerJobs();
        if (activeChatId) fetchMessages(activeChatId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, role, lastRequest, activeChatId]);

  // --- API CALLS ---
  async function sendCode() {
    setError(null);
    const r = await fetch(`${API}/auth/request-otp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });
    if (!r.ok) return setError("Failed to send code");
    const data = await r.json();
    setCodeSent(true);
    if (data.dev_code) setCode(data.dev_code);
  }

  async function verify() {
    setError(null);
    const r = await fetch(`${API}/auth/verify-otp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, name, role, preferred_language: i18n.language }),
    });
    if (!r.ok) return setError("Invalid code");
    const data = await r.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", role);
    setToken(data.access_token);
  }

  async function submitRequest() {
    setError(null);
    const r = await fetch(`${API}/requests`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      const data = await r.json();
      setLastRequest(data);
      setText("");
    } else {
      setError("انتهت الجلسة أو حدث خطأ.");
    }
  }

  async function fetchOffers(reqId: number) {
    const r = await fetch(`${API}/offers/${reqId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const fetchedOffers = await r.json();
      setOffers(fetchedOffers);
      // Update request status if accepted or beyond
      const statusRes = await fetch(`${API}/requests/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (statusRes.ok) {
        const allReqs = await statusRes.json();
        const currentReq = allReqs.find((r: any) => r.id === reqId);
        if (currentReq && currentReq.status !== lastRequest?.status) {
           setLastRequest(currentReq);
        }
      }
    }
  }

  async function fetchOpenRequests() {
    const r = await fetch(`${API}/requests/open`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setOpenRequests(await r.json());
  }

  async function fetchWorkerJobs() {
    const r = await fetch(`${API}/worker/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setWorkerJobs(await r.json());
  }

  async function fetchMessages(reqId: number) {
    const r = await fetch(`${API}/messages/${reqId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setMessages(await r.json());
  }

  async function sendOffer(reqId: number, isQuestion: boolean = false) {
    if (!isQuestion && !offerPrice) return;
    const r = await fetch(`${API}/offers`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ request_id: reqId, price: isQuestion ? 0 : parseFloat(offerPrice), message: offerMsg, is_question: isQuestion }),
    });
    if (r.ok) {
      setOfferPrice(""); setOfferMsg("");
      alert(isQuestion ? "Question sent!" : "Offer sent!");
    }
  }

  async function acceptOffer(offerId: number) {
    const r = await fetch(`${API}/offers/${offerId}/accept`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      alert("Offer Accepted! Payment is now held in Escrow.");
      if (lastRequest) fetchOffers(lastRequest.id);
    }
  }

  async function sendMessage(reqId: number, type: string = "text", payload: string = chatInput, mediaUrl: string = "") {
    if (type === "text" && !payload.trim()) return;
    const r = await fetch(`${API}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ request_id: reqId, message_type: type, content: payload, media_url: mediaUrl }),
    });
    if (r.ok) { setChatInput(""); fetchMessages(reqId); }
  }

  async function handleFileUpload(reqId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch(`${API}/upload`, { method: "POST", body: formData });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      const type = file.type.startsWith("video") ? "video" : "image";
      sendMessage(reqId, type, "", url);
    }
  }

  async function handleWorkerComplete(reqId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch(`${API}/upload`, { method: "POST", body: formData });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      const r = await fetch(`${API}/jobs/${reqId}/worker-complete`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ evidence_url: url }),
      });
      if (r.ok) {
        alert("Job marked complete. Waiting for client to release payment.");
        fetchWorkerJobs();
        if(activeChatId === reqId) fetchMessages(reqId);
      }
    }
  }

    async function handleClientComplete(reqId: number) {
    if(!window.confirm("Are you sure? This will release the funds to the worker.")) return;
    
    const r = await fetch(`${API}/jobs/${reqId}/client-complete`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` },
    });
    
    if (r.ok) {
      alert("Payment Released! Job is now fully complete.");
      // Instantly update the UI status without waiting for the poll
      if (lastRequest) {
        setLastRequest({ ...lastRequest, status: "client_completed" });
      }
    } else {
      alert("Failed to release funds. Check the backend console for errors.");
    }
  }

  function handleSendLocation(reqId: number) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const mapsUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
      sendMessage(reqId, "location", mapsUrl);
    });
  }

  function logout() {
    localStorage.clear();
    setToken(null); setLastRequest(null); setOffers([]); setMessages([]); setActiveChatId(null);
  }

  const renderMessageContent = (m: Message) => {
    if (m.message_type === "image") return <img src={m.media_url} alt="attachment" className="mt-1 rounded max-w-full h-auto max-h-48 object-cover" />;
    if (m.message_type === "video") return <video src={m.media_url} controls className="mt-1 rounded max-w-full max-h-48" />;
    if (m.message_type === "location") return <a href={m.content} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm mt-1 block">📍 View Shared Location</a>;
    return m.content;
  };

  // --- UI ---
  if (!token) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm space-y-4 bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t("login_title")}</h1>
            <button className="text-sm underline" onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}>{i18n.language === "ar" ? "EN" : "AR"}</button>
          </div>
          <div className="flex justify-center mb-4 pt-4"><img src="/logo.png" alt="Logo" className="h-24 w-auto object-contain" /></div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded">
            <button onClick={() => setRole("client")} className={`flex-1 py-1 rounded ${role === "client" ? "bg-white shadow font-bold" : ""}`}>Client</button>
            <button onClick={() => setRole("worker")} className={`flex-1 py-1 rounded ${role === "worker" ? "bg-white shadow font-bold" : ""}`}>Worker</button>
          </div>
          <input className="w-full border rounded px-3 py-2" placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} disabled={codeSent} />
          <input className="w-full border rounded px-3 py-2 text-left" dir="ltr" placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={codeSent} />
          {!codeSent ? (
            <button className="w-full bg-emerald-600 text-white rounded py-2" onClick={sendCode} disabled={!name || !phone}>{t("send_code")}</button>
          ) : (
            <>
              <input className="w-full border rounded px-3 py-2 text-center tracking-widest text-lg" dir="ltr" placeholder={t("code")} value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="w-full bg-emerald-600 text-white rounded py-2" onClick={verify}>{t("verify")}</button>
            </>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  // WORKER DASHBOARD
  if (role === "worker") {
    return (
      <div dir={dir} className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 bg-gray-50">
        <div className="flex justify-between items-center bg-white p-4 rounded shadow">
          <div className="flex items-center gap-3"><img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" /><h1 className="text-xl font-bold">Worker Dashboard</h1></div>
          <button className="text-sm text-red-600 underline" onClick={logout}>{t("logout")}</button>
        </div>
        
        {workerJobs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-blue-800">My Active Jobs (Chat)</h2>
            {workerJobs.map(job => (
              <div key={job.id} className="bg-white p-4 rounded shadow border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{job.text} <span className="text-sm font-normal text-gray-500">({job.status})</span></span>
                  <button className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded" onClick={() => setActiveChatId(job.id)}>Open Chat</button>
                </div>
                
                {job.status === "accepted" && (
                  <div className="mt-2 bg-yellow-50 p-2 rounded flex justify-between items-center border border-yellow-200">
                    <span className="text-sm text-yellow-800 font-semibold">Finished the job? Upload proof to request payment.</span>
                    <input type="file" ref={completionFileRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleWorkerComplete(job.id, e)} />
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm" onClick={() => completionFileRef.current?.click()}>Mark Completed</button>
                  </div>
                )}
                {job.status === "worker_completed" && (
                  <div className="mt-2 bg-blue-50 p-2 rounded text-blue-800 text-sm font-semibold">Waiting for client to confirm and release funds...</div>
                )}
                {job.status === "client_completed" && (
                  <div className="mt-2 bg-emerald-100 p-2 rounded text-emerald-800 text-sm font-bold">✅ Payment Released to you!</div>
                )}
                
                {activeChatId === job.id && (
                  <div className="mt-4 border-t pt-4 space-y-2">
                    <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-50 p-2 rounded">
                      {messages.map(m => (
                        <div key={m.id} className={`p-2 rounded text-sm w-fit max-w-[80%] ${m.role === 'worker' ? 'bg-blue-100 ml-auto' : 'bg-white border mr-auto'}`}>
                          <span className="font-bold text-xs block text-gray-500">{m.sender_name}</span>
                          {renderMessageContent(m)}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-gray-200 p-2 rounded" title="Attach">📎</button>
                      <button onClick={() => handleSendLocation(job.id)} className="bg-gray-200 p-2 rounded" title="Location">📍</button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(job.id, e)} />
                      <input className="border rounded px-2 py-1 flex-1 text-sm" placeholder="Reply..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={() => sendMessage(job.id)}>Send</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold mt-8">Open Requests (Broadcast)</h2>
        {openRequests.map((req) => (
          <div key={req.id} className="bg-white p-4 rounded shadow border space-y-3">
            <div className="flex justify-between"><span className="font-bold text-emerald-700">{req.category}</span><span className="text-sm text-gray-500">{req.address}</span></div>
            <p className="text-lg">{req.text}</p>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <input type="number" placeholder="Price" className="border rounded px-2 py-1 w-24" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
              <input type="text" placeholder="Message..." className="border rounded px-2 py-1 flex-1" value={offerMsg} onChange={(e) => setOfferMsg(e.target.value)} />
              <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm" onClick={() => sendOffer(req.id, true)}>Ask Details</button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={() => sendOffer(req.id, false)}>Send Offer</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // CLIENT DASHBOARD
  return (
    <div dir={dir} className="min-h-screen p-6 max-w-xl mx-auto space-y-4 bg-gray-50">
            <div className="flex justify-between items-center bg-white p-4 rounded shadow">
        <div className="flex items-center gap-3"><img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" /><h1 className="text-xl font-bold">{t("app_name")}</h1></div>
        <div className="flex gap-3">
          {lastRequest && (
            <button className="text-sm text-emerald-600 underline font-semibold" onClick={() => { setLastRequest(null); setMessages([]); setOffers([]); }}>
              + New Request
            </button>
          )}
          <button className="text-sm underline" onClick={logout}>{t("logout")}</button>
        </div>
      </div>

      {!lastRequest ? (
        <div className="bg-white p-6 rounded shadow space-y-4">
          <h2 className="text-lg font-semibold">{t("request_title")}</h2>
          <textarea className="w-full border rounded px-3 py-2 min-h-24" placeholder={t("placeholder")} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="bg-emerald-600 text-white rounded py-2 px-4 w-full" onClick={submitRequest} disabled={!text.trim()}>{t("submit")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow border-r-4 border-emerald-500">
            <p className="text-sm text-gray-500">Your Request:</p>
            <p className="text-lg font-semibold">{lastRequest.category}</p>
            <p className="text-sm text-gray-700">Status: {lastRequest.status}</p>
          </div>

          {lastRequest.status === "accepted" && (
            <div className="bg-yellow-50 p-4 rounded text-center text-yellow-800 font-bold border border-yellow-300">
              🔒 Payment is held in Escrow. Worker is on the job.
            </div>
          )}
          {lastRequest.status === "worker_completed" && (
            <div className="bg-blue-100 p-4 rounded text-center border border-blue-300 space-y-2">
              <p className="text-blue-800 font-bold">Worker marked job as complete! Review the evidence in chat.</p>
              <button onClick={() => handleClientComplete(lastRequest.id)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold w-full">Confirm & Release Payment</button>
            </div>
          )}
                    {lastRequest.status === "client_completed" && (
            <div className="bg-emerald-100 p-4 rounded text-center text-emerald-800 font-bold border border-emerald-300 space-y-3">
              <p>✅ Job Completed! Payment Released to Worker. Thank you!</p>
              <button 
                onClick={() => {
                  setLastRequest(null);
                  setMessages([]);
                  setOffers([]);
                }} 
                className="bg-emerald-600 text-white px-4 py-2 rounded text-sm w-full"
              >
                Start a New Request
              </button>
            </div>
          )}

          {["submitted", "accepted"].includes(lastRequest.status) && (
            <>
              <h3 className="font-bold text-lg">Offers Received ({offers.length})</h3>
              {offers.map((offer) => (
                <div key={offer.id} className={`p-4 rounded shadow border space-y-2 ${offer.status === 'accepted' ? 'bg-emerald-50 border-emerald-500' : 'bg-white'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{offer.worker_name}</span>
                    {offer.status === "question" ? <span className="text-blue-600 font-bold text-sm">طلب تفاصيل</span> : <span className="text-emerald-600 font-bold text-xl">{offer.price} EGP</span>}
                  </div>
                  <p className="text-gray-700">{offer.message}</p>
                  {offer.status === "pending" && <button onClick={() => acceptOffer(offer.id)} className="w-full bg-emerald-600 text-white py-2 rounded mt-2">Accept Offer (Escrow)</button>}
                  {offer.status === "accepted" && <div className="text-center text-emerald-700 font-bold mt-2">✅ Accepted</div>}
                </div>
              ))}
            </>
          )}

          <div className="bg-white p-4 rounded shadow mt-6 border border-gray-200">
            <h3 className="font-bold text-lg mb-2">Chat & Evidence</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-50 p-2 rounded mb-2">
              {messages.map(m => (
                <div key={m.id} className={`p-2 rounded text-sm w-fit max-w-[80%] ${m.role === 'client' ? 'bg-emerald-100 ml-auto text-right' : 'bg-white border mr-auto text-left'}`}>
                  <span className="font-bold text-xs block text-gray-500">{m.sender_name}</span>
                  {renderMessageContent(m)}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => fileInputRef.current?.click()} className="bg-gray-200 p-2 rounded" title="Attach">📎</button>
              <button onClick={() => handleSendLocation(lastRequest.id)} className="bg-gray-200 p-2 rounded" title="Location">📍</button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(lastRequest.id, e)} />
              <input className="border rounded px-2 py-1 flex-1 text-sm" placeholder="Type reply..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <button className="bg-emerald-600 text-white px-3 py-1 rounded text-sm" onClick={() => sendMessage(lastRequest.id)}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}