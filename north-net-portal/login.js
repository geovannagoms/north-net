(function () {
  "use strict";
  const form = document.getElementById("formLogin");
  const inputUsuario = document.getElementById("inputUsuario");
  const inputEmail = document.getElementById("inputEmail");
  const inputSenha = document.getElementById("inputSenha");
  const btnAcao = document.getElementById("btnAcao");
  const btnAlternar = document.getElementById("btnAlternarModo");
  const btnRecuperar = document.getElementById("btnRecuperarSenha");
  const loginErro = document.getElementById("loginErro");
  const auth = window.northAuth;
  let modo = new URLSearchParams(window.location.search).get("modo") === "entrar" ? "entrar" : "criar";
  let ocupado = true;

  function mensagem(texto, tipo = "erro") {
    loginErro.textContent = texto;
    loginErro.dataset.tipo = tipo;
  }

  function atualizarModo() {
    const criar = modo === "criar";
    const recuperar = modo === "recuperar";
    const novaSenha = modo === "nova-senha";
    document.getElementById("campoUsuario").hidden = !criar;
    inputUsuario.required = criar;
    inputUsuario.disabled = !criar || ocupado;
    inputEmail.closest("label").hidden = novaSenha;
    inputEmail.required = !novaSenha;
    inputEmail.disabled = novaSenha || ocupado;
    document.getElementById("campoSenha").hidden = recuperar;
    inputSenha.required = !recuperar;
    inputSenha.disabled = recuperar || ocupado;
    inputSenha.minLength = criar || novaSenha ? 8 : 1;
    inputSenha.autocomplete = criar || novaSenha ? "new-password" : "current-password";
    inputSenha.placeholder = criar || novaSenha ? "Pelo menos 8 caracteres" : "Sua senha";
    document.getElementById("labelSenha").textContent = novaSenha ? "Nova senha" : "Senha";
    const textos = {
      criar: ["Crie sua conta para começar", "Criar conta"],
      entrar: ["Bem-vinda(o) de volta! Entre com seu e-mail", "Entrar"],
      recuperar: ["Receba um link para recuperar sua senha", "Enviar link"],
      "nova-senha": ["Escolha sua nova senha", "Salvar nova senha"]
    };
    document.getElementById("loginSub").textContent = textos[modo][0];
    btnAcao.textContent = ocupado ? "Aguarde…" : textos[modo][1];
    btnAcao.disabled = ocupado;
    btnAlternar.hidden = novaSenha;
    btnAlternar.disabled = ocupado;
    btnAlternar.textContent = criar ? "Já tenho uma conta — entrar" : modo === "recuperar" ? "Voltar para entrar" : "Quero criar uma conta";
    btnRecuperar.hidden = modo !== "entrar";
    btnRecuperar.disabled = ocupado;
    form.setAttribute("aria-busy", String(ocupado));
  }

  function trocarModo(novoModo) {
    modo = novoModo;
    inputSenha.value = "";
    mensagem("");
    atualizarModo();
  }

  btnAlternar.addEventListener("click", function () {
    if (!ocupado) trocarModo(modo === "criar" ? "entrar" : modo === "recuperar" ? "entrar" : "criar");
  });
  btnRecuperar.addEventListener("click", function () {
    if (!ocupado) trocarModo("recuperar");
  });

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (ocupado || !form.reportValidity()) return;
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;
    const nome = inputUsuario.value.trim().replace(/^\.+/, "");
    if (modo === "criar" && !nome) { mensagem("Escolha um nome ou apelido."); return; }
    ocupado = true;
    atualizarModo();
    mensagem("");
    try {
      auth.exigirCliente();
      if (modo === "criar") {
        const resultado = await auth.cliente.auth.signUp({
          email, password: senha,
          options: { emailRedirectTo: auth.urls.login, data: { username: nome } }
        });
        if (resultado.error) throw resultado.error;
        inputSenha.value = "";
        if (resultado.data.session) {
          window.location.replace(auth.urls.portal);
        } else {
          modo = "entrar";
          mensagem("Confira seu e-mail e o spam para confirmar o cadastro. Depois entre com seu e-mail e senha. Se já tiver uma conta, use Entrar ou recupere a senha.", "sucesso");
        }
      } else if (modo === "entrar") {
        const resultado = await auth.cliente.auth.signInWithPassword({ email, password: senha });
        if (resultado.error) throw resultado.error;
        inputSenha.value = "";
        window.location.replace(auth.urls.portal);
      } else if (modo === "recuperar") {
        const resultado = await auth.cliente.auth.resetPasswordForEmail(email, { redirectTo: auth.urls.login });
        if (resultado.error) throw resultado.error;
        mensagem("Se existir uma conta com esse e-mail, você receberá um link para escolher outra senha. Confira também o spam.", "sucesso");
      } else {
        const resultado = await auth.cliente.auth.updateUser({ password: senha });
        if (resultado.error) throw resultado.error;
        inputSenha.value = "";
        window.location.replace(auth.urls.portal);
      }
    } catch (erro) {
      mensagem(auth ? auth.mensagemErro(erro) : "O arquivo north-auth.js não carregou. Confira a instalação.");
    } finally {
      ocupado = false;
      atualizarModo();
    }
  });

  async function preparar() {
    atualizarModo();
    try {
      if (!auth) throw new Error("north-auth.js não carregou");
      const usuario = await auth.iniciar();
      if (auth.erroRetorno) {
        modo = "entrar";
        mensagem(auth.mensagemErro({ code: auth.erroRetorno }));
      } else if (usuario && auth.recuperacao) {
        modo = "nova-senha";
        mensagem("");
      } else if (usuario) {
        window.location.replace(auth.urls.portal);
        return;
      } else {
        if (auth.recuperacao) modo = "recuperar";
        mensagem(auth.recuperacao ? "O link não abriu uma sessão válida. Solicite outro link." : "");
      }
      ocupado = false;
      atualizarModo();
    } catch (erro) {
      mensagem(auth ? auth.mensagemErro(erro) : "O arquivo north-auth.js não carregou. Confira a instalação.");
      // O formulário permanece bloqueado quando a conexão não pôde ser preparada.
    }
  }
  preparar();
})();