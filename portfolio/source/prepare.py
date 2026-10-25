"""Prepare the approved portfolio for a buildless, portable website."""
from pathlib import Path
from PIL import Image
import json, shutil, html
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[1] / 'output/portfolio/SPACE_Editable_Archive_20261023'
DIST = ROOT / 'dist'
for d in ['assets/pages', 'assets/fonts', 'downloads']:
    (DIST / d).mkdir(parents=True, exist_ok=True)
pages = json.loads((SOURCE/'source/copy_bilingual.json').read_text('utf-8'))
meta = [
    ('Overview', 'A factory you build. A system you pilot.', '项目概述'),
    ('Origins', 'Three forms of progression, one moving workshop.', '缘起与目标'),
    ('Play', 'Construction becomes part of control.', '核心玩法'),
    ('Reflection', 'The first experiment, and what it taught me.', '前作与反思'),
    ('Iteration', 'A more focused system, built through experiments.', '迭代与成果'),
]
alts = [
    'SPACE: an isometric moving factory in deep space, with the design question and three project principles.',
    'An orbital composition connecting Raft, Noita and automation games to acquisition, execution and understanding.',
    'Gameplay captures and orbital diagrams explain exploration, ship editing, supply, triggers and piloting.',
    'Hexagonal spell editing, particle output and boss combat from Astronaut Aircraft Artemis, with retrospective analysis.',
    'Four elliptical development stages connect the 2D prototype, 3D trials, space setting and shared editing views.',
]
omit = {'title','insets','hero_caption','network_caption','automation_images','callout_store','callout_route','callout_input','flight_caption','credits','particles','boss','a_caption','combat_h'}
groups = []
for p, (label, strap, zh), alt in zip(pages, meta, alts):
    n = p['page']
    im = Image.open(SOURCE/f'pages/{n:02}.png').convert('RGB')
    im.save(DIST/f'assets/pages/{n:02}-full.webp', lossless=True, method=6)
    for width in [840, 1680]:
        im.resize((width, round(width*3/7)), Image.Resampling.LANCZOS).save(DIST/f'assets/pages/{n:02}-{width}.webp', quality=94, method=6)
    p.update(label=label, label_zh=zh, strap=strap, alt=alt)
    blocks = []
    for b in p['blocks']:
        if b['id'] in omit: continue
        tag = 'h4' if b['id'].endswith('_h') or b['id'] in ['strap','h1','h2','h3'] else 'p'
        blocks.append(f'<{tag} data-copy="{b["id"]}">{html.escape(b["en"].replace(chr(10)," "))}</{tag}>')
    groups.append(f'''
    <section class="chapter" id="chapter-{n}" aria-labelledby="chapter-title-{n}" data-chapter="{n}">
      <div class="chapter-meta"><h2 id="chapter-title-{n}"><span class="chapter-number">{n:02}</span>{label}</h2><p>{strap}</p><span class="page-total">{n:02} / 05</span></div>
      <button class="sheet" type="button" data-open="{n}" aria-label="Enlarge chapter {n}: {label}">
        <img src="assets/pages/{n:02}-1680.webp" srcset="assets/pages/{n:02}-840.webp 840w, assets/pages/{n:02}-1680.webp 1680w, assets/pages/{n:02}-full.webp 2520w"
             sizes="(min-width:2200px) 2200px, 100vw" width="2520" height="1080"
             alt="{html.escape(alt)}" loading="{'eager' if n == 1 else 'lazy'}" decoding="async" {'fetchpriority="high"' if n == 1 else ''}>
        <span class="enlarge-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>Explore full page</span>
      </button>
      <details class="reader" id="reader-{n}">
        <summary><span class="reader-label">Read this chapter</span><span class="reader-plus" aria-hidden="true">+</span></summary>
        <div class="reader-content" data-reader="{n}" lang="en">{''.join(blocks)}</div>
      </details>
    </section>''')
(DIST/'content.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2), 'utf-8')
font = SOURCE/'assets/type/SPACE-Axis-Refined-19'
for weight in ['Regular','Medium','Bold','Black']:
    shutil.copy2(font/f'fonts/Mono/SPACE-Axis-Refined-Mono-{weight}.woff', DIST/f'assets/fonts/{weight.lower()}.woff')
for p in font.rglob('*'):
    if p.is_file() and ('ofl' in p.name.lower() or 'license' in p.name.lower()):
        shutil.copy2(p, DIST/'assets/fonts'/p.name)
        break
shutil.copy2(font/'wordmarks/SPACE-Color-Black-ivory.svg', DIST/'assets/space-wordmark.svg')
shutil.copy2(SOURCE/'delivery/SPACE_Refined_21x9.pdf', DIST/'downloads/SPACE-Orbital-Workshop.pdf')
shutil.copy2(SOURCE/'delivery/五页中文稿_可编辑.txt', DIST/'downloads/SPACE-Chinese-Companion.txt')
Image.open(SOURCE/'pages/01.png').convert('RGB').resize((1200,514),Image.Resampling.LANCZOS).save(DIST/'assets/social-preview.jpg',quality=92)
template = (ROOT/'index.template.html').read_text('utf-8')
(DIST/'index.html').write_text(template.replace('<!-- CHAPTERS -->','\n'.join(groups)), 'utf-8')
for p in ['style.css','app.js','favicon.svg']: shutil.copy2(ROOT/p, DIST/p)
(DIST/'.nojekyll').write_text('', 'utf-8')
(DIST/'robots.txt').write_text('User-agent: *\nAllow: /\n', 'utf-8')
print(json.dumps({'pages':len(pages),'bytes':sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file())}))
