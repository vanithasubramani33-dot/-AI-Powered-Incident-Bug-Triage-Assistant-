/**
 * AI Triage Engine
 * ------------------------------------------------------------------
 * Tries an external AI service (if AI_API_KEY is configured) first.
 * If the service is unavailable, misconfigured, or errors out, it
 * falls back to a deterministic rule-based engine so the app always
 * returns a usable triage result.
 * ------------------------------------------------------------------
 */

const KEYWORD_RULES = [
  {
    category: 'Authentication',
    team: 'Backend Team',
    keywords: ['login', 'log in', 'signin', 'sign in', 'password', 'auth', 'token', 'session', 'oauth', 'logout', '401', '403', 'unauthorized', 'forbidden'],
    rootCause: 'Authentication/authorization flow failure (invalid credentials, expired token, or broken auth API).',
    action: 'Check authentication API logs, verify token/session handling, and confirm identity provider connectivity.',
  },
  {
    category: 'Database',
    team: 'Database Team',
    keywords: ['database', 'db', 'query', 'mongo', 'sql', 'index', 'migration', 'timeout connecting', 'deadlock', 'constraint', 'schema', 'record not found', 'duplicate key'],
    rootCause: 'Database query failure, connection issue, or data integrity/schema problem.',
    action: 'Inspect database logs and slow query log, verify connection pool health, and check recent schema migrations.',
  },
  {
    category: 'Security',
    team: 'Security Team',
    keywords: ['security', 'vulnerability', 'xss', 'csrf', 'injection', 'exploit', 'leak', 'exposed', 'breach', 'unauthorized access', 'encryption', 'ssl', 'tls', 'cve'],
    rootCause: 'Potential security vulnerability or misconfiguration exposing data or access controls.',
    action: 'Escalate immediately to security on-call, isolate the affected component, and audit access logs.',
  },
  {
    category: 'Performance',
    team: 'Platform Team',
    keywords: ['slow', 'timeout', 'lag', 'latency', 'performance', 'memory leak', 'high cpu', 'freeze', 'hang', 'crash under load', 'out of memory', 'oom'],
    rootCause: 'Resource contention, inefficient query/algorithm, or capacity limits causing degraded performance.',
    action: 'Profile the affected endpoint/service, check resource utilization graphs, and review recent load changes.',
  },
  {
    category: 'Deployment',
    team: 'DevOps Team',
    keywords: ['deploy', 'deployment', 'build failed', 'pipeline', 'ci/cd', 'docker', 'kubernetes', 'container', 'rollback', 'environment variable', 'config missing', '502', '503', '504'],
    rootCause: 'Deployment/configuration issue causing the service to be unavailable or misconfigured in the target environment.',
    action: 'Review latest deployment logs, verify environment variables/secrets, and consider rolling back the last release.',
  },
  {
    category: 'Frontend/UI',
    team: 'Frontend Team',
    keywords: ['button', 'ui', 'layout', 'css', 'style', 'render', 'component', 'screen', 'display', 'broken image', 'responsive', 'alignment', 'click', 'not showing', 'blank page'],
    rootCause: 'UI rendering or client-side logic issue in the frontend component.',
    action: 'Reproduce in browser dev tools, check console errors, and inspect the relevant component/state.',
  },
  {
    category: 'Backend/API',
    team: 'Backend Team',
    keywords: ['api', 'endpoint', 'server error', '500', 'internal server error', 'request failed', 'null pointer', 'exception', 'stack trace', 'route', 'controller', 'service unavailable'],
    rootCause: 'Server-side error in an API endpoint or backend service logic.',
    action: 'Check backend server logs and stack trace, reproduce the request, and add/verify input validation.',
  },
];

const SEVERITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function scoreText(text, keywords) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits += 1;
  }
  return hits;
}

function ruleBasedTriage(bug) {
  const combinedText = [
    bug.title,
    bug.description,
    bug.errorMessage,
    bug.stepsToReproduce,
    bug.environment,
  ]
    .filter(Boolean)
    .join(' \n ');

  let best = null;
  let bestScore = 0;

  for (const rule of KEYWORD_RULES) {
    const score = scoreText(combinedText, rule.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  if (!best) {
    best = {
      category: 'Other',
      team: 'Triage Team',
      rootCause: 'Unable to confidently classify from the provided details; needs manual investigation.',
      action: 'Assign to a triage lead for manual review and request more reproduction details from the reporter.',
    };
  }

  // Priority derivation: combine reported severity with matched-rule urgency
  // and how many production-impact keywords were detected.
  const severityWeight = SEVERITY_WEIGHT[bug.severity] || 2;
  const urgentCategories = ['Security', 'Authentication', 'Database'];
  const urgencyBoost = urgentCategories.includes(best.category) ? 1 : 0;
  const prodBoost = /production|prod\b/i.test(combinedText) ? 1 : 0;

  const priorityScore = severityWeight + urgencyBoost + prodBoost;
  let priority = 'Low';
  if (priorityScore >= 5) priority = 'Critical';
  else if (priorityScore === 4) priority = 'High';
  else if (priorityScore === 3) priority = 'Medium';
  else priority = 'Low';

  // Confidence: based on keyword match strength, capped 55-97%
  const confidenceScore = Math.min(97, Math.max(55, 55 + bestScore * 8));

  return {
    category: best.category,
    severity: bug.severity || 'Medium',
    priority,
    rootCause: best.rootCause,
    suggestedTeam: best.team,
    suggestedAssignee: 'Unassigned',
    recommendedAction: best.action,
    confidenceScore,
    engine: 'rule-based',
  };
}

async function aiServiceTriage(bug) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  if (!apiKey || !apiUrl) {
    throw new Error('AI service not configured');
  }

  const prompt = `You are a software bug triage assistant. Analyze the following bug report and
respond with ONLY a JSON object (no markdown, no prose) with keys:
category (one of: Frontend/UI, Backend/API, Database, Authentication, Performance, Security, Deployment, Other),
severity (Critical, High, Medium, Low),
priority (Critical, High, Medium, Low),
rootCause (string),
suggestedTeam (string),
suggestedAssignee (string),
recommendedAction (string),
confidenceScore (integer 0-100).

Bug Title: ${bug.title}
Description: ${bug.description}
Steps to Reproduce: ${bug.stepsToReproduce || 'N/A'}
Error Message: ${bug.errorMessage || 'N/A'}
Environment: ${bug.environment || 'N/A'}
Reported Severity: ${bug.severity || 'N/A'}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`AI service responded with ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || data.content?.[0]?.text;
    if (!raw) throw new Error('Empty AI response');

    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return { ...parsed, engine: 'ai-service' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Main entry point: attempts the external AI service, and transparently
 * falls back to the rule-based engine on any failure.
 */
async function analyzeBug(bug) {
  try {
    if (process.env.AI_API_KEY) {
      const result = await aiServiceTriage(bug);
      return result;
    }
  } catch (err) {
    console.warn('[AI Triage] External AI service failed, using rule-based fallback:', err.message);
  }
  return ruleBasedTriage(bug);
}

module.exports = { analyzeBug, ruleBasedTriage };
