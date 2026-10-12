(function () {
  "use strict";
  const dados = northAuth.armazenamento;
  const inputCapa = document.getElementById("inputCapa");
  const btnEditarCapa = document.getElementById("btnEditarCapa");
  const btnRemoverCapa = document.getElementById("btnRemoverCapa");
  const capaTela = document.getElementById("capaTela");
  let leitura = 0;

  function aplicarCapaPersonalizada(urlImagem) {
    capaTela.style.backgroundImage = "url(" + JSON.stringify(urlImagem) + ")";
    capaTela.style.backgroundSize = "cover";
    capaTela.style.backgroundPosition = "center";
    capaTela.style.backgroundRepeat = "no-repeat";
    capaTela.classList.remove("player-tela-padrao");
  }
  const capaSalva = dados.getItem("northnetCapa");
  if (capaSalva) aplicarCapaPersonalizada(capaSalva);

  btnEditarCapa.addEventListener("click", function () { inputCapa.click(); });
  inputCapa.addEventListener("change", function () {
    const arquivo = inputCapa.files[0];
    if (!arquivo) return;
    if (!/^image\//.test(arquivo.type)) { alert("Escolha uma imagem para a capa."); return; }
    const atual = ++leitura;
    const leitor = new FileReader();
    leitor.onload = function () {
      if (atual !== leitura) return;
      try {
        dados.setItem("northnetCapa", leitor.result);
        aplicarCapaPersonalizada(leitor.result);
      } catch (_) { alert("Não foi possível salvar a capa neste navegador. A capa anterior foi mantida."); }
      inputCapa.value = "";
    };
    leitor.onerror = function () { alert("Não foi possível ler a imagem."); };
    leitor.readAsDataURL(arquivo);
  });
  btnRemoverCapa.addEventListener("click", function () {
    try {
      dados.removeItem("northnetCapa");
      leitura++;
      inputCapa.value = "";
      capaTela.style.backgroundImage = "";
      capaTela.style.backgroundSize = "";
      capaTela.style.backgroundPosition = "";
      capaTela.style.backgroundRepeat = "";
      capaTela.classList.add("player-tela-padrao");
    } catch (_) { alert("Não foi possível remover a capa. Tente novamente."); }
  });
  document.getElementById("btnSair").addEventListener("click", async function (evento) {
    const botao = evento.currentTarget;
    if (botao.disabled) return;
    botao.disabled = true;
    try { await northAuth.sair(); }
    catch (erro) { alert(northAuth.mensagemErro(erro)); botao.disabled = false; }
  });
})();