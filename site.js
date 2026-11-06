// Content (from content.json, built from the Obsidian vault by build.py) and routing:
//   /#  home   |   /#about   |   /#projects   |   /p/<slug>/  a post (its own page, made by build.py)
const contentReady = fetch('content.json').then(r => r.json());

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Obsidian links are relative to the note (folder = 'vault/' or 'vault/projects/'); make them site links.
function renderMarkdown(md, projects, folder) {
    const el = document.createElement('div');
    el.innerHTML = marked.parse(md);
    el.querySelectorAll('img').forEach(img => {
        img.src = new URL(img.getAttribute('src'), location.origin + '/' + folder).href;
    });
    el.querySelectorAll('a[href$=".md"]').forEach(a => {
        const file = decodeURIComponent(a.getAttribute('href')).split('/').pop();
        const target = projects.find(p => p.file === file);
        if (target) a.href = postUrl(target);
    });
    return el.innerHTML;
}

const postUrl = p => `p/${p.slug}/`;

function metaLine(p) {
    return `<div class="meta"><span class="type">${escapeHtml(p.type)}</span>` +
        (p.date ? ` · ${escapeHtml(p.date)}` : '') + '</div>';
}

function renderTiles(projects) {
    document.getElementById('tiles').innerHTML = projects.map(p => `
        <a class="tile" data-type="${escapeHtml(p.type)}" href="${postUrl(p)}">
            ${metaLine(p)}
            <h2>${escapeHtml(p.title)}</h2>
            <p>${escapeHtml(p.summary)}</p>
        </a>`).join('');
}

function renderPost(p, projects) {
    document.getElementById('post').innerHTML = `
        <p><a href="#projects">← Projects</a></p>
        ${metaLine(p)}
        <h1>${escapeHtml(p.title)}</h1>
        ${p.link ? `<p><a href="${escapeHtml(p.link)}">${escapeHtml(p.link)}</a></p>` : ''}
        ${renderMarkdown(p.body, projects, 'vault/projects/')}`;
}

function show(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === sectionId));
    document.querySelectorAll('nav a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === '#' + sectionId ||
            (sectionId === 'post' && a.getAttribute('href') === '#projects')));
    document.querySelector('.content').scrollTop = 0;
}

function route() {
    const [page, slug] = location.hash.slice(1).split('/');
    if (slug) return location.replace(`/p/${slug}/`);   // old #projects/<slug> links
    show(page === 'about' || page === 'projects' ? page : 'home');
}

const postSlug = location.pathname.match(/^\/p\/([^/]+)/)?.[1];
if (postSlug) {
    contentReady.then(({ projects }) => {
        const post = projects.find(p => p.slug === postSlug);
        if (post) renderPost(post, projects);
        show('post');
    });
} else {
    route();
    // Count About/Projects views too (GoatCounter only sees the first page load by itself)
    window.addEventListener('hashchange', () => {
        route();
        window.goatcounter?.count?.({ path: '/' + location.hash });
    });
}

contentReady.then(({ cv, projects }) => {
    document.getElementById('cv').innerHTML = renderMarkdown(cv, projects, 'vault/');
    renderTiles(projects);
});

// Theme toggle (initial theme is set in <head>)
document.getElementById('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
});
