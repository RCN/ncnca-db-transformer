import { diffChars } from 'diff'
import chalk from 'chalk'
import inspect from './utils'

const printDiff = diff => {
  // green for additions, red for deletions
  // grey for common parts
  const diffStr = diff.map(part =>
    part.added
      ? chalk.green(part.value)
      : part.removed
        ? chalk.red(part.value)
        : chalk.grey(part.value)
  )
  .join('')

  console.log(diffStr)
}


export default (one, other) => printDiff(diffChars(one, other))
