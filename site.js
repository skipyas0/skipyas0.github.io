// Content (from content.json, built from the Obsidian vault by build.py) and hash routing:
//   #  home   |   #about   |   #projects   |   #projects/<slug>
const contentReady = fetch('content.json').then(r => r.json());

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Turn vault-relative links/images (as Obsidian writes them) into site links.
function renderMarkdown(md, projects) {
    const el = document.createElement('div');
    el.innerHTML = marked.parse(md);
    el.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (!/^([a-z]+:|\/)/i.test(src)) img.src = 'vault/' + src;
    });
    el.querySelectorAll('a[href$=".md"]').forEach(a => {
        const file = decodeURIComponent(a.getAttribute('href')).split('/').pop();
        const target = projects.find(p => p.file === file);
        if (target) a.href = '#projects/' + target.slug;
    });
    return el.innerHTML;
}

function metaLine(p) {
    return `<div class="meta"><span class="type">${escapeHtml(p.type)}</span>` +
        (p.date ? ` · ${escapeHtml(p.date)}` : '') + '</div>';
}

function renderTiles(projects) {
    document.getElementById('tiles').innerHTML = projects.map(p => `
        <a class="tile" data-type="${escapeHtml(p.type)}" href="#projects/${p.slug}">
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
        ${renderMarkdown(p.body, projects)}`;
}

function show(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === sectionId));
    document.querySelectorAll('nav a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === '#' + sectionId ||
            (sectionId === 'post' && a.getAttribute('href') === '#projects')));
    document.querySelector('.content').scrollTop = 0;
}

async function route() {
    const [page, slug] = location.hash.slice(1).split('/');
    if (page === 'about' || page === 'projects') {
        const { projects } = await contentReady;
        const post = slug && projects.find(p => p.slug === slug);
        if (post) {
            renderPost(post, projects);
            document.title = post.title + ' — Vojtěch Klouda';
            return show('post');
        }
        document.title = 'Vojtěch Klouda';
        return show(page);
    }
    document.title = 'Vojtěch Klouda';
    show('home');
}

contentReady.then(({ cv, projects }) => {
    document.getElementById('cv').innerHTML = renderMarkdown(cv, projects);
    renderTiles(projects);
});
window.addEventListener('hashchange', route);
route();

// Theme toggle (initial theme is set in <head>)
document.getElementById('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
});
