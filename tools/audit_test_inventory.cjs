// Verify that tracked tests and browser scenarios have not disappeared or been muted.
const fs = require('node:fs')
const path = require('node:path')
const {execFileSync} = require('node:child_process')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const git = args => execFileSync('git', args, {cwd:root,encoding:'utf8',windowsHide:true})
const files = [...new Set(git(['ls-files','-co','--exclude-standard']).trim().split(/\r?\n/))]
const baseline = git(['ls-tree','-r','--name-only','HEAD']).trim().split(/\r?\n/)
const tests = files.filter(file => /^tests\//.test(file) && /\.(tsx?|[cm]?js|py)$/.test(file))
const missing = baseline.filter(file => /^tests\//.test(file) && /\.(tsx?|[cm]?js|py)$/.test(file) && !files.includes(file))
const suppressed = []
const chain = expression => ts.isCallExpression(expression) ? chain(expression.expression) : ts.isPropertyAccessExpression(expression) ? [...chain(expression.expression),expression.name.text] : ts.isElementAccessExpression(expression)&&ts.isStringLiteral(expression.argumentExpression) ? [...chain(expression.expression),expression.argumentExpression.text] : ts.isIdentifier(expression) ? [expression.text] : []
const countDefinitions = (file, source, inspect = true) => {
  if (file.endsWith('.py')) return (source.match(/^\s*def test_\w+\s*\(/gm) || []).length
  const tree = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  let count=0
  const visit = node => {
    if(ts.isCallExpression(node)) {
      const expression = node.expression.getText(tree)
      const names=chain(node.expression)
      if (inspect && ((['it','test','describe'].includes(names[0]) && names.some(name=>['skip','only','todo','skipIf','runIf','fails'].includes(name))) || /^(?:xit|xtest|xdescribe|fit|fdescribe)$/.test(expression))) suppressed.push({file,line:tree.getLineAndCharacterOfPosition(node.getStart()).line+1,expression:names.join('.')})
      if (/^(?:it|test|describe)(?:\.each)?$/.test(expression)) count++
    }
    ts.forEachChild(node,visit)
  }
  visit(tree)
  return count
}
let definitions=0
const reductions=[]
for (const file of tests) {
  const source=fs.readFileSync(path.join(root,file),'utf8')
  const count=countDefinitions(file,source); definitions+=count
  if (file.endsWith('.py') && /@(?:unittest\.)?skip|pytest\.mark\.(?:skip|xfail)/.test(source)) suppressed.push({file,expression:'Python skip/xfail marker'})
  if (baseline.includes(file)) {
    const old=git(['show',`HEAD:${file}`])
    const before=countDefinitions(file,old,false)
    if(count<before)reductions.push({file,before,after:count})
  }
}
const browser=fs.readFileSync(path.join(root,'tests/integration/hookRegression.browser.tsx'),'utf8')
const browserTree=ts.createSourceFile('hookRegression.browser.tsx',browser,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const runFunction=browserTree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='run')
const directDefaultCalls=(runFunction?.body?.statements || []).flatMap(node=>ts.isExpressionStatement(node)&&ts.isAwaitExpression(node.expression)&&ts.isCallExpression(node.expression.expression)&&ts.isIdentifier(node.expression.expression.expression)?[node.expression.expression.expression.text]:[])
const baselineBrowser=ts.createSourceFile('baseline.browser.tsx',git(['show','HEAD:tests/integration/hookRegression.browser.tsx']),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const baselineRun=baselineBrowser.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='run')
const baselineCalls=(baselineRun?.body?.statements || []).flatMap(node=>ts.isExpressionStatement(node)&&ts.isAwaitExpression(node.expression)&&ts.isCallExpression(node.expression.expression)&&ts.isIdentifier(node.expression.expression.expression)?[node.expression.expression.expression.text]:[])
const removedDefaultCalls=baselineCalls.filter(name=>/^run/.test(name)&&!directDefaultCalls.includes(name))
const imported=[...browser.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"]/g)].flatMap(match=>match[1].split(',').map(name=>name.trim()).filter(name=>/^run[A-Z]/.test(name)))
const notInvoked=imported.filter(name=>!new RegExp(`await\\s+${name}\\(`).test(browser))
const packageData=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
const previousPackage=JSON.parse(git(['show','HEAD:package.json']))
const removedGateCommands=previousPackage.scripts.check.split('&&').map(s=>s.trim()).filter(command=>!packageData.scripts.check.split('&&').map(s=>s.trim()).includes(command))
const report={testSourceFiles:tests.length,unitFiles:tests.filter(f=>f.endsWith('.test.ts')).length,pythonFiles:tests.filter(f=>f.endsWith('.py')).length,nodeFiles:tests.filter(f=>f.endsWith('.node.mjs')).length,staticDefinitions:definitions,missing,suppressed,reductions,notInvoked,removedGateCommands,removedDefaultCalls,fullRunnerHasCollections:directDefaultCalls.includes('runCollectionsScenarios'),directDefaultCalls:directDefaultCalls.filter(name=>/^run/.test(name))}
console.log(JSON.stringify(report,null,2))
if(missing.length||suppressed.length||reductions.length||notInvoked.length||removedGateCommands.length||removedDefaultCalls.length||!report.fullRunnerHasCollections)process.exitCode=1
