/* North.net — autenticação compartilhada entre login, portal e feed. */
(function () {
  "use strict";

  const SUPABASE_URL = "https://etdvbzgyzuagepnpmgyt.supabase.co";
  // Chave pública própria para o navegador. Nunca coloque uma Secret key aqui.
  const SUPABASE_KEY = "sb_publishable_cXovT9qURABx2KUxrRfbUw_RAX-onKF";
  const raiz = new URL(".", document.currentScript.src);
  const loginUrl = new URL("north-net-portal/login.html", raiz).href;
  const portalUrl = new URL("north-net-portal/index.html", raiz).href;
  const retorno = new URLSearchParams(window.location.hash.slice(1));
  const chavesLocais = [
    "meuPerfil", "meusPosts", "minhasMemorias", "meusGrupos", "meuGuestbook",
    "minhasPreferencias", "meuTema", "northnetCapa", "northChatUsuarioId"
  ];
  let usuario = null;
  let prefixo = null;
  let paginaProtegida = false;
  let recuperacao = retorno.get("type") === "recovery";
  let inicio = null;

  const cliente = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  function mensagemErro(erro) {
    const mensagens = {
      invalid_credentials: "E-mail ou senha incorretos.",
      email_not_confirmed: "Confirme seu e-mail antes de entrar. Confira também o spam.",
      user_already_exists: "Esse e-mail já tem uma conta. Use Entrar ou recupere a senha.",
      email_exists: "Esse e-mail já tem uma conta. Use Entrar ou recupere a senha.",
      signup_disabled: "Os cadastros estão fechados neste momento.",
      email_address_not_authorized: "Este e-mail ainda não está autorizado para o teste. Use o e-mail da sua conta do Supabase.",
      over_email_send_rate_limit: "O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.",
      over_request_rate_limit: "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.",
      weak_password: "A senha não atende às regras do projeto. Use pelo menos 8 caracteres e combine letras, números e símbolos.",
      same_password: "Escolha uma senha diferente da atual.",
      otp_expired: "Este link expirou ou já foi usado. Solicite outro link.",
      session_not_found: "Sua sessão terminou. Entre novamente.",
      reauthentication_needed: "Para trocar a senha, saia da conta e entre novamente primeiro."
    };
    if (erro && mensagens[erro.code]) return mensagens[erro.code];
    if (erro && (erro.name === "AuthRetryableFetchError" || /fetch|network/i.test(erro.message || ""))) {
      return "Não foi possível conectar. Confira sua internet e tente novamente.";
    }
    return erro && erro.northMensagem || "Não foi possível concluir. Tente novamente e confira as configurações de autenticação do projeto.";
  }

  function falha(texto) {
    const erro = new Error(texto);
    erro.northMensagem = texto;
    return erro;
  }

  function exigirCliente() {
    if (!/^https?:$/.test(window.location.protocol)) {
      throw falha("Abra o North pelo Live Server do VS Code, com endereço http:// ou https://.");
    }
    if (!cliente) throw falha("A biblioteca do Supabase não carregou. Confira sua internet e recarregue a página.");
  }

  function prepararDados(id) {
    const donoKey = "northnetDadosLegadosDono";
    let dono = localStorage.getItem(donoKey);
    // A primeira conta real neste navegador conserva os dados antigos, sem duplicar fotos.
    if (!dono && chavesLocais.some(function (chave) { return localStorage.getItem(chave) !== null; })) {
      localStorage.setItem(donoKey, id);
      dono = id;
    }
    prefixo = dono === id ? "" : "northnet:" + id + ":";
    // Remove as credenciais e o indicador do login antigo; a sessão vem do Supabase.
    localStorage.removeItem("northnetConta");
    localStorage.removeItem("northnetLogado");
  }

  const armazenamento = {
    getItem: function (chave) {
      if (prefixo === null) throw falha("Entre na sua conta para acessar seus dados.");
      return localStorage.getItem(prefixo + chave);
    },
    setItem: function (chave, valor) {
      if (prefixo === null) throw falha("Entre na sua conta para salvar seus dados.");
      localStorage.setItem(prefixo + chave, valor);
    },
    removeItem: function (chave) {
      if (prefixo === null) throw falha("Entre na sua conta para alterar seus dados.");
      localStorage.removeItem(prefixo + chave);
    },
    clear: function () {
      if (prefixo === null) throw falha("Entre na sua conta para alterar seus dados.");
      chavesLocais.forEach(function (chave) { localStorage.removeItem(prefixo + chave); });
    }
  };

  function irParaLogin() {
    document.documentElement.classList.add("north-auth-aguardando");
    window.location.replace(loginUrl + "?modo=entrar");
  }

  async function iniciar() {
    if (inicio) return inicio;
    inicio = (async function () {
      exigirCliente();
      const sessao = await cliente.auth.getSession();
      if (sessao.error) throw sessao.error;
      if (!sessao.data.session) return null;
      // Confere a sessão no servidor, em vez de confiar em um booleano local.
      const resultado = await cliente.auth.getUser();
      if (resultado.error) {
        if (resultado.error.status === 401 || resultado.error.status === 403 ||
            ["session_not_found", "user_not_found", "bad_jwt"].includes(resultado.error.code)) {
          await cliente.auth.signOut({ scope: "local" });
          return null;
        }
        throw resultado.error;
      }
      usuario = resultado.data.user;
      if (!usuario) return null;
      try { prepararDados(usuario.id); }
      catch (_) { throw falha("Não foi possível acessar o armazenamento deste navegador. Libere espaço ou permita o armazenamento do site e tente novamente."); }
      return usuario;
    })();
    try { return await inicio; }
    catch (erro) { inicio = null; throw erro; }
  }

  async function sair() {
    exigirCliente();
    const resultado = await cliente.auth.signOut({ scope: "local" });
    if (resultado.error) throw resultado.error;
    usuario = null;
    prefixo = null;
    inicio = null;
    irParaLogin();
  }

  function nomeUsuario() {
    const meta = usuario && usuario.user_metadata || {};
    return meta.username || meta.usuario || (usuario && usuario.email || "seu nome").split("@")[0];
  }

  function mostrarFalha(erro) {
    const painel = document.createElement("div");
    painel.setAttribute("role", "alert");
    painel.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f5f4ec;color:#16294e;display:grid;place-content:center;padding:24px;font:16px/1.6 sans-serif;text-align:center";
    const texto = document.createElement("p");
    texto.textContent = mensagemErro(erro);
    const repetir = document.createElement("button");
    repetir.textContent = "Tentar novamente";
    repetir.style.cssText = "padding:12px;border-radius:10px;cursor:pointer";
    repetir.onclick = function () { window.location.reload(); };
    const voltar = document.createElement("a");
    voltar.textContent = "Voltar para o login";
    voltar.href = loginUrl;
    painel.append(texto, repetir, voltar);
    document.body.appendChild(painel);
    document.documentElement.classList.remove("north-auth-aguardando");
  }

  async function carregarProtegida(caminhoScript) {
    paginaProtegida = true;
    try {
      const atual = await iniciar();
      if (!atual) { irParaLogin(); return; }
      if (recuperacao) { window.location.replace(loginUrl); return; }
      await new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = caminhoScript;
        script.onload = resolve;
        script.onerror = function () { reject(falha("O código da página não carregou. Confira se todos os arquivos foram copiados para as pastas corretas.")); };
        document.body.appendChild(script);
      });
      document.documentElement.classList.remove("north-auth-aguardando");
    } catch (erro) { mostrarFalha(erro); }
  }

  if (cliente) {
    // Não chama outros métodos de Auth dentro deste callback, evitando bloqueios.
    cliente.auth.onAuthStateChange(function (evento, sessao) {
      if (evento === "PASSWORD_RECOVERY") recuperacao = true;
      if (evento === "SIGNED_OUT") {
        usuario = null; prefixo = null; inicio = null;
        if (paginaProtegida) queueMicrotask(irParaLogin);
      } else if (paginaProtegida && usuario && sessao && sessao.user.id !== usuario.id) {
        document.documentElement.classList.add("north-auth-aguardando");
        queueMicrotask(function () { window.location.reload(); });
      }
    });
  }

  window.addEventListener("pageshow", function (evento) {
    if (evento.persisted && paginaProtegida) window.location.reload();
  });

  window.northAuth = {
    cliente, armazenamento, urls: { login: loginUrl, portal: portalUrl },
    iniciar, sair, nomeUsuario, mensagemErro, exigirCliente, carregarProtegida,
    get usuario() { return usuario; },
    get recuperacao() { return recuperacao; },
    erroRetorno: retorno.get("error_code") || retorno.get("error")
  };
})();
