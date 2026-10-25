"""Optional, synthetic OCR feasibility check; not an app dependency or OCR feature."""
import difflib
import json
import pathlib
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parents[1]
output = root / 'local-artifacts' / 'rag-ocr-2026-10-23'
output.mkdir(parents=True, exist_ok=True)
engine = shutil.which('tesseract')
if not engine:
    raise SystemExit('Requested local OCR evaluation requires installed Tesseract')
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 32)
cases = {
    'printed': ['Una politica migliorata non e necessariamente ottima.', 'La convergenza dei parametri richiede eccitazione persistente.'],
    'notation': ['Q_pi(s,a) = E[G_t | S_t=s, A_t=a]', 'sigma = q_dot - q_r_dot', 'Y(q, q_dot, q_r_dot, q_r_ddot) theta_hat'],
    'table': ['Metodo     Modello noto     Fine episodio', 'TD         no               no', 'Monte Carlo no              si'],
}
results = []
for name, lines in cases.items():
    image = Image.new('RGB', (1400, 420), 'white')
    draw = ImageDraw.Draw(image)
    for index, line in enumerate(lines):
        draw.text((40, 40 + index * 75), line, fill='black', font=font)
    path = output / (name + '.png')
    image.save(path)
    run = subprocess.run([engine, str(path), 'stdout', '-l', 'ita+eng', '--psm', '6'], check=True, capture_output=True, text=True, timeout=45)
    actual = run.stdout.strip()
    expected = '\n'.join(lines)
    normalize = lambda text: ' '.join(text.split()).lower()
    results.append({'case': name, 'expected': expected, 'actual': actual, 'character_similarity': difflib.SequenceMatcher(None, normalize(expected), normalize(actual)).ratio(), 'exact': normalize(expected) == normalize(actual)})
version = subprocess.run([engine, '--version'], capture_output=True, text=True, check=True).stdout.splitlines()[0]
report = {'engine': version, 'synthetic_only': True, 'network_calls': 0, 'results': results, 'decision': 'Do not silently use OCR as a reliable formula/table transcription. Existing explicit visual page attachment remains available. No OCR runtime bundled or source overwritten.'}
(output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf8')
print(json.dumps({'engine': version, 'cases': len(results), 'exact': sum(result['exact'] for result in results), 'similarities': [round(result['character_similarity'], 4) for result in results]}))
