const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync } = require('node:child_process')
const candidates = [process.env.JAVA_HOME, 'C:/Program Files/Android/Android Studio/jbr'].filter(Boolean)
const javaHome = candidates.find(home => fs.existsSync(path.join(home, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac')))
const executable = name => javaHome ? path.join(javaHome, 'bin', name + (process.platform === 'win32' ? '.exe' : '')) : name
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lezionify-periods-'))
try {
  execFileSync(executable('javac'), ['-d', directory,
    'android-companion/app/src/main/java/it/lezionify/mobile/StudyPeriods.java', 'tests/android/StudyPeriodsTest.java'], { stdio: 'inherit', windowsHide: true })
  execFileSync(executable('java'), ['-cp', directory, 'it.lezionify.mobile.StudyPeriodsTest'], { stdio: 'inherit', windowsHide: true })
} finally {
  if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('lezionify-periods-')) throw new Error('Invalid temporary test directory')
  fs.rmSync(directory, { recursive: true, force: true })
}
