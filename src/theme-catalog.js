const FAMILY_SEEDS = [
  { id: "editorial", name: "Editorial", category: "Editorial", layout: "editorial", blueprints: ["blog", "news", "diary"], features: ["Reading progress", "Pull quote", "Author rail"] },
  { id: "journal", name: "Journal", category: "Kreator", layout: "journal", blueprints: ["blog", "profile", "diary"], features: ["Story series", "Newsletter", "Reading mode"] },
  { id: "newsroom", name: "Newsroom", category: "Berita", layout: "newsroom", blueprints: ["news", "blog"], features: ["Breaking ticker", "Multi desk", "Live update"] },
  { id: "business", name: "Business", category: "Bisnis", layout: "business", blueprints: ["website", "landing", "portfolio"], features: ["Service grid", "Case studies", "Lead capture"] },
  { id: "launch", name: "Launch", category: "Landing", layout: "landing", blueprints: ["landing", "website", "profile"], features: ["Sticky CTA", "Social proof", "Conversion blocks"] },
  { id: "collective", name: "Collective", category: "Komunitas", layout: "community", blueprints: ["community", "forum", "knowledge"], features: ["Member feed", "Events", "Group spaces"] },
  { id: "forum", name: "Forum", category: "Komunitas", layout: "forum", blueprints: ["forum", "community", "knowledge"], features: ["Solved topics", "Reputation", "Moderation"] },
  { id: "canvas", name: "Canvas", category: "Portofolio", layout: "portfolio", blueprints: ["portfolio", "profile", "website"], features: ["Project gallery", "Case study", "Contact flow"] },
  { id: "identity", name: "Identity", category: "Profil", layout: "profile", blueprints: ["profile", "portfolio", "landing"], features: ["Link hub", "Bio blocks", "Instant contact"] },
  { id: "diary", name: "Diary", category: "Personal", layout: "diary", blueprints: ["diary", "blog", "profile"], features: ["Mood archive", "Calendar", "Private notes"] },
  { id: "atlas", name: "Atlas", category: "Dokumentasi", layout: "knowledge", blueprints: ["knowledge", "website", "community"], features: ["Command search", "Version docs", "Auto TOC"] },
  { id: "magazine", name: "Magazine", category: "Majalah", layout: "magazine", blueprints: ["blog", "news", "website"], features: ["Cover story", "Issue archive", "Editorial grid"] },
  { id: "market", name: "Market", category: "Toko", layout: "store", blueprints: ["website", "landing", "portfolio"], features: ["Product stories", "Offer bar", "Trust badges"] },
  { id: "voyage", name: "Voyage", category: "Perjalanan", layout: "travel", blueprints: ["blog", "portfolio", "diary"], features: ["Destination map", "Trip notes", "Photo journal"] },
  { id: "table", name: "Table", category: "Kuliner", layout: "food", blueprints: ["blog", "website", "portfolio"], features: ["Recipe cards", "Menu blocks", "Reservation CTA"] },
  { id: "academy", name: "Academy", category: "Edukasi", layout: "education", blueprints: ["knowledge", "website", "community"], features: ["Course tracks", "Progress cards", "Resource library"] },
  { id: "wellness", name: "Wellness", category: "Kesehatan", layout: "health", blueprints: ["website", "blog", "community"], features: ["Expert cards", "Program timeline", "Appointment CTA"] },
  { id: "circuit", name: "Circuit", category: "Teknologi", layout: "tech", blueprints: ["website", "blog", "landing"], features: ["Changelog", "Feature matrix", "Developer CTA"] },
  { id: "lens", name: "Lens", category: "Fotografi", layout: "photography", blueprints: ["portfolio", "profile", "blog"], features: ["Masonry gallery", "Lightbox", "EXIF notes"] },
  { id: "studio", name: "Studio", category: "Podcast", layout: "podcast", blueprints: ["blog", "community", "profile"], features: ["Episode player", "Guest cards", "Subscribe links"] },
];

const VARIANTS = [
  { id: "prime", label: "Prime", badge: "Signature", hue: 218, saturation: 64, light: 38, accentHue: 38, surface: 97, radius: 10, font: "DM Sans" },
  { id: "dawn", label: "Dawn", badge: "Bright", hue: 18, saturation: 72, light: 42, accentHue: 164, surface: 98, radius: 22, font: "Playfair Display" },
  { id: "night", label: "Night", badge: "Dark", hue: 252, saturation: 48, light: 22, accentHue: 86, surface: 11, radius: 14, font: "DM Sans", dark: true },
  { id: "coast", label: "Coast", badge: "Fresh", hue: 188, saturation: 66, light: 32, accentHue: 24, surface: 97, radius: 28, font: "DM Sans" },
  { id: "atelier", label: "Atelier", badge: "Artisan", hue: 338, saturation: 45, light: 36, accentHue: 46, surface: 96, radius: 4, font: "Playfair Display" },
];

