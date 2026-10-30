/**
 * Normalizes skill names and maps technology aliases to canonical representations.
 * Preserves distinct technologies (e.g. Java !== JavaScript, C !== C++, React !== React Native).
 */

const CANONICAL_ALIASES: Record<string, string> = {
  // Languages
  js: 'javascript',
  javascript: 'javascript',
  ecmascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  py: 'python',
  python: 'python',
  golang: 'go',
  go: 'go',
  'c++': 'c++',
  cpp: 'c++',
  'c/c++': 'c++',
  'c#': 'c#',
  csharp: 'c#',
  'c-sharp': 'c#',
  '.net': '.net',
  dotnet: '.net',
  'asp.net': '.net',
  '.net core': '.net',
  rb: 'ruby',
  ruby: 'ruby',
  rs: 'rust',
  rust: 'rust',
  kt: 'kotlin',
  kotlin: 'kotlin',
  sql: 'sql',
  html: 'html',
  html5: 'html',
  css: 'css',
  css3: 'css',
  sass: 'sass',
  scss: 'sass',
  scala: 'scala',
  elixir: 'elixir',
  swift: 'swift',
  php: 'php',

  // Frameworks & Libraries
  react: 'react',
  'react.js': 'react',
  reactjs: 'react',
  'react native': 'react native',
  'react-native': 'react native',
  angular: 'angular',
  'angular.js': 'angular',
  angularjs: 'angular',
  vue: 'vue',
  'vue.js': 'vue',
  vuejs: 'vue',
  'next.js': 'next.js',
  nextjs: 'next.js',
  next: 'next.js',
  'nuxt.js': 'nuxt.js',
  nuxtjs: 'nuxt.js',
  'node.js': 'node.js',
  nodejs: 'node.js',
  node: 'node.js',
  express: 'express',
  'express.js': 'express',
  expressjs: 'express',
  spring: 'spring',
  'spring boot': 'spring',
  springboot: 'spring',
  django: 'django',
  flask: 'flask',
  fastapi: 'fastapi',
  laravel: 'laravel',
  'ruby on rails': 'ruby on rails',
  rails: 'ruby on rails',
  tailwind: 'tailwind css',
  tailwindcss: 'tailwind css',
  'tailwind css': 'tailwind css',
  bootstrap: 'bootstrap',
  graphql: 'graphql',
  pytorch: 'pytorch',
  tensorflow: 'tensorflow',
  langchain: 'langchain',

  // Databases & Cloud & Tools
  postgres: 'postgresql',
  postgresql: 'postgresql',
  postgre: 'postgresql',
  mysql: 'mysql',
  mongo: 'mongodb',
  mongodb: 'mongodb',
  redis: 'redis',
  sqlite: 'sqlite',
  elasticsearch: 'elasticsearch',
  docker: 'docker',
  k8s: 'kubernetes',
  kubernetes: 'kubernetes',
  aws: 'aws',
  'amazon web services': 'aws',
  gcp: 'gcp',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  azure: 'azure',
  'microsoft azure': 'azure',
  git: 'git',
  github: 'github',
  gitlab: 'gitlab',
  linux: 'linux',
  unix: 'linux',
  terraform: 'terraform',
  jenkins: 'jenkins',
  'ci/cd': 'ci/cd',
  'ci-cd': 'ci/cd',
  cicd: 'ci/cd',
  'continuous integration': 'ci/cd',
  kafka: 'kafka',
  'apache kafka': 'kafka',
  spark: 'spark',
  'apache spark': 'spark',

  // Concepts & AI
  'rest api': 'rest api',
  'rest apis': 'rest api',
  restful: 'rest api',
  'restful api': 'rest api',
  rest: 'rest api',
  ml: 'machine learning',
  'machine learning': 'machine learning',
  ai: 'artificial intelligence',
  'artificial intelligence': 'artificial intelligence',
  'deep learning': 'deep learning',
  dl: 'deep learning',
  genai: 'generative ai',
  'gen ai': 'generative ai',
  'generative ai': 'generative ai',
  llm: 'llm',
  llms: 'llm',
  'large language models': 'llm',
  'large language model': 'llm',
  nlp: 'nlp',
  'natural language processing': 'nlp',
  'computer vision': 'computer vision',
  cv: 'computer vision',
  microservices: 'microservices',
  microservice: 'microservices',
  agile: 'agile',
  scrum: 'agile',
};

/**
 * Normalizes a raw skill name into a trimmed, lowercased canonical token.
 */
export function normalizeSkillName(name: string | null | undefined): string {
  if (!name) return '';
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, ' ')
    .trim();

  if (CANONICAL_ALIASES[cleaned]) {
    return CANONICAL_ALIASES[cleaned];
  }

  // Handle dot stripping except for recognized extensions (like .net, node.js, etc.)
  const withoutDots = cleaned.replace(/\./g, '');
  if (CANONICAL_ALIASES[withoutDots]) {
    return CANONICAL_ALIASES[withoutDots];
  }

  return cleaned;
}

/**
 * Checks whether two skill names represent equivalent technologies.
 */
export function areSkillsEquivalent(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  return normalizeSkillName(nameA) === normalizeSkillName(nameB);
}
