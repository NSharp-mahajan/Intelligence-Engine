/**
 * Deterministic skill categorization for Intelligence-Engine Career Evidence Workspace.
 * Maps canonical and custom skill names to logical developer domain categories.
 */

export type SkillCategoryGroup =
  | 'Programming Languages'
  | 'Frontend Development'
  | 'Backend Development'
  | 'AI & Machine Learning'
  | 'Databases'
  | 'Developer Tools'
  | 'Other';

export const SKILL_CATEGORY_ORDER: SkillCategoryGroup[] = [
  'Programming Languages',
  'Frontend Development',
  'Backend Development',
  'AI & Machine Learning',
  'Databases',
  'Developer Tools',
  'Other',
];

export const CATEGORY_DESCRIPTIONS: Record<SkillCategoryGroup, string> = {
  'Programming Languages': 'Core syntax and runtime environments you write daily.',
  'Frontend Development': 'UI frameworks, styling libraries, and client-side architecture.',
  'Backend Development': 'Server runtimes, API frameworks, and distributed system components.',
  'AI & Machine Learning': 'Model training, inference frameworks, NLP, and data intelligence.',
  'Databases': 'Relational engines, document stores, in-memory caches, and ORMs.',
  'Developer Tools': 'Containerization, orchestration, cloud providers, and CI/CD pipelines.',
  'Other': 'Architectural paradigms, software principles, and general competencies.',
};

const LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'go', 'golang',
  'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'elixir', 'dart', 'r',
  'julia', 'shell', 'bash', 'powershell', 'perl', 'html', 'html5', 'css', 'css3',
  'sass', 'scss', 'assembly', 'clojure', 'haskell', 'lua', 'objective-c', 'sql'
]);

const FRONTEND = new Set([
  'react', 'react.js', 'reactjs', 'angular', 'angularjs', 'vue', 'vue.js', 'vuejs',
  'next.js', 'nextjs', 'nuxt.js', 'nuxtjs', 'svelte', 'sveltekit', 'tailwind css',
  'tailwind', 'tailwindcss', 'bootstrap', 'redux', 'mobx', 'zustand', 'webpack',
  'vite', 'vite.js', 'rollup', 'parcel', 'jquery', 'material-ui', 'chakra ui',
  'radix ui', 'shadcn', 'styled-components', 'emotion', 'storybook', 'webgl',
  'three.js', 'css modules', 'd3.js', 'd3'
]);

const BACKEND = new Set([
  'node.js', 'nodejs', 'node', 'express', 'express.js', 'expressjs', 'spring',
  'spring boot', 'django', 'flask', 'fastapi', '.net', 'asp.net', '.net core',
  'ruby on rails', 'rails', 'laravel', 'nestjs', 'nest.js', 'gin', 'fiber',
  'actix', 'actix-web', 'axum', 'microservices', 'grpc', 'graphql', 'rest',
  'rest api', 'restful api', 'websockets', 'socket.io', 'apollo', 'celery',
  'sidekiq', 'kafka', 'rabbitmq', 'activemq', 'zeromq', 'bullmq', 'trpc'
]);

const AI_ML = new Set([
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'keras',
  'scikit-learn', 'sklearn', 'llm', 'large language models', 'generative ai',
  'genai', 'langchain', 'llamaindex', 'nlp', 'natural language processing',
  'computer vision', 'hugging face', 'huggingface', 'opencv', 'pandas', 'numpy',
  'scipy', 'matplotlib', 'seaborn', 'data science', 'ai', 'artificial intelligence',
  'reinforcement learning', 'transformers', 'stable diffusion', 'bert', 'gpt',
  'vector databases', 'chromadb', 'pinecone', 'weaviate', 'qdrant', 'milvus'
]);

const DATABASES = new Set([
  'postgresql', 'postgres', 'mysql', 'mongodb', 'mongo', 'redis', 'sqlite',
  'oracle', 'microsoft sql server', 'sql server', 'cassandra', 'dynamodb',
  'elasticsearch', 'neo4j', 'prisma', 'typeorm', 'sqlalchemy', 'hibernate',
  'firebase', 'firestore', 'supabase', 'cockroachdb', 'couchdb', 'mariadb',
  'memcached', 'clickhouse', 'snowflake', 'bigquery', 'redshift'
]);

const DEV_TOOLS = new Set([
  'docker', 'kubernetes', 'k8s', 'aws', 'amazon web services', 'gcp',
  'google cloud', 'google cloud platform', 'azure', 'git', 'github', 'gitlab',
  'bitbucket', 'ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'linux',
  'unix', 'terraform', 'ansible', 'prometheus', 'grafana', 'postman',
  'insomnia', 'jira', 'confluence', 'nginx', 'apache', 'cloudflare',
  'datadog', 'new relic', 'sentry', 'helm', 'argocd', 'vagrant', 'sonarqube'
]);

/**
 * Deterministically categorize a skill name into one of the 7 supported developer groups.
 * If backend category is provided (e.g. LANGUAGE), it is used as strong supplementary evidence.
 */
export function categorizeSkill(skillName: string, backendCategory?: string): SkillCategoryGroup {
  const norm = skillName.trim().toLowerCase();

  if (LANGUAGES.has(norm)) return 'Programming Languages';
  if (FRONTEND.has(norm)) return 'Frontend Development';
  if (BACKEND.has(norm)) return 'Backend Development';
  if (AI_ML.has(norm)) return 'AI & Machine Learning';
  if (DATABASES.has(norm)) return 'Databases';
  if (DEV_TOOLS.has(norm)) return 'Developer Tools';

  // Substring or pattern matches
  if (/python|javascript|typescript|golang|rust|kotlin|swift|ruby|php|scala/i.test(norm)) {
    return 'Programming Languages';
  }
  if (/react|angular|vue|svelte|frontend|css|html|tailwind/i.test(norm)) {
    return 'Frontend Development';
  }
  if (/node|spring|django|flask|fastapi|backend|express|api|grpc|microservice/i.test(norm)) {
    return 'Backend Development';
  }
  if (/ai|ml|learning|neural|tensor|torch|vision|nlp|llm|hugging/i.test(norm)) {
    return 'AI & Machine Learning';
  }
  if (/sql|mongo|redis|database|db|postgres|data store|orm/i.test(norm)) {
    return 'Databases';
  }
  if (/docker|kube|cloud|aws|azure|gcp|linux|git|devops|ci\/cd|pipeline/i.test(norm)) {
    return 'Developer Tools';
  }

  // Supplementary fallback to backend Prisma category
  if (backendCategory === 'LANGUAGE') return 'Programming Languages';
  if (backendCategory === 'FRAMEWORK') return 'Backend Development';
  if (backendCategory === 'TOOL') return 'Developer Tools';

  return 'Other';
}
