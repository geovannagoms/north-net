const inputUsuario = document.getElementById("inputUsuario");
const inputSenha = document.getElementById("inputSenha");
const btnAcao = document.getElementById("btnAcao");
const loginErro = document.getElementById("loginErro");
const loginSub = document.getElementById("loginSub");

const contaExistente = JSON.parse(localStorage.getItem("northnetConta"));
const modo = contaExistente ? "entrar" : "criar";

if (modo === "entrar") {
  btnAcao.textContent = "Entrar";
  loginSub.textContent = "Bem-vindo(a) de volta!";
} else {
  btnAcao.textContent = "Criar conta";
  loginSub.textContent = "Crie sua conta para começar";
}

btnAcao.addEventListener("click", function () {
  const usuario = inputUsuario.value.trim();
  const senha = inputSenha.value;

  if (usuario === "" || senha === "") {
    loginErro.textContent = "Preencha usuário e senha.";
    return;
  }

  if (modo === "criar") {
    localStorage.setItem("northnetConta", JSON.stringify({ usuario: usuario, senha: senha }));
    localStorage.setItem("northnetLogado", "true");
    window.location.href = "index.html";
  } else {
    if (usuario === contaExistente.usuario && senha === contaExistente.senha) {
      localStorage.setItem("northnetLogado", "true");
      window.location.href = "index.html";
    } else {
      loginErro.textContent = "Usuário ou senha incorretos.";
    }
  }
});