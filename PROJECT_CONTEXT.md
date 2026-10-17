# PROJECT_CONTEXT.md — North.net

## 1. O que é

North.net é uma rede social autoral em desenvolvimento, inspirada na estética de redes e sites sociais dos anos 2000 e início dos anos 2010, especialmente Orkut, iCarly.com e Instagram antigo.

O projeto é desenvolvido com HTML, CSS e JavaScript puro e utiliza Supabase para autenticação de usuários.

Atualmente, o North.net possui um portal de entrada com criação de conta e login, além de uma aplicação social com perfil, norths (publicações), grupos, guestbook, memories e outras funcionalidades em desenvolvimento.

## 2. Stack

- HTML5
- CSS3
- JavaScript vanilla (ES6)
- Supabase
- Supabase Auth para autenticação e gerenciamento de usuários
- Git e GitHub para versionamento
- Sem framework front-end
- Sem bundler ou build step

### Autenticação

A autenticação utiliza Supabase Auth.

O sistema atualmente permite:

- criação de conta com e-mail e senha;
- nome/apelido armazenado nos metadados do usuário;
- confirmação de cadastro por e-mail;
- login com e-mail e senha;
- persistência e renovação automática da sessão;
- recuperação de senha por e-mail;
- definição de nova senha;
- logout;
- proteção das páginas que exigem autenticação.

O antigo sistema de autenticação baseado apenas em `localStorage` não é mais utilizado.

### Armazenamento local

Parte dos dados da aplicação ainda utiliza `localStorage`.

O armazenamento local é separado por usuário autenticado, evitando que contas diferentes no mesmo navegador compartilhem os mesmos dados.

A migração e integração dos dados da aplicação com o Supabase ainda está em desenvolvimento.

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

## 4. O que já está funcionando

### Autenticação e contas

- Cadastro de usuários com e-mail, senha e nome/apelido.
- Confirmação de cadastro por e-mail.
- Login utilizando Supabase Auth.
- Sessão persistente com renovação automática.
- Validação da sessão antes de liberar páginas protegidas.
- Recuperação de senha por e-mail.
- Definição de nova senha através do fluxo de recuperação.
- Logout.
- Mensagens de erro personalizadas para problemas de autenticação e conexão.
- Separação dos dados locais de acordo com o usuário autenticado.

### north-net-portal
- `login.html`: interface de autenticação integrada ao Supabase Auth, permitindo criar conta com nome/apelido, e-mail e senha, entrar em uma conta existente e iniciar o processo de recuperação de senha.
- A autenticação é compartilhada entre o portal e o feed através do `north-auth.js`, responsável pela conexão com o Supabase e pelo gerenciamento da sessão do usuário.
- As páginas protegidas verificam a sessão atual antes de liberar o acesso. Caso não exista uma sessão válida, o usuário é redirecionado para a página de login.
- O sistema permite confirmação de cadastro por e-mail, recuperação de senha e definição de uma nova senha.
- O logout encerra a sessão atual do Supabase e redireciona o usuário para a página de login.
- `index.html`: moldura visual de "laptop" (CSS puro, sem imagem) com uma "tela" grande de capa. A capa pode ser padrão ou personalizada com uma imagem enviada pelo usuário.
- Dois "clipes" abaixo da capa: **Feed** (link para `../feed-social/index.html`) e **Estante** (desativado enquanto a área Minha Estante permanece em desenvolvimento).

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
6. **Integração com Supabase**: a autenticação com Supabase já está implementada e funcional. a integração dos demais dados da aplicação com o Supabase ainda está em desenvolvimento. o objetivo é reduzir gradualmente a dependência do armazenamento local e permitir que os dados necessários sejam persistidos entre dispositivos e sessões.
7. Simplificação sugerida (não feita): trocar as várias funções repetidas de abrir/fechar "view-pagina" (cada seção tem sua própria lógica quase idêntica de esconder `.pagina-corpo` e mostrar a view) por uma função genérica única.

## 6. Padrões de código usados até aqui

