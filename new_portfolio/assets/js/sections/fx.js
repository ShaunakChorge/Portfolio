/* =====================================================================
   NEURAL NEON - fx.js  (FX engineer: global effects, no partial)
   Classic script, IIFE, defer.  Registers on window.Portfolio (core.js loads first).
   Every feature is independent and failure-safe (try/catch per feature), pauses with the
   tab (Portfolio.raf), and is skipped or simplified for prefers-reduced-motion / coarse pointers.

     1  neural-network background canvas          (.fx-net)
     2  spring-follow cursor glow orb              (.fx-orb, fine pointers only)
     3  [data-tilt] 3D tilt + moving glare         (.fx-glare)
     4  [data-magnetic] buttons (6px pull)
     5  command palette, Ctrl/Cmd+K, '/', header [data-open-palette]
     6  mini terminal easter egg                   (backtick key, palette action)
     7  accent switcher widget (desktop)           (.fx-accent)
     8  [data-scramble] text decrypt effect
     9  console banner
    10  Konami code -> overdrive

   Public API:  Portfolio.fx = { openPalette, closePalette, togglePalette, openTerminal, closeTerminal,
                                 exec, overdrive, scramble, stats, data }
   Bus events emitted: portfolio:palette {open}, portfolio:terminal {open}, portfolio:overdrive
   Bus events used:    portfolio:open-palette, portfolio:motion, portfolio:accent,
                       (emits) portfolio:filter {cat, source:'fx'}, portfolio:open-project {id, source:'fx'}
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document, root = doc.documentElement;
  if (win.__pfFx) return;
  win.__pfFx = true;

  /* compact facts, generated from research/content.final.json by build/_fx_tools/gen.mjs (do not hand-edit between the markers) */
  var DATA = /*@@DATA*/{"name":"Shaunak Chorge","short":"Shaunak","role":"AI & Python developer","roles":["AI & Python developer","LLM & RAG builder","Backend API developer","Automation tinkerer"],"headline":"AI Developer building LLM apps, vision systems and backend APIs","tagline":"I turn models and messy workflows into software that actually runs.","loc":"Pune / Mumbai, India","email":"shaunak.chorge@gmail.com","status":"AI Developer @ Claptek","avail":"AI Developer at Claptek (Mumbai), building AI features for GRC and audit platforms. Open to interesting AI and backend collaborations.","langs":["English","Hindi","Marathi","German","French"],"gh":"https://github.com/ShaunakChorge","li":"https://www.linkedin.com/in/shaunak-chorge","ig":"https://www.instagram.com/_shaunakkk/","resume":"assets/Shaunak-Chorge-Resume.pdf","short_bio":"B.Tech AI & Data Science graduate (CGPA 9.62) based in Pune and Mumbai. I have built LLM chatbots, REST APIs and automation during internships, and RAG, vision and speech projects on my own and with teammates.","bio":["I'm Shaunak, a software developer who works mostly in Python on AI and backend systems. I graduated in May 2026 with a B.Tech in Artificial Intelligence & Data Science (CGPA 9.62/10). My two industry internships covered REST APIs and local-LLM document pipelines at Osource Global, and client-facing RAG chatbots on Supabase and PostgreSQL at Shivohini Tech-AI.","Outside work I like to build things end to end: a RAG assistant that cites its sources or admits it doesn't know, an observable LLM-routed API with traces and metrics, a counter-scam agent built with Prasanna Patil, and speech and vision models wrapped in small apps. These days I am an AI Developer at Claptek, building LLM-powered features for audit and compliance platforms."],"degree":"B.Tech in Artificial Intelligence & Data Science","cgpa":"CGPA 9.62/10","period":"2022 - May 2026","hero":{"stack":["Python","FastAPI","PostgreSQL","Docker"],"builds":["RAG assistants","LLM-routed APIs","vision + speech models"]},"stats":[{"l":"B.Tech CGPA, AI & Data Science","v":9.62,"s":"/10"},{"l":"Industry roles","v":3,"s":""},{"l":"Contest & hackathon podiums","v":3,"s":""},{"l":"Projects on this page","v":19,"s":""}],"skills":{"daily":["Python","FastAPI","PostgreSQL","Docker","Git","pandas","Streamlit","LLM APIs (Groq, OpenAI)"],"shipped":["Django","Django REST Framework","RAG","LangChain","ChromaDB","sentence-transformers","Pydantic","pytest","OpenTelemetry","Prometheus","Jaeger","Supabase","MongoDB","MySQL","SQL","scikit-learn","TensorFlow / Keras","PyTorch","OpenCV","YOLOv8","librosa","NLTK","Hugging Face Transformers","Local LLMs","React","Vite","Twilio","WhatsApp Cloud API (prototype)","Telegram Bot API","BeautifulSoup","JavaScript","HTML / CSS","Java","C / C++"],"learning":["LangGraph agent workflows"],"labels":{"daily":{"title":"Daily drivers","caption":"What I reach for first on a new build."},"shipped":{"title":"Used in projects and work","caption":"Tools I have used in the projects and internships on this page."},"learning":{"title":"Exploring","caption":"Early experiments, nothing shipped yet."}}},"filters":[{"id":"all","label":"All"},{"id":"llm","label":"LLM & agents"},{"id":"vision","label":"Vision"},{"id":"speech-ml","label":"ML, speech & NLP"},{"id":"backend","label":"Backend & APIs"},{"id":"automation","label":"Automation"},{"id":"web-tools","label":"Web, tools & games"}],"projects":[{"id":"observable-ai-backend","t":"Observable AI Backend","y":"2026","tone":"blue","g":"backend","f":true,"early":false,"cat":"LLM & Backend","b":"LLM-routed FastAPI service with trace IDs, Prometheus metrics and Jaeger traces.","d":"FastAPI service where an LLM routes each question to a business action, with JSON logs, Prometheus metrics and OpenTelemetry traces.","st":["Python","FastAPI","Pydantic","OpenTelemetry","Jaeger","Prometheus"],"status":"Private repo \u00b7 take-home project","repo":"","live":"","by":"","w":""},{"id":"ai-rag-healthcare-assistant","t":"Healthcare Policy RAG Assistant","y":"2026","tone":"cyan","g":"llm","f":true,"early":false,"cat":"LLM & RAG","b":"RAG assistant over synthetic healthcare policies that cites sources or says it does not know.","d":"RAG assistant over synthetic healthcare policies (FastAPI, ChromaDB, Groq). Answers cite sources and confidence; out-of-scope questions are refused.","st":["Python","FastAPI","LangChain","ChromaDB","sentence-transformers","Groq"],"status":"Public repo \u00b7 take-home prototype","repo":"https://github.com/ShaunakChorge/AI-RAG","live":"","by":"","w":""},{"id":"agentic-honeypot","t":"Agentic Honey-Pot","y":"2026","tone":"cyan","g":"llm","f":true,"early":false,"cat":"AI Agents","b":"Counter-scam agent: an LLM persona stalls scammers and logs the UPI IDs and links they reveal.","d":"Counter-scam system: an LLM plays an easily fooled target, keeps scammers chatting and logs the UPI IDs, links and phone numbers they reveal.","st":["Python","FastAPI","Pydantic","Groq API","React 19","Vite"],"status":"Public repo \u00b7 co-authored hackathon build","repo":"https://github.com/prasanna4149/agentic-honeypot","live":"","by":"Prasanna Patil","w":"Prasanna Patil"},{"id":"speech-emotion-recognition","t":"Speech Emotion Recognition","y":"2025","tone":"purple","g":"speech-ml","f":true,"early":false,"cat":"Speech & ML","b":"1-D CNN that labels seven emotions in speech: 93.87% on a held-out split, with live mic inference.","d":"1-D CNN that labels seven emotions in speech, trained on four public datasets: 93.87% on a held-out 20% split, with live microphone inference.","st":["Python","TensorFlow / Keras","librosa","scikit-learn","NumPy","pandas"],"status":"Public repo \u00b7 personal project","repo":"https://github.com/ShaunakChorge/Speech-Emotion-Recognition-System","live":"","by":"","w":""},{"id":"deepfake-video-detection","t":"DeepFake Video Detection","y":"2025","tone":"magenta","g":"vision","f":true,"early":false,"cat":"Computer Vision","b":"Frame-by-frame deepfake scoring with a Streamlit app and PDF report. B.Tech team project, 74.16%.","d":"B.Tech team project: a small CNN scores each video frame as real or fake, with a Streamlit app, confidence chart and PDF report. 74.16% test accuracy.","st":["Python","TensorFlow / Keras","OpenCV","Streamlit","ReportLab","Celeb-DF dataset"],"status":"Public repo \u00b7 B.Tech team project","repo":"https://github.com/ShaunakChorge/DeepFakeAnalysis","live":"","by":"","w":"Prasanna Patil"},{"id":"django-box-selection-api","t":"Box Selection API","y":"2026","tone":"blue","g":"backend","f":true,"early":false,"cat":"Backend","b":"Django REST API that picks the fewest, cheapest shipping boxes for an order. 27 passing tests.","d":"Django REST API that recommends the fewest, cheapest shipping boxes for an order using a rotation-aware packing heuristic, with 27 passing tests.","st":["Python 3.12","Django 5","Django REST Framework","SQLite","Django test runner"],"status":"Public repo \u00b7 take-home project","repo":"https://github.com/ShaunakChorge/PythonDjangoAssignment","live":"","by":"","w":""},{"id":"ams-ai-finding-engine","t":"AMS AI Finding Drafting Engine","y":"2026","tone":"cyan","g":"llm","f":false,"early":false,"cat":"LLM & Backend","b":"LLM drafting service for audit findings with code-enforced zero-hallucination gates and batch drafting.","d":"FastAPI microservice that turns audit checklist observations into grounded draft findings - three variants each, batch mode and cluster reports.","st":["Python","FastAPI","Pydantic v2","TF-IDF","Local LLMs","Spring Boot"],"status":"Private enterprise repo","repo":"","live":"","by":"","w":""},{"id":"obligation-management-system","t":"Obligation Management System","y":"2026","tone":"cyan","g":"llm","f":false,"early":false,"cat":"LLM & Documents","b":"Extracts obligation registers from regulatory PDFs with verbatim evidence highlighting: 97.2% span-located.","d":"Domain-agnostic extraction service that reads circulars, permits and master directions and returns structured obligations with highlightable source evidence.","st":["Python","FastAPI","Ollama","PyMuPDF","pdf.js","React"],"status":"Private enterprise repo","repo":"","live":"","by":"","w":""},{"id":"finacle-text-to-sql","t":"Core-Banking Text-to-SQL Assistant","y":"2026","tone":"blue","g":"backend","f":false,"early":false,"cat":"LLM & Data","b":"On-prem NL-to-Oracle-SQL assistant for core-banking reporting, with execution-guided self-correction.","d":"Air-gapped assistant that turns reporting questions into multi-table Oracle SQL over a 1,628-table core-banking schema.","st":["Python","FastAPI","sqlglot","Oracle","vLLM","BM25"],"status":"Private enterprise repo","repo":"","live":"","by":"","w":"One Claptek teammate (schema retrieval, SQL guardrail, seeding)"},{"id":"whatsapp-ai-agent-platform","t":"WhatsApp Automation & AI Agent Platform","y":"2025-26","tone":"blue","g":"automation","f":false,"early":false,"cat":"Automation","b":"Webhook-driven WhatsApp platform with async AI replies, user state tracking and operator alerts.","d":"Client platform that ingests WhatsApp webhooks, tracks conversation state and answers asynchronously through LLM agents.","st":["Python","FastAPI","PostgreSQL","Supabase","Redis","Celery"],"status":"Private enterprise repo","repo":"","live":"","by":"","w":""},{"id":"advanced-cctv-analytics","t":"CCTV Crime & Crowd Analytics","y":"2023","tone":"magenta","g":"vision","f":false,"early":false,"cat":"Computer Vision","b":"Smart India Hackathon team prototype: crowd limits, crime-frame classification and face recognition.","d":"Smart India Hackathon team project: crowd-limit alerts, frame-based crime classification and face recognition on CCTV video, logged to MongoDB.","st":["Python","OpenCV","PyTorch","Hugging Face Transformers (ViT)","Flask","MongoDB"],"status":"Public repo \u00b7 team hackathon project","repo":"https://github.com/prasanna4149/Advanced-CCTV-Analytics-System","live":"","by":"Prasanna Patil","w":"Prasanna Patil"},{"id":"spam-classifier","t":"Email/SMS Spam Classifier","y":"2025","tone":"purple","g":"speech-ml","f":false,"early":false,"cat":"NLP","b":"NLTK, TF-IDF and Naive Bayes spam filter: 100% precision and 97.1% accuracy on 1,034 test messages.","d":"NLTK, TF-IDF and Naive Bayes spam detector: 97.1% accuracy and 100% precision on 1,034 test messages, served through a Streamlit app.","st":["Python","NLTK","scikit-learn","TF-IDF","Multinomial Naive Bayes","Streamlit"],"status":"Public repo \u00b7 AICTE internship project","repo":"https://github.com/ShaunakChorge/Spam-Classifier","live":"","by":"","w":""},{"id":"house-price-predictor","t":"House Price Predictor","y":"2026","tone":"purple","g":"speech-ml","f":false,"early":false,"cat":"Machine Learning","b":"Ames housing price model on eight features: Random Forest (R\u00b2 0.89) beats the linear baseline.","d":"Ames-housing price model on eight features: Random Forest beats the linear baseline (R\u00b2 0.89), with a Streamlit predictor launched from the notebook.","st":["Python","pandas","NumPy","scikit-learn","Random Forest","Streamlit"],"status":"Public repo \u00b7 data-science assessment","repo":"https://github.com/ShaunakChorge/HousePricePredictor","live":"","by":"","w":""},{"id":"astra-telegram-bot","t":"ASTRA Telegram Bot","y":"2024","tone":"blue","g":"automation","f":false,"early":false,"cat":"Automation","b":"Telegram bot that walks you through zodiac sign and date and replies with the daily horoscope.","d":"Telegram bot that walks users through zodiac sign and date (up to a year back) and returns the daily horoscope, with validation and error handling.","st":["Python","pyTelegramBotAPI","requests","Telegram Bot API"],"status":"Public repo \u00b7 learning project","repo":"","live":"","by":"","w":""},{"id":"zapvi-web-scraper","t":"Zapvi Web Scraper","y":"2024","tone":"blue","g":"automation","f":false,"early":false,"cat":"Automation","b":"Requests and BeautifulSoup notebook that scrapes product listings into pandas and CSV.","d":"Requests and BeautifulSoup notebook that scrapes product names, prices and URLs from an online store into pandas and CSV.","st":["Python","Requests","BeautifulSoup","pandas","Jupyter"],"status":"Public repo \u00b7 learning project","repo":"https://github.com/ShaunakChorge/Zapvi-Web-Scrapper","live":"","by":"","w":""},{"id":"cv-fundamentals-yolov8","t":"Computer Vision Fundamentals + YOLOv8 on Video","y":"2025","tone":"magenta","g":"vision","f":false,"early":false,"cat":"Computer Vision","b":"Grayscale, resize and blur, then Faster R-CNN on an image and YOLOv8n on video frames.","d":"Assignment notebook: grayscale, resize and blur, then Faster R-CNN detection on an image and YOLOv8n detection on every fifth frame of a video.","st":["Python","OpenCV","Matplotlib","PyTorch / torchvision","Ultralytics YOLOv8n","Jupyter"],"status":"Assignment \u00b7 notebook only","repo":"","live":"","by":"","w":""},{"id":"german-english-translate-summarize","t":"German to English Translate & Summarize","y":"2025","tone":"purple","g":"speech-ml","f":false,"early":false,"cat":"NLP","b":"Streamlit utility that translates German to English with MarianMT, then summarises with BART.","d":"Streamlit utility that translates German text to English with MarianMT, then summarises it with BART, chunking long inputs map-reduce style.","st":["Python","Streamlit","Hugging Face Transformers","MarianMT","BART"],"status":"Small utility \u00b7 in a public repo","repo":"https://github.com/ShaunakChorge/DeepFakeAnalysis/blob/main/app.py","live":"","by":"","w":""},{"id":"medical-insurance-cost-prediction","t":"Medical Insurance Cost Prediction","y":"2024","tone":"purple","g":"speech-ml","f":false,"early":true,"cat":"Machine Learning","b":"EDA and linear regression on 1,338 insurance records: R\u00b2 0.74 on test data.","d":"Data-science course case study: EDA and linear regression on 1,338 insurance records (R\u00b2 0.74 on test) with a small cost-estimate function.","st":["Python","pandas","NumPy","scikit-learn","Matplotlib","Seaborn"],"status":"Course case study \u00b7 follows a public tutorial notebook","repo":"","live":"","by":"","w":""},{"id":"qr-code-generator","t":"QR Code Generator","y":"2024","tone":"blue","g":"web-tools","f":false,"early":true,"cat":"Web","b":"Single-page tool that turns short text or a URL into a QR code. Live on GitHub Pages.","d":"Single-page web tool that turns short text or a simple URL into a QR code, with a reveal animation. Live on GitHub Pages.","st":["HTML","CSS","JavaScript","api.qrserver.com"],"status":"Public repo \u00b7 live on GitHub Pages","repo":"https://github.com/ShaunakChorge/QR-Code-Generator","live":"https://shaunakchorge.github.io/QR-Code-Generator/","by":"","w":""},{"id":"quiz-game-c","t":"Ultimate Quiz Game (C)","y":"2023","tone":"blue","g":"web-tools","f":false,"early":true,"cat":"Games","b":"Console quiz in C with accounts, six topics, two difficulty levels and a persistent leaderboard.","d":"Console quiz in C: registration and login, six topics at two difficulty levels (88 questions) and a persistent sorted high-score table.","st":["C","GCC","File I/O"],"status":"Public repo \u00b7 college PBL team project","repo":"https://github.com/ShaunakChorge/Quiz-Game","live":"","by":"","w":""},{"id":"atm-simulator","t":"ATM Simulator (Java Swing)","y":"2024","tone":"blue","g":"backend","f":false,"early":true,"cat":"Desktop","b":"Java Swing and MySQL ATM: signup, card and PIN login, deposits, withdrawals, mini statement.","d":"Java Swing and MySQL desktop app: three-page signup, card and PIN login, deposit, withdrawal, fast cash, mini statement and PIN change.","st":["Java","Swing / AWT","JDBC","MySQL"],"status":"Public repo \u00b7 tutorial-based learning project","repo":"https://github.com/ShaunakChorge/ATM-Simulator","live":"","by":"","w":""},{"id":"tetris-raylib-cpp","t":"Tetris (C++ / raylib)","y":"2024","tone":"blue","g":"web-tools","f":false,"early":true,"cat":"Games","b":"Object-oriented C++ Tetris on raylib: rotation, line clearing, scoring, preview and sound.","d":"Object-oriented C++ Tetris on raylib: seven tetromino classes, rotation, line clearing, scoring, next-piece preview and sound effects.","st":["C++","raylib","Make / g++"],"status":"Public repo \u00b7 tutorial-based learning project","repo":"https://github.com/ShaunakChorge/Tetris-Game","live":"","by":"","w":""},{"id":"password-generator","t":"Password Generator","y":"2023","tone":"blue","g":"web-tools","f":false,"early":true,"cat":"Tools","b":"First-year Python OOP mini-project: random passwords of a chosen length, saved to a text file.","d":"First-year Python OOP mini-project: generates random passwords of a chosen length and saves them with a name to a text file.","st":["Python","OOP","File I/O"],"status":"Public repo \u00b7 first-year mini-project","repo":"https://github.com/ShaunakChorge/Password-Generator","live":"","by":"","w":""}],"exp":[{"o":"Claptek","r":"AI Developer","p":"Jul 2026 - Present","g":"work","b":["Sole engineer on an LLM audit-finding drafting service (Python, FastAPI, Pydantic v2): grounded RAG pipeline with code-enforced zero-hallucination gates, three draft variants per finding, batch spreadsheet drafting and AI cluster reports - adopted into the client's audit product the day after handover.","Shipped a ~28x latency fix (7.9 min to 16.9 s end-to-end) by root-causing hidden reasoning tokens in the LLM gateway and benchmarking four candidate models with accuracy held constant."]},{"o":"Osource Global Pvt. Ltd.","r":"Python Automation Intern","p":"Mar 2026 - Jun 2026","g":"work","b":["Engineered RESTful backend APIs in Python, FastAPI and PostgreSQL to sync data across internal company systems.","Integrated local LLMs into a document pipeline that generates structured enterprise reports from unformatted input."]},{"o":"Shivohini Tech-AI LLP","r":"AI & ML Intern","p":"Sep 2025 - Mar 2026","g":"work","b":["Developed and deployed client-facing conversational AI chatbots using LLaMA, the OpenAI API and retrieval-augmented generation.","Designed PostgreSQL and Supabase schemas for chat history and user profiles, enabling stateful bot conversations."]},{"o":"Edunet","r":"AI & Data Analytics Green Skills Intern","p":"Jan 2025 - Feb 2025","g":"programme","b":[]},{"o":"TechSaksham (AICTE internship, Microsoft & SAP CSR initiative)","r":"AI & Transformative Learning Intern","p":"Dec 2024 - Jan 2025","g":"programme","b":[]},{"o":"Osource India Pvt. Ltd.","r":"Python Automation Developer Intern","p":"Jul 2024 - Aug 2024","g":"programme","b":[]},{"o":"IBM SkillsBuild","r":"Front-End Development Intern","p":"Jun 2024 - Jul 2024","g":"programme","b":[]},{"o":"Academor","r":"AI & Python Intern","p":"Jan 2023","g":"programme","b":[]}],"edu":[{"i":"Dr. D. Y. Patil School of Science & Technology, DPU","d":"B.Tech in Artificial Intelligence & Data Science","p":"2022 - May 2026","g":"CGPA 9.62/10","l":"Pune, India"}],"certs":[{"n":"Oracle Cloud Infrastructure 2025 Certified Generative AI Professional","i":"Oracle","y":2025},{"n":"Generative AI Certification","i":"GeeksforGeeks","y":""},{"n":"IgniteX Program Participant","i":"Wadhwani Foundation","y":""},{"n":"Python for Data Science","i":"Infosys Springboard","y":""},{"n":"Python Django","i":"SimpliLearn","y":""},{"n":"Introduction to SQL","i":"SimpliLearn","y":""},{"n":"Getting Started with Enterprise Data Science (digital badge)","i":"IBM (IBM SkillsBuild)","y":2024}],"awards":[{"t":"1st Runner-up, Code Golf (INNIXO - SWASTIK)","y":2025},{"t":"1st Runner-up, Code Quest Infinity","y":2024},{"t":"Winners, SIH Internal Round Hackathon","y":2023}]}/*@@END*/;

  var P = win.Portfolio = win.Portfolio || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ helpers */
  function qs(sel, ctx) { try { return (ctx || doc).querySelector(sel); } catch (e) { return null; } }
  function qsa(sel, ctx) { try { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); } catch (e) { return []; } }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function now() { return (win.performance && performance.now) ? performance.now() : Date.now(); }
  function mq(q) { try { return win.matchMedia ? win.matchMedia(q) : null; } catch (e) { return null; } }
  var mReduce = mq('(prefers-reduced-motion: reduce)');
  var mFine = mq('(hover: hover) and (pointer: fine)');
  var mCoarse = mq('(pointer: coarse)');
  var mSmall = mq('(max-width: 47.9375em)');
  function reduced() { return typeof P.prefersReducedMotion === 'boolean' ? P.prefersReducedMotion : !!(mReduce && mReduce.matches); }
  function fine() { return !!(mFine && mFine.matches); }
  function coarse() { return !!(mCoarse && mCoarse.matches); }
  function small() { return !!(mSmall && mSmall.matches); }
  function safe(name, fn) {
    try { return fn(); } catch (e) { if (win.console && console.warn) console.warn('[fx] ' + name + ' disabled:', e && e.message ? e.message : e); }
  }
  function add(n, k) {
    if (k === null || k === undefined || k === false) return n;
    if (Array.isArray(k)) { for (var i = 0; i < k.length; i++) add(n, k[i]); }
    else if (typeof k === 'string' || typeof k === 'number') n.appendChild(doc.createTextNode(String(k)));
    else n.appendChild(k);
    return n;
  }
  function h(tag, cls, kids, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) { for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); } }
    add(n, kids);
    return n;
  }
  function icon(name, cls) {
    var s = doc.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var u = doc.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  function kbd(t) { return h('kbd', 'kbd', t); }
  function isTyping(t) {
    if (!t || !t.tagName) return false;
    var tg = t.tagName;
    return tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || !!t.isContentEditable;
  }
  function activeEl() { var a = doc.activeElement; return (a && a !== doc.body && a !== root) ? a : null; }
  function restoreFocus(n) { if (n && n.isConnected && typeof n.focus === 'function') { try { n.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
  function visible(n) { return !!(n && (n.offsetWidth || n.offsetHeight || (n.getClientRects && n.getClientRects().length))); }
  function focusables(ctx) {
    return qsa('a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', ctx).filter(visible);
  }
  function trapTab(e, ctx) {
    var f = focusables(ctx);
    if (!f.length) { e.preventDefault(); return; }
    var i = f.indexOf(doc.activeElement);
    if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
    else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { f[0].focus(); e.preventDefault(); }
  }
  function lock(on, key) { if (P.lockScroll) P.lockScroll(on, key); }
  function toast(msg, type) { if (P.toast) return P.toast(msg, { type: type || 'info' }); }
  function emit(name, detail) { if (P.emit) P.emit(name, detail); else { try { doc.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* ignore */ } } }
  function on(name, fn) { if (P.on) return P.on(name, fn); doc.addEventListener(name, fn); return function () { doc.removeEventListener(name, fn); }; }
  function raf(fn) { return P.raf && P.raf.add ? P.raf.add(fn) : null; }
  function unraf(fn) { if (P.raf && P.raf.remove) P.raf.remove(fn); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function trunc(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : s; }

  var ACCENTS = ['cyan', 'magenta', 'purple', 'green'];
  var RGB = { cyan: [0, 255, 255], magenta: [255, 0, 110], purple: [181, 83, 242], green: [52, 255, 140] };
  function accentName() {
    var a = (P.accent && typeof P.accent === 'function') ? P.accent() : null;
    a = a || root.getAttribute('data-accent') || 'cyan';
    return RGB[a] ? a : 'cyan';
  }
  function setAccent(name) {
    if (P.accent) { P.accent(name); return true; }
    if (RGB[name]) { root.setAttribute('data-accent', name); return true; }
    return false;
  }

  /* shared pointer state (fine pointers only) */
  var ptr = { x: -1, y: -1, on: false, t: 0, type: 'mouse' };
  var hooks = { move: [], leave: [] };

  /* ================================================================== 1  NEURAL NETWORK CANVAS */
  var net = null;
  function initNetwork() {
    if (!doc.body) return;
    var w0 = win.innerWidth || root.clientWidth || 0, h0 = win.innerHeight || root.clientHeight || 0;   /* read BEFORE any DOM write (no forced layout) */
    var cv = h('canvas', 'fx-net', null, { 'aria-hidden': 'true' });
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    var bgf = qs('.bg-fixed');
    if (bgf && bgf.parentNode) bgf.parentNode.insertBefore(cv, bgf.nextSibling); else doc.body.insertBefore(cv, doc.body.firstChild);

    var MIX = { cyan: ['cyan', 'purple', 'magenta'], magenta: ['magenta', 'purple', 'cyan'], purple: ['purple', 'cyan', 'magenta'], green: ['green', 'cyan', 'purple'] };
    var ALPHA = [0.07, 0.12, 0.18, 0.27], HOT = [0.13, 0.22, 0.34, 0.5], CALPHA = [0.14, 0.24, 0.36, 0.5];
    var W = 0, H = 0, dpr = 1, nodes = [], sprites = [], accSprite = null;
    var styles = [], hotStyles = [], curStyles = [];
    var segs = [], i;
    for (i = 0; i < 12; i++) segs.push([]);
    var cseg = [[], [], [], []];
    var LD = 130, CR = 170, R = 190;
    var boostUntil = 0, boost = 0;
    var scrollYv = win.pageYOffset || 0, acc = 0, lastScroll = scrollYv, lastActive = now();   /* scrollYv is kept by Portfolio.onScroll: reading pageYOffset inside the frame forces a layout whenever the DOM is dirty */
    var workEma = 0, frames = 0, degrade = 0, fpsC = 0, fpsT = now(), fps = 0, lineCount = 0, started = false, running = false;

    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function makeSprite(c) {
      var px = Math.max(8, Math.ceil(32 * dpr)), o = doc.createElement('canvas');
      o.width = o.height = px;
      var g = o.getContext('2d'), gr = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.12, rgba(c, 0.95)); gr.addColorStop(0.32, rgba(c, 0.3)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, px, px);
      return o;
    }
    function buildPalette() {
      var an = accentName(), cols = MIX[an] || MIX.cyan;
      sprites = cols.map(function (n) { return makeSprite(RGB[n]); });
      styles = cols.map(function (n) { return ALPHA.map(function (a) { return rgba(RGB[n], a); }); });
      hotStyles = cols.map(function (n) { return HOT.map(function (a) { return rgba(RGB[n], a); }); });
      accSprite = makeSprite(RGB[an]);
      cseg.accStyle = CALPHA.map(function (a) { return rgba(RGB[an], a); });
    }
    function targetCount() {
      var area = W * H, sm = W < 768 || coarse();
      var n = sm ? Math.min(24, Math.round(area / 14000)) : Math.min(70, Math.round(area / 22000));
      n = Math.max(sm ? 14 : 28, n);
      return Math.max(12, Math.round(n * (1 - degrade * 0.22)));
    }
    function mkNode() {
      var z = 0.45 + Math.random() * 0.55, a = Math.random() * 6.2832, sp = (5 + Math.random() * 11) * (0.5 + z * 0.5), r = Math.random();
      return { x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ex: 0, ey: 0, z: z, c: r < 0.5 ? 0 : (r < 0.8 ? 1 : 2), ph: Math.random() * 6.2832, sp: 0.6 + Math.random() * 1.2, s: 12 + z * 9 };
    }
    function resize(fw, fh) {
      var w = typeof fw === 'number' ? fw : (win.innerWidth || root.clientWidth || 0), hh = typeof fh === 'number' ? fh : (win.innerHeight || root.clientHeight || 0);
      if (!w || !hh) return;
      var nd = Math.min(win.devicePixelRatio || 1, 1.5);
      if (W && Math.abs(w - W) <= 1 && Math.abs(hh - H) <= 120 && nd === dpr) return;   /* mobile URL-bar jitter: keep the bitmap */
      var ow = W, oh = H;
      W = w; H = hh;
      if (nd !== dpr || !sprites.length) { dpr = nd; buildPalette(); }
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.setProperty('--fx-w', W + 'px'); cv.style.setProperty('--fx-h', H + 'px');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LD = clamp(Math.min(W, H) * 0.17, 92, 150);
      if (W < 768) LD = Math.min(LD, 105);
      var want = targetCount();
      if (ow && oh && nodes.length) { var sx = W / ow, sy = H / oh; for (var k = 0; k < nodes.length; k++) { nodes[k].x *= sx; nodes[k].y *= sy; } }
      while (nodes.length > want) nodes.pop();
      while (nodes.length < want) nodes.push(mkNode());
      if (reduced() || (started && !running)) draw(0, false);
    }

    function draw(t, useP) {
      var n = nodes.length, a, b, dx, dy, d2, q, bk, s, c, m, k, j, nd, al, size;
      ctx.clearRect(0, 0, W, H);
      for (k = 0; k < 12; k++) segs[k].length = 0;
      for (k = 0; k < 4; k++) cseg[k].length = 0;
      var LDm = LD * (1 + 0.35 * boost), LD2 = LDm * LDm, lines = 0;
      for (k = 0; k < n; k++) {
        a = nodes[k];
        for (j = k + 1; j < n; j++) {
          b = nodes[j];
          dx = a.x - b.x; if (dx > LDm || dx < -LDm) continue;
          dy = a.y - b.y; if (dy > LDm || dy < -LDm) continue;
          d2 = dx * dx + dy * dy; if (d2 >= LD2) continue;
          q = 1 - Math.sqrt(d2) / LDm;
          bk = q > 0.66 ? 3 : (q > 0.4 ? 2 : (q > 0.18 ? 1 : 0));
          s = segs[a.c * 4 + bk]; s.push(a.x, a.y, b.x, b.y); lines++;
        }
        if (useP) {
          dx = a.x - ptr.x; dy = a.y - ptr.y; d2 = dx * dx + dy * dy;
          if (d2 < CR * CR) { q = 1 - Math.sqrt(d2) / CR; bk = q > 0.66 ? 3 : (q > 0.4 ? 2 : (q > 0.18 ? 1 : 0)); cseg[bk].push(ptr.x, ptr.y, a.x, a.y); lines++; }
        }
      }
      lineCount = lines;
      curStyles = boost > 0.05 ? hotStyles : styles;
      ctx.lineWidth = 1;
      for (c = 0; c < 3; c++) {
        for (bk = 0; bk < 4; bk++) {
          s = segs[c * 4 + bk]; if (!s.length) continue;
          ctx.strokeStyle = curStyles[c][bk]; ctx.beginPath();
          for (m = 0; m < s.length; m += 4) { ctx.moveTo(s[m], s[m + 1]); ctx.lineTo(s[m + 2], s[m + 3]); }
          ctx.stroke();
        }
      }
      if (useP) {
        for (bk = 0; bk < 4; bk++) {
          s = cseg[bk]; if (!s.length) continue;
          ctx.strokeStyle = cseg.accStyle[bk]; ctx.beginPath();
          for (m = 0; m < s.length; m += 4) { ctx.moveTo(s[m], s[m + 1]); ctx.lineTo(s[m + 2], s[m + 3]); }
          ctx.stroke();
        }
      }
      for (k = 0; k < n; k++) {
        nd = nodes[k];
        al = (0.55 + 0.45 * Math.sin(t * nd.sp + nd.ph)) * (0.55 + 0.45 * nd.z);
        ctx.globalAlpha = al; size = nd.s * (1 + boost * 0.35);
        ctx.drawImage(sprites[nd.c], nd.x - size / 2, nd.y - size / 2, size, size);
      }
      if (useP) { ctx.globalAlpha = 0.85; ctx.drawImage(accSprite, ptr.x - 15, ptr.y - 15, 30, 30); }
      ctx.globalAlpha = 1;
    }

    function frame(ts, dt) {
      if (reduced()) { running = false; return false; }
      var t0 = now();
      var quiet = t0 - lastActive;
      if (quiet > 8000) { running = false; return false; }                       /* 8 s without scroll or pointer: stop; the last frame stays painted, any input restarts it */
      var idle = quiet > 3000;
      var minDt = (coarse() || small()) ? 1 / 32 : (idle ? 1 / 22 : 1 / 36);   /* ~30fps while the pointer or page moves, ~20fps when idle, ~30fps on phones */
      acc += dt;
      if (acc < minDt) return;
      var sdt = Math.min(acc, 0.05); acc = 0;

      var sy = scrollYv, dsy = sy - lastScroll; lastScroll = sy;
      if (dsy) lastActive = t0;
      var useP = ptr.on && !coarse() && ptr.type !== 'touch' && (t0 - ptr.t) < 4500;
      var left = boostUntil - t0;
      boost = left <= 0 ? 0 : (left > 1200 ? 1 : left / 1200);
      var spd = 1 + 2.4 * boost, dec = Math.exp(-2.2 * sdt), R2 = R * R;
      var n = nodes.length, nd, dx, dy, d2, d, f, i2;
      for (i2 = 0; i2 < n; i2++) {
        nd = nodes[i2];
        if (useP) {
          dx = nd.x - ptr.x; dy = nd.y - ptr.y; d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 4) {
            d = Math.sqrt(d2);
            f = d < 80 ? (80 - d) / 80 * 260 : -(d - 80) / (R - 80) * 40;   /* repel close, attract gently at range */
            nd.ex += dx / d * f * sdt; nd.ey += dy / d * f * sdt;
          }
        }
        nd.ex *= dec; nd.ey *= dec;
        nd.x += (nd.vx * spd + nd.ex) * sdt;
        nd.y += (nd.vy * spd + nd.ey) * sdt - dsy * nd.z * 0.16;
        if (nd.x < -30) nd.x = W + 30; else if (nd.x > W + 30) nd.x = -30;
        if (nd.y < -30) nd.y = H + 30; else if (nd.y > H + 30) nd.y = -30;
      }
      draw(ts / 1000, useP);

      var work = now() - t0;
      workEma = workEma ? workEma * 0.95 + work * 0.05 : work;
      frames++; fpsC++;
      if (t0 - fpsT >= 1000) { fps = fpsC * 1000 / (t0 - fpsT); fpsC = 0; fpsT = t0; }
      if (frames % 150 === 0 && workEma > 4 && degrade < 3) {      /* adaptive quality: a slow device sheds nodes */
        degrade++;
        var want = targetCount();
        while (nodes.length > want) nodes.pop();
      }
      if (!started) { started = true; cv.classList.add('is-on'); }
    }

    function start() {
      if (running) return;
      if (reduced()) { draw(0, false); if (!started) { started = true; requestAnimationFrame(function () { cv.classList.add('is-on'); }); } return; }
      running = true; acc = 0; lastActive = now(); lastScroll = scrollYv;
      raf(frame);
    }
    function stop() { running = false; unraf(frame); }
    function wake() { lastActive = now(); if (!running && !reduced()) start(); }

    buildPalette();
    resize(w0, h0);
    start();
    if (P.onResize) P.onResize(resize); else win.addEventListener('resize', resize, { passive: true });
    if (P.onScroll) P.onScroll(function (st) { if (st && typeof st.y === 'number') scrollYv = st.y; wake(); });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) wake(); });
    hooks.move.push(wake);
    on('portfolio:motion', function () { if (reduced()) { stop(); draw(0, false); } else start(); });
    on('portfolio:accent', function () { buildPalette(); if (reduced() || !running) draw(0, false); });

    net = {
      stats: function () { return { nodes: nodes.length, lines: lineCount, workMs: +workEma.toFixed(2), fps: +fps.toFixed(1), degrade: degrade, dpr: dpr, w: W, h: H, running: running, boost: +boost.toFixed(2) }; },
      boost: function (ms) { boostUntil = now() + (ms || 5000); lastActive = now(); if (reduced()) { draw(0, false); } }
    };
  }

  /* ================================================================== pointer plumbing (orb, magnetic, canvas) */
  var magnet = { items: [], dirty: true, ts: 0 };
  function initPointer() {
    win.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.t = now(); ptr.type = e.pointerType || 'mouse';
      for (var i = 0; i < hooks.move.length; i++) { try { hooks.move[i](e); } catch (err) { /* ignore */ } }
    }, { passive: true });
    function gone() { ptr.on = false; for (var i = 0; i < hooks.leave.length; i++) { try { hooks.leave[i](); } catch (err) { /* ignore */ } } }
    doc.documentElement.addEventListener('mouseleave', gone);
    win.addEventListener('blur', gone);
    if (P.onScroll) P.onScroll(function () { magnet.dirty = true; });
    if (P.onResize) P.onResize(function () { magnet.dirty = true; });
  }

  /* ================================================================== 2  CURSOR GLOW ORB */
  function initOrb() {
    if (!fine()) return;
    var orb = null, sp = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }, running = false, shown = false;
    function write() { orb.style.transform = 'translate3d(' + sp.x.toFixed(1) + 'px,' + sp.y.toFixed(1) + 'px,0)'; }
    function step(ts, dt) {
      if (!orb) return false;
      if (reduced()) { sp.x = sp.tx; sp.y = sp.ty; sp.vx = sp.vy = 0; write(); running = false; return false; }
      dt = Math.min(dt, 1 / 30);
      var k = 60, c = 20;                                  /* spring (stiffness 60, damping 20) */
      sp.vx += (-k * (sp.x - sp.tx) - c * sp.vx) * dt; sp.vy += (-k * (sp.y - sp.ty) - c * sp.vy) * dt;
      sp.x += sp.vx * dt; sp.y += sp.vy * dt;
      write();
      if (Math.abs(sp.x - sp.tx) < 0.3 && Math.abs(sp.y - sp.ty) < 0.3 && Math.abs(sp.vx) < 0.5 && Math.abs(sp.vy) < 0.5) { sp.x = sp.tx; sp.y = sp.ty; write(); running = false; return false; }
    }
    hooks.move.push(function (e) {
      if (!fine() || e.pointerType === 'touch') return;
      if (!orb) { orb = h('div', 'fx-orb', null, { 'aria-hidden': 'true' }); doc.body.appendChild(orb); }
      sp.tx = ptr.x; sp.ty = ptr.y;
      if (!shown) { sp.x = sp.tx; sp.y = sp.ty; sp.vx = sp.vy = 0; write(); shown = true; requestAnimationFrame(function () { if (orb) orb.classList.add('is-on'); }); }
      if (!running) { running = true; raf(step); }
    });
    hooks.leave.push(function () { if (orb) { orb.classList.remove('is-on'); shown = false; } });
  }

  /* ================================================================== 2b  CURSOR LABEL ("Open case study" pill on cards / rows, fine pointers) */
  function initCursorLabel() {
    if (!fine()) return;
    var lab = h('div', 'fx-cur', ['Open case study ', icon('arrow-up-right', 'icon--sm')], { 'aria-hidden': 'true' }), shown = false;
    doc.body.appendChild(lab);
    hooks.move.push(function (e) {
      if (reduced()) { if (shown) { shown = false; lab.classList.remove('is-on'); } return; }
      var t = e.target && e.target.closest ? e.target.closest('.projects__card, .projects__row') : null;
      var hit = !!t && !e.target.closest('a, button');
      if (hit !== shown) {
        shown = hit; lab.classList.toggle('is-on', hit);
        if (hit) {
          var src = t.hasAttribute('data-tone') ? t : (qs('.projects__rowin', t) || t), cs = win.getComputedStyle(src);
          lab.style.setProperty('--tone', cs.getPropertyValue('--tone')); lab.style.setProperty('--tone-ink', cs.getPropertyValue('--tone-ink'));
        }
      }
      if (hit) { lab.style.setProperty('--x', String(Math.round(e.clientX + 18))); lab.style.setProperty('--y', String(Math.round(e.clientY + 18))); }
    });
    hooks.leave.push(function () { shown = false; lab.classList.remove('is-on'); });
  }

  /* ================================================================== 3  TILT  + 4  MAGNETIC */
  var bound = typeof WeakSet === 'function' ? new WeakSet() : { has: function (n) { return !!n.__fxb; }, add: function (n) { n.__fxb = 1; } };
  var tilt = { set: [], running: false };

  function tiltLoop(ts, dt) {
    var k = 1 - Math.exp(-dt * 12), i, st;
    for (i = tilt.set.length - 1; i >= 0; i--) {
      st = tilt.set[i];
      st.rx += (st.trx - st.rx) * k; st.ry += (st.try_ - st.ry) * k;
      if (!st.hover && Math.abs(st.rx) < 0.02 && Math.abs(st.ry) < 0.02) {
        st.el.style.transform = ''; st.el.classList.remove('is-tilting'); st.on = false; tilt.set.splice(i, 1); continue;
      }
      st.el.style.transform = 'perspective(900px) rotateX(' + st.rx.toFixed(2) + 'deg) rotateY(' + st.ry.toFixed(2) + 'deg)';
      if (st.hover) { st.el.style.setProperty('--fx-gx', st.gx.toFixed(1) + '%'); st.el.style.setProperty('--fx-gy', st.gy.toFixed(1) + '%'); }
    }
    if (!tilt.set.length) { tilt.running = false; return false; }
  }
  function bindTilt(node, isStatic) {
    if (bound.has(node) || !fine() || reduced()) return;
    bound.add(node);
    var st = { el: node, rx: 0, ry: 0, trx: 0, try_: 0, gx: 50, gy: 50, hover: false, rect: null, rt: 0, leave: 0, on: false };
    var g = h('span', 'fx-glare', null, { 'aria-hidden': 'true' });
    node.appendChild(g);
    if (isStatic === undefined) { try { isStatic = win.getComputedStyle(node).position === 'static'; } catch (e) { isStatic = false; } }
    if (isStatic) node.classList.add('fx-rel');
    function wake() { if (!st.on) { st.on = true; tilt.set.push(st); } if (!tilt.running) { tilt.running = true; raf(tiltLoop); } }
    node.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch' || reduced()) return;
      clearTimeout(st.leave);
      st.hover = true; st.rect = node.getBoundingClientRect(); st.rt = now();
      node.classList.add('is-tilting'); wake();
    });
    node.addEventListener('pointermove', function (e) {
      if (!st.hover || e.pointerType === 'touch') return;
      if (now() - st.rt > 400) { st.rect = node.getBoundingClientRect(); st.rt = now(); }
      var r = st.rect; if (!r || !r.width || !r.height) return;
      var px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
      var max = clamp(7 - r.width / 160, 2.5, 6);
      st.trx = (0.5 - py) * 2 * max; st.try_ = (px - 0.5) * 2 * max; st.gx = px * 100; st.gy = py * 100;
      wake();
    });
    node.addEventListener('pointerleave', function () {
      clearTimeout(st.leave);
      st.leave = setTimeout(function () { st.hover = false; st.trx = 0; st.try_ = 0; wake(); }, 50);   /* small grace: edges flicker while rotated */
    });
  }

  function magLoop(ts, dt) {
    var k = 1 - Math.exp(-dt * 14), busy = false, i, st;
    for (i = 0; i < magnet.items.length; i++) {
      st = magnet.items[i];
      if (!st.act) continue;
      st.x += (st.tx - st.x) * k; st.y += (st.ty - st.y) * k;
      if (st.tx === 0 && st.ty === 0 && Math.abs(st.x) < 0.05 && Math.abs(st.y) < 0.05) {
        st.x = st.y = 0; st.el.style.transform = ''; st.el.classList.remove('is-magnetic'); st.act = false; continue;
      }
      st.el.style.transform = 'translate3d(' + st.x.toFixed(2) + 'px,' + st.y.toFixed(2) + 'px,0)';
      busy = true;
    }
    if (!busy) { magnet.running = false; return false; }
  }
  function bindMagnet(node) {
    if (bound.has(node) || !fine() || reduced()) return;
    bound.add(node);
    magnet.items.push({ el: node, x: 0, y: 0, tx: 0, ty: 0, cx: 0, cy: 0, w: 0, h: 0, act: false });
    magnet.dirty = true;
  }
  function magnetMove(e) {
    var items = magnet.items;
    if (!items.length || reduced() || e.pointerType === 'touch') return;
    var t = now(), i, st, r, dx, dy, S = 6, near, wake = false;
    if (magnet.dirty || t - magnet.ts > 1500) {
      magnet.ts = t; magnet.dirty = false;
      for (i = items.length - 1; i >= 0; i--) {
        st = items[i];
        if (!st.el.isConnected) { items.splice(i, 1); continue; }
        r = st.el.getBoundingClientRect();
        st.cx = r.left + r.width / 2 - st.x; st.cy = r.top + r.height / 2 - st.y; st.w = r.width; st.h = r.height;
      }
    }
    /* only the NEAREST button inside the 26px zone is pulled (two neighbouring buttons used to lean into each other and weld) */
    var best = null, bestD = 1e9, ds = magnet.ds || (magnet.ds = []);
    for (i = 0; i < items.length; i++) {
      st = items[i]; ds[i] = null;
      if (!st.w || st.cy < -120 || st.cy > (win.innerHeight || 800) + 120) continue;
      dx = e.clientX - st.cx; dy = e.clientY - st.cy;
      near = Math.abs(dx) < st.w / 2 + 26 && Math.abs(dy) < st.h / 2 + 26;
      if (!near) continue;
      ds[i] = [dx, dy];
      var dn = Math.abs(dx) / (st.w / 2 + 26) + Math.abs(dy) / (st.h / 2 + 26);
      if (dn < bestD) { bestD = dn; best = st; }
    }
    for (i = 0; i < items.length; i++) {
      st = items[i];
      var tx = 0, ty = 0;
      if (st === best && ds[i]) { tx = clamp(ds[i][0] / (st.w / 2), -1, 1) * S; ty = clamp(ds[i][1] / (st.h / 2), -1, 1) * S; }
      if (tx !== st.tx || ty !== st.ty) { st.tx = tx; st.ty = ty; if (!st.act && (tx || ty)) { st.act = true; st.el.classList.add('is-magnetic'); } wake = true; }
    }
    if (wake && !magnet.running) { magnet.running = true; raf(magLoop); }
  }
  hooks.move.push(magnetMove);
  hooks.leave.push(function () {
    var wake = false;
    magnet.items.forEach(function (st) { if (st.tx || st.ty) { st.tx = st.ty = 0; wake = true; } });
    if (wake && !magnet.running) { magnet.running = true; raf(magLoop); }
  });

  /* ================================================================== 8  SCRAMBLE */
  var scrIO = null;
  function scramble(node, o) {
    o = o || {};
    if (!node || node.__scr || reduced() || !P.raf) return;
    var finalText = node.textContent;
    if (!finalText || !finalText.trim()) return;
    var attr = parseInt(node.getAttribute('data-scramble'), 10);
    var dur = o.duration || (attr > 100 ? attr : 900);
    var chars = finalText.split(''), n = chars.length, times = [], i;
    for (i = 0; i < n; i++) times.push((i / n) * dur * 0.65 + Math.random() * dur * 0.35);
    var sr = h('span', 'sr-only', finalText), vis = h('span', 'fx-scr', null, { 'aria-hidden': 'true' });
    var tag = node.tagName, labelOk = /^(H[1-6]|A|BUTTON)$/.test(tag) || node.hasAttribute('role');
    if (labelOk) node.setAttribute('aria-label', finalText);
    var saved = [];                                   /* keep the original child nodes (spans, em ...) and put them back at the end */
    while (node.firstChild) saved.push(node.removeChild(node.firstChild));
    node.appendChild(sr); node.appendChild(vis);
    node.__scr = 1;
    var SET_U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SET_L = 'abcdefghijklmnopqrstuvwxyz', SET_D = '0123456789', SET_S = '<>/\\[]{}=+*#%&@';
    function rnd(ch) {
      if (/[A-Z]/.test(ch)) return SET_U.charAt((Math.random() * 26) | 0);
      if (/[a-z]/.test(ch)) return SET_L.charAt((Math.random() * 26) | 0);
      if (/[0-9]/.test(ch)) return SET_D.charAt((Math.random() * 10) | 0);
      return SET_S.charAt((Math.random() * SET_S.length) | 0);
    }
    var t0 = null, lastSwap = 0, cur = chars.slice();
    var delay = parseInt(node.getAttribute('data-scramble-delay'), 10) || 0;
    vis.textContent = chars.map(function (c) { return /\s/.test(c) ? c : rnd(c); }).join('');   /* no blank frame */
    raf(function (ts) {
      if (t0 === null) t0 = ts + delay;
      var el = ts - t0;
      if (el < 0) { vis.textContent = chars.map(function (c) { return /\s/.test(c) ? c : rnd(c); }).join(''); return; }
      var done = true, k;
      if (el - lastSwap > 42) {
        lastSwap = el;
        for (k = 0; k < n; k++) cur[k] = (/\s/.test(chars[k]) || el >= times[k]) ? chars[k] : rnd(chars[k]);
        vis.textContent = cur.join('');
      }
      for (k = 0; k < n; k++) { if (el < times[k] && !/\s/.test(chars[k])) { done = false; break; } }
      if (done || el > dur + 200) {
        while (node.firstChild) node.removeChild(node.firstChild);
        saved.forEach(function (k) { node.appendChild(k); });
        if (labelOk) node.removeAttribute('aria-label'); node.__scr = 0;
        return false;
      }
    });
  }
  function initScramble() {
    if (!('IntersectionObserver' in win)) return;
    scrIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        scrIO.unobserve(en.target);
        scramble(en.target);
      });
    }, { threshold: 0.5 });
  }
  function bindScramble(node) {
    if (!scrIO || bound.has(node) || reduced()) return;
    bound.add(node);
    scrIO.observe(node);
  }

  function scanAll() {
    /* read all computed positions first, then write: no interleaved style/layout flushes per card */
    var tn = qsa('[data-tilt]').filter(function (n) { return !bound.has(n); });
    var tp = tn.length && fine() && !reduced() ? tn.map(function (n) { try { return win.getComputedStyle(n).position === 'static'; } catch (e) { return false; } }) : [];
    tn.forEach(function (n, i) { safe('tilt', function () { bindTilt(n, tp[i]); }); });
    qsa('[data-magnetic]').forEach(function (n) { safe('magnet', function () { bindMagnet(n); }); });
    qsa('[data-scramble]').forEach(function (n) { safe('scramble', function () { bindScramble(n); }); });
  }
  function watchDom() {
    if (!('MutationObserver' in win) || !doc.body) return;
    var SEL = '[data-tilt],[data-magnetic],[data-scramble]', queued = false;
    var mo = new MutationObserver(function (muts) {
      var hit = false;
      for (var i = 0; i < muts.length && !hit; i++) {
        var tgt = muts[i].target;
        if (tgt && tgt.closest && tgt.closest('.fx-dialog, .fx-accent')) continue;
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) {
          var nn = add[j];
          if (nn.nodeType !== 1 || (nn.classList && (nn.classList.contains('fx-dialog') || nn.classList.contains('fx-glare')))) continue;
          if ((nn.matches && nn.matches(SEL)) || (nn.querySelector && nn.querySelector(SEL))) { hit = true; break; }
        }
      }
      if (hit && !queued) { queued = true; requestAnimationFrame(function () { queued = false; scanAll(); }); }
    });
    mo.observe(doc.body, { childList: true, subtree: true });
  }

  /* ================================================================== shared dialog plumbing */
  function showDialog(d) {
    if (d.open) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function hideDialog(d) {
    try { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } catch (e) { d.removeAttribute('open'); }
  }
  function outsideClose(d, boxSel, closeFn) {
    var down = false;
    d.addEventListener('pointerdown', function (e) { down = !e.target.closest(boxSel); });
    d.addEventListener('click', function (e) { if (down && !e.target.closest(boxSel)) closeFn(); down = false; });
  }

  /* ================================================================== 5  COMMAND PALETTE */
  var pal = { built: false, open: false, dlg: null, input: null, list: null, empty: null, live: null, items: [], all: [], idx: -1, ret: null, timer: 0, q: '' };

  var SEC_ICON = { home: 'sparkles', about: 'users', build: 'layers', stack: 'cpu', work: 'folder', journey: 'trending-up', contact: 'mail' };
  var GROUP_ICON = { llm: 'brain-circuit', vision: 'scan-eye', 'speech-ml': 'audio-lines', backend: 'server', automation: 'bot', 'web-tools': 'globe' };

  function sectionItems() {
    var out = [];
    qsa('section[id][data-rail]').forEach(function (s) {
      var id = s.id, rail = s.getAttribute('data-rail') || id;
      var m = /^(\d+)\s*\S\s*(.+)$/.exec(rail);
      var link = qs('.nav__link[href="#' + id + '"]');
      var label = (link && link.textContent.trim()) || (m ? cap(m[2]) : cap(id));
      var hd = qs('h1, h2', s);
      out.push({
        type: 'section', id: 'sec-' + id, label: label, hint: hd ? trunc(hd.textContent, 64) : 'Go to section', kw: id + ' ' + (m ? m[2] : '') + ' section go to jump',
        icon: SEC_ICON[id] || 'hash', meta: m ? m[1] : '', nav: true,
        run: function () { if (P.goto) P.goto(id); else { var el = doc.getElementById(id); if (el) el.scrollIntoView(); } }
      });
    });
    return out;
  }
  function projectItems() {
    var src = (P.projects && P.projects.length) ? P.projects : null, byId = {}, out = [];
    DATA.projects.forEach(function (p) { byId[p.id] = p; });
    var list = src ? src.map(function (p) { return { id: p.id, title: p.title, tone: p.tone, group: p.group, year: p.year, category: p.category }; })
      : DATA.projects.map(function (p) { return { id: p.id, title: p.t, tone: p.tone, group: p.g, year: p.y, category: p.cat }; });
    if (!src) {
      qsa('[data-project-id]').forEach(function (n) { /* DOM fallback, only if DATA lacks the id */
        var id = n.getAttribute('data-project-id'); if (id && !byId[id]) list.push({ id: id, title: (qs('h3', n) || n).textContent.trim(), tone: n.getAttribute('data-tone') || 'cyan', group: '', year: '', category: '' });
      });
    }
    list.forEach(function (p, i) {
      var d = byId[p.id] || {};
      out.push({
        type: 'project', id: 'prj-' + p.id, label: p.title, tone: p.tone, featured: i < 6,
        hint: [p.category || (DATA.filters.filter(function (f) { return f.id === p.group; })[0] || {}).label || '', p.year].filter(Boolean).join(' \u00b7 '),
        kw: [d.st ? d.st.join(' ') : '', d.b || '', p.group || '', p.category || '', 'project'].join(' '),
        icon: GROUP_ICON[p.group] || 'folder', meta: 'Project', nav: true,
        run: function () { openProject(p.id); }
      });
    });
    return out;
  }
  function openProject(id) {
    if (P.work && typeof P.work.open === 'function') P.work.open(id);
    else { emit('portfolio:open-project', { id: id, source: 'fx' }); if (P.goto) P.goto('work'); }
  }
  function copyText(txt) {
    function legacy() {
      var ok = false, ta = h('textarea', 'sr-only', null, { readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = txt; doc.body.appendChild(ta); ta.select();
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }
  function copyEmail() {
    return copyText(DATA.email).then(function (ok) {
      toast(ok ? 'Email copied: ' + DATA.email : 'Could not copy automatically. Email: ' + DATA.email, ok ? 'success' : 'error');
      return ok;
    });
  }
  function downloadResume() {
    var a = h('a', 'sr-only', 'Resume', { href: DATA.resume, download: 'Shaunak-Chorge-Resume.pdf', rel: 'noopener', 'aria-hidden': 'true', tabindex: '-1' });
    doc.body.appendChild(a); a.click(); a.remove();
    toast('Resume download started', 'success');
  }
  function openExternal(url) {
    /* always through an anchor click: window.open(..., 'noopener') returns null, which used to be read as "blocked" and opened a second tab */
    var a = h('a', 'sr-only', 'link', { href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-hidden': 'true', tabindex: '-1' });
    doc.body.appendChild(a); a.click(); a.remove();
  }
  function cycleAccent() {
    var cur = accentName(), i = ACCENTS.indexOf(cur), nx = ACCENTS[(i + 1) % ACCENTS.length];
    setAccent(nx); toast('Accent: ' + nx, 'info'); return nx;
  }
  /* "Pause effects" (WCAG 2.2.2): state + persistence live in core (Portfolio.motion), this is the UI entry point */
  function motionPaused() { return !!(P.motion && P.motion.paused()); }
  function toggleMotion() {
    if (!P.motion) return;
    var on = P.motion.toggle();
    toast(on ? 'Effects paused. Motion and the background network are off.' : 'Effects resumed.', 'info');
    return on;
  }
  function actionItems() {
    var cur = accentName();
    var A = [
      { id: 'act-terminal', label: 'Open terminal', hint: 'Mini shell: help, whoami, projects', kw: 'terminal shell console cli command line bash', icon: 'terminal', meta: 'Ctrl `', terminal: true, run: function () { /* handled in runItem */ } },
      { id: 'act-resume', label: 'Download resume', hint: 'PDF', kw: 'resume cv pdf download', icon: 'download', run: downloadResume },
      { id: 'act-email', label: 'Copy email address', hint: DATA.email, kw: 'copy email mail clipboard', icon: 'copy', run: copyEmail },
      { id: 'act-mail', label: 'Send an email', hint: DATA.email, kw: 'send email mail write contact hire', icon: 'mail', quiet: true, run: function () { win.location.href = 'mailto:' + DATA.email; } },
      { id: 'act-gh', label: 'Open GitHub', hint: 'github.com/ShaunakChorge', kw: 'github git code repos source', icon: 'github', run: function () { openExternal(DATA.gh); } },
      { id: 'act-li', label: 'Open LinkedIn', hint: 'linkedin.com/in/shaunak-chorge', kw: 'linkedin profile network', icon: 'linkedin', run: function () { openExternal(DATA.li); } },
      { id: 'act-ig', label: 'Open Instagram', hint: 'instagram.com/_shaunakkk', kw: 'instagram insta social', icon: 'instagram', run: function () { openExternal(DATA.ig); } },
      { id: 'act-accent', label: 'Switch accent colour', hint: 'Now: ' + cur + ' (cycles cyan, magenta, purple, green)', kw: 'accent colour color theme switch cycle neon', icon: 'wand-sparkles', run: cycleAccent },
      { id: 'act-motion', label: motionPaused() ? 'Resume effects' : 'Pause effects', hint: motionPaused() ? 'Turn the background and motion effects back on' : 'Stop the background network, typing and other motion', kw: 'pause resume stop effects animation motion reduce background canvas', icon: motionPaused() ? 'play' : 'pause', run: toggleMotion },
      { id: 'act-top', label: 'Scroll to top', hint: 'Back to the hero', kw: 'top scroll up start home', icon: 'arrow-up', nav: true, run: function () { if (P.goto) P.goto('top'); else win.scrollTo(0, 0); } }
    ];
    ACCENTS.forEach(function (nm) {
      if (nm === cur) return;
      A.push({ id: 'act-acc-' + nm, label: 'Accent: ' + cap(nm), hint: 'Switch the neon accent', kw: 'accent colour color theme ' + nm, icon: 'sparkles', quiet: true, dot: RGB[nm], run: function () { setAccent(nm); toast('Accent: ' + nm, 'info'); } });
    });
    DATA.filters.forEach(function (f) {
      if (f.id === 'all') return;
      A.push({ id: 'act-f-' + f.id, label: 'Filter work: ' + f.label, hint: 'Show only these projects', kw: 'filter projects work category ' + f.id, icon: 'folder', quiet: true, nav: true,
        run: function () { emit('portfolio:filter', { cat: f.id, source: 'fx' }); if (P.goto) P.goto('work'); } });
    });
    A.forEach(function (a) { a.type = 'action'; if (!a.meta && a.type === 'action') a.meta = 'Action'; });
    return A;
  }

  /* fuzzy matching: substring (word-start bonus) first, otherwise an ordered subsequence with a density limit */
  var WB = /[\s\-_\/.:\u00b7(+&]/;
  function fz(q, s, loose) {
    if (!q) return null;
    var i = s.indexOf(q);
    /* keyword / hint fields: tokens of 3 characters or less must start a word ("rag" must not match "t-e-l-e-g-r-a-m") */
    var strictShort = loose === false && q.length <= 3;
    if (strictShort) { while (i > 0 && !WB.test(s.charAt(i - 1))) i = s.indexOf(q, i + 1); }
    if (i >= 0) {
      var wb = i === 0 || WB.test(s.charAt(i - 1));
      return { s: 100 + (i === 0 ? 60 : 0) + (wb ? 40 : 0) - Math.min(i, 40) * 0.5 - (s.length - q.length) * 0.15, a: i, b: i + q.length };
    }
    if (q.length < 2 || strictShort) return null;
    var qi = 0, score = 0, prev = -2, idx = [], j;
    for (j = 0; j < s.length && qi < q.length; j++) {
      if (s.charAt(j) === q.charAt(qi)) {
        score += 6 + (j === prev + 1 ? 8 : 0) + ((j === 0 || WB.test(s.charAt(j - 1))) ? 8 : 0);
        idx.push(j); prev = j; qi++;
      }
    }
    if (qi < q.length) return null;
    var span = idx[idx.length - 1] - idx[0] + 1;
    if (span > (q.length <= 3 ? q.length + 2 : q.length * 2 + 2)) return null;   /* short tokens must stay tight */
    return { s: score - span * 0.3, idx: idx };
  }
  function search(q) {
    var toks = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
    pal.all.forEach(function (it, order) {
      var total = 0, ok = true, marks = [];
      for (var i = 0; i < toks.length; i++) {
        var r = fz(toks[i], it.ll), best = -1;
        if (r) { best = r.s; if (r.idx) marks = marks.concat(r.idx); else for (var m = r.a; m < r.b; m++) marks.push(m); }
        var r2 = fz(toks[i], it.kl, false); if (r2 && r2.s * 0.55 > best) best = r2.s * 0.55;
        var r3 = fz(toks[i], it.hl, false); if (r3 && r3.s * 0.45 > best) best = r3.s * 0.45;
        if (best < 0) { ok = false; break; }
        total += best;
      }
      if (ok) out.push({ it: it, score: total - order * 0.001, marks: marks });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 24);
  }
  function buildAll() {
    var all = sectionItems().concat(actionItems(), projectItems());
    all.forEach(function (it) { it.ll = it.label.toLowerCase(); it.kl = (it.kw || '').toLowerCase(); it.hl = (it.hint || '').toLowerCase(); });
    pal.all = all;
  }
  function labelNodes(text, marks) {
    if (!marks || !marks.length) return text;
    var set = {}; marks.forEach(function (i) { set[i] = 1; });
    var out = [], run = '', inMark = false;
    function flush() { if (!run) return; out.push(inMark ? h('mark', 'fx-mark', run) : run); run = ''; }
    for (var i = 0; i < text.length; i++) {
      var mk = !!set[i];
      if (mk !== inMark) { flush(); inMark = mk; }
      run += text.charAt(i);
    }
    flush();
    return out;
  }
  function optNode(it, idx, marks) {
    var o = h('div', 'fx-opt', null, { role: 'option', id: 'fx-opt-' + idx, 'aria-selected': 'false' });
    if (it.tone) o.setAttribute('data-tone', it.tone);
    o.setAttribute('data-i', String(idx));
    var ico = h('span', 'fx-opt__ico', null, { 'aria-hidden': 'true' });
    if (it.dot) { var dot = h('i', 'fx-opt__dot'); dot.style.setProperty('--sw', it.dot.join(' ')); ico.appendChild(dot); } else ico.appendChild(icon(it.icon || 'hash'));
    var txt = h('span', 'fx-opt__txt', [h('span', 'fx-opt__label', labelNodes(it.label, marks)), it.hint ? h('span', 'fx-opt__hint', it.hint) : null]);
    var meta = h('span', 'fx-opt__meta', null, { 'aria-hidden': 'true' });
    if (it.meta) { meta.appendChild(it.meta === '`' ? kbd('`') : h('span', 'fx-opt__tag', it.meta)); }
    meta.appendChild(icon('arrow-right', 'icon--sm fx-opt__go'));
    o.appendChild(ico); o.appendChild(txt); o.appendChild(meta);
    return o;
  }
  function render() {
    var q = pal.input.value.trim(), list = pal.list, rows = [];
    list.textContent = '';
    pal.q = q;
    if (q) {
      rows = search(q);
      rows.forEach(function (r, i) { list.appendChild(optNode(r.it, i, r.marks)); });
      pal.items = rows.map(function (r) { return r.it; });
    } else {
      var groups = [
        ['Jump to', pal.all.filter(function (x) { return x.type === 'section'; })],
        ['Quick actions', pal.all.filter(function (x) { return x.type === 'action' && !x.quiet; })],
        ['Featured projects', pal.all.filter(function (x) { return x.type === 'project' && x.featured; })]
      ];
      var i = 0, flat = [];
      groups.forEach(function (g, gi) {
        if (!g[1].length) return;
        var gid = 'fx-gh-' + gi, grp = h('div', 'fx-pal__group', null, { role: 'group', 'aria-labelledby': gid });
        grp.appendChild(h('div', 'fx-pal__gh', g[0], { id: gid }));
        g[1].forEach(function (it) { grp.appendChild(optNode(it, i, null)); flat.push(it); i++; });
        list.appendChild(grp);
      });
      pal.items = flat;
    }
    pal.idx = -1;
    setActive(pal.items.length ? 0 : -1, false);
    var none = !pal.items.length;
    pal.empty.textContent = '';
    if (none) pal.empty.appendChild(h('p', null, ['No matches for “' + trunc(q, 40) + '”. Try ', h('em', null, 'rag'), ', ', h('em', null, 'vision'), ' or ', h('em', null, 'terminal'), '.']));
    pal.empty.hidden = !none; list.hidden = none;
    pal.input.setAttribute('aria-expanded', none ? 'false' : 'true');
    pal.live.textContent = pal.items.length ? pal.items.length + (pal.items.length === 1 ? ' result' : ' results') + (q ? '' : '. Type to search.') : 'No results';
    list.scrollTop = 0;
  }
  function setActive(i, scroll) {
    var n = pal.items.length;
    if (i >= n) i = n ? 0 : -1;
    if (i < -1) i = n - 1;
    var prev = pal.idx >= 0 ? qs('#fx-opt-' + pal.idx, pal.list) : null;
    if (prev) prev.setAttribute('aria-selected', 'false');
    pal.idx = i;
    var cur = i >= 0 ? qs('#fx-opt-' + i, pal.list) : null;
    if (cur) {
      cur.setAttribute('aria-selected', 'true');
      pal.input.setAttribute('aria-activedescendant', cur.id);
      if (scroll) { try { cur.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } }
    } else pal.input.removeAttribute('aria-activedescendant');
  }
  function buildPalette() {
    if (pal.built) return;
    pal.built = true;
    var dlg = h('dialog', 'fx-dialog fx-pal', null, { 'aria-label': 'Command palette' });
    var input = h('input', 'fx-pal__input', null, {
      type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'fx-pal-list', 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox',
      'aria-label': 'Search sections, projects and actions', placeholder: small() ? 'Search or jump to\u2026' : 'Search sections, projects, actions\u2026', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go'
    });
    var closeBtn = h('button', 'fx-pal__x', [h('span', 'fx-pal__esc', 'Esc'), icon('x')], { type: 'button', 'aria-label': 'Close command palette' });
    var top = h('div', 'fx-pal__top', [icon('search'), input, closeBtn]);
    var list = h('div', 'fx-pal__list', null, { role: 'listbox', id: 'fx-pal-list', 'aria-label': 'Results' });
    var live = h('p', 'sr-only', null, { role: 'status', 'aria-live': 'polite' });
    var empty = h('div', 'fx-pal__empty'); empty.hidden = true;
    var foot = h('div', 'fx-pal__foot', [
      h('span', null, [kbd('\u2191'), kbd('\u2193'), 'navigate']), h('span', null, [kbd('\u21b5'), 'select']), h('span', null, [kbd('Esc'), 'close']), h('span', null, [kbd('`'), 'terminal'])
    ], { 'aria-hidden': 'true' });
    var box = h('div', 'fx-pal__box', [top, list, empty, foot, live]);
    dlg.appendChild(h('div', 'fx-dialog__wrap', box));
    doc.body.appendChild(dlg);
    pal.dlg = dlg; pal.input = input; pal.list = list; pal.live = live; pal.empty = empty;

    input.addEventListener('input', render);
    closeBtn.addEventListener('click', function () { closePalette(); });
    list.addEventListener('pointermove', function (e) {
      var o = e.target.closest('.fx-opt'); if (!o) return;
      var i = +o.getAttribute('data-i'); if (i !== pal.idx) setActive(i, false);
    });
    list.addEventListener('click', function (e) {
      var o = e.target.closest('.fx-opt'); if (!o) return;
      runItem(pal.items[+o.getAttribute('data-i')]);
    });
    dlg.addEventListener('keydown', function (e) {
      var k = e.key, n = pal.items.length;
      if (k === 'ArrowDown') { e.preventDefault(); if (n) setActive(pal.idx + 1 >= n ? 0 : pal.idx + 1, true); }
      else if (k === 'ArrowUp') { e.preventDefault(); if (n) setActive(pal.idx - 1 < 0 ? n - 1 : pal.idx - 1, true); }
      else if (k === 'PageDown') { e.preventDefault(); if (n) setActive(Math.min(n - 1, pal.idx + 6), true); }
      else if (k === 'PageUp') { e.preventDefault(); if (n) setActive(Math.max(0, pal.idx - 6), true); }
      else if (k === 'Home' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (n) setActive(0, true); }
      else if (k === 'End' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (n) setActive(n - 1, true); }
      else if (k === 'Enter') { e.preventDefault(); if (pal.idx >= 0) runItem(pal.items[pal.idx]); }
      else if (k === 'Tab') trapTab(e, dlg);
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closePalette(); });
    dlg.addEventListener('close', function () { if (pal.open) { pal.open = false; lock(false, 'fx-palette'); emit('portfolio:palette', { open: false }); } });
    outsideClose(dlg, '.fx-pal__box', function () { closePalette(); });
  }
  function openPalette(source) {
    buildPalette();
    if (pal.open) { pal.input.focus(); return; }
    pal.ret = term.open ? term.ret : activeEl();
    if (term.open) closeTerminal({ instant: true, restore: false });
    clearTimeout(pal.timer);
    pal.dlg.classList.remove('is-closing');
    buildAll();
    pal.input.value = '';
    render();
    pal.open = true;
    try { showDialog(pal.dlg); } catch (e) { pal.dlg.setAttribute('open', ''); }
    lock(true, 'fx-palette');
    pal.input.setAttribute('aria-expanded', 'true');
    pal.input.focus({ preventScroll: true });
    emit('portfolio:palette', { open: true, source: source || 'api' });
  }
  function closePalette(o) {
    o = o || {};
    if (!pal.open) return;
    pal.open = false;
    function done() {
      hideDialog(pal.dlg); pal.dlg.classList.remove('is-closing');
      pal.list.textContent = '';
      lock(false, 'fx-palette');
      if (o.restore !== false) restoreFocus(pal.ret);
      emit('portfolio:palette', { open: false });
    }
    if (o.instant || reduced()) done();
    else { pal.dlg.classList.add('is-closing'); pal.timer = setTimeout(done, 140); }
  }
  function runItem(it) {
    if (!it) return;
    var ret = pal.ret;
    closePalette({ instant: true, restore: !it.nav && !it.terminal });
    setTimeout(function () {
      try {
        if (it.terminal) openTerminal({ ret: ret });
        else it.run();
      } catch (e) { if (win.console) console.warn('[fx] action failed:', e && e.message); }
    }, 0);
  }

  /* ================================================================== 6  MINI TERMINAL */
  var term = { built: false, open: false, dlg: null, box: null, body: null, out: null, input: null, ret: null, hist: [], hi: 0, draft: '', started: false, mx: null, timers: [], timer: 0 };
  var SEC_ALIAS = { home: 'home', intro: 'home', about: 'about', build: 'build', services: 'build', stack: 'stack', skills: 'stack', work: 'work', projects: 'work', journey: 'journey', experience: 'journey', contact: 'contact' };

  function termSections() { return qsa('section[id][data-rail]').map(function (s) { return s.id; }); }
  function tone(c) { return 'fx-c-' + c; }
  function toneOf(t) { return { cyan: 'cyan', magenta: 'mag', purple: 'pur', blue: 'blu' }[t] || 'acc'; }
  function ps() { return [{ t: 'shaunak@portfolio', c: tone('grn') }, { t: ':', c: tone('dim') }, { t: '~', c: tone('cyan') }, { t: '$ ', c: tone('dim') }]; }
  function piece(p) {
    if (p === null || p === undefined) return doc.createTextNode('');
    if (typeof p === 'string') return doc.createTextNode(p);
    if (Array.isArray(p)) { var fr = doc.createDocumentFragment(); p.forEach(function (x) { fr.appendChild(piece(x)); }); return fr; }
    var n;
    if (p.href) {
      n = h('a', 'fx-t-link'); n.href = p.href;
      if (p.ext !== false && /^https?:/.test(p.href)) { n.target = '_blank'; n.rel = 'noopener noreferrer'; }
    } else if (p.cmd) {
      n = h('button', 'fx-t-cmd'); n.type = 'button'; n.tabIndex = -1; n.setAttribute('data-cmd', p.cmd);
    } else n = h('span');
    if (p.c) n.className += (n.className ? ' ' : '') + p.c;
    n.appendChild(doc.createTextNode(p.t));
    return n;
  }
  function row(parts, cls) {
    var r = h('div', 'fx-term__row' + (cls ? ' ' + cls : ''));
    (Array.isArray(parts) ? parts : [parts]).forEach(function (p) { r.appendChild(piece(p)); });
    term.out.appendChild(r);
    while (term.out.childNodes.length > 600) term.out.removeChild(term.out.firstChild);
    term.body.scrollTop = term.body.scrollHeight;
    return r;
  }
  function blank() { return row('', 'fx-term__gap'); }
  function say(text, c) { return row(c ? { t: text, c: c } : text); }
  function err(text) { return row({ t: text, c: tone('red') }); }
  function cell(x) { if (!Array.isArray(x)) return piece(x); var c = h('span'); c.appendChild(piece(x)); return c; }   /* an array is ONE grid cell */
  function kv(a, b, cls) {
    var r = h('div', 'fx-term__row ' + (cls || 'fx-term__kv'));
    r.appendChild(cell(a)); r.appendChild(cell(b));
    term.out.appendChild(r); term.body.scrollTop = term.body.scrollHeight; return r;
  }
  function later(fn, ms) { var id = setTimeout(fn, ms); term.timers.push(id); return id; }
  function clearTimers() { term.timers.forEach(clearTimeout); term.timers = []; }

  function findProject(arg) {
    if (!arg) return null;
    var a = String(arg).toLowerCase(), n = parseInt(a, 10), L = DATA.projects;
    if (String(n) === a && n >= 1 && n <= L.length) return L[n - 1];
    var hit = L.filter(function (p) { return p.id === a; })[0] || L.filter(function (p) { return p.id.indexOf(a) === 0; })[0] || L.filter(function (p) { return p.t.toLowerCase().indexOf(a) >= 0; })[0];
    return hit || null;
  }
  function filterLabel(g) { var f = DATA.filters.filter(function (x) { return x.id === g; })[0]; return f ? f.label : g; }
  function goSection(arg, c) {
    var id = SEC_ALIAS[String(arg || '').toLowerCase().replace(/\/$/, '')] || String(arg || '').toLowerCase();
    if (!doc.getElementById(id) || termSections().indexOf(id) < 0) { err('goto: no such section: ' + arg + '. Try: ' + termSections().join(', ')); return; }
    row([{ t: '-> ', c: tone('dim') }, 'scrolling to ', { t: id, c: tone('acc') }]);
    closeTerminal({ instant: false, restore: false });
    setTimeout(function () { if (P.goto) P.goto(id); }, 60);
  }

  var LOGO = [' ____    ____ ', '/ ___|  / ___|', '\\___ \\ | |    ', ' ___) || |___ ', '|____/  \\____|'];
  var CMDS = {
    help: {
      d: 'list commands', run: function () {
        say('Commands (click one, or type and press Enter). Tab completes, Up/Down recall history.', tone('dim'));
        Object.keys(CMDS).forEach(function (k) { if (!CMDS[k].hide) kv({ t: k, cmd: k, c: tone('acc') }, { t: CMDS[k].d, c: tone('dim') }); });
        say('Also try: neofetch, matrix, sudo hire-me', tone('dim'));
      }
    },
    whoami: {
      d: 'who is behind this site', run: function () {
        row([{ t: DATA.name, c: tone('w') + ' fx-t-b' }, '  |  ', { t: DATA.role, c: tone('acc') }]);
        say(DATA.degree + ', ' + DATA.cgpa + ' (' + DATA.period + ')');
        say(DATA.loc + '  |  ' + DATA.status);
        say(DATA.tagline, tone('dim'));
      }
    },
    about: {
      d: 'short bio', run: function () { DATA.bio.forEach(function (p, i) { if (i) blank(); say(p); }); }
    },
    skills: {
      d: 'tools I use, by tier', run: function () {
        ['daily', 'shipped', 'learning'].forEach(function (k, i) {
          var lab = DATA.skills.labels[k]; if (i) blank();
          row([{ t: lab.title, c: tone('acc') + ' fx-t-b' }, { t: '  ' + lab.caption, c: tone('dim') }]);
          var r = h('div', 'fx-term__row fx-term__tags');
          DATA.skills[k].forEach(function (s) { r.appendChild(h('span', 'fx-t-tag ' + (k === 'daily' ? 'is-hot' : ''), s)); });
          term.out.appendChild(r);
        });
        term.body.scrollTop = term.body.scrollHeight;
      }
    },
    projects: {
      d: 'list projects (projects <n> for detail)', complete: function (cur) { return DATA.projects.map(function (p) { return p.id; }); },
      run: function (a) {
        if (a[0]) {
          var p = findProject(a[0]);
          if (!p) { err('projects: no project matches "' + a[0] + '"'); return; }
          row([{ t: p.t, c: tone('w') + ' fx-t-b' }, { t: '  ' + p.y + '  ', c: tone('dim') }, { t: '[' + (p.cat || filterLabel(p.g)) + ']', c: tone(toneOf(p.tone)) }]);
          if (p.w) say('With ' + p.w, tone('acc'));
          say(p.d);
          kv({ t: 'stack', c: tone('dim') }, p.st.join(', '));
          kv({ t: 'status', c: tone('dim') }, p.status);
          if (p.repo) kv({ t: 'repo', c: tone('dim') }, [{ t: p.repo.replace(/^https?:\/\//, ''), href: p.repo, c: tone('acc') }, p.by ? { t: '  (repo owned by ' + p.by + ')', c: tone('dim') } : '']);
          if (p.live) kv({ t: 'live', c: tone('dim') }, { t: p.live.replace(/^https?:\/\//, ''), href: p.live, c: tone('acc') });
          row([{ t: '-> ', c: tone('dim') }, { t: 'open ' + p.id, cmd: 'open ' + p.id, c: tone('acc') }, { t: '  opens the case study', c: tone('dim') }]);
          return;
        }
        say(DATA.projects.length + ' projects. Click one or type: projects <number | id>', tone('dim'));
        DATA.projects.forEach(function (p, i) {
          var r = h('div', 'fx-term__row fx-term__prj');
          r.appendChild(h('span', tone('dim'), String(i + 1).padStart(2, '0')));
          r.appendChild(h('span', tone('dim'), p.y));
          r.appendChild(piece({ t: p.t, cmd: 'projects ' + (i + 1), c: tone(toneOf(p.tone)) }));
          r.appendChild(h('span', tone('dim') + ' fx-term__area', p.cat || filterLabel(p.g)));
          term.out.appendChild(r);
        });
        term.body.scrollTop = term.body.scrollHeight;
      }
    },
    open: {
      d: 'open a project case study (open <n | id>)', complete: function () { return DATA.projects.map(function (p) { return p.id; }); },
      run: function (a) {
        var p = findProject(a[0]);
        if (!a[0]) { err('usage: open <number | id>   (see: projects)'); return; }
        if (!p) { err('open: no project matches "' + a[0] + '"'); return; }
        row([{ t: '-> ', c: tone('dim') }, 'opening ', { t: p.t, c: tone('acc') }]);
        closeTerminal({ restore: false });
        setTimeout(function () { openProject(p.id); }, 80);
      }
    },
    experience: {
      d: 'internships and work', run: function () {
        var nWork = DATA.exp.filter(function (e) { return e.g === 'work'; }).length, nProg = DATA.exp.length - nWork;
        say('INTERNSHIPS', tone('acc') + ' fx-t-b');
        DATA.exp.filter(function (e) { return e.g === 'work'; }).forEach(function (e) {
          kv([{ t: e.r, c: tone('w') + ' fx-t-b' }, ' - ' + e.o], { t: e.p, c: tone('dim') }, 'fx-term__tp');
          e.b.forEach(function (b) { row([{ t: '  - ', c: tone('dim') }, b], 'fx-term__li'); });
        });
        blank(); say('PROGRAMMES & SHORT STINTS', tone('acc') + ' fx-t-b');
        DATA.exp.filter(function (e) { return e.g !== 'work'; }).forEach(function (e) { kv([e.r + ' - ' + e.o], { t: e.p, c: tone('dim') }, 'fx-term__tp'); });
        blank(); say(nWork + ' internships + ' + nProg + ' programmes', tone('dim'));
      }
    },
    education: {
      d: 'degree, certifications', run: function () {
        DATA.edu.forEach(function (e) { kv([{ t: e.d, c: tone('w') + ' fx-t-b' }, ' - ' + e.i], { t: e.p + (e.g ? '  |  ' + e.g : ''), c: tone('dim') }, 'fx-term__tp'); });
        blank(); say('CERTIFICATIONS', tone('acc') + ' fx-t-b');
        DATA.certs.forEach(function (c) { kv([c.n], { t: c.i + (c.y ? ' ' + c.y : ''), c: tone('dim') }, 'fx-term__tp'); });
      }
    },
    awards: {
      d: 'contests and hackathons', run: function () { DATA.awards.forEach(function (a) { kv([a.t], { t: String(a.y), c: tone('dim') }, 'fx-term__tp'); }); }
    },
    contact: {
      d: 'how to reach me', run: function () {
        kv({ t: 'email', c: tone('dim') }, [{ t: DATA.email, href: 'mailto:' + DATA.email, c: tone('acc') }, '  ', { t: '[copy]', cmd: 'copy', c: tone('dim') }]);
        kv({ t: 'github', c: tone('dim') }, { t: DATA.gh.replace(/^https?:\/\//, ''), href: DATA.gh, c: tone('acc') });
        kv({ t: 'linkedin', c: tone('dim') }, { t: DATA.li.replace(/^https?:\/\/(www\.)?/, ''), href: DATA.li, c: tone('acc') });
        kv({ t: 'instagram', c: tone('dim') }, { t: DATA.ig.replace(/^https?:\/\/(www\.)?/, ''), href: DATA.ig, c: tone('acc') });
        kv({ t: 'location', c: tone('dim') }, DATA.loc);
        row([{ t: '-> ', c: tone('dim') }, { t: 'goto contact', cmd: 'goto contact', c: tone('acc') }, { t: '  jumps to the contact form', c: tone('dim') }]);
      }
    },
    resume: { d: 'download my resume (PDF)', run: function () { row([{ t: '-> ', c: tone('dim') }, 'downloading ', { t: 'Shaunak-Chorge-Resume.pdf', c: tone('acc') }]); downloadResume(); } },
    github: { d: 'open GitHub', run: function () { row([{ t: '-> ', c: tone('dim') }, { t: DATA.gh, href: DATA.gh, c: tone('acc') }]); openExternal(DATA.gh); } },
    linkedin: { d: 'open LinkedIn', run: function () { row([{ t: '-> ', c: tone('dim') }, { t: DATA.li, href: DATA.li, c: tone('acc') }]); openExternal(DATA.li); } },
    instagram: { d: 'open Instagram', run: function () { row([{ t: '-> ', c: tone('dim') }, { t: DATA.ig, href: DATA.ig, c: tone('acc') }]); openExternal(DATA.ig); } },
    copy: { d: 'copy my email address', hide: true, run: function () { copyEmail().then(function (ok) { say(ok ? 'copied ' + DATA.email : 'copy failed, select it by hand: ' + DATA.email, ok ? tone('grn') : tone('red')); }); } },
    theme: {
      d: 'theme <cyan|magenta|purple|green>', complete: function () { return ACCENTS; },
      run: function (a) {
        var cur = accentName();
        if (!a[0]) { row(['accent: ', { t: cur, c: tone('acc') }, { t: '   options: ' + ACCENTS.join(', '), c: tone('dim') }]); return; }
        var n = a[0].toLowerCase();
        if (ACCENTS.indexOf(n) < 0) { err('theme: unknown colour "' + a[0] + '". Options: ' + ACCENTS.join(', ')); return; }
        setAccent(n); row([{ t: '-> ', c: tone('dim') }, 'accent set to ', { t: n, c: tone('acc') }]);
      }
    },
    goto: {
      d: 'jump to a section (goto <name>)', complete: function () { return termSections(); },
      run: function (a) { if (!a[0]) { row(['sections: ', { t: termSections().join('  '), c: tone('acc') }]); return; } goSection(a[0]); }
    },
    ls: {
      d: 'list sections', run: function () {
        var r = h('div', 'fx-term__row fx-term__ls');
        termSections().forEach(function (id) { r.appendChild(piece({ t: id + '/', cmd: 'goto ' + id, c: tone('cyan') })); });
        term.out.appendChild(r); term.body.scrollTop = term.body.scrollHeight;
      }
    },
    neofetch: {
      d: 'system info, portfolio edition', run: function () {
        var r = h('div', 'fx-term__row fx-term__nf');
        var logo = h('pre', 'fx-term__logo', null, { 'aria-hidden': 'true' });
        LOGO.forEach(function (l, i) {
          var s = l.slice(0, 7), c = l.slice(7);
          logo.appendChild(h('span', tone('cyan'), s)); logo.appendChild(h('span', tone('mag'), c)); logo.appendChild(doc.createTextNode('\n'));
        });
        var info = h('div', 'fx-term__nfi');
        info.appendChild(h('div', null, [h('span', tone('grn') + ' fx-t-b', 'shaunak'), '@', h('span', tone('cyan') + ' fx-t-b', 'portfolio')]));
        info.appendChild(h('div', tone('dim'), '------------------'));
        [['role', DATA.role], ['degree', DATA.degree.replace('B.Tech in ', 'B.Tech, ') + ', ' + DATA.cgpa], ['location', DATA.loc], ['stack', DATA.hero.stack.join(', ')], ['builds', DATA.hero.builds.join(', ')], ['status', DATA.status], ['accent', accentName()]].forEach(function (x) {
          info.appendChild(h('div', null, [h('span', tone('acc') + ' fx-t-b', x[0] + ' '.repeat(Math.max(1, 10 - x[0].length))), x[1]]));
        });
        r.appendChild(logo); r.appendChild(info); term.out.appendChild(r); term.body.scrollTop = term.body.scrollHeight;
      }
    },
    date: {
      d: 'local time in Pune', run: function () {
        var s; try { s = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' }).format(new Date()) + ' IST'; } catch (e) { s = new Date().toString(); }
        say(s);
      }
    },
    echo: { d: 'print text', hide: true, run: function (a, line) { say(line.replace(/^\s*echo\s?/i, '')); } },
    history: { d: 'show command history', run: function () { if (!term.hist.length) say('(empty)', tone('dim')); term.hist.forEach(function (c, i) { row([{ t: String(i + 1).padStart(3, ' ') + '  ', c: tone('dim') }, c]); }); } },
    clear: { d: 'clear the screen (Ctrl+L)', run: function () { clearTimers(); term.out.textContent = ''; } },
    exit: { d: 'close the terminal (Esc)', run: function () { closeTerminal(); } },
    matrix: { d: 'follow the white rabbit', run: function () { matrixToggle(); } },
    sudo: {
      d: 'sudo hire-me', hide: true, complete: function () { return ['hire-me']; },
      run: function (a) {
        var what = a.join(' ').toLowerCase().replace(/\s+/g, '-');
        if (what !== 'hire-me') {
          if (!a.length) say('usage: sudo <command>   (hint: hire-me)', tone('dim'));
          else say('recruiter is not in the sudoers file. This incident will be reported.', tone('red'));
          return;
        }
        var steps = [
          function () { say('[sudo] password for recruiter: ********', tone('dim')); },
          function () { say('authenticating ........ ok', tone('dim')); },
          function () { row([{ t: 'ACCESS GRANTED', c: tone('grn') + ' fx-t-b' }]); },
          function () { say(DATA.name + ' is ' + DATA.avail.charAt(0).toLowerCase() + DATA.avail.slice(1)); },
          function () { kv({ t: 'email', c: tone('dim') }, [{ t: DATA.email, href: 'mailto:' + DATA.email, c: tone('acc') }, '  ', { t: '[copy]', cmd: 'copy', c: tone('dim') }]); },
          function () { row([{ t: '-> ', c: tone('dim') }, { t: 'goto contact', cmd: 'goto contact', c: tone('acc') }, { t: '  or use the form', c: tone('dim') }]); }
        ];
        steps.forEach(function (fn, i) { if (reduced()) fn(); else later(fn, i * 380); });
      }
    },
    rm: { d: '', hide: true, run: function () { say('rm: permission denied. Nice try.', tone('red')); } },
    hello: { d: '', hide: true, run: function () { say('Hello, visitor. Type help.', tone('acc')); } }
  };
  CMDS = Object.assign(Object.create(null), CMDS);   /* no prototype: "constructor" / "__proto__" are not commands */
  CMDS.cd = { d: '', hide: true, complete: CMDS.goto.complete, run: CMDS.goto.run };
  CMDS.quit = { d: '', hide: true, run: CMDS.exit.run };
  CMDS.hi = CMDS.hello;
  CMDS.cls = { d: '', hide: true, run: CMDS.clear.run };

  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return d[m][n];
  }
  function tokenize(s) {
    var out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g, m;
    while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
    return out;
  }
  function exec(line) {
    line = String(line || '').trim();
    buildTerm();
    row(ps().concat([{ t: line, c: tone('w') }]), 'fx-term__echo');
    if (!line) return;
    if (term.hist[term.hist.length - 1] !== line) term.hist.push(line);
    if (term.hist.length > 80) term.hist.shift();
    term.hi = term.hist.length;
    var args = tokenize(line), name = (args.shift() || '').toLowerCase(), cmd = CMDS[name];
    if (!cmd) {
      var best = null, bd = 3;
      Object.keys(CMDS).forEach(function (k) { if (CMDS[k].hide && k !== 'sudo') return; var d = lev(name, k); if (d < bd) { bd = d; best = k; } });
      var parts = [{ t: name + ': command not found.', c: tone('red') }];
      if (best) parts.push(' Did you mean ', { t: best, cmd: best, c: tone('acc') }, '?'); else parts.push(' Try ', { t: 'help', cmd: 'help', c: tone('acc') }, '.');
      row(parts);
      return;
    }
    try { cmd.run(args, line); } catch (e) { err(name + ': ' + (e && e.message ? e.message : 'failed')); }
  }
  function welcome() {
    row([{ t: 'shaunak.sh', c: tone('acc') + ' fx-t-b' }, { t: ' - type help', c: tone('dim') }]);
    row([{ t: 'Type ', c: tone('dim') }, { t: 'help', cmd: 'help', c: tone('acc') }, { t: ' for commands, ', c: tone('dim') }, { t: 'whoami', cmd: 'whoami', c: tone('acc') }, { t: ' to get started. Tab completes, Esc exits.', c: tone('dim') }]);
    blank();
  }
  function complete() {
    var inp = term.input, v = inp.value, pos = inp.selectionStart == null ? v.length : inp.selectionStart, left = v.slice(0, pos), right = v.slice(pos);
    var m = /^(\s*)(\S*)$/.exec(left), cands, cur, prefix;
    if (m) {
      cur = m[2].toLowerCase();
      cands = Object.keys(CMDS).filter(function (k) { return !CMDS[k].hide || k === 'sudo' ? k.indexOf(cur) === 0 : false; });
      prefix = m[1];
    } else {
      var toks = left.split(/\s+/), name = toks[0].toLowerCase(); cur = (toks[toks.length - 1] || '').toLowerCase();
      var c = CMDS[name]; if (!c || !c.complete) return false;
      cands = c.complete(cur, toks).filter(function (x) { return x.toLowerCase().indexOf(cur) === 0; });
      prefix = left.slice(0, left.length - cur.length);
    }
    if (!cands.length) return false;
    var common = cands[0];
    cands.forEach(function (x) { while (x.toLowerCase().indexOf(common.toLowerCase()) !== 0) common = common.slice(0, -1); });
    if (cands.length === 1) { inp.value = prefix + cands[0] + ' ' + right.replace(/^\s+/, ''); }
    else if (common.length > cur.length) { inp.value = prefix + common + right; }
    else { row(ps().concat([{ t: left, c: tone('w') }]), 'fx-term__echo'); row({ t: cands.join('   '), c: tone('dim') }); }
    var p2 = inp.value.length - right.length; try { inp.setSelectionRange(p2, p2); } catch (e) { /* ignore */ }
    return true;
  }

  function matrixStop() {
    if (!term.mx) return;
    unraf(term.mx.job); clearTimeout(term.mx.timer);
    if (term.mx.cv.parentNode) term.mx.cv.parentNode.removeChild(term.mx.cv);
    term.mx = null;
  }
  function matrixToggle() {
    if (reduced()) { say('matrix: skipped because reduced motion is on.', tone('dim')); return; }
    if (term.mx) { matrixStop(); return; }
    var box = term.box, bw = box.clientWidth, bh = Math.max(40, box.clientHeight - 44), d = Math.min(win.devicePixelRatio || 1, 1.5);
    var cv = h('canvas', 'fx-term__matrix', null, { 'aria-hidden': 'true' }), ctx = cv.getContext('2d');
    if (!ctx) return;
    cv.width = Math.round(bw * d); cv.height = Math.round(bh * d); cv.style.setProperty('--mw', bw + 'px'); cv.style.setProperty('--mh', bh + 'px');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    box.appendChild(cv);
    var CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]=+*#', fs = 15, cols = Math.floor(bw / fs), drops = [], i, acc = 0, c = RGB[accentName()];
    for (i = 0; i < cols; i++) drops.push(Math.floor(Math.random() * -30));
    ctx.fillStyle = 'rgb(3,5,10)'; ctx.fillRect(0, 0, bw, bh);
    var job = function (ts, dt) {
      acc += dt; if (acc < 0.05) return; acc = 0;
      ctx.fillStyle = 'rgba(3,5,10,.14)'; ctx.fillRect(0, 0, bw, bh);
      ctx.font = fs + 'px "Space Mono", monospace';
      for (var k = 0; k < cols; k++) {
        var ch = CH.charAt((Math.random() * CH.length) | 0), y = drops[k] * fs;
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        if (y > 0) ctx.fillText(ch, k * fs, y);
        ctx.fillStyle = 'rgba(255,255,255,.9)'; if (y > 0 && Math.random() > 0.9) ctx.fillText(ch, k * fs, y);
        if (y > bh && Math.random() > 0.975) drops[k] = 0;
        drops[k]++;
      }
    };
    raf(job);
    term.mx = { cv: cv, job: job, armed: false, timer: setTimeout(function () { matrixStop(); if (term.open) say('matrix: signal lost. Back to the real world.', tone('dim')); }, 7000) };
    setTimeout(function () { if (term.mx) term.mx.armed = true; }, 0);   /* the Enter that started it must not stop it */
    say('matrix: running... press any key to wake up.', tone('dim'));
  }

  function buildTerm() {
    if (term.built) return;
    term.built = true;
    var dlg = h('dialog', 'fx-dialog fx-term', null, { 'aria-label': 'Terminal' });
    var closeBtn = h('button', 'fx-term__x', [icon('x')], { type: 'button', 'aria-label': 'Close terminal' });
    var bar = h('div', 'fx-term__bar', [
      h('span', 'fx-term__dots', [h('i'), h('i'), h('i')], { 'aria-hidden': 'true' }),
      h('span', 'fx-term__title', 'shaunak@portfolio: ~', { 'aria-hidden': 'true' }),
      h('span', 'fx-term__esc', [kbd('esc'), ' to close'], { 'aria-hidden': 'true' }), closeBtn
    ]);
    var out = h('div', 'fx-term__out', null, { role: 'log', 'aria-live': 'polite', 'aria-label': 'Terminal output' });
    var body = h('div', 'fx-term__body', out);
    var input = h('input', 'fx-term__in', null, {
      type: 'text', 'aria-label': 'Terminal command', 'aria-describedby': 'fx-term-hint', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'send'
    });
    var hint = h('p', 'sr-only', 'Type a command and press Enter. Tab completes, Up and Down recall history, Escape closes the terminal.', { id: 'fx-term-hint' });
    var quick = h('div', 'fx-term__quick');
    ['help', 'whoami', 'projects', 'skills', 'contact', 'theme', 'exit'].forEach(function (c) { quick.appendChild(h('button', 'fx-term__qb', c, { type: 'button', 'data-cmd': c })); });
    var prompt = h('div', 'fx-term__prompt', [h('span', 'fx-term__ps', [h('span', tone('grn'), 'shaunak@portfolio'), h('span', tone('dim'), ':'), h('span', tone('cyan'), '~'), h('span', tone('dim'), '$')], { 'aria-hidden': 'true' }), input]);
    var box = h('div', 'fx-term__box', [bar, body, quick, prompt, hint]);
    dlg.appendChild(h('div', 'fx-dialog__wrap', box));
    doc.body.appendChild(dlg);
    term.dlg = dlg; term.box = box; term.body = body; term.out = out; term.input = input;

    body.addEventListener('click', function (e) {
      var c = e.target.closest('.fx-t-cmd'); if (c) { exec(c.getAttribute('data-cmd')); input.focus({ preventScroll: true }); return; }
      if (e.target.closest('a')) return;
      var sel = win.getSelection && win.getSelection(); if (sel && String(sel).length) return;
      input.focus({ preventScroll: true });
    });
    quick.addEventListener('click', function (e) { var b = e.target.closest('.fx-term__qb'); if (b) { exec(b.getAttribute('data-cmd')); if (term.open) input.focus({ preventScroll: true }); } });
    closeBtn.addEventListener('click', function () { closeTerminal(); });
    input.addEventListener('keydown', function (e) {
      var k = e.key;
      if (e.isComposing) return;
      if (k === 'Enter') { e.preventDefault(); var v = input.value; input.value = ''; exec(v); }
      else if (k === 'Tab' && !e.shiftKey) {
        /* Tab completes only when there is something to complete; otherwise it moves on (close button), wrapping inside the dialog */
        if (input.value.trim() && complete()) e.preventDefault(); else trapTab(e, dlg);
      }
      else if (k === 'ArrowUp') {
        e.preventDefault();
        if (term.hi === term.hist.length) term.draft = input.value;
        if (term.hi > 0) term.hi--;
        input.value = term.hist[term.hi] || ''; setTimeout(function () { try { input.setSelectionRange(input.value.length, input.value.length); } catch (er) { /* ignore */ } }, 0);
      } else if (k === 'ArrowDown') {
        e.preventDefault();
        if (term.hi < term.hist.length) term.hi++;
        input.value = term.hi >= term.hist.length ? term.draft : term.hist[term.hi];
      } else if (e.ctrlKey && (k === 'l' || k === 'L')) { e.preventDefault(); CMDS.clear.run(); }
      else if (e.ctrlKey && (k === 'c' || k === 'C') && !(win.getSelection && String(win.getSelection()))) { e.preventDefault(); row(ps().concat([{ t: input.value + '^C', c: tone('w') }]), 'fx-term__echo'); input.value = ''; }
      else if (e.ctrlKey && (k === 'u' || k === 'U')) { e.preventDefault(); input.value = ''; }
    });
    dlg.addEventListener('keydown', function (e) {
      if (term.mx && term.mx.armed && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') { e.preventDefault(); e.stopPropagation(); matrixStop(); say('matrix: woke up.', tone('dim')); return; }
      if (e.key === 'Tab' && e.target !== input) trapTab(e, dlg);
      else if (e.key === 'Tab' && e.shiftKey) trapTab(e, dlg);
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); if (term.mx) { matrixStop(); return; } closeTerminal(); });
    dlg.addEventListener('close', function () { if (term.open) { term.open = false; lock(false, 'fx-terminal'); matrixStop(); emit('portfolio:terminal', { open: false }); } });
    outsideClose(dlg, '.fx-term__box', function () { closeTerminal(); });
  }
  function openTerminal(o) {
    o = o || {};
    buildTerm();
    if (term.open) { term.input.focus(); return; }
    if (pal.open) closePalette({ instant: true, restore: false });
    clearTimeout(term.timer);
    term.dlg.classList.remove('is-closing');
    term.ret = o.ret !== undefined ? o.ret : activeEl();
    term.open = true;
    try { showDialog(term.dlg); } catch (e) { term.dlg.setAttribute('open', ''); }
    lock(true, 'fx-terminal');
    if (!term.started) { term.started = true; welcome(); }
    term.body.scrollTop = term.body.scrollHeight;
    term.input.focus({ preventScroll: true });
    emit('portfolio:terminal', { open: true });
  }
  function closeTerminal(o) {
    o = o || {};
    if (!term.open) return;
    term.open = false;
    matrixStop(); clearTimers();
    function done() {
      hideDialog(term.dlg); term.dlg.classList.remove('is-closing');
      lock(false, 'fx-terminal');
      if (o.restore !== false) restoreFocus(term.ret);
      emit('portfolio:terminal', { open: false });
    }
    if (o.instant || reduced()) done();
    else { term.dlg.classList.add('is-closing'); term.timer = setTimeout(done, 140); }
  }

  /* ================================================================== 7  ACCENT SWITCHER */
  function initAccentWidget() {
    if (!P.accent || !doc.body) return;
    var aside = h('aside', 'fx-accent', null, { 'aria-label': 'Accent colour and effects' });
    var inner = h('div', 'fx-accent__in');
    var toggle = h('button', 'fx-accent__toggle', [h('span', 'fx-accent__ring', null, { 'aria-hidden': 'true' })], { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'fx-accent-list', title: 'Accent colour' });
    var list = h('div', 'fx-accent__list', null, { id: 'fx-accent-list' });
    var swatches = h('div', 'fx-accent__sws', null, { role: 'group', 'aria-label': 'Choose accent colour' });
    ACCENTS.forEach(function (nm) {
      var b = h('button', 'fx-accent__sw', [h('i', null, null, { 'aria-hidden': 'true' })], { type: 'button', 'data-accent-set': nm, 'aria-pressed': nm === accentName() ? 'true' : 'false', 'aria-label': cap(nm) });
      b.style.setProperty('--sw', RGB[nm].join(' '));
      swatches.appendChild(b);
    });
    /* WCAG 2.2.2: one visible control to pause all ambient motion (persisted by core as pf:motion) */
    var motionBtn = h('button', 'fx-accent__mo', [icon('pause')], { type: 'button', 'aria-pressed': motionPaused() ? 'true' : 'false', 'aria-label': 'Pause effects', title: 'Pause effects' });
    list.appendChild(swatches); list.appendChild(h('i', 'fx-accent__sep', null, { 'aria-hidden': 'true' })); list.appendChild(motionBtn);
    list.setAttribute('inert', '');
    inner.appendChild(toggle); inner.appendChild(list); aside.appendChild(inner);
    doc.body.appendChild(aside);

    var pickTimer = 0, openY = 0, picked = false;
    function label() { toggle.setAttribute('aria-label', 'Accent colour, now ' + accentName()); }   /* constant name: aria-expanded carries open / closed */
    function setOpen(v, focusToggle) {
      aside.classList.toggle('is-open', v);
      toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) { list.removeAttribute('inert'); openY = win.pageYOffset || 0; } else { list.setAttribute('inert', ''); clearTimeout(pickTimer); picked = false; }
      label();
      if (!v && focusToggle) toggle.focus({ preventScroll: true });
    }
    function armClose(ms) {
      clearTimeout(pickTimer);
      pickTimer = setTimeout(function () {
        if (!aside.classList.contains('is-open')) return;
        var inside = aside.contains(doc.activeElement), hovered = false;
        try { hovered = aside.matches(':hover'); } catch (e) { hovered = false; }
        if (!hovered) setOpen(false, inside);
      }, ms);
    }
    toggle.addEventListener('click', function () { setOpen(!aside.classList.contains('is-open')); });
    swatches.addEventListener('click', function (e) { if (e.target.closest('[data-accent-set]')) { picked = true; armClose(2500); } });
    motionBtn.addEventListener('click', function () { toggleMotion(); });
    aside.addEventListener('pointerenter', function () { clearTimeout(pickTimer); });
    aside.addEventListener('pointerleave', function () { if (picked && aside.classList.contains('is-open')) armClose(1500); });
    aside.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aside.classList.contains('is-open')) { e.stopPropagation(); setOpen(false, true); } });
    aside.addEventListener('focusout', function (e) { if (aside.classList.contains('is-open') && e.relatedTarget && !aside.contains(e.relatedTarget)) setOpen(false); });
    doc.addEventListener('pointerdown', function (e) { if (aside.classList.contains('is-open') && !aside.contains(e.target)) setOpen(false); });
    if (P.onScroll) P.onScroll(function (st) { if (aside.classList.contains('is-open') && Math.abs((st && st.y !== undefined ? st.y : win.pageYOffset) - openY) > 40) setOpen(false); });
    on('portfolio:accent', label);
    on('portfolio:motion', function () { motionBtn.setAttribute('aria-pressed', motionPaused() ? 'true' : 'false'); });
    label();
    P.accent(accentName(), { persist: false });   /* re-sync aria-pressed on the new swatches */
  }

  /* ================================================================== 9  CONSOLE BANNER */
  function banner() {
    if (!win.console || !console.log || win.__pfBanner) return;
    win.__pfBanner = true;
    var art = [' ____    ____ ', '/ ___|  / ___|', '\\___ \\ | |    ', ' ___) || |___ ', '|____/  \\____|'].join('\n');
    var base = 'font:12px/1.6 ui-monospace,Menlo,Consolas,monospace;';
    try {
      console.log('%c' + art, 'color:#00ffff;font:700 13px/1.15 ui-monospace,Menlo,Consolas,monospace;text-shadow:0 0 8px #00ffff;');
      console.log('%c Hello, fellow developer. %c You opened the console, so we will probably get along.', 'background:#00ffff;color:#000;font-weight:700;padding:2px 6px;border-radius:3px;' + base, 'color:#c8d3e0;' + base);
      console.log('%cI build LLM apps, vision and speech models and the Python backends around them. ' + DATA.status + ' - if you are hiring, say hi.', 'color:#ff2d86;' + base);
      console.log('%cGitHub  %c' + DATA.gh + '\n%cEmail   %c' + DATA.email, 'color:#8b95aa;' + base, 'color:#00ffff;' + base, 'color:#8b95aa;' + base, 'color:#00ffff;' + base);
      console.log('%cTip: Ctrl+K opens the command palette, Ctrl+` opens a terminal, and there is a Konami code.', 'color:#8b95aa;font-style:italic;' + base);
    } catch (e) { /* ignore */ }
  }

  /* ================================================================== 10  KONAMI -> OVERDRIVE */
  var odTimer = 0, flashEl = null;
  function overdrive() {
    emit('portfolio:overdrive', {});
    if (net) net.boost(6000);
    if (reduced()) { toast('Overdrive engaged. (Motion is reduced, so the network only glows brighter.)', 'success'); return; }
    root.classList.add('fx-overdrive');
    if (!flashEl) { flashEl = h('div', 'fx-flash', null, { 'aria-hidden': 'true' }); doc.body.appendChild(flashEl); }
    flashEl.classList.remove('is-on'); void flashEl.offsetWidth; flashEl.classList.add('is-on');
    clearTimeout(odTimer);
    odTimer = setTimeout(function () { root.classList.remove('fx-overdrive'); if (flashEl) flashEl.classList.remove('is-on'); }, 6000);
    toast('Overdrive engaged. The network is awake.', 'success');
  }
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'], kpos = 0, kY = 0;

  /* ================================================================== global keys */
  function isOpenModal() { return !!(qs('dialog[open]') || pal.open || term.open || (P.menu && P.menu.isOpen && P.menu.isOpen())); }
  function initKeys() {
    doc.addEventListener('keydown', function (e) {
      if (e.defaultPrevented && !(e.ctrlKey || e.metaKey)) return;
      var key = (e.key || '').toLowerCase();
      var typing = isTyping(e.target);

      /* Ctrl/Cmd + K : toggle palette (also from inside inputs, like every command palette) */
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && key === 'k') {
        e.preventDefault();
        if (pal.open) closePalette(); else emit('portfolio:open-palette', { source: 'keyboard' });
        return;
      }
      /* Ctrl + ` : toggle the terminal (a modified shortcut, so there are no single-key shortcuts to switch off: WCAG 2.1.4) */
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.code === 'Backquote' || e.key === '`')) {
        e.preventDefault();
        if (!e.repeat) emit('portfolio:open-terminal', { source: 'key' });
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      /* Konami (not while typing, not inside any dialog / menu). Once the sequence has started the arrow keys must not scroll the
         page, and finishing it puts the page back where it was. */
      if (typing || isOpenModal()) { kpos = 0; return; }
      if (key === KONAMI[kpos]) {
        if (kpos > 0 && key.indexOf('arrow') === 0) e.preventDefault();
        kpos++;
        if (kpos === 1) kY = win.pageYOffset || 0;          /* keydown runs before the default scroll, so this is the pre-sequence position */
        if (kpos === KONAMI.length) {
          kpos = 0;
          try { root.style.scrollBehavior = 'auto'; win.scrollTo(0, kY); root.style.scrollBehavior = ''; } catch (er) { /* ignore */ }
          overdrive();
        }
      } else {
        kpos = key === KONAMI[0] ? 1 : 0;
        if (kpos === 1) kY = win.pageYOffset || 0;
      }
    });
  }

  /* ================================================================== boot */
  function init() {
    safe('banner', banner);
    safe('pointer', initPointer);
    (win.requestAnimationFrame || setTimeout)(function () { safe('network', initNetwork); });   /* after the first frame: no forced layout during init */
    safe('orb', initOrb);
    safe('curlabel', initCursorLabel);
    safe('scramble', initScramble);
    safe('eyebrows', function () { qsa('.section[id] .eyebrow').forEach(function (n) { if (!n.hasAttribute('data-scramble')) n.setAttribute('data-scramble', '650'); }); });   /* text-decrypt on the six section eyebrows (never on titles) */
    safe('scan', scanAll);
    safe('watch', watchDom);
    safe('accent', initAccentWidget);
    safe('keys', initKeys);
    on('portfolio:open-palette', function (e) {
      var src = e && e.detail && e.detail.source;
      /* give other dialogs (project case study) a tick to close and hand focus back before we take it */
      setTimeout(function () { safe('palette', function () { openPalette(typeof src === 'string' ? src : 'bus'); }); }, 0);
    });
    on('portfolio:open-terminal', function () { setTimeout(function () { safe('terminal', function () { if (term.open) closeTerminal(); else openTerminal(); }); }, 0); });
    on('portfolio:motion', function () { if (!reduced()) scanAll(); });
    /* the network rests behind the two long reading runs (css: html[data-sec="work" | "journey"] .fx-net) */
    on('portfolio:section', function (e) { var id = e && e.detail && e.detail.id; if (id) root.setAttribute('data-sec', id); });
    if (P.activeSection) root.setAttribute('data-sec', P.activeSection);
  }

  P.fx = {
    version: '1.0.0',
    openPalette: function () { emit('portfolio:open-palette', { source: 'api' }); },
    closePalette: closePalette,
    togglePalette: function () { if (pal.open) closePalette(); else emit('portfolio:open-palette', { source: 'api' }); },
    openTerminal: openTerminal,
    closeTerminal: closeTerminal,
    exec: function (cmd) { if (!term.open) openTerminal(); exec(cmd); },
    overdrive: overdrive,
    scramble: scramble,
    stats: function () { return net ? net.stats() : null; },
    isPaletteOpen: function () { return pal.open; },
    isTerminalOpen: function () { return term.open; },
    data: DATA
  };

  if (P.ready) P.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
