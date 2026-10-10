import edge from 'edge.js'
import { cspKeywords } from '@adonisjs/shield'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { headScriptSources, refreshHeadScriptSources, withNonce } from '#services/csp'
import { environmentProblems } from '#services/environment_checks'

cspKeywords.register('@headScriptSources', () => headScriptSources())
edge.global('withNonce', withNonce)

if (app.getEnvironment() === 'web') {
  const problems = environmentProblems()
  for (const problem of problems.filter((item) => item.level === 'warning')) {
    logger.warn(problem.message)
  }
  const errors = problems.filter((item) => item.level === 'error')
  if (errors.length) {
    throw new Error(
      `Refusing to start:\n${errors.map((problem) => `  - ${problem.message}`).join('\n')}`
    )
  }
  void refreshHeadScriptSources()
}
