const components = [
  { id: "header-placeholder", url: "./components/header.html" },
  { id: "home-placeholder", url: "./components/home.html" },
  { id: "about-placeholder", url: "./components/about.html" },
  { id: "skills-placeholder", url: "./components/skills.html" },
  { id: "qualification-placeholder", url: "./components/qualification.html" },
  { id: "portfolio-placeholder", url: "./components/portfolio.html" },
  { id: "contact-placeholder", url: "./components/contact.html" },
  { id: "footer-placeholder", url: "./components/footer.html" },
];

// We fetch all components and then inject them
Promise.all(
  components.map((cmp) =>
    fetch(cmp.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${cmp.url}`);
        }
        return response.text();
      })
      .then((html) => {
        const placeholder = document.getElementById(cmp.id);
        if (placeholder) {
          placeholder.outerHTML = html; // Replace the placeholder entirely
        }
      }),
  ),
)
  .then(() => {
    // After all components are successfully loaded, inject the main.js script
    // This ensures event listeners in main.js bind correctly to the newly injected elements
    const script = document.createElement("script");
    script.src = "./packages/js/main.js";
    document.body.appendChild(script);
  })
  .catch((err) => {
    console.error("Error loading components:", err);
    document.body.innerHTML += `<div style="color:red; text-align:center; margin-top:20px;">
      Error loading components. If you are opening this file locally (file://), you need to use a local web server (like VS Code Live Server) due to CORS restrictions on fetch().
    </div>`;
  });
