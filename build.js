/**
 * BUILD SCRIPT - Run this before pushing to GitHub
 * 
 * What it does:
 * 1. Fetches all project data from your Google Sheet
 * 2. Generates a static HTML page for each project (SEO-friendly)
 * 3. Updates sitemap.xml with all project URLs
 * 
 * Usage: node build.js
 * 
 * Requirements: Node.js installed (run once: npm install)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============
const SHEET_ID = '1gtu1WSMvPOrPn1qzD2smIdSajVTqeOmH272c9LW6a1c';
const SHEET_NAME = 'project details';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
const SITE_URL = 'https://www.studio4core.com';
const OUTPUT_DIR = path.join(__dirname, 'assets', 'projects', 'Architecture', 'projects');

// ============ FETCH CSV ============
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ============ SIMPLE CSV PARSER ============
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell.length > 0)) rows.push(row);
  }
  return rows;
}

// ============ PROCESS GOOGLE DRIVE IMAGES ============
function processImg(url) {
  if (!url) return 'https://www.studio4core.com/assets/images/logo.jpg';
  url = url.trim();
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w4000`;
    }
  }
  return url;
}

// ============ SLUGIFY PROJECT NAME ============
function slugify(name) {
  return encodeURIComponent(name.trim());
}

// ============ ESCAPE HTML ============
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ GENERATE HTML FOR ONE PROJECT ============
function generateProjectHTML(project) {
  const title = escapeHtml(project.title);
  // Normalize category: replace underscores with spaces
  const rawCategory = (project.category || 'Architecture').replace(/_/g, ' ').trim();
  const category = escapeHtml(rawCategory);
  // Normalize location: ensure space after comma
  const rawLocation = (project.location || 'India').replace(/\s*,\s*/g, ', ').trim();
  const location = escapeHtml(rawLocation);
  const locationParts = rawLocation.split(',').map(s => s.trim()).filter(Boolean);
  const city = locationParts[0] || '';
  const region = locationParts[1] || '';

  // Better SEO title — includes location and category for matching search intent
  const seoTitle = location && location !== 'India'
    ? `${title}, ${location} | ${category} by Studio4Core`
    : `${title} | ${category} by Studio4Core`;

  // Description: prefer real content from sheet, but enrich with metadata
  const baseDesc = (project.description || '').replace(/\s+/g, ' ').trim();
  const enrichedDesc = baseDesc
    ? `${baseDesc.substring(0, 155)}${baseDesc.length > 155 ? '...' : ''}`
    : `${title} — ${category} project${location ? ' in ' + location : ''} by Studio4Core. View design concept, photographs, and project details.`;
  const description = escapeHtml(enrichedDesc);

  const heroImg = processImg(project.heroImage);
  const descImg = processImg(project.descImage);
  const galleryImages = (project.galleryRaw || '').split(',').map(u => u.trim()).filter(u => u.length > 5);
  
  const galleryHTML = galleryImages.map((url, i) => 
    `<img src="${processImg(url)}" alt="${title} ${category} project ${city ? 'in ' + city + ' ' : ''}- photo ${i + 1}" loading="lazy">`
  ).join('\n        ');

  const videoUrl = project.videoUrl ? project.videoUrl.trim() : '';
  let heroMediaHTML = '';
  
  if (videoUrl) {
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch && ytMatch[1]) {
      const vidId = ytMatch[1];
      heroMediaHTML = `
      <div class="video-hero-container">
        <iframe src="https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${vidId}&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>`;
    } else {
      heroMediaHTML = `
      <div class="video-hero-container">
        <video autoplay muted loop playsinline>
          <source src="${videoUrl}" type="video/mp4">
        </video>
      </div>`;
    }
  } else {
    heroMediaHTML = `
      <div class="single-img">
        <img src="${heroImg}" alt="${title}" onerror="this.src='https://via.placeholder.com/800x600?text=Image+Error'">
      </div>`;
  }

  const projectUrl = `${SITE_URL}/assets/projects/Architecture/projects/?project=${slugify(project.title)}`;
  const descriptionText = project.description || '';

  const keywords = [
    title,
    `${title} ${city}`,
    `${title} architect`,
    `${title} ${category}`,
    `${category} ${city}`,
    `Studio4Core ${title}`,
    'Studio4Core',
    `${category} firm India`,
    city,
    region
  ].filter(k => k && k.trim()).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${seoTitle}</title>
<meta name="description" content="${description}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="author" content="Studio4Core">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${projectUrl}">

