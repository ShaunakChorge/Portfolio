/* =====================================================================
   NEURAL NEON - fx.js  (global effects, no partial)
   Classic script, IIFE, defer.  Registers on window.Portfolio (core.js loads first).
   Every feature is independent and failure-safe (try/catch per feature), pauses with the
   tab (Portfolio.raf), and is skipped or simplified for prefers-reduced-motion / coarse pointers.

     1  neural-network background canvas          (.fx-net)
     2  spring-follow cursor glow orb              (.fx-orb, fine pointers only)
     3  [data-tilt] 3D tilt + moving glare         (.fx-glare)
     4  [data-magnetic] buttons (6px pull)
     5  command palette (header [data-open-palette] button, or the Control / Command + letter shortcut)
     6  mini terminal easter egg                   (Ctrl + backtick, palette action)
     7  accent switcher widget (desktop)           (.fx-accent)
     8  [data-scramble] text decrypt effect
     9  console banner
    10  Konami code -> overdrive

   Round 3 (FX_R3): palette + terminal navigate between the real pages of the site (BASE comes from this script's own URL), data from
   content/content.json (no project years, no spoken languages, two stack tiers). Home sections are #home #stack #about #offer #selected #roles #process #faq #contact.

   Public API:  Portfolio.fx = { openPalette, closePalette, togglePalette, openTerminal, closeTerminal,
                                 exec, overdrive, scramble, stats, data }
   Bus events used:    portfolio:open-palette, portfolio:open-terminal, portfolio:motion, portfolio:accent
   ===================================================================== */
