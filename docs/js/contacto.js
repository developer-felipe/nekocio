(() => {
  "use strict";

  const modalContacto = document.querySelector("#modal-contacto");
  const botonSolicitarEvaluacion = document.querySelector("[data-solicitar-evaluacion]");
  const botonesCerrarModal = document.querySelectorAll("[data-cerrar-modal-contacto]");
  const formularioContacto = document.querySelector("#formulario-contacto");
  const botonEnviarFormulario = document.querySelector("#enviar-formulario-contacto");
  const estadoFormulario = document.querySelector("#estado-formulario");
  const contenedorTurnstile = document.querySelector("#turnstile-contacto");
  const campoMensaje = document.querySelector("#mensaje");
  const contadorMensaje = document.querySelector("#contador-mensaje");
  const textoBotonEnviar = document.querySelector(".boton-enviar-formulario__texto");
  const botonCerrarFormulario = document.querySelector(".boton-cerrar-formulario");
  const camposFormulario = document.querySelectorAll("#formulario-contacto input:not(#sitio-web), #formulario-contacto textarea");
  let identificadorTurnstile = null;
  let posicionScrollPagina = 0;

  if (!modalContacto || !botonSolicitarEvaluacion || !formularioContacto || !botonEnviarFormulario || !estadoFormulario || !contenedorTurnstile) return;

  const mostrarEstado = (mensaje, esError = false) => {
    estadoFormulario.textContent = mensaje;
    estadoFormulario.classList.toggle("error", esError);
  };

  const actualizarContador = () => {
    if (campoMensaje && contadorMensaje) contadorMensaje.textContent = `${campoMensaje.value.length} / 500`;
  };

  const actualizarVisibilidadBotonCerrar = () => {
    if (!botonCerrarFormulario) return;
    botonCerrarFormulario.hidden = window.matchMedia("(max-width: 600px)").matches;
  };

  const restablecerBotonEnviar = () => {
    botonEnviarFormulario.disabled = false;
    botonEnviarFormulario.classList.remove("enviando", "enviado");
    botonEnviarFormulario.removeAttribute("aria-busy");
    if (textoBotonEnviar) textoBotonEnviar.textContent = "Enviar formulario";
  };

  const bloquearScrollPagina = () => {
    posicionScrollPagina = window.scrollY;
    document.body.style.top = `-${posicionScrollPagina}px`;
    document.body.classList.add("modal-contacto-abierto");
  };

  const desbloquearScrollPagina = () => {
    document.body.classList.remove("modal-contacto-abierto");
    document.body.style.top = "";
    const comportamientoScroll = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    requestAnimationFrame(() => {
      window.scrollTo(0, posicionScrollPagina);
      document.documentElement.style.scrollBehavior = comportamientoScroll;
    });
  };

  const validarFormulario = () => {
    const reglas = [
      { selector: "#nombre", mensaje: "Ingresa tu nombre (entre 2 y 50 caracteres).", validar: (valor) => valor.length >= 2 && valor.length <= 50 },
      { selector: "#correo", mensaje: "Ingresa un correo electrónico válido.", validar: (valor, campo) => valor.length <= 254 && campo.validity.valid },
      { selector: "#asunto", mensaje: "Ingresa un asunto (entre 3 y 50 caracteres).", validar: (valor) => valor.length >= 3 && valor.length <= 50 },
      { selector: "#mensaje", mensaje: "Ingresa un mensaje (entre 10 y 500 caracteres).", validar: (valor) => valor.length >= 10 && valor.length <= 500 }
    ];
    let esValido = true;
    let mensajeError = "";

    reglas.forEach(({ selector, mensaje, validar }) => {
      const campo = formularioContacto.querySelector(selector);
      if (!campo) return;
      const campoValido = validar(campo.value.trim(), campo);
      campo.setAttribute("aria-invalid", String(!campoValido));
      esValido = esValido && campoValido;
      if (!campoValido && !mensajeError) mensajeError = mensaje;
    });

    return { esValido, mensajeError };
  };

  const inicializarTurnstile = () => {
    if (!window.turnstile) {
      window.setTimeout(inicializarTurnstile, 100);
      return;
    }
    if (identificadorTurnstile !== null) return;

    identificadorTurnstile = window.turnstile.render(contenedorTurnstile, {
      sitekey: "0x4AAAAAAEhmG9mzqZ6saREI",
      theme: "dark",
      language: "es",
      action: "contact_form",
      callback: () => mostrarEstado(""),
      "expired-callback": () => mostrarEstado("La verificación expiró. Verifica nuevamente.", true)
    });
  };

  campoMensaje?.addEventListener("input", actualizarContador);
  camposFormulario.forEach((campo) => campo.addEventListener("input", () => campo.removeAttribute("aria-invalid")));
  window.addEventListener("resize", actualizarVisibilidadBotonCerrar);

  botonSolicitarEvaluacion.addEventListener("click", () => {
    formularioContacto.reset();
    camposFormulario.forEach((campo) => campo.removeAttribute("aria-invalid"));
    actualizarContador();
    mostrarEstado("");
    restablecerBotonEnviar();
    if (identificadorTurnstile !== null && window.turnstile) window.turnstile.reset(identificadorTurnstile);
    modalContacto.showModal();
    modalContacto.focus({ preventScroll: true });
    bloquearScrollPagina();
  });

  modalContacto.addEventListener("cancel", (evento) => evento.preventDefault());
  modalContacto.addEventListener("close", desbloquearScrollPagina);
  botonesCerrarModal.forEach((botonCerrar) => botonCerrar.addEventListener("click", () => modalContacto.close()));

  formularioContacto.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mostrarEstado("");

    const validacion = validarFormulario();
    if (!validacion.esValido) {
      mostrarEstado(validacion.mensajeError, true);
      formularioContacto.querySelector("[aria-invalid=true]")?.focus();
      return;
    }

    if (identificadorTurnstile === null || !window.turnstile) {
      mostrarEstado("La verificación todavía no está disponible.", true);
      return;
    }

    const tokenTurnstile = window.turnstile.getResponse(identificadorTurnstile);
    if (!tokenTurnstile) {
      mostrarEstado("Completa la verificación antes de enviar.", true);
      return;
    }

    botonEnviarFormulario.disabled = true;
    botonEnviarFormulario.classList.add("enviando");
    botonEnviarFormulario.setAttribute("aria-busy", "true");
    let fueEnviado = false;

    try {
      const respuesta = await fetch("https://contacto.eci-felipe.workers.dev/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.querySelector("#nombre").value.trim(),
          email: document.querySelector("#correo").value.trim(),
          subject: document.querySelector("#asunto").value.trim(),
          message: document.querySelector("#mensaje").value.trim(),
          website: document.querySelector("#sitio-web").value.trim(),
          turnstileToken: tokenTurnstile
        })
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No fue posible enviar el formulario.");

      formularioContacto.reset();
      actualizarContador();
      fueEnviado = true;
      botonEnviarFormulario.classList.remove("enviando");
      botonEnviarFormulario.classList.add("enviado");
      botonEnviarFormulario.removeAttribute("aria-busy");
      if (textoBotonEnviar) textoBotonEnviar.textContent = "Enviado";
    } catch (errorEnvio) {
      mostrarEstado(errorEnvio.message || "No pudimos enviar el formulario. Inténtalo nuevamente.", true);
    } finally {
      if (identificadorTurnstile !== null && window.turnstile) window.turnstile.reset(identificadorTurnstile);
      if (!fueEnviado) restablecerBotonEnviar();
    }
  });

  actualizarContador();
  actualizarVisibilidadBotonCerrar();
  inicializarTurnstile();
})();
