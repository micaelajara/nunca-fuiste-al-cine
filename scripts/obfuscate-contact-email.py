#!/usr/bin/env python3
"""One-off script: replace the plain mailto: link with a JS-built one on all pages."""
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent

OLD_LINK = '<a href="mailto:nuncafuistealcine@gmail.com" class="cta-small cta-outline">Contactanos</a>'
NEW_LINK = '<a href="#" id="contactLink" class="cta-small cta-outline">Contactanos</a>'

JS_SNIPPET = """
  var contactLink = document.getElementById('contactLink');
  if (contactLink) {
    var user = 'nuncafuistealcine';
    var domain = 'gmail.com';
    contactLink.href = 'mailto:' + user + '@' + domain;
  }
</script>"""

changed = []
for html_file in sorted(REPO.glob('*.html')):
    text = html_file.read_text(encoding='utf-8')
    if OLD_LINK not in text:
        continue
    if '</script>' not in text:
        raise SystemExit(f'{html_file.name}: no </script> found to anchor the snippet')

    text = text.replace(OLD_LINK, NEW_LINK, 1)
    text = text.replace('</script>', JS_SNIPPET, 1)

    html_file.write_text(text, encoding='utf-8')
    changed.append(html_file.name)

print(f'Updated {len(changed)} files:')
for name in changed:
    print(f'  - {name}')
