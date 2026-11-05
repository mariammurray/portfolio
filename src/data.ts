export type Project = { title: string; body: string[]; links: [string, string][] }
export type Entry = { label: string; desc: string; href?: string; project?: Project }
export type Section = { title: string; entries: Entry[] }

export const PUB_NAME = 'The Resume & Cover Letter'

export const SECTIONS: Section[] = [
  {
    title: 'Work',
    entries: [
      {
        label: 'GRN X', desc: 'Founding Developer (Contract) since June 2025', href: 'https://galactik.grnx.app/',
        project: {
          title: 'GRN X Ltd – Founding Developer (Contract)',
          body: [
            'One of two founding developers, owned and built the frontend of a web platform from scratch for a pre-launch startup, shipping features including marketplace flows, multi-project tracking, user profiles/portfolios, and chat groups. Often delivering fixes same-day and building & iterating on larger features within weeks.',
            'Consistently met deadlines for client and industry demos, translating founder mockups and specs into React/TypeScript components and writing tests to ensure they meet standards.',
            'Integrated Stripe (for in-platform payments), Mapbox and 2 internal REST APIs with backend engineering, collaborating on architecture decisions across the stack.',
          ],
          links: [
            ['Landing Page', 'https://galactik.grnx.app/'],
            ['Desktop Demo', 'https://1drv.ms/v/c/9ecfc5d8fe34b33e/IQBr8_U_eu2fSopROEB40wPYASOHVAmQmc5shmAzw3Dn3TQ?e=LDC7kB'],
            ['Mobile Demo', 'https://1drv.ms/v/c/9ecfc5d8fe34b33e/IQB5N5bM0t35RqUQKmFx03g9AVMOuTfFbURACHqUiXOxte8?e=ayFmhz'],
          ],
        },
      },
    ],
  },
  {
    title: 'Personal Projects',
    entries: [
      {
        label: 'WSL Fantasy Stats', desc: "Women's Super League fantasy football statistics dashboard, reverse-engineered from official site to reveal fun facts, auto-updates each match week",
        href: 'https://mariammurray.github.io/WSL-Fantasy-Stats/',
        project: {
          title: 'WSL Fantasy Dashboard',
          body: [
            'To celebrate the first ever official WSL fantasy football game, I sifted through the network requests and minified JS bundles until I had enough data to make my own, auto-updating fun-fact dashboard.',
            'Especially useful for spotlighting high-scoring WSL2 players who I might have missed otherwise, it starts with the players who scored the most while being selected the least (and vice versa), and includes superlatives like points per million £ pricetag and biggest change in ownership %.',
            'I used GitHub Actions to automate taking data snapshots before/after gamedays and then trigger a re-render, so that I could host the whole thing on GitHub Pages. Standings from previous weeks can be toggled through at any time, and I made layouts which work for mobile and desktop.',
          ],
          links: [['Site', 'https://mariammurray.github.io/WSL-Fantasy-Stats/'], ['GitHub', 'https://github.com/mariammurray/WSL-Fantasy-Stats']],
        },
      },
      {
        label: 'Who Probably Wrote On It', desc: 'Mathematically determining your favourite member of One Direction with the Spotify API',
        href: 'https://mariammurray.github.io/whoprobablywroteonit/',
        project: {
          title: 'Who probably wrote on it? | An analysis of One Direction',
          body: [
            "Using a very serious statistical analysis of One Direction writing credits, this site allows users to connect their spotify and submit their liked songs (or enter a public playlist) to determine which member of one direction's writing they truly like the best.",
            'Uses a harmonic weighted points system and takes into consideration instances where some of the members are credited in alphabetical order instead of by contribution, example shown in the repo ReadMe.',
            'Clicking on contributor names in the ranking reveals pictochart visualizations of their contribution on each included song, which have attached aria labels for screen readers.'
            
          ],
          links: [['Site', 'https://mariammurray.github.io/whoprobablywroteonit/'], ['GitHub', 'https://github.com/mariammurray/whoprobablywroteonit']],
        },
      },
      {
        label: 'SettleUp', desc: 'Sports betting app prototype with social component, live room updates and odds tracking via websocket',
        href: 'https://github.com/mariammurray/settleUp',
        project: {
          title: 'SettleUp | Social sports betting prototype',
          body: [
            'Built a full-stack sports betting app prototype with a social component as a capstone project.',
            'Implemented Socket.IO to handle event-driven user interactions, with odds that update for everyone in a shared room. Live API-powered odds recalculate as bets and accumulated odds shift with game events.',
            'Built with React and Tailwind CSS on the frontend, Node.js and Express on the backend, APIFootball for sports data, and Socket.IO for live updates.',
          ],
          links: [['GitHub', 'https://github.com/mariammurray/settleUp'], ['Site', 'https://settleup-prpg.onrender.com/']],
        },
      },
      {
        label: 'Caldeira Media', desc: 'Motion-based landing page for a fictional film production company',
        href: 'https://mariammurray.github.io/caldeira-media/',
        project: {
          title: 'Caldeira Media | Parallax landing page',
          body: [
            'I love working in Photoshop, and wanted to build something motion-based. I took a free Wikimedia photo and made a landing page for a fictional film production company, cutting out layers by hand and filling in hidden areas to create the effect of moving through and around the landscape.',
            'I also masked the grass, ocean and clouds so they animate independently. The film theme carries through the loading screen and the custom cursor.',
            'It is accessible to screen readers and works on desktop and mobile.',
          ],
          links: [['Site', 'https://mariammurray.github.io/caldeira-media/']],
        },
      },
    ],
  },
]

export const APPETIZERS: Section = {
  title: 'More',
  entries: [
    { label: 'Hospitality & retail', desc: 'Building rapport, supporting the brand, reading the customer' },
    { label: 'Universal Music Group', desc: 'Archiving, created a digital tracking system for the team and automated repetitive tasks' },
    { label: 'Toronto City Hall', desc: 'Liaising across departments to resolve constituent issues, escalating when necessary'}
  ],
}

export const LINKS: (Entry & { href: string })[] = [
  { label: 'GitHub', desc: 'GitHub profile and repositories', href: 'https://github.com/mariammurray/' },
  { label: 'LinkedIn', desc: 'LinkedIn profile', href: 'https://www.linkedin.com/in/maria-evm/' },
  { label: 'Email', desc: 'Email address', href: 'mailto:maria.evm@outlook.com' }
]

export const SPECIALS = [
  { label: 'Customer-focused building', note: 'Demoed to clients, turned founder specs into shipped features' },
  { label: 'API integrations', note: "Including integrating Stripe and building internal REST APIs" },
  { label: 'React + TypeScript', note: 'Built tested, responsive, and accessible interfaces as sole frontend owner.' },
  { label: 'Troubleshooting', note: 'Both technical debugging and customer-facing problem-solving'},
]

export const EDUCATION = [
  { label: 'Springboard', desc: 'Software Engineering Certificate (React, Node, Python/Flask, SQL; two capstones)' },
  { label: 'McGill University', desc: 'Computer Science and Political Science' },
]