(function () {
  'use strict';
  /* FX_R3 */

  var win = window, doc = document, root = doc.documentElement;
  if (win.__pfFx) return;
  win.__pfFx = true;

  /* compact facts, generated from content/content.json by tools/fx/gen.mjs (do not hand-edit between the markers) */
  var DATA = /*@@DATA*/{"name":"Shaunak Chorge","role":"AI Engineer","tagline":"I turn AI models and messy workflows into software that actually runs.","loc":"Mumbai, India","email":"shaunak.chorge@gmail.com","status":"AI Engineer at Claptek Pvt Ltd","avail":"I take select freelance AI and backend projects alongside my full-time job as AI Engineer at Claptek Pvt Ltd. I am based in Mumbai, India (IST). The contact form or email is the fastest way to start.","gh":"https://github.com/ShaunakChorge","li":"https://www.linkedin.com/in/shaunak-chorge","ig":"https://www.instagram.com/_shaunakkk/","resume":"assets/Shaunak-Chorge-Resume.pdf","wa":"https://wa.me/919920644655?text=Hi%20Shaunak%2C%20I%20found%20your%20portfolio%20and%20would%20like%20to%20talk%20about%20a%20project.","vcard":"assets/Shaunak-Chorge.vcf","bio":["I work mostly in Python on Artificial Intelligence (AI) and backend systems. My day job is building AI tools for audit and compliance software. One tool drafts findings and is not allowed to make things up. Another reads documents and points to its evidence. A third turns plain questions into database queries on a bank's own servers.","Before that, two internships showed me how real systems behave. At Osource Global I built backend APIs and document tools that use AI models running on company machines. At Shivohini Tech-AI I built AI chatbots for clients. Outside work I build whole projects myself. They include a chatbot that cites its sources or admits it does not know, and a backend that shows where each request slows down. I also built a scam-fighting AI with Prasanna Patil, plus speech and vision models inside small apps.","Need a chatbot, a document reader, a computer vision prototype or a Python backend built carefully? Reach me through the contact page, the fastest way to start."],"freelance":"Taking select freelance AI and backend projects","degree":"Bachelor of Technology in Artificial Intelligence and Data Science, 2026","school":"Dr. D. Y. Patil School of Science and Technology, DPU","hero":{"stack":["Python","FastAPI","PostgreSQL","Docker"]},"skills":{"core":["Python","FastAPI","PostgreSQL","Docker","Git","AI model APIs (Groq, OpenAI)","RAG (answers from documents)","ChromaDB","pandas","Streamlit"],"also":["Django","Django REST Framework","Pydantic","pytest","sentence-transformers","Local AI models (Ollama, vLLM)","PyMuPDF","sqlglot","Redis","Celery","WebSockets","OpenTelemetry","Prometheus","Jaeger","Supabase","MongoDB","MySQL","SQL","NumPy","scikit-learn","TensorFlow / Keras","PyTorch","OpenCV","YOLOv8","librosa","NLTK","Hugging Face Transformers","React","Vite","Flask","Twilio","WhatsApp Cloud API (prototype)","Telegram Bot API","Requests","BeautifulSoup","JavaScript","HTML / CSS","Java","C / C++"],"labels":{"core":{"title":"Core stack","caption":"What I reach for first on a new build."},"also":{"title":"Also work with","caption":"Other tools I have used across these projects and roles."}}},"pages":[{"path":"","label":"Home","hint":"Shaunak Chorge","kw":"home"},{"path":"projects/","label":"Projects","hint":"AI engineer portfolio projects and case studies","kw":"projects"},{"path":"services/","label":"Services","hint":"Freelance AI development services in Mumbai","kw":"services"},{"path":"about/","label":"About","hint":"About Shaunak Chorge, AI engineer","kw":"about"},{"path":"faq/","label":"FAQ","hint":"AI developer cost in India: freelance FAQ","kw":"faq"},{"path":"contact/","label":"Contact","hint":"Hire an AI developer for your project","kw":"contact"},{"path":"resume/","label":"Resume","hint":"Shaunak Chorge resume: AI Engineer","kw":"resume"}],"services":[{"slug":"llm-apps-rag","label":"AI chatbots and assistants","blurb":"Chatbots that answer from your documents and show their sources."},{"slug":"document-ai-extraction","label":"Document AI","blurb":"Tools that read documents and turn them into checked data."},{"slug":"python-backend-apis","label":"Backend and APIs","blurb":"FastAPI and Django services with automated tests and clear logs."},{"slug":"computer-vision","label":"Computer vision","blurb":"Tools that detect and monitor things in photos and video."},{"slug":"speech-nlp-ml","label":"Speech and machine learning","blurb":"Models trained on audio and text, wrapped in small apps."},{"slug":"automation-integrations","label":"Automation and bots","blurb":"Scrapers and bots that take repetitive work off your team."}],"projects":[{"id":"ai-rag-healthcare-assistant","slug":"ai-rag-healthcare-assistant","t":"Healthcare Policy Chatbot","tone":"cyan","g":"llm","cs":1,"cat":"AI chatbot","b":"A chatbot over healthcare policy documents that cites its source, or says it does not know.","d":"A chatbot (FastAPI, ChromaDB, Groq) that answers from six sample healthcare policies, cites its source and confidence, and refuses out-of-scope questions.","st":["Python","FastAPI","ChromaDB","sentence-transformers","Groq","Pydantic Settings"],"status":"Public repo \u00b7 take-home prototype","repo":"https://github.com/ShaunakChorge/AI-RAG","w":""},{"id":"advanced-cctv-analytics","slug":"advanced-cctv-analytics","t":"CCTV Crime and Crowd Analytics","tone":"magenta","g":"vision","cs":1,"cat":"Computer vision","b":"Smart India Hackathon team prototype: crowd-limit alerts, crime labels from video frames and face recognition, as three separate modules.","d":"A Smart India Hackathon team project that watches camera footage three ways: crowd-limit alerts, crime labels from video frames and face recognition, with evidence frames saved to a database.","st":["Python","OpenCV","PyTorch","Hugging Face Transformers (ViT)","Flask","MongoDB"],"status":"Public repo \u00b7 team hackathon project","repo":"https://github.com/ShaunakChorge/Advanced-CCTV-Analytics-System","w":"Prasanna Patil"},{"id":"speech-emotion-recognition","slug":"speech-emotion-recognition","t":"Speech Emotion Recognition","tone":"purple","g":"speech-ml","cs":1,"cat":"Speech and machine learning","b":"Detects seven emotions in a voice clip with a neural network: 93.87% on a random test split, with live microphone input.","d":"A neural network that labels seven emotions in speech, trained on four public datasets: 93.87% on a random 20% test split, with live microphone input.","st":["Python","TensorFlow / Keras","librosa","scikit-learn","NumPy","pandas"],"status":"Public repo \u00b7 personal project","repo":"https://github.com/ShaunakChorge/Speech-Emotion-Recognition-System","w":""},{"id":"observable-ai-backend","slug":"observable-ai-backend","t":"Traceable AI Backend","tone":"blue","g":"backend","cs":1,"cat":"AI and backend","b":"An AI server that shows exactly where each request goes and where it slows down, with request IDs, metrics and traces for LLM observability.","d":"A FastAPI AI server where an AI picks the right business action for each question, with request IDs in logs, Prometheus metrics and OpenTelemetry traces in Jaeger for large language model (LLM) observability.","st":["Python","FastAPI","Pydantic","OpenTelemetry","Jaeger","Prometheus"],"status":"Private repo \u00b7 job-application task","repo":"","w":""},{"id":"obligation-management-system","slug":"obligation-management-system","t":"Obligation Management System","tone":"cyan","g":"llm","cs":1,"cat":"AI and documents","b":"Reads regulatory PDFs and lists every obligation, each linked to the exact highlighted passage. 97.2% of 1,266 records located.","d":"A service that reads circulars, permits and regulations and returns a structured list of obligations, each linked to a highlightable source passage.","st":["Python","FastAPI","Ollama","PyMuPDF","pdf.js","React"],"status":"Private client repo","repo":"","w":""},{"id":"ams-ai-finding-engine","slug":"ams-ai-finding-engine","t":"AI Audit Finding Drafting Engine","tone":"cyan","g":"llm","cs":1,"cat":"AI and backend","b":"Turns short audit notes into three draft findings, with code that blocks any invented fact. Drafts whole spreadsheets in bulk.","d":"A service that turns audit checklist notes into draft findings, three versions each, with checks that block invented facts, plus bulk drafting.","st":["Python","FastAPI","Pydantic v2","TF-IDF","Local AI models","Spring Boot"],"status":"Private client repo","repo":"","w":""},{"id":"core-banking-text-to-sql","slug":"core-banking-text-to-sql","t":"Core-Banking Text-to-SQL Assistant","tone":"blue","g":"backend","cs":1,"cat":"AI and data","b":"Turns plain questions into database queries for core-banking reports, on the bank's own servers, with a self-correcting loop.","d":"An assistant that turns plain questions into working Oracle database queries (SQL) across a 1,628-table core-banking system, fully on the bank's own servers.","st":["Python","FastAPI","sqlglot","Oracle","vLLM","BM25 (keyword search)"],"status":"Private client repo","repo":"","w":""},{"id":"agentic-honeypot","slug":"agentic-honeypot","t":"Scam-Catching AI Honeypot","tone":"cyan","g":"llm","cs":1,"cat":"AI agent","b":"An AI plays an easily fooled victim, keeps scammers chatting and logs the payment IDs, links and phone numbers they reveal.","d":"A counter-scam system: an AI plays an easily fooled target, keeps scammers talking and records the UPI payment IDs, links and phone numbers they reveal.","st":["Python","FastAPI","Pydantic","Groq API","React 19","Vite"],"status":"Public repo \u00b7 team hackathon build","repo":"https://github.com/ShaunakChorge/agentic-honeypot","w":"Prasanna Patil"},{"id":"whatsapp-ai-agent-platform","slug":"whatsapp-ai-agent-platform","t":"WhatsApp Automation and AI Agent Platform","tone":"blue","g":"automation","cs":1,"cat":"Automation","b":"AI replies run in the background, every chat is tracked and human operators get alerts.","d":"A client platform that receives WhatsApp messages, tracks each conversation and replies through AI agents in the background.","st":["Python","FastAPI","PostgreSQL","Supabase","Redis","Celery"],"status":"Private client repo","repo":"","w":""},{"id":"deepfake-video-detection","slug":"deepfake-video-detection","t":"DeepFake Video Detection","tone":"magenta","g":"vision","cs":1,"cat":"Computer vision","b":"Scores each frame of a video as real or fake, with a web app and PDF report. College team project, 74.16% accuracy.","d":"A college team project: a small neural network scores each video frame as real or fake, with a Streamlit app, confidence chart and PDF report. 74.16% test accuracy.","st":["Python","TensorFlow / Keras","OpenCV","Streamlit","ReportLab","Celeb-DF dataset"],"status":"Public repo \u00b7 college team project","repo":"https://github.com/ShaunakChorge/DeepFakeAnalysis","w":"Prasanna Patil"},{"id":"spam-classifier","slug":"spam-classifier","t":"SMS Spam Classifier","tone":"purple","g":"speech-ml","cs":1,"cat":"Natural language","b":"Spots spam in text messages: 97.1% accurate on 1,034 test messages, with no genuine message flagged.","d":"A spam detector using NLTK, TF-IDF and Naive Bayes: 97.1% accuracy and 100% precision on 1,034 test messages, in a Streamlit app.","st":["Python","NLTK","scikit-learn","TF-IDF","Multinomial Naive Bayes","Streamlit"],"status":"Public repo \u00b7 internship project","repo":"https://github.com/ShaunakChorge/Spam-Classifier","w":""},{"id":"house-price-predictor","slug":"house-price-predictor","t":"House Price Predictor","tone":"purple","g":"speech-ml","cs":0,"cat":"Machine learning","b":"Predicts house prices from eight features. A Random Forest beats a simple baseline (R-squared 0.89, where 1.0 is perfect).","d":"An Ames house-price model on eight features: a Random Forest beats the linear baseline (R-squared 0.89), with a Streamlit price predictor launched from the notebook.","st":["Python","pandas","NumPy","scikit-learn","Random Forest","Streamlit"],"status":"Public repo \u00b7 data science assessment","repo":"https://github.com/ShaunakChorge/HousePricePredictor","w":""},{"id":"cv-fundamentals-yolov8","slug":"cv-fundamentals-yolov8","t":"Computer Vision Basics and YOLOv8 on Video","tone":"magenta","g":"vision","cs":0,"cat":"Computer vision","b":"Basic image steps (grayscale, resize, blur), then object detection with Faster R-CNN on an image and YOLOv8n on video frames.","d":"An assignment notebook: grayscale, resize and blur an image, detect objects with Faster R-CNN, then run YOLOv8n on every fifth frame of a video.","st":["Python","OpenCV","Matplotlib","PyTorch / torchvision","Ultralytics YOLOv8n","Jupyter"],"status":"Assignment \u00b7 notebook only","repo":"","w":""},{"id":"zapvi-web-scraper","slug":"zapvi-web-scraper","t":"Zapvi Web Scraper","tone":"blue","g":"automation","cs":0,"cat":"Automation","b":"Collects product names, prices and links from online store pages into a clean table and CSV file.","d":"A Requests and BeautifulSoup notebook that scrapes product names, prices and links from an online store into pandas and CSV.","st":["Python","Requests","BeautifulSoup","pandas","Jupyter"],"status":"Public repo \u00b7 personal project","repo":"https://github.com/ShaunakChorge/Zapvi-Web-Scrapper","w":""},{"id":"astra-telegram-bot","slug":"astra-telegram-bot","t":"ASTRA Telegram Bot","tone":"blue","g":"automation","cs":0,"cat":"Automation","b":"A Telegram bot: pick a zodiac sign and a date, and get the day's horoscope, with friendly error messages.","d":"A Telegram bot that walks users through zodiac sign and date (up to a year back) and returns the daily horoscope, with input checks and error handling.","st":["Python","pyTelegramBotAPI","requests","Telegram Bot API"],"status":"Public repo \u00b7 personal project","repo":"","w":""},{"id":"medical-insurance-cost-prediction","slug":"medical-insurance-cost-prediction","t":"Medical Insurance Cost Prediction","tone":"purple","g":"speech-ml","cs":0,"cat":"Machine learning","b":"Studies 1,338 insurance records and predicts costs with linear regression: R-squared 0.74 on test data.","d":"A data science course case study: data exploration and linear regression on 1,338 insurance records (R-squared 0.74 on test data), with a small cost-estimate function.","st":["Python","pandas","NumPy","scikit-learn","Matplotlib","Seaborn"],"status":"Course case study \u00b7 follows a public tutorial","repo":"","w":""},{"id":"atm-simulator","slug":"atm-simulator","t":"ATM Simulator (Java desktop app)","tone":"blue","g":"backend","cs":0,"cat":"Desktop app","b":"A Java desktop ATM with MySQL: signup, card and PIN login, deposits, withdrawals, mini statement and PIN change.","d":"A Java Swing and MySQL desktop app: three-page signup, card and PIN login, deposit, withdrawal, fast cash, mini statement and PIN change.","st":["Java","Swing / AWT","JDBC","MySQL"],"status":"Public repo \u00b7 tutorial-based project","repo":"https://github.com/ShaunakChorge/ATM-Simulator","w":""},{"id":"qr-code-generator","slug":"qr-code-generator","t":"QR Code Generator","tone":"blue","g":"web-tools","cs":0,"cat":"Web tool","b":"Type a short text or a link and get a scannable QR code. No dependencies, live on GitHub Pages.","d":"A single-page web tool: type short text or a simple link and get a QR code with a reveal animation. Live on GitHub Pages.","st":["HTML","CSS","JavaScript","api.qrserver.com"],"status":"Public repo \u00b7 live on GitHub Pages","repo":"https://github.com/ShaunakChorge/QR-Code-Generator","w":""},{"id":"quiz-game-c","slug":"quiz-game-c","t":"Ultimate Quiz Game (C)","tone":"blue","g":"web-tools","cs":0,"cat":"Games","b":"A quiz game in C with accounts, six topics, two difficulty levels and a saved leaderboard.","d":"A console quiz in C: sign-up and login, six topics at two difficulty levels (88 questions) and a saved, sorted high-score table.","st":["C","GCC","File I/O"],"status":"Public repo \u00b7 college team project","repo":"https://github.com/ShaunakChorge/Quiz-Game","w":""},{"id":"tetris-raylib-cpp","slug":"tetris-raylib-cpp","t":"Tetris (C++ and raylib)","tone":"blue","g":"web-tools","cs":0,"cat":"Games","b":"Tetris in C++ with raylib: rotation, line clearing, scoring, next-piece preview and sound.","d":"Object-oriented C++ Tetris on raylib: seven piece types, rotation, line clearing, scoring, next-piece preview and sound effects.","st":["C++","raylib","Make / g++"],"status":"Public repo \u00b7 tutorial-based project","repo":"https://github.com/ShaunakChorge/Tetris-Game","w":""},{"id":"password-generator","slug":"password-generator","t":"Password Generator","tone":"blue","g":"web-tools","cs":0,"cat":"Tools","b":"A first-year Python mini-project: random passwords of a chosen length, saved to a text file.","d":"A first-year Python mini-project: generates random passwords of a chosen length and saves them with a name to a text file.","st":["Python","OOP","File I/O"],"status":"Public repo \u00b7 first-year mini-project","repo":"https://github.com/ShaunakChorge/Password-Generator","w":""},{"id":"django-box-selection-api","slug":"django-box-selection-api","t":"Box Selection API","tone":"blue","g":"backend","cs":0,"cat":"Backend","b":"Give it an order and this Django API picks the fewest, cheapest shipping boxes. It tries every rotation, and 27 tests pass.","d":"A Django REST API that recommends the fewest, cheapest shipping boxes for an order using a rotation-aware packing method, with 27 passing tests.","st":["Python 3.12","Django 5","Django REST Framework","SQLite","Django test runner"],"status":"Public repo \u00b7 job-application task","repo":"https://github.com/ShaunakChorge/PythonDjangoAssignment","w":""}],"exp":[{"o":"Claptek Pvt Ltd","r":"AI Engineer","p":"Jul 2026 - Present","g":"work","b":["Sole engineer on an AI service that drafts audit findings from short checklist notes. It writes three versions of each finding, drafts whole spreadsheets in one go and builds summary reports. Code-level checks reject any draft that invents a figure, date or owner. The client's audit product adopted it the day after handover.","Made it about 28 times faster (7.9 minutes down to 16.9 seconds). I found hidden extra processing in how the system called the AI models and compared four candidate models, with accuracy unchanged."]},{"o":"Osource Global Pvt. Ltd.","r":"Python Automation Intern","p":"Mar 2026 - Jun 2026","g":"work","b":["Built backend APIs in Python, FastAPI and PostgreSQL that sync data between internal company systems.","Connected AI models running on company machines to a document tool that turns unformatted input into structured business reports."]},{"o":"Shivohini Tech-AI LLP","r":"AI and Machine Learning Intern","p":"Sep 2025 - Mar 2026","g":"work","b":["Built and launched AI chatbots for clients using LLaMA, the OpenAI API and retrieval (answers drawn from stored documents).","Designed PostgreSQL and Supabase databases for chat history and user profiles, so bots can remember each conversation."]},{"o":"Edunet","r":"AI and Data Analytics Green Skills Intern","p":"Jan 2025 - Feb 2025","g":"programme","b":[]},{"o":"TechSaksham (AICTE internship, a Microsoft and SAP CSR initiative)","r":"AI and Transformative Learning Intern","p":"Dec 2024 - Jan 2025","g":"programme","b":[]},{"o":"Osource India Pvt. Ltd.","r":"Python Automation Developer Intern","p":"Jul 2024 - Aug 2024","g":"programme","b":[]},{"o":"IBM SkillsBuild","r":"Front-End Development Intern","p":"Jun 2024 - Jul 2024","g":"programme","b":[]},{"o":"Academor","r":"AI and Python Intern","p":"Jan 2023","g":"programme","b":[]}],"certs":[{"n":"Oracle Cloud Infrastructure 2025 Certified Generative AI Professional","i":"Oracle"},{"n":"Generative AI Certification","i":"GeeksforGeeks"},{"n":"TCS iON Career Edge, Young Professional","i":"Tata Consultancy Services"},{"n":"Python for Data Science","i":"Infosys Springboard"},{"n":"Python for Beginners","i":"SimpliLearn"},{"n":"Getting Started with Enterprise Data Science","i":"IBM SkillsBuild"},{"n":"IgniteX Program Participant","i":"Wadhwani Foundation"},{"n":"Introduction to SQL","i":"SimpliLearn"},{"n":"Python Django","i":"SimpliLearn"},{"n":"AI and Data Analytics Virtual Internship, Green Skills","i":"AICTE, Shell India Markets and Edunet Foundation"},{"n":"AI: Transformative Learning with TechSaksham","i":"AICTE, with Microsoft and SAP, implemented by Edunet Foundation"},{"n":"Front-End Development Internship","i":"IBM SkillsBuild, with AICTE and Edunet Foundation"},{"n":"Python Automation Internship","i":"Osource Global Pvt. Ltd."},{"n":"AI and Python Internship","i":"Academor"}],"awards":[{"t":"First runner-up, Code Golf (INNIXO - SWASTIK)"},{"t":"First runner-up, Code Quest Infinity"},{"t":"Winners, Smart India Hackathon internal round"}]}/*@@END*/;

  var P = win.Portfolio = win.Portfolio || {};
  if (!P.qs) return;                                       /* core.js not loaded: nothing to do */
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ helpers */
  var qs = P.qs, qsa = P.qsa;
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
      var t = e.target && e.target.closest ? e.target.closest('[data-cursor="case"]') : null;
      var hit = !!t && !e.target.closest('a, button');
      if (hit !== shown) {
        shown = hit; lab.classList.toggle('is-on', hit);
        if (hit) {
          var src = t.hasAttribute('data-tone') ? t : t, cs = win.getComputedStyle(src);
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

  var SEC_ICON = { home: 'sparkles', stack: 'layers', about: 'users', offer: 'layers', selected: 'folder', roles: 'briefcase', process: 'workflow', faq: 'message-circle', contact: 'mail' };
  var SEC_LABEL = { home: 'Top of this page', stack: 'Tech stack', about: 'About me', offer: 'Services', selected: 'Selected work', roles: 'Experience', process: 'How a project runs', faq: 'FAQ', contact: 'Hire me (form and contacts)' };
  var GROUP_ICON = { llm: 'brain-circuit', vision: 'scan-eye', 'speech-ml': 'audio-lines', backend: 'server', automation: 'bot', 'web-tools': 'globe' };
  var PAGE_ICON = { '': 'sparkles', 'projects/': 'folder', 'services/': 'layers', 'about/': 'users', 'faq/': 'message-circle', 'contact/': 'mail', 'resume/': 'file-text' };

  /* site root relative to the current page, taken from this script's own URL (.../assets/dist/js/fx.min.js or .../assets/js/sections/fx.js) */
  var BASE = (function () {
    var sc = doc.currentScript || qs('script[src*="fx."]'), src = sc && sc.getAttribute('src'), m = src && /^(.*?)assets\//.exec(src);
    return m ? m[1] : '';
  })();
  function pageUrl(path) { try { return new URL(BASE + path, win.location.href); } catch (e) { return null; } }
  function samePath(a, b) { return a.replace(/index\.html$/, '') === b.replace(/index\.html$/, ''); }
  function isHere(path) { var u = pageUrl(path.replace(/#.*$/, '')); return !!u && samePath(u.pathname, win.location.pathname); }
  function go(path) {
    var u = pageUrl(path); if (!u) return;
    if (isHere(path) && !/#/.test(path)) { if (P.goto) P.goto('top'); else win.scrollTo(0, 0); return; }
    win.location.href = u.href;
  }

  function sectionItems() {
    var out = [];
    qsa('section[id][data-rail]').forEach(function (s) {
      var id = s.id, rail = s.getAttribute('data-rail') || id;
      var m = /^(\d+)\s*\S\s*(.+)$/.exec(rail);
      var hd = qs('h1, h2', s);
      out.push({
        type: 'section', id: 'sec-' + id, label: SEC_LABEL[id] || (m ? cap(m[2]) : cap(id)), hint: hd ? trunc(hd.textContent, 64) : 'Go to section', kw: id + ' ' + (m ? m[2] : '') + ' section go to jump scroll',
        icon: SEC_ICON[id] || 'hash', meta: m ? m[1] : '', nav: true,
        run: function () { if (P.goto) P.goto(id); else { var el = doc.getElementById(id); if (el) el.scrollIntoView(); } }
      });
    });
    return out;
  }
  function pageItems() {
    var out = [];
    DATA.pages.forEach(function (pg) {
      out.push({
        type: 'page', id: 'page-' + (pg.path || 'home'), label: pg.label, hint: isHere(pg.path) ? 'You are here' : pg.hint, kw: pg.kw + ' page open go to',
        icon: PAGE_ICON[pg.path] || 'hash', meta: 'Page', nav: true, run: function () { go(pg.path); }
      });
    });
    DATA.services.forEach(function (sv) {
      out.push({
        type: 'page', id: 'svc-' + sv.slug, label: sv.label, hint: 'Freelance service', kw: 'service freelance hire ' + sv.slug.replace(/-/g, ' ') + ' ' + sv.blurb,
        icon: 'rocket', meta: 'Service', quiet: true, nav: true, run: function () { go('services/' + sv.slug + '/'); }
      });
    });
    return out;
  }
  function projectItems() {
    var out = [];
    DATA.projects.forEach(function (p, i) {
      out.push({
        type: 'project', id: 'prj-' + p.id, label: p.t, tone: p.tone, featured: !!p.cs && i < 6,
        hint: p.cat,
        kw: [p.st.join(' '), p.b || '', p.g || '', p.cat || '', 'project case study work'].join(' '),
        icon: GROUP_ICON[p.g] || 'folder', meta: p.cs ? 'Case study' : 'Project', nav: true,
        run: function () { openProject(p.id); }
      });
    });
    return out;
  }
  function openProject(id) {
    var p = null;
    DATA.projects.forEach(function (x) { if (x.id === id) p = x; });
    if (p && p.cs) go('projects/' + p.slug + '/'); else go('projects/#p-' + id);
  }
  function copyEmail() {
    return P.copy(DATA.email).then(function (ok) {
      toast(ok ? 'Email copied: ' + DATA.email : 'Could not copy automatically. Email: ' + DATA.email, ok ? 'success' : 'error');
      return ok;
    });
  }
  function downloadResume() {
    var a = h('a', 'sr-only', 'Resume', { href: DATA.resume, download: 'Shaunak-Chorge-Resume.pdf', rel: 'noopener', 'aria-hidden': 'true', tabindex: '-1' });
    doc.body.appendChild(a); a.click(); a.remove();
    toast('Resume download started', 'success');
  }
  function downloadVcard() {
    var a = h('a', 'sr-only', 'Contact card', { href: BASE + DATA.vcard, download: 'Shaunak-Chorge.vcf', rel: 'noopener', 'aria-hidden': 'true', tabindex: '-1' });
    doc.body.appendChild(a); a.click(); a.remove();
    toast('Contact card download started', 'success');
  }
  function openExternal(url) {
    /* always through an anchor click: window.open(..., 'noopener') returns null, which used to be read as "blocked" and opened a second tab */
    var a = h('a', 'sr-only', 'link', { href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-hidden': 'true', tabindex: '-1' });
    doc.body.appendChild(a); a.click(); a.remove();
  }
  function gotoContact() {
    /* on the home page the hire section is #contact; anywhere else it is contact/#hire. The FIRST long jump on a cold page can land short
       (content-visibility sections above expand while the smooth scroll runs), so once the scroll settles we re-align if clearly off. */
    if (!doc.getElementById('contact')) { go('contact/#hire'); return; }
    if (P.goto) P.goto('contact'); else { var e0 = doc.getElementById('contact'); if (e0) e0.scrollIntoView(); }
    var tries = 0, last = -1;
    var iv = win.setInterval(function () {
      var el = doc.getElementById('contact');
      if (!el) { win.clearInterval(iv); return; }
      var y = win.scrollY || win.pageYOffset || 0;
      if (Math.abs(y - last) < 2) {
        win.clearInterval(iv);
        var top = el.getBoundingClientRect().top;
        if ((top > 150 || top < -150) && P.goto) P.goto('contact');
        return;
      }
      last = y;
      if (++tries > 14) win.clearInterval(iv);
    }, 420);
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
      { id: 'act-hire', label: 'Hire me', hint: DATA.freelance, kw: 'hire freelance project brief work together commission contact start', icon: 'rocket', nav: true, run: function () { gotoContact(); toast('Let’s build something', 'success'); } },
      { id: 'act-book', label: 'Book a call', hint: 'Pick a day and time (India Standard Time)', kw: 'book call meeting appointment schedule calendar slot talk', icon: 'calendar', nav: true, run: function () { go('contact/#book'); } },
      { id: 'act-wa', label: 'Message on WhatsApp', hint: 'Opens WhatsApp in a new tab', kw: 'whatsapp message chat text', icon: 'message-circle', quiet: true, run: function () { openExternal(DATA.wa); } },
      { id: 'act-vcard', label: 'Save contact card', hint: 'Download my details (.vcf)', kw: 'save contact card vcard vcf phone book address', icon: 'download', quiet: true, run: downloadVcard },
      { id: 'act-terminal', label: 'Open terminal', hint: 'Mini shell: help, whoami, projects', kw: 'terminal shell console cli command line bash', icon: 'terminal', terminal: true, run: function () { /* handled in runItem */ } },
      { id: 'act-resume', label: 'Download resume (PDF)', hint: 'PDF', kw: 'resume cv pdf download', icon: 'download', run: downloadResume },
      { id: 'act-email', label: 'Copy email address', hint: DATA.email, kw: 'copy email mail clipboard', icon: 'copy', run: copyEmail },
      { id: 'act-mail', label: 'Send an email', hint: DATA.email, kw: 'send email mail write contact', icon: 'mail', quiet: true, run: function () { win.location.href = 'mailto:' + DATA.email; } },
      { id: 'act-gh', label: 'Open GitHub', hint: 'github.com/ShaunakChorge', kw: 'github git code repos source', icon: 'github', run: function () { openExternal(DATA.gh); } },
      { id: 'act-li', label: 'Open LinkedIn', hint: 'linkedin.com/in/shaunak-chorge', kw: 'linkedin profile network', icon: 'linkedin', run: function () { openExternal(DATA.li); } },
      { id: 'act-ig', label: 'Open Instagram', hint: 'instagram.com/_shaunakkk', kw: 'instagram insta social', icon: 'instagram', quiet: true, run: function () { openExternal(DATA.ig); } },
      { id: 'act-accent', label: 'Switch accent colour', hint: 'Now: ' + cur + ' (cycles cyan, magenta, purple, green)', kw: 'accent colour color theme switch cycle neon', icon: 'wand-sparkles', run: cycleAccent },
      { id: 'act-motion', label: motionPaused() ? 'Resume effects' : 'Pause effects', hint: motionPaused() ? 'Turn the background and motion effects back on' : 'Stop the background network, typing and other motion', kw: 'pause resume stop effects animation motion reduce background canvas', icon: motionPaused() ? 'play' : 'pause', run: toggleMotion },
      { id: 'act-top', label: 'Scroll to top', hint: 'Back to the top of this page', kw: 'top scroll up start', icon: 'arrow-up', nav: true, run: function () { if (P.goto) P.goto('top'); else win.scrollTo(0, 0); } }
    ];
    ACCENTS.forEach(function (nm) {
      if (nm === cur) return;
      A.push({ id: 'act-acc-' + nm, label: 'Accent: ' + cap(nm), hint: 'Switch the neon accent', kw: 'accent colour color theme ' + nm, icon: 'sparkles', quiet: true, dot: RGB[nm], run: function () { setAccent(nm); toast('Accent: ' + nm, 'info'); } });
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
    var all = pageItems().concat(sectionItems(), actionItems(), projectItems());
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
    if (it.meta) meta.appendChild(h('span', 'fx-opt__tag', it.meta));
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
        ['Go to', pal.all.filter(function (x) { return x.type === 'page' && !x.quiet; })],
        ['On this page', pal.all.filter(function (x) { return x.type === 'section'; })],
        ['Quick actions', pal.all.filter(function (x) { return x.type === 'action' && !x.quiet; })],
        ['Featured case studies', pal.all.filter(function (x) { return x.type === 'project' && x.featured; })]
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
      'aria-label': 'Search pages, projects and actions', placeholder: small() ? 'Search or jump to\u2026' : 'Search pages, projects, actions\u2026', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go'
    });
    var closeBtn = h('button', 'fx-pal__x', [icon('x')], { type: 'button', 'aria-label': 'Close command palette' });
    var top = h('div', 'fx-pal__top', [icon('search'), input, closeBtn]);
    var list = h('div', 'fx-pal__list', null, { role: 'listbox', id: 'fx-pal-list', 'aria-label': 'Results' });
    var live = h('p', 'sr-only', null, { role: 'status', 'aria-live': 'polite' });
    var empty = h('div', 'fx-pal__empty'); empty.hidden = true;
    var box = h('div', 'fx-pal__box', [top, list, empty, live]);
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
    dlg.addEventListener('close', function () { if (pal.open) { pal.open = false; lock(false, 'fx-palette'); } });
    outsideClose(dlg, '.fx-pal__box', function () { closePalette(); });
  }
  function openPalette() {
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
  /* terminal "goto": real pages first, then (on the home page) the sections of the page */
  var PAGE_ALIAS = { home: '', '/': '', projects: 'projects/', work: 'projects/', services: 'services/', about: 'about/', faq: 'faq/', contact: 'contact/', hire: 'contact/#hire', resume: 'resume/', cv: 'resume/' };
  var SEC_ALIAS = { home: 'home', intro: 'home', top: 'home', stack: 'stack', tools: 'stack', services: 'offer', build: 'offer', offer: 'offer', work: 'selected', projects: 'selected', selected: 'selected', about: 'about', bio: 'about', experience: 'roles', roles: 'roles', process: 'process', faq: 'faq', contact: 'contact', hire: 'contact' };

  function termSections() { return qsa('section[id][data-rail]').map(function (s) { return s.id; }); }
  function termPages() { return ['home'].concat(DATA.pages.filter(function (pg) { return pg.path; }).map(function (pg) { return pg.path.replace(/\/$/, ''); })); }
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
  function filterLabel(g) { var f = (DATA.filters || []).filter(function (x) { return x.id === g; })[0]; return f ? f.label : g; }
  function goSection(arg, c) {
    var key = String(arg || '').toLowerCase().replace(/\/$/, '');
    if (key === 'hire') { row([{ t: '-> ', c: tone('dim') }, 'opening ', { t: 'the contact form', c: tone('acc') }]); closeTerminal({ instant: false, restore: false }); setTimeout(gotoContact, 60); return; }
    if (Object.prototype.hasOwnProperty.call(PAGE_ALIAS, key)) {             /* real pages win over section names that share a word (about, services, faq, contact) */
      var path = PAGE_ALIAS[key];
      row([{ t: '-> ', c: tone('dim') }, 'opening ', { t: path || 'home', c: tone('acc') }]);
      closeTerminal({ instant: false, restore: false });
      setTimeout(function () { go(path); }, 80);
      return;
    }
    var onPage = termSections().indexOf(SEC_ALIAS[key] || key) >= 0 ? (SEC_ALIAS[key] || key) : '';
    if (onPage) {
      row([{ t: '-> ', c: tone('dim') }, 'scrolling to ', { t: onPage, c: tone('acc') }]);
      closeTerminal({ instant: false, restore: false });
      setTimeout(function () { if (P.goto) P.goto(onPage); }, 60);
      return;
    }
    err('goto: no such page or section: ' + arg + '. Try: ' + termPages().join(', ') + (termSections().length ? ' | on this page: ' + termSections().join(', ') : ''));
  }

  var LOGO = [' ____    ____ ', '/ ___|  / ___|', '\\___ \\ | |    ', ' ___) || |___ ', '|____/  \\____|'];
  var CMDS = {
    help: {
      d: 'list commands', run: function () {
        say('Commands (click one, or type and press Enter). Up/Down recall history.', tone('dim'));
        Object.keys(CMDS).forEach(function (k) { if (!CMDS[k].hide) kv({ t: k, cmd: k, c: tone('acc') }, { t: CMDS[k].d, c: tone('dim') }); });
        say('Also try: neofetch, theme, matrix, sudo hire-me', tone('dim'));
      }
    },
    whoami: {
      d: 'who is behind this site', run: function () {
        row([{ t: DATA.name, c: tone('w') + ' fx-t-b' }, '  |  ', { t: DATA.role, c: tone('acc') }]);
        say(DATA.degree + ' | ' + DATA.school);
        say(DATA.loc + '  |  ' + DATA.status);
        say(DATA.tagline, tone('dim'));
      }
    },
    about: {
      d: 'short bio', run: function () { DATA.bio.forEach(function (p, i) { if (i) blank(); say(p); }); row([{ t: '-> ', c: tone('dim') }, { t: 'goto about', cmd: 'goto about', c: tone('acc') }, { t: '  opens the About page', c: tone('dim') }]); }
    },
    skills: {
      d: 'tools I use, in two tiers', run: function () {
        ['core', 'also'].forEach(function (k, i) {
          var lab = DATA.skills.labels[k]; if (i) blank();
          row([{ t: lab.title, c: tone('acc') + ' fx-t-b' }, { t: '  ' + lab.caption, c: tone('dim') }]);
          var r = h('div', 'fx-term__row fx-term__tags');
          DATA.skills[k].forEach(function (s) { r.appendChild(h('span', 'fx-t-tag ' + (k === 'core' ? 'is-hot' : ''), s)); });
          term.out.appendChild(r);
        });
        term.body.scrollTop = term.body.scrollHeight;
      }
    },
    services: {
      d: 'what I take on as a freelancer', run: function () {
        say('Select freelance AI and backend projects. Click one to open its page.', tone('dim'));
        DATA.services.forEach(function (sv) {
          kv({ t: sv.label, href: BASE + 'services/' + sv.slug + '/', c: tone('acc'), ext: false }, { t: sv.blurb, c: tone('dim') }, 'fx-term__tp');
        });
        row([{ t: '-> ', c: tone('dim') }, { t: 'hire', cmd: 'hire', c: tone('acc') }, { t: '  starts a project', c: tone('dim') }]);
      }
    },
    projects: {
      d: 'list projects (projects <n> for detail)', complete: function (cur) { return DATA.projects.map(function (p) { return p.id; }); },
      run: function (a) {
        if (a[0]) {
          var p = findProject(a[0]);
          if (!p) { err('projects: no project matches "' + a[0] + '"'); return; }
          row([{ t: p.t, c: tone('w') + ' fx-t-b' }, { t: '  [' + (p.cat || filterLabel(p.g)) + ']', c: tone(toneOf(p.tone)) }]);
          if (p.w) say('Co-built with ' + p.w, tone('acc'));
          say(p.d);
          kv({ t: 'stack', c: tone('dim') }, p.st.join(', '));
          kv({ t: 'status', c: tone('dim') }, p.status);
          if (p.repo) kv({ t: 'repo', c: tone('dim') }, { t: p.repo.replace(/^https?:\/\//, ''), href: p.repo, c: tone('acc') });
          row([{ t: '-> ', c: tone('dim') }, { t: 'open ' + p.id, cmd: 'open ' + p.id, c: tone('acc') }, { t: p.cs ? '  opens the case study' : '  opens it on the projects page', c: tone('dim') }]);
          return;
        }
        say('Click a project or type: projects <number | id>', tone('dim'));
        DATA.projects.forEach(function (p, i) {
          var r = h('div', 'fx-term__row fx-term__prj');
          r.appendChild(h('span', tone('dim'), String(i + 1).padStart(2, '0')));
          r.appendChild(h('span', tone('dim'), p.cs ? 'case' : 'work'));
          r.appendChild(piece({ t: p.t, cmd: 'projects ' + (i + 1), c: tone(toneOf(p.tone)) }));
          r.appendChild(h('span', tone('dim') + ' fx-term__area', p.cat || filterLabel(p.g)));
          term.out.appendChild(r);
        });
        term.body.scrollTop = term.body.scrollHeight;
      }
    },
    open: {
      d: 'open a project page (open <n | id>)', complete: function () { return DATA.projects.map(function (p) { return p.id; }); },
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
      d: 'work experience and programmes', run: function () {
        say('ROLES', tone('acc') + ' fx-t-b');
        DATA.exp.filter(function (e) { return e.g === 'work'; }).forEach(function (e) {
          kv([{ t: e.r, c: tone('w') + ' fx-t-b' }, ' - ' + e.o], { t: e.p, c: tone('dim') }, 'fx-term__tp');
          e.b.forEach(function (b) { row([{ t: '  - ', c: tone('dim') }, b], 'fx-term__li'); });
        });
        blank(); say('PROGRAMMES AND SHORT STINTS', tone('acc') + ' fx-t-b');
        DATA.exp.filter(function (e) { return e.g !== 'work'; }).forEach(function (e) { kv([e.r + ' - ' + e.o], { t: e.p, c: tone('dim') }, 'fx-term__tp'); });
      }
    },
    education: {
      d: 'degree and certifications', run: function () {
        kv([{ t: DATA.degree, c: tone('w') + ' fx-t-b' }], { t: DATA.school, c: tone('dim') }, 'fx-term__tp');
        blank(); say('CERTIFICATIONS', tone('acc') + ' fx-t-b');
        DATA.certs.forEach(function (c) { kv([c.n], { t: c.i, c: tone('dim') }, 'fx-term__tp'); });
      }
    },
    awards: {
      d: 'contests and hackathons', run: function () { DATA.awards.forEach(function (a) { say(a.t); }); }
    },
    contact: {
      d: 'how to reach me', run: function () {
        kv({ t: 'email', c: tone('dim') }, [{ t: DATA.email, href: 'mailto:' + DATA.email, c: tone('acc') }, '  ', { t: '[copy]', cmd: 'copy', c: tone('dim') }]);
        kv({ t: 'github', c: tone('dim') }, { t: DATA.gh.replace(/^https?:\/\//, ''), href: DATA.gh, c: tone('acc') });
        kv({ t: 'linkedin', c: tone('dim') }, { t: DATA.li.replace(/^https?:\/\/(www\.)?/, ''), href: DATA.li, c: tone('acc') });
        kv({ t: 'location', c: tone('dim') }, DATA.loc);
        row([{ t: '-> ', c: tone('dim') }, { t: 'hire', cmd: 'hire', c: tone('acc') }, { t: '  jumps to the contact form', c: tone('dim') }]);
      }
    },
    hire: { d: 'start a freelance project (opens the contact form)', run: function () { toast('Let’s build something', 'success'); row([{ t: '-> ', c: tone('dim') }, 'opening ', { t: 'the contact form', c: tone('acc') }]); closeTerminal({ instant: false, restore: false }); setTimeout(gotoContact, 60); } },
    resume: { d: 'open my resume page', run: function () { row([{ t: '-> ', c: tone('dim') }, 'opening ', { t: 'resume', c: tone('acc') }, { t: '  (PDF: type "pdf")', c: tone('dim') }]); closeTerminal({ instant: false, restore: false }); setTimeout(function () { go('resume/'); }, 80); } },
    pdf: { d: 'download my resume (PDF)', run: function () { row([{ t: '-> ', c: tone('dim') }, 'downloading ', { t: 'Shaunak-Chorge-Resume.pdf', c: tone('acc') }]); downloadResume(); } },
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
      d: 'open a page or jump to a section (goto <name>)', complete: function () { return termPages().concat(termSections()); },
      run: function (a) { if (!a[0]) { row(['pages: ', { t: termPages().join('  '), c: tone('acc') }]); if (termSections().length) row(['on this page: ', { t: termSections().join('  '), c: tone('acc') }]); return; } goSection(a[0]); }
    },
    ls: {
      d: 'list pages', run: function () {
        var r = h('div', 'fx-term__row fx-term__ls');
        termPages().forEach(function (id) { r.appendChild(piece({ t: id + '/', cmd: 'goto ' + id, c: tone('cyan') })); });
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
        [['role', DATA.role], ['degree', DATA.degree], ['location', DATA.loc], ['stack', DATA.hero.stack.join(', ')], ['freelance', DATA.freelance], ['status', DATA.status], ['accent', accentName()]].forEach(function (x) {
          info.appendChild(h('div', null, [h('span', tone('acc') + ' fx-t-b', x[0] + ' '.repeat(Math.max(1, 10 - x[0].length))), x[1]]));
        });
        r.appendChild(logo); r.appendChild(info); term.out.appendChild(r); term.body.scrollTop = term.body.scrollHeight;
      }
    },
    date: {
      d: 'local time in Mumbai', run: function () {
        var s; try { s = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' }).format(new Date()) + ' IST'; } catch (e) { s = new Date().toString(); }
        say(s);
      }
    },
    echo: { d: 'print text', hide: true, run: function (a, line) { say(line.replace(/^\s*echo\s?/i, '')); } },
    history: { d: 'show command history', run: function () { if (!term.hist.length) say('(empty)', tone('dim')); term.hist.forEach(function (c, i) { row([{ t: String(i + 1).padStart(3, ' ') + '  ', c: tone('dim') }, c]); }); } },
    clear: { d: 'clear the screen', run: function () { clearTimers(); term.out.textContent = ''; } },
    exit: { d: 'close the terminal', run: function () { closeTerminal(); } },
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
          function () { row([{ t: '-> ', c: tone('dim') }, { t: 'hire', cmd: 'hire', c: tone('acc') }, { t: '  or use the form', c: tone('dim') }]); }
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
    row([{ t: 'Type ', c: tone('dim') }, { t: 'help', cmd: 'help', c: tone('acc') }, { t: ' for commands, ', c: tone('dim') }, { t: 'whoami', cmd: 'whoami', c: tone('acc') }, { t: ' to get started.', c: tone('dim') }]);
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
      closeBtn
    ]);
    var out = h('div', 'fx-term__out', null, { role: 'log', 'aria-live': 'polite', 'aria-label': 'Terminal output' });
    var body = h('div', 'fx-term__body', out, { tabindex: '0', role: 'region', 'aria-label': 'Terminal output history' });
    var input = h('input', 'fx-term__in', null, {
      type: 'text', 'aria-label': 'Terminal command', 'aria-describedby': 'fx-term-hint', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'send'
    });
    var hint = h('p', 'sr-only', 'Type a command and press Enter. Tab completes, Up and Down recall history, Escape closes the terminal.', { id: 'fx-term-hint' });
    var quick = h('div', 'fx-term__quick');
    ['help', 'whoami', 'services', 'projects', 'skills', 'hire', 'exit'].forEach(function (c) { quick.appendChild(h('button', 'fx-term__qb', c, { type: 'button', 'data-cmd': c })); });
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
    dlg.addEventListener('close', function () { if (term.open) { term.open = false; lock(false, 'fx-terminal'); matrixStop(); } });
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
      console.log('%cI build AI chatbots, computer vision tools and the Python backends behind them. ' + DATA.status + ' - if you are hiring, say hi.', 'color:#ff2d86;' + base);
      console.log('%cGitHub  %c' + DATA.gh + '\n%cEmail   %c' + DATA.email, 'color:#8b95aa;' + base, 'color:#00ffff;' + base, 'color:#8b95aa;' + base, 'color:#00ffff;' + base);
      console.log('%cTip: there is a Konami code hidden on this site.', 'color:#8b95aa;font-style:italic;' + base);
    } catch (e) { /* ignore */ }
  }

  /* ================================================================== 10  KONAMI -> OVERDRIVE */
  var odTimer = 0, flashEl = null;
  function overdrive() {
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

      /* Control or Command with the letter K toggles the palette (also from inside inputs, like every command palette); no hint is shown on screen */
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
  /* the visual extras run one per idle slot after first paint, so no single task blocks the page while it loads */
  function idleQueue(steps) {
    var ric = win.requestIdleCallback;
    (function next() {
      var step = steps.shift();
      if (!step) return;
      var go = function () { safe(step[0], step[1]); next(); };
      if (ric) ric(go, { timeout: 1500 }); else setTimeout(go, 60);
    })();
  }
  function init() {
    safe('banner', banner);
    safe('pointer', initPointer);
    safe('keys', initKeys);
    idleQueue([
      ['network', initNetwork],
      ['orb', initOrb],
      ['curlabel', initCursorLabel],
      ['scramble', initScramble],
      ['eyebrows', function () { qsa('.section[id] .eyebrow').forEach(function (n) { if (!n.hasAttribute('data-scramble')) n.setAttribute('data-scramble', '650'); }); }],   /* text-decrypt on the section eyebrows (never on titles) */
      ['scan', scanAll],
      ['watch', watchDom],
      ['accent', initAccentWidget]
    ]);
    on('portfolio:open-palette', function () {
      /* give other dialogs (project case study) a tick to close and hand focus back before we take it */
      setTimeout(function () { safe('palette', function () { openPalette(); }); }, 0);
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