const clampHue = (value) => ((value % 360) + 360) % 360;
const hsl = (h, s, l) => `hsl(${clampHue(h)} ${s}% ${l}%)`;

function layoutMarkup(theme) {
  const commonHeader = `<header class="ng-header"><a class="ng-brand" href="#">${theme.name}<i>.</i></a><nav><a href="#stories">Stories</a><a href="#about">About</a><a href="#contact">Contact</a></nav><button aria-label="Open menu">Menu</button></header>`;
  const cards = `<div class="ng-cards"><article><small>FEATURED</small><h3>Ideas that deserve a remarkable home.</h3><p>Publish faster with a responsive, accessible, and search-ready foundation.</p></article><article><small>NEW</small><h3>Built for every screen.</h3><p>Desktop, tablet, and mobile layouts adapt without losing hierarchy.</p></article><article><small>COMMUNITY</small><h3>Grow an audience you own.</h3><p>Connect posts, pages, media, memberships, and newsletters.</p></article></div>`;
  const hero = `<section class="ng-hero"><div><span>${theme.category.toUpperCase()} · NGEBlOGGING ORIGINAL</span><h1>${theme.name}: a distinct digital space.</h1><p>${theme.description}</p><a href="#stories">Explore the experience</a></div><aside><b>Responsive by design</b><span>Desktop</span><span>Tablet</span><span>Mobile</span></aside></section>`;
  const layouts = {
    editorial: `${hero}<section id="stories" class="ng-section split"><h2>Long-form stories with editorial rhythm.</h2>${cards}</section>`,
    journal: `${hero}<section id="stories" class="ng-section journal-line"><p>01 — Notes</p>${cards}</section>`,
    newsroom: `<section class="ng-ticker">LIVE · Independent publishing infrastructure · Global edge delivery</section>${hero}<section id="stories" class="ng-section newsroom-grid">${cards}</section>`,
    business: `${hero}<section id="stories" class="ng-section"><h2>Services, proof, and a clear path to action.</h2>${cards}</section>`,
    landing: `${hero}<section id="stories" class="ng-section centered"><h2>One promise. One audience. One action.</h2>${cards}</section>`,
    community: `${hero}<section id="stories" class="ng-section community-feed"><h2>People, spaces, and shared momentum.</h2>${cards}</section>`,
    forum: `${hero}<section id="stories" class="ng-section forum-list"><h2>Questions worth answering.</h2>${cards}</section>`,
    portfolio: `${hero}<section id="stories" class="ng-section portfolio-grid"><h2>Selected work.</h2>${cards}</section>`,
    profile: `${hero}<section id="stories" class="ng-section profile-links"><h2>Everything important, one link away.</h2>${cards}</section>`,
    diary: `${hero}<section id="stories" class="ng-section diary-paper"><h2>Entries and moments.</h2>${cards}</section>`,
    knowledge: `${hero}<section id="stories" class="ng-section docs-layout"><aside>Getting started<br/>Guides<br/>Reference</aside>${cards}</section>`,
    magazine: `${hero}<section id="stories" class="ng-section magazine-cover"><h2>The new issue.</h2>${cards}</section>`,
    store: `${hero}<section id="stories" class="ng-section store-grid"><h2>Products with a story.</h2>${cards}</section>`,
    travel: `${hero}<section id="stories" class="ng-section travel-route"><h2>Journeys, mapped beautifully.</h2>${cards}</section>`,
    food: `${hero}<section id="stories" class="ng-section food-menu"><h2>Recipes, menus, and gatherings.</h2>${cards}</section>`,
    education: `${hero}<section id="stories" class="ng-section education-path"><h2>Learn in a clear sequence.</h2>${cards}</section>`,
    health: `${hero}<section id="stories" class="ng-section health-program"><h2>Trusted guidance with calm clarity.</h2>${cards}</section>`,
    tech: `${hero}<section id="stories" class="ng-section tech-grid"><h2>Ship the future with confidence.</h2>${cards}</section>`,
    photography: `${hero}<section id="stories" class="ng-section photo-wall"><h2>Frames that speak first.</h2>${cards}</section>`,
    podcast: `${hero}<section id="stories" class="ng-section podcast-list"><h2>Latest episodes.</h2>${cards}</section>`,
  };
  return `${commonHeader}<main>${layouts[theme.layout] || `${hero}${cards}`}</main><footer id="contact"><b>${theme.name}</b><span>Powered by Ngeblogging</span></footer>`;
}

