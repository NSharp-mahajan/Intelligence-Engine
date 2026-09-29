import { SkillCategory, RequirementType } from '@prisma/client';

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
  requirementType: RequirementType;
}

export interface ExtractionResult {
  requiredSkills: string[];
  preferredSkills: string[];
  skills: ExtractedSkill[];
}

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  patterns: RegExp[];
}

/**
 * Curated canonical vocabulary of common technology skills.
 */
export const SKILL_VOCABULARY: SkillDefinition[] = [
  // Languages
  { name: 'JavaScript', category: 'LANGUAGE', patterns: [/\bJavaScript\b/i, /\bJS\b/, /\bECMAScript\b/i] },
  { name: 'TypeScript', category: 'LANGUAGE', patterns: [/\bTypeScript\b/i, /\bTS\b/] },
  { name: 'Python', category: 'LANGUAGE', patterns: [/\bPython\b/i, /\bPy\b/] },
  { name: 'Java', category: 'LANGUAGE', patterns: [/\bJava\b(?!Script)/i] },
  { name: 'C++', category: 'LANGUAGE', patterns: [/\bC\+\+\b/i, /\bCPP\b/i, /\bC\/C\+\+\b/i] },
  { name: 'C#', category: 'LANGUAGE', patterns: [/\bC#\b/i, /\bCSharp\b/i, /\bC-Sharp\b/i, /\.NET C#/i] },
  { name: 'C', category: 'LANGUAGE', patterns: [/(?:^|[\s,./()\-:;])C(?:$|[\s,./()\-:;])(?![+#a-zA-Z0-9])/] },
  { 
    name: 'Go', 
    category: 'LANGUAGE', 
    patterns: [
      /\bGolang\b/i, 
      /\bGo\b(?=\s+(?:lang|language|developer|engineer|programmer|backend|code|stack|services?)\b)/i,
      /\bGo\b(?=\s*[\/,]\s*(?:Python|Java|C\+\+|Rust|Node|TypeScript|JavaScript|Docker|Kubernetes|Ruby|PHP|C#)\b)/
    ] 
  },
  { name: 'Rust', category: 'LANGUAGE', patterns: [/\bRust\b/i] },
  { name: 'Kotlin', category: 'LANGUAGE', patterns: [/\bKotlin\b/i] },
  { name: 'Swift', category: 'LANGUAGE', patterns: [/\bSwift\b/i] },
  { name: 'Ruby', category: 'LANGUAGE', patterns: [/\bRuby\b/i] },
  { name: 'PHP', category: 'LANGUAGE', patterns: [/\bPHP\b/i] },
  { name: 'SQL', category: 'LANGUAGE', patterns: [/\bSQL\b/i] },
  { name: 'HTML', category: 'LANGUAGE', patterns: [/\bHTML5?\b/i] },
  { name: 'CSS', category: 'LANGUAGE', patterns: [/\bCSS3?\b/i] },
  { name: 'Sass', category: 'LANGUAGE', patterns: [/\b(Sass|SCSS)\b/i] },
  { name: 'Scala', category: 'LANGUAGE', patterns: [/\bScala\b/i] },
  { name: 'Elixir', category: 'LANGUAGE', patterns: [/\bElixir\b/i] },

  // Frameworks & Libraries
  { name: 'React', category: 'FRAMEWORK', patterns: [/\bReact\b(?!\s*Native)/i, /\bReact\.js\b/i, /\bReactJS\b/i] },
  { name: 'Angular', category: 'FRAMEWORK', patterns: [/\bAngular\b/i, /\bAngularJS\b/i, /\bAngular\.js\b/i] },
  { name: 'Vue', category: 'FRAMEWORK', patterns: [/\bVue\b/i, /\bVue\.js\b/i, /\bVueJS\b/i] },
  { name: 'Next.js', category: 'FRAMEWORK', patterns: [/\bNext\.js\b/i, /\bNextJS\b/i] },
  { name: 'Nuxt.js', category: 'FRAMEWORK', patterns: [/\bNuxt\.js\b/i, /\bNuxtJS\b/i] },
  { name: 'Node.js', category: 'FRAMEWORK', patterns: [/\bNode\.js\b/i, /\bNodeJS\b/i, /\bNode\b(?=\s+js|\s+backend|\s+developer|\s+server|\s*[,./()\-:;])/i] },
  { name: 'Express', category: 'FRAMEWORK', patterns: [/\bExpress\.js\b/i, /\bExpressJS\b/i, /\bExpress\b(?=\s+js|\s+framework|\s+backend|\s*[,./()\-:;])/i] },
  { name: 'Spring', category: 'FRAMEWORK', patterns: [/\bSpring\b/i, /\bSpring Boot\b/i] },
  { name: 'Django', category: 'FRAMEWORK', patterns: [/\bDjango\b/i] },
  { name: 'Flask', category: 'FRAMEWORK', patterns: [/\bFlask\b/i] },
  { name: 'FastAPI', category: 'FRAMEWORK', patterns: [/\bFastAPI\b/i] },
  { name: '.NET', category: 'FRAMEWORK', patterns: [/(?:^|[\s,/()])\.NET(?:\s+Core)?(?:$|[\s,/()])/i, /\bASP\.NET\b/i, /\bDotnet\b/i] },
  { name: 'Laravel', category: 'FRAMEWORK', patterns: [/\bLaravel\b/i] },
  { name: 'Ruby on Rails', category: 'FRAMEWORK', patterns: [/\bRuby on Rails\b/i, /\bRails\b/i] },
  { name: 'Tailwind CSS', category: 'FRAMEWORK', patterns: [/\bTailwind\b/i, /\bTailwindCSS\b/i, /\bTailwind CSS\b/i] },
  { name: 'Bootstrap', category: 'FRAMEWORK', patterns: [/\bBootstrap\b/i] },
  { name: 'GraphQL', category: 'FRAMEWORK', patterns: [/\bGraphQL\b/i] },
  { name: 'PyTorch', category: 'FRAMEWORK', patterns: [/\bPyTorch\b/i] },
  { name: 'TensorFlow', category: 'FRAMEWORK', patterns: [/\bTensorFlow\b/i] },
  { name: 'LangChain', category: 'FRAMEWORK', patterns: [/\bLangChain\b/i] },

  // Tools, Databases & Cloud
  { name: 'PostgreSQL', category: 'TOOL', patterns: [/\bPostgreSQL\b/i, /\bPostgres\b/i, /\bPostgre\b/i] },
  { name: 'MySQL', category: 'TOOL', patterns: [/\bMySQL\b/i] },
  { name: 'MongoDB', category: 'TOOL', patterns: [/\bMongoDB\b/i, /\bMongo\b/i] },
  { name: 'Redis', category: 'TOOL', patterns: [/\bRedis\b/i] },
  { name: 'SQLite', category: 'TOOL', patterns: [/\bSQLite\b/i] },
  { name: 'Elasticsearch', category: 'TOOL', patterns: [/\bElasticsearch\b/i] },
  { name: 'Docker', category: 'TOOL', patterns: [/\bDocker\b/i] },
  { name: 'Kubernetes', category: 'TOOL', patterns: [/\bKubernetes\b/i, /\bK8s\b/i] },
  { name: 'AWS', category: 'TOOL', patterns: [/\bAWS\b/i, /\bAmazon Web Services\b/i] },
  { name: 'Azure', category: 'TOOL', patterns: [/\bAzure\b/i, /\bMicrosoft Azure\b/i] },
  { name: 'Google Cloud', category: 'TOOL', patterns: [/\bGoogle Cloud\b/i, /\bGCP\b/i, /\bGoogle Cloud Platform\b/i] },
  { name: 'Git', category: 'TOOL', patterns: [/\bGit\b(?!\s*Hub|\s*Lab)/i] },
  { name: 'GitHub', category: 'TOOL', patterns: [/\bGitHub\b/i] },
  { name: 'GitLab', category: 'TOOL', patterns: [/\bGitLab\b/i] },
  { name: 'Linux', category: 'TOOL', patterns: [/\bLinux\b/i, /\bUnix\b/i] },
  { name: 'Terraform', category: 'TOOL', patterns: [/\bTerraform\b/i] },
  { name: 'Jenkins', category: 'TOOL', patterns: [/\bJenkins\b/i] },
  { name: 'CI/CD', category: 'TOOL', patterns: [/\bCI\/CD\b/i, /\bCI-CD\b/i, /\bContinuous Integration\b/i] },
  { name: 'Kafka', category: 'TOOL', patterns: [/\bKafka\b/i, /\bApache Kafka\b/i] },
  { name: 'Spark', category: 'TOOL', patterns: [/\bSpark\b/i, /\bApache Spark\b/i] },

  // Concepts & AI
  { name: 'REST API', category: 'CONCEPT', patterns: [/\bREST\s*APIs?\b/i, /\bRESTful\s*APIs?\b/i, /\bRESTful\b/i, /\bREST\b/] },
  { name: 'Machine Learning', category: 'CONCEPT', patterns: [/\bMachine Learning\b/i, /\bML\b/i] },
  { name: 'Deep Learning', category: 'CONCEPT', patterns: [/\bDeep Learning\b/i, /\bDL\b/i] },
  { name: 'NLP', category: 'CONCEPT', patterns: [/\bNLP\b/i, /\bNatural Language Processing\b/i] },
  { name: 'Computer Vision', category: 'CONCEPT', patterns: [/\bComputer Vision\b/i, /\bCV\b/i] },
  { name: 'Generative AI', category: 'CONCEPT', patterns: [/\bGenerative AI\b/i, /\bGenAI\b/i, /\bGen AI\b/i] },
  { name: 'LLM', category: 'CONCEPT', patterns: [/\bLLMs?\b/i, /\bLarge Language Models?\b/i] },
  { name: 'OpenAI', category: 'CONCEPT', patterns: [/\bOpenAI\b/i] },
  { name: 'Microservices', category: 'CONCEPT', patterns: [/\bMicroservices\b/i, /\bMicroservice\b/i] },
  { name: 'Agile', category: 'CONCEPT', patterns: [/\bAgile\b/i, /\bScrum\b/i] },
];

/**
 * Safely converts raw HTML content to plain text while preserving paragraph/list boundaries.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  let text = html;

  // Replace line breaks and block element ends with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace per line
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.join('\n');
}

interface Section {
  type: 'REQUIRED' | 'PREFERRED' | 'GENERAL_REQUIREMENT' | 'NON_REQUIREMENT';
  text: string;
}

/**
 * Parses plain text into logical sections to infer requirement context.
 */
function parseSections(plainText: string): Section[] {
  const lines = plainText.split('\n');
  const sections: Section[] = [];

  let currentType: 'REQUIRED' | 'PREFERRED' | 'GENERAL_REQUIREMENT' | 'NON_REQUIREMENT' = 'NON_REQUIREMENT';
  let currentBuffer: string[] = [];

  const requiredHeadingRegex = /\b(requirements|qualifications|what you'?ll need|what you'?ll bring|what we'?re looking for|must have|must-have|key skills|technical skills|role requirements|who you are)\b/i;
  const preferredHeadingRegex = /\b(preferred|nice to have|nice-to-have|bonus|plus|desirable|optional|preferred qualifications|preferred skills)\b/i;
  const nonReqHeadingRegex = /\b(about us|about the company|company background|benefits|perks|what we offer|our tech stack|tech stack|how to apply|equal opportunity)\b/i;

  for (const line of lines) {
    const isHeading = line.length < 80 && (
      requiredHeadingRegex.test(line) ||
      preferredHeadingRegex.test(line) ||
      nonReqHeadingRegex.test(line) ||
      line.endsWith(':')
    );

    if (isHeading) {
      if (currentBuffer.length > 0) {
        sections.push({ type: currentType, text: currentBuffer.join(' ') });
        currentBuffer = [];
      }

      if (preferredHeadingRegex.test(line)) {
        currentType = 'PREFERRED';
      } else if (requiredHeadingRegex.test(line)) {
        currentType = 'REQUIRED';
      } else if (nonReqHeadingRegex.test(line)) {
        currentType = 'NON_REQUIREMENT';
      } else {
        currentType = 'GENERAL_REQUIREMENT';
      }
      currentBuffer.push(line);
    } else {
      currentBuffer.push(line);
    }
  }

  if (currentBuffer.length > 0) {
    sections.push({ type: currentType, text: currentBuffer.join(' ') });
  }

  return sections;
}

/**
 * Deterministically extracts skills from opportunity title and description.
 */
export function extractOpportunitySkills(title: string, descriptionHtml: string): ExtractionResult {
  const requiredSkillMap = new Map<string, SkillDefinition>();
  const preferredSkillMap = new Map<string, SkillDefinition>();

  const plainText = htmlToPlainText(descriptionHtml);

  // 1. Skills in Title are automatically REQUIRED
  for (const def of SKILL_VOCABULARY) {
    for (const pattern of def.patterns) {
      if (pattern.test(title)) {
        requiredSkillMap.set(def.name, def);
        break;
      }
    }
  }

  // 2. Parse description into structured sections
  const sections = parseSections(plainText);
  const hasExplicitRequirementSections = sections.some(s => s.type === 'REQUIRED' || s.type === 'PREFERRED' || s.type === 'GENERAL_REQUIREMENT');

  const reqSignalRegex = /\b(required|requirements|must have|must-have|you have|you should have|experience with|proficient in|strong experience in|essential)\b/i;
  const prefSignalRegex = /\b(preferred|nice to have|nice-to-have|bonus|plus|desirable|optional)\b/i;

  for (const section of sections) {
    for (const def of SKILL_VOCABULARY) {
      let isMatched = false;
      for (const pattern of def.patterns) {
        if (pattern.test(section.text)) {
          isMatched = true;
          break;
        }
      }

      if (!isMatched) continue;

      if (section.type === 'REQUIRED' || section.type === 'GENERAL_REQUIREMENT') {
        requiredSkillMap.set(def.name, def);
      } else if (section.type === 'PREFERRED') {
        if (!requiredSkillMap.has(def.name)) {
          preferredSkillMap.set(def.name, def);
        }
      } else if (section.type === 'NON_REQUIREMENT') {
        // Only extract from non-requirement sections if explicit sentence-level signals exist
        if (reqSignalRegex.test(section.text)) {
          requiredSkillMap.set(def.name, def);
        } else if (prefSignalRegex.test(section.text) && !requiredSkillMap.has(def.name)) {
          preferredSkillMap.set(def.name, def);
        }
      }
    }
  }

  // 3. Fallback scanning if description has no structured headings
  if (!hasExplicitRequirementSections) {
    for (const def of SKILL_VOCABULARY) {
      if (requiredSkillMap.has(def.name) || preferredSkillMap.has(def.name)) continue;

      for (const pattern of def.patterns) {
        if (pattern.test(plainText)) {
          // If fallback match, default conservatively to REQUIRED
          requiredSkillMap.set(def.name, def);
          break;
        }
      }
    }
  }

  // Ensure REQUIRED takes precedence over PREFERRED
  for (const name of requiredSkillMap.keys()) {
    preferredSkillMap.delete(name);
  }

  const skills: ExtractedSkill[] = [
    ...Array.from(requiredSkillMap.values()).map(def => ({
      name: def.name,
      category: def.category,
      requirementType: RequirementType.REQUIRED,
    })),
    ...Array.from(preferredSkillMap.values()).map(def => ({
      name: def.name,
      category: def.category,
      requirementType: RequirementType.PREFERRED,
    })),
  ];

  return {
    requiredSkills: Array.from(requiredSkillMap.keys()),
    preferredSkills: Array.from(preferredSkillMap.keys()),
    skills,
  };
}
