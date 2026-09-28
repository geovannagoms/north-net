# PROJECT_CONTEXT.md — North.net

## 1. O que é

North.net é uma rede social nostálgica (inspirada em Orkut, iCarly.com, Instagram antigo) construída por uma pessoa iniciante em programação, guiada passo a passo. Hoje é single-user (sem backend real): um portal de entrada com login local, e um app principal tipo perfil-Orkut com posts ("norths"), grupos, amigos fictícios, guestbook e memories.

## 2. Stack

- HTML5, CSS3, JavaScript vanilla (ES6, sem módulos, sem bundler).
- Sem framework, sem build step, sem package manager.
- Sem backend, sem banco de dados real. Persistência 100% via `localStorage` do navegador (chave-valor, JSON.stringify/parse). Imagens são convertidas para base64 via `FileReader` e salvas direto como string no `localStorage`.
- Fontes: Google Fonts — `Fredoka` (títulos/display) e `Inter` (corpo/UI), carregadas via `<link>` no `<head>`.
- Ambiente de desenvolvimento: VS Code + extensão "Live Server" (Ritwick Dey), servindo em `http://127.0.0.1:5500`.
- Sem testes automatizados.

## 3. Estrutura de pastas

```
North-Net/                        ← pasta raiz aberta no VS Code
├── north-net-portal/              ← portal de entrada (hub + login)
│   ├── login.html                 ← tela de criar conta / entrar
│   ├── login.css
│   ├── login.js
│   ├── index.html                 ← portal (moldura "laptop" com capa + botões Feed/Estante)
│   ├── style.css
│   └── script.js                  ← lógica de trocar capa (upload/remover) + logout
├── feed-social/                   ← app principal (a "rede social" propriamente dita)
│   ├── index.html                 ← página única com todas as seções (perfil, feed, etc)
│   ├── style.css
│   └── script.js
└── Minha Estante/                 ← projeto pausado (estante de livros), não linkado no portal ainda
    ├── index.html
    ├── style.css
    └── script.js
```

Não há mais pastas ou arquivos além desses. Cada uma das três pastas acima é independente (tem seu próprio `index.html`/`style.css`/`script.js`); elas só se conectam por links `<a href="../outra-pasta/index.html">`.

## 4. O que já está funcionando

### north-net-portal
- `login.html`: primeiro acesso cria conta (usuário+senha salvos em `localStorage["northnetConta"]`); acessos seguintes fazem login comparando com essa conta. Sucesso seta `localStorage["northnetLogado"] = "true"` e redireciona pro `index.html`.
- `index.html`: moldura visual de "laptop" (CSS puro, sem imagem) com uma "tela" grande de capa. Capa pode ser: (a) padrão — gradiente + textura CSS com o texto "North.net" grande centralizado, ou (b) personalizada — foto enviada pelo usuário (upload, salva em base64 em `localStorage["northnetCapa"]`), com texto pequeno no canto. Botões de "Trocar capa" e "Remover capa (🗑)".
- Dois "clipes" abaixo da capa: **Feed** (link ativo pra `../feed-social/index.html`) e **Estante** (desativado, sem link, pois Minha Estante não está pronta).
- Botão "Sair da conta" seta `northnetLogado = "false"` e volta pro login.
- Todo `index.html` do portal e do feed-social começa com um `<script>` inline que checa `localStorage["northnetLogado"]` e redireciona pro login se não estiver autenticado — isso é o "gate" de acesso, compartilhado entre pastas porque todas rodam na mesma origem (`127.0.0.1:5500`).

### feed-social (o núcleo do projeto)
Página única (`index.html`) dividida em seções, todas renderizadas/manipuladas via JavaScript puro manipulando o DOM (sem framework):

