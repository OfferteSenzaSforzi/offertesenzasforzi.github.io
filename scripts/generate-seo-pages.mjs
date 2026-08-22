import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEO_PAGES = [
  {
    route: 'home',
    path: '/',
    title: 'OfferteSenzaSforzi (OSS) | Offerte, tracking prezzi e AI',
    description:
      'OfferteSenzaSforzi (OSS): offerte senza sforzi, tracking prezzi, Wishlist AI e Smart Care per ricevere solo gli avvisi che servono.',
  },
  {
    route: 'offerte',
    path: '/offerte/',
    title: 'Offerte Amazon selezionate | OfferteSenzaSforzi',
    description:
      'Scopri offerte Amazon selezionate, salvale nei preferiti oppure scartale senza perdere la possibilità di recuperarle.',
  },
  {
    route: 'tracking',
    path: '/tracking/',
    title: 'Tracking prezzi Amazon | OfferteSenzaSforzi',
    description:
      'Imposta il prezzo desiderato e lascia che il tracking prezzi di OfferteSenzaSforzi ti avvisi quando il prodotto entra nel tuo intervallo.',
  },
  {
    route: 'wishlist-ai',
    path: '/wishlist-ai/',
    title: 'Wishlist AI per trovare prodotti | OfferteSenzaSforzi',
    description:
      'Descrivi ciò che cerchi, il budget e le caratteristiche importanti: Wishlist AI trova prodotti compatibili da confrontare e salvare.',
  },
  {
    route: 'smart-care',
    path: '/smart-care/',
    title: 'Smart Care e promemoria | OfferteSenzaSforzi',
    description:
      'Smart Care stima manutenzione e sostituzione dei tuoi oggetti e ti ricorda quando è il momento di intervenire.',
  },
  {
    route: 'prezzi',
    path: '/prezzi/',
    title: 'Piani e prezzi | OfferteSenzaSforzi',
    description:
      'Confronta i piani Free, Smart e Pro di OfferteSenzaSforzi per tracking prezzi, Wishlist AI e Smart Care.',
  },
  {
    route: 'forum',
    path: '/forum/',
    title: 'Forum in arrivo | OfferteSenzaSforzi',
    description:
      'Il forum di OfferteSenzaSforzi è in arrivo: uno spazio per confrontare esperienze e acquistare con più consapevolezza.',
    index: false,
  },
];

const SITE_URL = 'https://offertesenzasforzi.com';

export function renderSeoPage(template, page) {
  const sectionPattern = new RegExp(
    `<section\\b(?=[^>]*\\bdata-page="${page.route}")[\\s\\S]*?<\\/section>`,
  );
  const section = template.match(sectionPattern)?.[0];
  if (!section) throw new Error(`Missing section for route: ${page.route}`);

  const visibleSection = section.replace(/(<section\b[^>]*?)\s+hidden(?=[\s>])/, '$1');
  const canonical = `${SITE_URL}${page.path}`;

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${page.description}">`,
    )
    .replace(
      /<meta name="robots" content="[^"]*">/,
      `<meta name="robots" content="${page.index === false ? 'noindex, follow' : 'index, follow'}">`,
    )
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${page.title}">`)
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${page.description}">`,
    )
    .replace(/<body([^>]*)>/, `<body data-route="${page.route}"$1>`)
    .replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/, `$1\n${visibleSection}\n$2`);
}

export async function generateSeoPages(outputDirectory = resolve('dist')) {
  const template = await readFile(join(outputDirectory, 'index.html'), 'utf8');

  await Promise.all(
    SEO_PAGES.map(async (page) => {
      const outputPath =
        page.route === 'home'
          ? join(outputDirectory, 'index.html')
          : join(outputDirectory, page.route, 'index.html');
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, renderSeoPage(template, page));
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSeoPages();
}
