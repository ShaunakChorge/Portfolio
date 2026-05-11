## Shaunak Chorge – Personal Portfolio 🚀

A **responsive, component‑based portfolio website** showcasing my professional journey, projects, and skills. Built with vanilla HTML, CSS, and JavaScript, the site is structured for maintainability, dynamic loading, and premium visual design.

---

### ✨ Project Highlights
- **Modular Architecture** – All major sections (`home`, `about`, `skills`, `qualification`, `portfolio`, `contact`, `footer`) live in `components/` and are injected at runtime via `packages/js/loadComponents.js`.
- **Premium UI** – Modern typography, smooth gradients, glass‑morphism cards, and micro‑animations create a wow‑factor experience.
- **Dynamic Image Management** – Images are stored in `packages/images/` with clear, descriptive names. Thumbnails follow a `thumbnail_` naming convention; unused assets are safely isolated in `packages/images/trash/`.
- **Responsive Design** – Fully mobile‑first, using CSS Grid/Flex and media queries.
- **Easy Deployment** – Works out‑of‑the‑box on GitHub Pages; just push the repository.

---

### 🛠️ Tech Stack
- **HTML5** – Semantic markup with sections and ARIA‑friendly attributes.
- **CSS3** – Custom design system, variables, and animations (no frameworks).
- **JavaScript (ES6+)** – Component loader, Swiper carousel, theme toggling.
- **Git** – Version control, CI‑ready.
- **GitHub Pages** – Static site hosting.

---

### 📁 Project Structure
```
Portfolio/
├─ components/           # HTML fragments for each page section
│   ├─ about.html
│   ├─ home.html
│   ├─ portfolio.html
│   ├─ qualification.html
│   └─ …
├─ packages/
│   ├─ css/               # styles.css, swiper‑bundle.min.css
│   ├─ images/            # all used images + thumbnails
│   │   ├─ thumbnail_*.jpeg
│   │   └─ trash/          # unused assets (safe to delete)
│   └─ js/                # main.js, loadComponents.js, swiper‑bundle.min.js
├─ index.html            # primary entry point with placeholders
├─ README.md             # this documentation
└─ .git/                # Git repository (auto‑generated)
```

---

### 🔧 Development Workflow
1. **Clone the repo**
   ```bash
   git clone https://github.com/ShaunakChorge/Portfolio.git
   cd Portfolio
   ```
2. **Serve locally** (required for `fetch` used by `loadComponents.js`)
   ```bash
   npx -y http-server ./ -p 8080   # or use VS Code Live Server
   ```
3. **Edit components** – modify any file inside `components/`; the changes appear instantly after a page reload.
4. **Add/rename images** – place new assets in `packages/images/`. Follow the `thumbnail_` prefix for gallery images and run `update_image_refs.py` (already included) to auto‑update HTML src attributes.
5. **Commit & push** – see the **Git workflow** section below.

---

### 📤 Deployment to GitHub Pages
The repository is configured for static hosting. After pushing, enable GitHub Pages in the repo settings (source → `master`/`main` branch, root folder). The site will be live at:
```
https://ShaunakChorge.github.io/Portfolio/
```

---

### 🤝 Contributing
Feel free to fork, open issues, or submit pull requests. When adding new sections, create a matching component file and register it in `loadComponents.js`.

---

### 📜 License
This project is released under the **MIT License** – you may use, modify, and distribute it freely.

---

*Built with love by **Shaunak Chorge** – always learning, always creating.*