- **Header/topo**: logo "north.net", slogan, menu (home/explore/signals/settings/logout), busca (visual, sem função).
- **Sidebar esquerda**: caixa de destaque "NORTH is yours", menu "quick north" (navegação — ver abaixo), "who's online?" (lista fictícia fixa no HTML), "north.fm" (player visual, **sem áudio real ainda**), "memories" (upload de foto+legenda, com "view all").
- **Coluna central**: cartão de perfil (foto upload, nome, citação curta), "mood" (texto livre), barra de stats (norths/friends/favorites/groups/photos — calculados dinamicamente onde possível), "about me" (textarea grande), "my top friends" (grid fixo fictício, view all leva pra mesma lista de "who's online"), "my icons" (4 slots de emoji editáveis clicando), feed de "norths" (posts com texto e/ou imagem, compositor no topo, curtir, apagar, mostra só os 4 mais recentes com link "view all" pra lista completa).
- **Sidebar direita**: "my playlist" (lista estática de texto, **sem busca real de música ainda**), "my groups" (criar grupo com nome+bio, apagar, view all).
- **Guestbook** (full-width, fora do grid de 3 colunas): recados com nome/texto/data, responder (1 resposta por recado), apagar, assinar novo recado (nome + texto livres, sem validação de identidade), view all.
- **Settings** (acessível pelo menu superior): trocar senha da conta, toggles de preferência (perfil privado / notificações — salvos mas sem efeito real ainda), exportar todos os dados como `.json`, apagar conta (limpa `localStorage` inteiro e desloga).
- Padrão de "view all": cada seção com lista longa (memories, groups, friends, norths, guestbook, settings) usa uma `<div class="view-pagina" id="view...">` escondida por padrão (`display:none`), que aparece por cima escondendo `.pagina-corpo` e `.guestbook` quando o link "view all" correspondente é clicado, e um link "‹ voltar" que reverte isso.

## 5. O que falta / próximos passos

1. **Playlist com busca real de música** — hoje é só texto estático. Precisa de uma API de busca de música (ideia discutida: Deezer, que tem endpoint de busca gratuito sem API key) pra digitar nome da música e adicionar de verdade.
2. **North.fm tocando áudio de verdade** — depende do item acima; ao clicar numa música da playlist, tocar ela no player da sidebar (provavelmente via `<audio>` ou embed).
3. **Causa raiz de um bug de CSS não resolvida**: havia um conflito de especificidade fazendo `.sidebar-esquerda` renderizar `gap: 8px` ao invés dos `14px` definidos — foi contornado com `!important`, mas a regra duplicada/conflitante original não foi localizada e removida. Vale auditar o `style.css` do feed-social por regras `.sidebar-esquerda` duplicadas.
4. **"Estante" (Minha Estante)** — projeto separado, funcional mas com visual que a usuária considerou incompleto/não gostou; está pausado e **não linkado** no portal (botão desativado).
5. **Seções "em breve"**: explore, signals, favorites — têm apenas uma tela genérica de aviso "essa área ainda está sendo construída", sem função real.
6. **Multiusuário real** — todo o "who's online", "top friends", membros de grupos, etc. são dados fictícios fixos no código. Migração pra multiusuário de verdade exigiria backend (Supabase foi cogitado e depois pausado em favor de terminar o visual primeiro) com auth e banco de dados — isso ainda não foi iniciado.
7. Simplificação sugerida (não feita): trocar as várias funções repetidas de abrir/fechar "view-pagina" (cada seção tem sua própria lógica quase idêntica de esconder `.pagina-corpo` e mostrar a view) por uma função genérica única.

## 6. Padrões de código usados até aqui