- **Nomenclatura**: variáveis e funções em português, `camelCase` (ex: `renderPerfil`, `criarNorth`, `overlayEditar`). IDs de elementos HTML em `camelCase` também, às vezes prefixados por contexto (`btnEditarPerfil`, `inputFotoPerfil`, `linkViewAllGrupos`, `qnHome` para itens do menu "quick north"). Classes CSS em português, `kebab-case` (ex: `.caixa-topo`, `.north-item`, `.view-pagina`).
- **Persistência**: cada "entidade" tem sua própria chave no `localStorage`, sempre JSON stringificado: `meuPerfil`, `meusPosts`, `minhasMemorias`, `meusGrupos`, `meuGuestbook`, `minhasPreferencias`, `northnetCapa`. Padrão de leitura: `let x = JSON.parse(localStorage.getItem("chave")) || <valorPadrao>;` no topo do script. Padrão de escrita: sempre que o estado muda, salva de novo com `localStorage.setItem("chave", JSON.stringify(x))` imediatamente (sem debounce).
- **Renderização**: sem virtual DOM nem templates — cada seção tem uma função `renderX()` que faz `container.innerHTML = ""` e reconstrói os elementos via `document.createElement` + `appendChild`. É chamada manualmente depois de qualquer alteração de dado (create/update/delete), nunca automática/reativa.
- **Modais**: padrão `.overlay` (fundo escurecido, `position: fixed; inset: 0;`) contendo `.modal-editar`. Abre com `overlay.classList.add("show")`, fecha com `.remove("show")`, fecha também clicando fora (`if (evento.target === overlay)`).
- **Páginas internas ("view all")**: padrão `.view-pagina` com `display:none` por padrão, classe `.show` pra aparecer; ao abrir, esconde `.pagina-corpo` e `.guestbook`; ao voltar, reverte. Não é roteamento de verdade (sem mudar URL/histórico do navegador).
- - **Imagens**: atualmente, parte das imagens é processada no navegador através de `FileReader` e armazenada localmente como Data URL. A estratégia de armazenamento está sendo revista conforme avança a integração com o Supabase.
- **Erros**: sem tratamento formal de erro/try-catch estruturado; validações são `if` simples com `alert()` pra avisar o usuário (ex: "escreva algo ou escolha uma foto!"). Confirmações destrutivas usam `confirm()` nativo do navegador (ex: apagar post, apagar conta).
- **Estilo geral**: paleta de cor azul-marinho/creme (`#1E3A6E`, `#3A5FA8`, `#F0EFE6`, `#DDD3B0`), gradientes lineares em headers e barras (`linear-gradient(180deg, #3A5FA8 0%, #1E3A6E 100%)`), bordas com `border-radius` pequeno (6-10px), sem CSS framework — tudo escrito à mão.

## 7. Configuração e execução

O projeto utiliza Supabase para autenticação.

A configuração pública necessária para o cliente web está definida no arquivo `north-auth.js`.

Para executar o projeto localmente:

1. Clone o repositório.
2. Abra a pasta raiz do North.net no VS Code.
3. Utilize a extensão Live Server.
4. Abra `north-net-portal/login.html` com o Live Server.
5. Crie uma conta ou entre com uma conta existente.

O projeto deve ser executado através de HTTP/HTTPS. Abrir os arquivos diretamente pelo protocolo `file://` não é suportado.

## 8. Regras que não podem ser quebradas

- **Nunca** remover o texto "North.net" fixo no HTML da capa do portal (é uma marca d'água intencional — mesmo com capa personalizada, é pra continuar visível, só menor/reposicionado).
- **Nunca** remover ou renomear as chaves de `localStorage` já em uso (listadas na seção 6) sem migrar os dados existentes — a usuária já tem dados reais salvos localmente que não podem ser perdidos silenciosamente.
- **Não introduzir build step, framework ou bundler** sem alinhar antes — a usuária é iniciante completa e está aprendendo com HTML/CSS/JS puro, passo a passo; qualquer ferramenta nova precisa ser introduzida com explicação, não silenciosamente.
- **Não reverter o layout do feed-social pro formato antigo** (app mobile de abas com bottom nav) — esse foi completamente abandonado e substituído pelo layout desktop em 3 colunas estilo Orkut. O histórico de conversa mostra essa decisão como definitiva.
- Ao gerar HTML grande, sempre fechar todas as tags corretamente e manter a estrutura de 3 colunas (`sidebar-esquerda` / `coluna-centro` / `sidebar-direita`) dentro de `.pagina-corpo` — erros de aninhamento (divs não fechadas, blocos colados no lugar errado) já causaram bugs visuais recorrentes nesse projeto; validar a estrutura antes de entregar.
