# build/ — geração de assets

O app é **estático** (sem bundler, servido direto no GitHub Pages). Estes
scripts mantêm **fonte única de verdade** para código/markup repetido,
preservando a saída estática (boa para SEO, FOUC e PWA).

Rode sempre da **raiz do repositório**.

## Scripts

| Comando | O que faz |
|---|---|
| `bash build/build.sh` | Build completo: `concat.sh` + `build-pages.mjs`. |
| `bash build/build.sh --check` | Só verifica drift dos partials (não grava). |
| `bash build/concat.sh` | Concatena `js/src/*.js` → `js/main.js`. |
| `node build/build-pages.mjs` | Gera as regiões de partial nas páginas. |
| `node build/build-pages.mjs --check` | Dry-run: lista páginas com drift (sai 1 se houver). |

## Partials de página (`build-pages.mjs`)

Mantém UMA fonte para blocos de markup repetidos nas páginas. Hoje gerencia a
**navbar padrão** das páginas de conteúdo.

- **Estrutura** → `build/partials/navbar.html` (com `{{TITLE}}` / `{{SUBTITLE}}`).
- **Textos por página** → `build/pages.config.json` (`navTitle`, `navSubtitle`).
- A região gerada em cada HTML fica entre marcadores:

  ```html
  <!-- mc:navbar:start ... -->
  <nav class="navbar"> ... </nav>
  <!-- mc:navbar:end -->
  ```

### Como editar

- Mudar o **layout** da navbar (vale p/ todas): edite `build/partials/navbar.html`
  e rode `node build/build-pages.mjs`.
- Mudar o **título/subtítulo** de uma página: edite `build/pages.config.json` e
  rode o build.
- **NÃO** edite a navbar direto no HTML entre os marcadores — o build sobrescreve.

### Garantia anti-drift

`tests/run_tests.js` falha se algum HTML divergir do que os partials gerariam.
Ou seja: se alguém editar a navbar à mão sem rodar o build, o CI acusa. Rode
`node build/build-pages.mjs` para reconciliar.

### Páginas fora do escopo (intencional)

- `arena`, `batalha`, `perfil-publico`: navbar com `<h1 id="navTitle">` definido
  em runtime por JS (título dinâmico).
- `login`, `welcome`, `dashboard`, `aprendizado`, etc.: layout próprio (sem a
  navbar padrão).
- **Fontes** e **markup do splash** continuam por página: há variação
  intencional (ex.: 5 páginas carregam `DM Sans` peso `900`), então não são
  unificadas para não quebrar o render.