<meta property="og:type" content="article">
<meta property="og:title" content="${seoTitle}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${projectUrl}">
<meta property="og:site_name" content="Studio4Core">
<meta property="og:image" content="${heroImg}">
<meta property="og:image:alt" content="${title} - ${category} by Studio4Core">
<meta property="og:locale" content="en_IN">
<meta property="article:author" content="Studio4Core">
<meta property="article:section" content="${category}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${seoTitle}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${heroImg}">

<link rel="icon" type="image/png" href="../../../../assets/images/logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../../css/style.css">
<link rel="stylesheet" href="../../../css/detailproject.css">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "${title}",
  "alternateName": "${title} ${city}",
  "description": "${escapeHtml(descriptionText.substring(0, 500).replace(/\s+/g, ' ').trim())}",
  "image": ["${heroImg}"${galleryImages.length ? ', "' + galleryImages.slice(0, 5).map(u => processImg(u)).join('", "') + '"' : ''}],
  "author": {
    "@type": "Organization",
    "name": "Studio4Core",
    "url": "https://www.studio4core.com",
    "logo": "https://www.studio4core.com/assets/images/logo.jpg",
    "sameAs": ["https://www.instagram.com/studio4core/", "https://www.linkedin.com/in/studio-4core-6b2b043b5/"]
  },
  "creator": {
    "@type": "Organization",
    "name": "Studio4Core",
    "url": "https://www.studio4core.com"
  },
  "locationCreated": {
    "@type": "Place",
    "name": "${escapeHtml(project.location || 'India')}",
    "address": {"@type": "PostalAddress", "addressLocality": "${escapeHtml(city)}", "addressRegion": "${escapeHtml(region)}", "addressCountry": "IN"}
  },
  "genre": "${category}",
  "keywords": "${escapeHtml(keywords)}",
  "url": "${projectUrl}"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.studio4core.com/"},
    {"@type": "ListItem", "position": 2, "name": "Projects", "item": "https://www.studio4core.com/assets/projects/Architecture/"},
    {"@type": "ListItem", "position": 3, "name": "${title}", "item": "${projectUrl}"}
  ]
}
</script>