function layoutCss(layout) {
  const rules = {
    editorial: `.ng-hero h1{font-family:Georgia,serif}.split{display:grid;grid-template-columns:.7fr 1.3fr}.split>h2{position:sticky;top:30px;height:max-content}`,
    journal: `.ng-hero{border-bottom:1px dashed var(--line)}.journal-line>p{writing-mode:vertical-rl;float:left;margin-right:24px;letter-spacing:.18em}`,
    newsroom: `.ng-ticker{padding:10px 4vw;background:var(--ink);color:var(--surface);font-size:.72rem;letter-spacing:.12em}.newsroom-grid .ng-cards{grid-template-columns:1.5fr 1fr 1fr}`,
    business: `.ng-hero{background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary),black 28%));color:white}.ng-hero aside{border-color:#ffffff44}`,
    landing: `.ng-hero{text-align:center}.ng-hero>div{margin:auto}.ng-hero aside{display:none}.centered{text-align:center}`,
    community: `.community-feed .ng-cards article{border-left:6px solid var(--accent)}`,
    forum: `.forum-list .ng-cards{display:block}.forum-list article{display:grid;grid-template-columns:110px 1fr;gap:20px;margin-bottom:12px}`,
    portfolio: `.portfolio-grid .ng-cards{grid-template-columns:2fr 1fr}.portfolio-grid article:first-child{grid-row:span 2;min-height:420px}`,
    profile: `.profile-links .ng-cards{display:flex;flex-direction:column}.profile-links article{border-radius:999px;display:grid;grid-template-columns:100px 1fr;align-items:center}`,
    diary: `.diary-paper{max-width:860px;margin:auto;background:color-mix(in srgb,var(--surface),white 35%);box-shadow:0 30px 90px #00000012}`,
    knowledge: `.docs-layout{display:grid;grid-template-columns:220px 1fr}.docs-layout>aside{line-height:2.4;border-right:1px solid var(--line)}`,
    magazine: `.magazine-cover .ng-cards article:first-child{transform:rotate(-1deg)}.magazine-cover .ng-cards article:nth-child(2){transform:rotate(1deg)}`,
    store: `.store-grid article{min-height:300px;background:linear-gradient(180deg,transparent 55%,color-mix(in srgb,var(--accent),transparent 70%))}`,
    travel: `.travel-route{background-image:radial-gradient(var(--accent) 1px,transparent 1px);background-size:24px 24px}`,
    food: `.food-menu article{border-top:4px double var(--primary)}`,
    education: `.education-path article{counter-increment:course}.education-path article:before{content:'0' counter(course);font-size:2rem;color:var(--accent)}`,
    health: `.health-program{border-radius:calc(var(--radius)*2);background:color-mix(in srgb,var(--primary),white 92%)}`,
    tech: `.tech-grid{background:linear-gradient(180deg,color-mix(in srgb,var(--primary),black 62%),var(--ink));color:white}.tech-grid article{background:#ffffff0d;border-color:#ffffff25}`,
    photography: `.photo-wall .ng-cards{grid-template-columns:1.4fr .8fr .8fr}.photo-wall article{min-height:360px;color:white;background:linear-gradient(145deg,var(--primary),var(--accent))}`,
    podcast: `.podcast-list article{padding-left:90px;position:relative}.podcast-list article:before{content:'▶';position:absolute;left:26px;top:32px;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:var(--ink)}`,
  };
  return rules[layout] || "";
}