- **Nomenclatura**: variáveis e funções em português, `camelCase` (ex: `renderPerfil`, `criarNorth`, `overlayEditar`). IDs de elementos HTML em `camelCase` também, às vezes prefixados por contexto (`btnEditarPerfil`, `inputFotoPerfil`, `linkViewAllGrupos`, `qnHome` para itens do menu "quick north"). Classes CSS em português, `kebab-case` (ex: `.caixa-topo`, `.north-item`, `.view-pagina`).
- **Persistência**: cada "entidade" tem sua própria chave no `localStorage`, sempre JSON stringificado: `meuPerfil`, `meusPosts`, `minhasMemorias`, `meusGrupos`, `meuGuestbook`, `minhasPreferencias`, `northnetConta`, `northnetLogado`, `northnetCapa`. Padrão de leitura: `let x = JSON.parse(localStorage.getItem("chave")) || <valorPadrao>;` no topo do script. Padrão de escrita: sempre que o estado muda, salva de novo com `localStorage.setItem("chave", JSON.stringify(x))` imediatamente (sem debounce).
- **Renderização**: sem virtual DOM nem templates — cada seção tem uma função `renderX()` que faz `container.innerHTML = ""` e reconstrói os elementos via `document.createElement` + `appendChild`. É chamada manualmente depois de qualquer alteração de dado (create/update/delete), nunca automática/reativa.
- **Modais**: padrão `.overlay` (fundo escurecido, `position: fixed; inset: 0;`) contendo `.modal-editar`. Abre com `overlay.classList.add("show")`, fecha com `.remove("show")`, fecha também clicando fora (`if (evento.target === overlay)`).
- **Páginas internas ("view all")**: padrão `.view-pagina` com `display:none` por padrão, classe `.show` pra aparecer; ao abrir, esconde `.pagina-corpo` e `.guestbook`; ao voltar, reverte. Não é roteamento de verdade (sem mudar URL/histórico do navegador).
- **Imagens**: sempre via `<input type="file" accept="image/*">` + `FileReader.readAsDataURL()`, nunca upload pra servidor (não existe servidor). Preview imediato antes de salvar.
- **Erros**: sem tratamento formal de erro/try-catch estruturado; validações são `if` simples com `alert()` pra avisar o usuário (ex: "escreva algo ou escolha uma foto!"). Confirmações destrutivas usam `confirm()` nativo do navegador (ex: apagar post, apagar conta).
- **Estilo geral**: paleta de cor azul-marinho/creme (`#1E3A6E`, `#3A5FA8`, `#F0EFE6`, `#DDD3B0`), gradientes lineares em headers e barras (`linear-gradient(180deg, #3A5FA8 0%, #1E3A6E 100%)`), bordas com `border-radius` pequeno (6-10px), sem CSS framework — tudo escrito à mão.

## 7. Variáveis de ambiente / como rodar

Não há variáveis de ambiente — é um site 100% estático, sem chamadas a API externa nem chaves secretas (exceto Google Fonts via CDN público).

Para rodar:
1. Abrir a pasta raiz `North-Net/` no VS Code.
2. Ter a extensão "Live Server" instalada.
3. Clicar com botão direito em `north-net-portal/login.html` → "Open with Live Server" (ou usar o botão "Go Live" na barra inferior).
4. Acessa em `http://127.0.0.1:5500/north-net-portal/login.html`.

Não há passo de instalação (`npm install` etc.) porque não há dependências.

## 8. Regras que não podem ser quebradas

- **Nunca** remover o texto "North.net" fixo no HTML da capa do portal (é uma marca d'água intencional — mesmo com capa personalizada, é pra continuar visível, só menor/reposicionado).
- **Nunca** trocar o mecanismo de autenticação por algo que quebre o compartilhamento entre pastas — o login funciona porque todas as pastas são servidas pela mesma origem (mesmo host:porta). Se migrar pra multiusuário/backend, isso precisa ser reconsiderado do zero, não só remendado.
- **Nunca** remover ou renomear as chaves de `localStorage` já em uso (listadas na seção 6) sem migrar os dados existentes — a usuária já tem dados reais salvos localmente que não podem ser perdidos silenciosamente.
- **Não introduzir build step, framework ou bundler** sem alinhar antes — a usuária é iniciante completa e está aprendendo com HTML/CSS/JS puro, passo a passo; qualquer ferramenta nova precisa ser introduzida com explicação, não silenciosamente.
- **Não reverter o layout do feed-social pro formato antigo** (app mobile de abas com bottom nav) — esse foi completamente abandonado e substituído pelo layout desktop em 3 colunas estilo Orkut. O histórico de conversa mostra essa decisão como definitiva.
- Ao gerar HTML grande, sempre fechar todas as tags corretamente e manter a estrutura de 3 colunas (`sidebar-esquerda` / `coluna-centro` / `sidebar-direita`) dentro de `.pagina-corpo` — erros de aninhamento (divs não fechadas, blocos colados no lugar errado) já causaram bugs visuais recorrentes nesse projeto; validar a estrutura antes de entregar.
