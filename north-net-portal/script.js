const inputCapa = document.getElementById("inputCapa");
const btnEditarCapa = document.getElementById("btnEditarCapa");
const btnRemoverCapa = document.getElementById("btnRemoverCapa");
const capaTela = document.getElementById("capaTela");

const capaSalva = localStorage.getItem("northnetCapa");
if (capaSalva) {
  aplicarCapaPersonalizada(capaSalva);
}

btnEditarCapa.addEventListener("click", function () {
  inputCapa.click();
});

inputCapa.addEventListener("change", function () {
  const arquivo = inputCapa.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = function () {
    aplicarCapaPersonalizada(leitor.result);
    localStorage.setItem("northnetCapa", leitor.result);
  };
  leitor.readAsDataURL(arquivo);
});

btnRemoverCapa.addEventListener("click", function () {
  localStorage.removeItem("northnetCapa");
  capaTela.style.backgroundImage = "";
  capaTela.style.backgroundSize = "";
  capaTela.style.backgroundPosition = "";
  capaTela.style.backgroundRepeat = "";
  capaTela.classList.add("player-tela-padrao");
});

function aplicarCapaPersonalizada(urlImagem) {
  capaTela.style.backgroundImage = "url('" + urlImagem + "')";
  capaTela.style.backgroundSize = "cover";
  capaTela.style.backgroundPosition = "center";
  capaTela.style.backgroundRepeat = "no-repeat";
  capaTela.classList.remove("player-tela-padrao");
}

document.getElementById("btnSair").addEventListener("click", function () {
  localStorage.setItem("northnetLogado", "false");
  window.location.href = "login.html";
});