function buildThemeCode(theme) {
  const html = `<div class="ng-theme" data-theme="${theme.id}">${layoutMarkup(theme)}</div>`;
  const css = `:root{--primary:${theme.colors.primary};--accent:${theme.colors.accent};--surface:${theme.colors.surface};--ink:${theme.colors.ink};--line:color-mix(in srgb,var(--ink),transparent 82%);--radius:${theme.radius}px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--surface);color:var(--ink);font-family:${theme.font === "Playfair Display" ? "Georgia,serif" : "Arial,sans-serif"};line-height:1.6}.ng-theme{min-height:100vh}.ng-header{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--surface),transparent 8%);position:sticky;top:0;z-index:10;backdrop-filter:blur(18px)}.ng-brand{font-size:1.25rem;font-weight:800;color:inherit;text-decoration:none}.ng-brand i{color:var(--accent)}.ng-header nav{display:flex;gap:24px}.ng-header nav a{color:inherit;text-decoration:none;font-size:.86rem}.ng-header button{display:none;border:0;border-radius:999px;padding:10px 14px;background:var(--primary);color:white}.ng-hero{min-height:620px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);align-items:center;gap:7vw;padding:clamp(70px,10vw,140px) clamp(20px,7vw,110px)}.ng-hero>div{max-width:880px}.ng-hero span,.ng-section small{font-size:.72rem;font-weight:800;letter-spacing:.14em}.ng-hero h1{font-size:clamp(3rem,8vw,7.4rem);line-height:.92;letter-spacing:-.065em;margin:.25em 0}.ng-hero p{max-width:680px;font-size:clamp(1rem,2vw,1.25rem);opacity:.78}.ng-hero a{display:inline-flex;margin-top:22px;padding:14px 20px;border-radius:999px;background:var(--accent);color:var(--ink);font-weight:800;text-decoration:none}.ng-hero aside{display:grid;gap:10px;padding:28px;border:1px solid var(--line);border-radius:var(--radius)}.ng-section{padding:clamp(58px,8vw,110px) clamp(20px,7vw,110px)}.ng-section>h2{font-size:clamp(2rem,5vw,4.5rem);line-height:1.02;letter-spacing:-.04em}.ng-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.ng-cards article{padding:clamp(22px,3vw,38px);border:1px solid var(--line);border-radius:var(--radius);background:color-mix(in srgb,var(--surface),white 10%);box-shadow:0 20px 55px #0000000b}.ng-cards h3{font-size:clamp(1.25rem,2vw,2rem);line-height:1.15}.ng-cards p{opacity:.72}footer{display:flex;justify-content:space-between;gap:20px;padding:36px clamp(20px,7vw,110px);border-top:1px solid var(--line)}${layoutCss(theme.layout)}@media(max-width:1024px){.ng-hero{min-height:auto;grid-template-columns:1fr;padding-top:90px}.ng-hero aside{grid-template-columns:repeat(3,1fr)}.ng-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.split,.docs-layout{grid-template-columns:1fr}.photo-wall .ng-cards,.portfolio-grid .ng-cards,.newsroom-grid .ng-cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.ng-header{min-height:62px}.ng-header nav{display:none}.ng-header button{display:block}.ng-hero{padding:66px 18px}.ng-hero h1{font-size:clamp(2.7rem,14vw,4.8rem)}.ng-hero aside{grid-template-columns:1fr}.ng-section{padding:52px 18px}.ng-cards,.photo-wall .ng-cards,.portfolio-grid .ng-cards,.newsroom-grid .ng-cards{grid-template-columns:1fr}.forum-list article,.profile-links article{grid-template-columns:1fr}.portfolio-grid article:first-child{min-height:260px}.docs-layout>aside{display:none}footer{padding:30px 18px;flex-direction:column}}`;
  const javascript = `document.querySelector('[data-theme="${theme.id}"] .ng-header button')?.addEventListener('click',()=>document.querySelector('[data-theme="${theme.id}"] .ng-header nav')?.classList.toggle('open'));`;
  return { enabled: false, html, css, javascript };
}

export const BUILT_IN_THEMES = FAMILY_SEEDS.flatMap((family, familyIndex) => VARIANTS.map((variant, variantIndex) => {
  const hue = clampHue(variant.hue + familyIndex * 17 + variantIndex * 7);
  const accentHue = clampHue(variant.accentHue + familyIndex * 23);
  const dark = Boolean(variant.dark);
  const theme = {
    id: `${family.id}-${variant.id}`,
    name: `${family.name} ${variant.label}`,
    category: family.category,
    badge: variant.badge,
    description: `${family.name} dengan karakter ${variant.label.toLowerCase()}, struktur ${family.layout}, dan pengalaman responsif yang berbeda di setiap perangkat.`,
    colors: {
      primary: hsl(hue, variant.saturation, variant.light),
      accent: hsl(accentHue, 78, dark ? 58 : 48),
      surface: hsl(hue + 8, dark ? 22 : 34, variant.surface),
      ink: dark ? hsl(hue + 4, 18, 92) : hsl(hue + 4, 34, 14),
    },
    font: variant.font,
    radius: variant.radius,
    layout: family.layout,
    blueprints: family.blueprints,
    features: family.features,
    defaultWidgetIds: ["search", "recent-posts", familyIndex % 2 ? "newsletter" : "popular-posts", familyIndex % 3 ? "tags" : "categories"],
  };
  theme.code = buildThemeCode(theme);
  return theme;
}));

export function themeCodeFor(theme) {
  return theme?.code || BUILT_IN_THEMES[0].code;
}

export const THEME_COUNT = BUILT_IN_THEMES.length;