<style>
  .site-header {
    background: rgba(250, 249, 247, 0.9) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border-bottom: 1px solid rgba(0,0,0,0.05) !important;
  }
  .site-header .brand, .site-header .site-nav a { color: #111 !important; }
  .site-header .menu-toggle span { background: #111 !important; }
  #loading { text-align: center; padding: 100px 20px; font-size: 1.2rem; color: #888; }
  .component-text { white-space: pre-line; }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
    margin-top: 40px;
  }
  .gallery-grid img { width: 100%; height: 300px; object-fit: cover; border-radius: 4px; cursor: pointer; transition: transform 0.3s; }
  .gallery-grid img:hover { transform: translateY(-5px); }
  .video-hero-container { position: relative; width: 100%; padding-bottom: 45%; height: 0; background: #000; overflow: hidden; margin-bottom: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  .video-hero-container iframe { position: absolute; width: 100%; height: 125%; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 0; pointer-events: none; }
  .project-header { padding-top: 50px; margin-bottom: 40px; }
  .project-breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 15px; word-wrap: break-word; }
  .project-breadcrumb a { color: #666; text-decoration: none; transition: color 0.2s; }
  .project-breadcrumb a:hover { color: #000; }
  .project-h1.component-title { margin: 0 0 12px 0 !important; font-size: clamp(1.6rem, 4.2vw, 3rem) !important; line-height: 1.15 !important; word-wrap: break-word; overflow-wrap: anywhere; hyphens: auto; }
  .project-subtitle { font-size: 1rem; color: #555; margin: 0; line-height: 1.5; }
  .project-subtitle a { color: #000; font-weight: 600; text-decoration: none; border-bottom: 1px solid currentColor; }
  @media (max-width: 768px) { .project-header { padding-top: 30px; margin-bottom: 25px; } .project-h1.component-title { font-size: clamp(1.4rem, 6vw, 2.2rem) !important; } .project-subtitle { font-size: 0.9rem; } }
  @media (max-width: 480px) { .project-h1.component-title { font-size: clamp(1.3rem, 7vw, 1.9rem) !important; } .project-subtitle { font-size: 0.85rem; } }
  .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background-color: rgba(255,255,255,0.1); color: white; border: none; font-size: 3rem; padding: 10px 20px; cursor: pointer; z-index: 1002; border-radius: 5px; user-select: none; transition: background 0.3s; }
  .lightbox-nav:hover { background-color: rgba(255,255,255,0.3); color: #f0c14a; }
  .lightbox-prev { left: 20px; }
  .lightbox-next { right: 20px; }
  @media (max-width: 600px) { .lightbox-nav { font-size: 2rem; padding: 5px 10px; } .lightbox-prev { left: 10px; } .lightbox-next { right: 10px; } }
</style>
</head>

<body>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="../../../../" style="display: flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none;">
      <img src="../../../../assets/images/logo.jpg" style="max-width: 30px; max-height: 30px;" alt="Studio4Core Logo">
      Studio4Core
    </a>
    <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <nav class="site-nav" aria-label="Primary navigation">
      <ul>
        <li><a href="../../">Services</a></li>
        <li><a href="../../../contact/">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>

<main class="component-body">
  <div class="project-header">
    <nav aria-label="breadcrumb" class="project-breadcrumb">
      <a href="../../../../">Home</a> &rsaquo;
      <a href="../">Projects</a> &rsaquo;
      <span>${title}</span>
    </nav>
    <h1 class="component-title component-head project-h1">${title}${city ? ', ' + escapeHtml(city) : ''}</h1>
    <p class="project-subtitle"><strong>${category}</strong> project${location ? ' in <strong>' + location + '</strong>' : ''} &mdash; Designed by <a href="https://www.studio4core.com">Studio4Core</a></p>
  </div>
  ${heroMediaHTML}
  <div class="component-menu">
    <div><p class="component-menu-title">Project Client</p><p>${escapeHtml(project.client) || 'N/A'}</p></div>
    <div><p class="component-menu-title">Project Category</p><p>${escapeHtml(project.category) || 'N/A'}</p></div>
    <div><p class="component-menu-title">Location</p><p>${escapeHtml(project.location) || 'N/A'}</p></div>
    <div><p class="component-menu-title">Status</p><p>${escapeHtml(project.status) || 'Completed'}</p></div>
    <div><p class="component-menu-title">Area</p><p>${escapeHtml(project.area) || 'N/A'}</p></div>
  </div>
  <div class="img-text">
    <img src="${descImg}" alt="${title} - Detail" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Error'">
    <p class="component-text">${descriptionText}</p>
  </div>
  <div class="single-text">
    <h2 class="component-title">Photos</h2>
  </div>
  <div class="gallery-grid">
    ${galleryHTML}
  </div>
  <div class="paginationbox">
    <div class="prev-next-title">
      <a href="../">
        <span>Back to</span>
        <div class="component-title prev-next">All Projects</div>
      </a>
    </div>
  </div>
</main>

<footer id="footer">
  <div class="footer-top">
    <div class="footer-grid">
      <div class="footer-col-main">
        <h3 class="footer-brand">Studio4Core</h3>
        <p>Multidisciplinary architecture and design studio crafting timeless spatial narratives.</p>
        <a href="mailto:connect.studio4core@gmail.com">connect.studio4core@gmail.com</a>
        <div class="footer-phones" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <a href="https://wa.me/918805513821?text=Hi,%20I%20want%20to%20connect.">+91 8805513821</a>
          <a href="https://wa.me/917709315430?text=Hi,%20I%20want%20to%20connect.">+91 7709315430</a>
          <a href="https://wa.me/918007605291?text=Hi,%20I%20want%20to%20connect.">+91 8007605291</a>
          <a href="https://wa.me/919518581033?text=Hi,%20I%20want%20to%20connect.">+91 9518581033</a>
        </div>
      </div>
      <div>
        <h4>Services</h4>
        <a href="../../../../assets/projects/Architecture/?filter=Architecture">Architecture</a>
        <a href="../../../../assets/projects/Architecture/?filter=Interior_Design">Interior Design</a>
        <a href="../../../../assets/projects/Architecture/?filter=Landscape">Landscape</a>
        <a href="../../../../assets/projects/Architecture/?filter=Urban_Design">Urban Design</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="../../../../News/">News</a>
        <a href="../../../../assets/contact/">Contact us</a>
      </div>
      <div>
        <h4>Follow Us</h4>
        <div class="social">
          <a href="https://www.instagram.com/studio4core/" target="_blank"><img src="../../../../assets/images/social logo/instagram.png" alt="Instagram"></a>
          <a href="https://www.linkedin.com/in/studio-4core-6b2b043b5/" target="_blank"><img src="../../../../assets/images/social logo/linkedin.png" alt="LinkedIn"></a>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 Studio4Core. All rights reserved.</p>
  </div>
</footer>

<div id="lightbox" class="lightbox">
  <span class="lightbox-close">&times;</span>
  <button class="lightbox-nav lightbox-prev" id="lb-prev">&#10094;</button>
  <button class="lightbox-nav lightbox-next" id="lb-next">&#10095;</button>
  <img id="lightbox-img" class="lightbox-content">
</div>

<script src="../../../js/script.js"></script>
<script>
// Lightbox
(function() {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const images = Array.from(document.querySelectorAll(".gallery-grid img, .img-text img, .single-img img"));
  let idx = 0;
  images.forEach((img, i) => {
    img.style.cursor = "pointer";
    img.addEventListener("click", () => { idx = i; lbImg.src = images[idx].src; lb.style.display = "flex"; });
  });
  document.getElementById("lb-next").onclick = (e) => { e.stopPropagation(); idx = (idx + 1) % images.length; lbImg.src = images[idx].src; };
  document.getElementById("lb-prev").onclick = (e) => { e.stopPropagation(); idx = (idx - 1 + images.length) % images.length; lbImg.src = images[idx].src; };
  document.querySelector(".lightbox-close").onclick = () => lb.style.display = "none";
  lb.onclick = (e) => { if (e.target === lb) lb.style.display = "none"; };
  document.onkeydown = (e) => { if (lb.style.display === "flex") { if (e.key === "ArrowRight") { idx = (idx+1)%images.length; lbImg.src = images[idx].src; } if (e.key === "ArrowLeft") { idx = (idx-1+images.length)%images.length; lbImg.src = images[idx].src; } if (e.key === "Escape") lb.style.display = "none"; }};
})();
</script>
</body>
</html>`;
}

// ============ GENERATE SITEMAP ============
function generateSitemap(projects) {
  const today = new Date().toISOString().split('T')[0];
  
  let urls = `<url>
  <loc>${SITE_URL}/</loc>
  <lastmod>${today}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>1.00</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.90</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/contact/</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.80</priority>
</url>
<url>
  <loc>${SITE_URL}/News/</loc>
  <lastmod>${today}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.80</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.85</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/?filter=Architecture</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.70</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/?filter=Interior_Design</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.70</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/?filter=Landscape</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.70</priority>
</url>
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/?filter=Urban_Design</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.70</priority>
</url>`;

  // Add all project pages
  projects.forEach(p => {
    urls += `
<url>
  <loc>${SITE_URL}/assets/projects/Architecture/projects/?project=${slugify(p.title)}</loc>
  <lastmod>${today}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.80</priority>
</url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;
}

// ============ MAIN BUILD ============
async function build() {
  console.log('🔄 Fetching project data from Google Sheets...');
  
  try {
    const csvText = await fetchCSV(SHEET_URL);
    const rows = parseCSV(csvText);
    
    // Skip header rows (first 2 rows based on your sheet structure)
    const dataRows = rows.slice(2);
    
    const projects = [];
    let generated = 0;
    
    for (const cols of dataRows) {
      const title = cols[2] ? cols[2].trim() : '';
      if (!title) continue;
      
      const project = {
        category:    cols[1] || '',
        title:       title,
        heroImage:   cols[3] || '',
        description: cols[4] || '',
        client:      cols[5] || '',
        location:    cols[6] || '',
        status:      cols[7] || '',
        area:        cols[8] || '',
        descImage:   cols[9] || '',
        galleryRaw:  cols[10] || '',
        videoUrl:    cols[11] || ''
      };
      
      projects.push(project);
      
      // Generate static HTML — written alongside the dynamic page
      // The dynamic page still works as fallback, but Google will see static content
      const html = generateProjectHTML(project);
      const fileName = `seo-${slugify(project.title)}.html`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      
      fs.writeFileSync(filePath, html, 'utf-8');
      generated++;
      console.log(`  ✅ Generated: ${project.title}`);
    }
    
    // Update sitemap
    const sitemapPath = path.join(__dirname, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, generateSitemap(projects), 'utf-8');
    console.log(`\n📍 Sitemap updated with ${projects.length} project URLs`);
    
    console.log(`\n🎉 Build complete! Generated ${generated} static project pages.`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. git add .`);
    console.log(`   2. git commit -m "Build: generate static project pages"`);
    console.log(`   3. git push`);
    console.log(`   4. Submit sitemap in Google Search Console`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
