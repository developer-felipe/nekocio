(() => {
      "use strict";

      const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const punteroPreciso = window.matchMedia("(pointer: fine)").matches;
      const cabecera = document.querySelector("#cabecera");
      const botonMenu = document.querySelector(".menu-boton");
      const menuPrincipal = document.querySelector("#menu-principal");

      const actualizarCabecera = () => {
        cabecera?.classList.toggle("desplazada", window.scrollY > 30);
      };

      actualizarCabecera();
      window.addEventListener("scroll", actualizarCabecera, { passive: true });

      if (botonMenu && menuPrincipal) {
        botonMenu.addEventListener("click", () => {
          const abierto = botonMenu.getAttribute("aria-expanded") === "true";
          botonMenu.setAttribute("aria-expanded", String(!abierto));
          botonMenu.setAttribute("aria-label", abierto ? "Abrir menú" : "Cerrar menú");
          menuPrincipal.classList.toggle("abierto", !abierto);
          document.body.classList.toggle("menu-abierto", !abierto);
        });

        menuPrincipal.querySelectorAll("a").forEach((enlace) => {
          enlace.addEventListener("click", () => {
            botonMenu.setAttribute("aria-expanded", "false");
            botonMenu.setAttribute("aria-label", "Abrir menú");
            menuPrincipal.classList.remove("abierto");
            document.body.classList.remove("menu-abierto");
          });
        });
      }

      document.querySelectorAll('a[href^="#"]').forEach((enlace) => {
        enlace.addEventListener("click", (eventoClic) => {
          const selector = enlace.getAttribute("href");
          const destino = selector && selector !== "#" ? document.querySelector(selector) : null;
          if (!destino) return;

          eventoClic.preventDefault();
          destino.scrollIntoView({
            behavior: movimientoReducido ? "auto" : "smooth",
            block: "start"
          });
        });
      });

      /* ---------- Activación de la sección problema ----------
         Se dispara más tarde para que las cards se animen cuando el usuario
         realmente pueda verlas, no apenas empieza a entrar la sección. */
      const seccionProblema = document.querySelector("#problema");

      if (seccionProblema) {
        if (movimientoReducido || !("IntersectionObserver" in window)) {
          seccionProblema.classList.add("problema-activa", "problema-lista");
        } else {
          const observadorProblema = new IntersectionObserver((entradas, instancia) => {
            entradas.forEach((entrada) => {
              if (!entrada.isIntersecting) return;
              entrada.target.classList.add("problema-activa");
              window.setTimeout(() => entrada.target.classList.add("problema-lista"), 3200);
              instancia.unobserve(entrada.target);
            });
          }, {
            threshold: 0.35,
            rootMargin: "0px 0px -25% 0px"
          });

          observadorProblema.observe(seccionProblema);
        }
      }

      /* ---------- Revelar al hacer scroll ----------
         Servicios usa un trigger más estricto para que cada card aparezca
         cuando el bloque está realmente visible, con delays escalonados. */
      const revelarServicios = document.querySelectorAll("#servicios .revelar");
      const revelarServiciosTemprano = document.querySelectorAll("#servicios .revelar-delay-3, #servicios .revelar-delay-4, #servicios .revelar-delay-5");
      const revelarServiciosPrincipales = document.querySelectorAll("#servicios .revelar:not(.revelar-delay-3):not(.revelar-delay-4):not(.revelar-delay-5)");
      const revelarOtros = document.querySelectorAll(".revelar:not(#servicios .revelar)");

      if (movimientoReducido || !("IntersectionObserver" in window)) {
        revelarServicios.forEach((elemento) => elemento.classList.add("visible"));
        revelarOtros.forEach((elemento) => elemento.classList.add("visible"));
      } else {
        const observadorServicios = new IntersectionObserver((entradas, instancia) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add("visible");
            instancia.unobserve(entrada.target);
          });
        }, { threshold: 0.25, rootMargin: "0px 0px -20% 0px" });

        const observadorServiciosTemprano = new IntersectionObserver((entradas, instancia) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add("visible");
            instancia.unobserve(entrada.target);
          });
        }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

        const observadorGeneral = new IntersectionObserver((entradas, instancia) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add("visible");
            instancia.unobserve(entrada.target);
          });
        }, { threshold: 0.14, rootMargin: "0px 0px -6%" });

        revelarServiciosPrincipales.forEach((elemento) => observadorServicios.observe(elemento));
        revelarServiciosTemprano.forEach((elemento) => observadorServiciosTemprano.observe(elemento));
        revelarOtros.forEach((elemento) => observadorGeneral.observe(elemento));
      }

      const estadosParalaje = new WeakMap();

      const aplicarParalaje = (objetivo, superficie, clienteX, clienteY, intensidadX = 10, intensidadY = 8) => {
        const rectangulo = superficie.getBoundingClientRect();
        const posicionX = (clienteX - rectangulo.left) / rectangulo.width - 0.5;
        const posicionY = (clienteY - rectangulo.top) / rectangulo.height - 0.5;

        objetivo.style.setProperty("--rot-y", `${posicionX * intensidadX}deg`);
        objetivo.style.setProperty("--rot-x", `${posicionY * -intensidadY}deg`);
      };

      const programarParalaje = (objetivo, superficie, eventoPuntero, intensidadX = 10, intensidadY = 8) => {
        let estado = estadosParalaje.get(objetivo);

        if (!estado) {
          estado = { cuadro: 0, clienteX: 0, clienteY: 0, intensidadX, intensidadY, superficie };
          estadosParalaje.set(objetivo, estado);
        }

        estado.clienteX = eventoPuntero.clientX;
        estado.clienteY = eventoPuntero.clientY;
        estado.intensidadX = intensidadX;
        estado.intensidadY = intensidadY;
        estado.superficie = superficie;

        if (estado.cuadro) return;

        estado.cuadro = requestAnimationFrame(() => {
          aplicarParalaje(
            objetivo,
            estado.superficie,
            estado.clienteX,
            estado.clienteY,
            estado.intensidadX,
            estado.intensidadY
          );
          estado.cuadro = 0;
        });
      };

      const heroSection = document.querySelector(".hero");
      const escenaHero = document.querySelector("[data-escena-3d]");

      if (escenaHero && !movimientoReducido && "IntersectionObserver" in window) {
        const observadorAnimacionHero = new IntersectionObserver(([entrada]) => {
          escenaHero.classList.toggle("animaciones-pausadas", !entrada.isIntersecting);
        }, { threshold: 0.04 });

        observadorAnimacionHero.observe(escenaHero);
      }

      if (!movimientoReducido && punteroPreciso) {
        /* El hero completo funciona como superficie de interacción.
           El objetivo que rota sigue siendo únicamente la escena 3D. */
        if (heroSection && escenaHero) {
          heroSection.addEventListener(
            "pointermove",
            (eventoPuntero) => programarParalaje(escenaHero, heroSection, eventoPuntero, 11, 8),
            { passive: true }
          );

          heroSection.addEventListener("pointerleave", () => {
            escenaHero.style.setProperty("--rot-x", "0deg");
            escenaHero.style.setProperty("--rot-y", "0deg");
          });
        }

        /* El panel de autogestión conserva su propia zona de interacción. */
        document.querySelectorAll("[data-panel-3d]").forEach((escena) => {
          escena.addEventListener(
            "pointermove",
            (eventoPuntero) => programarParalaje(escena, escena, eventoPuntero),
            { passive: true }
          );

          escena.addEventListener("pointerleave", () => {
            escena.style.setProperty("--rot-x", "7deg");
            escena.style.setProperty("--rot-y", "-10deg");
          });
        });

        document.querySelectorAll("[data-inclinacion]").forEach((tarjeta) => {
          const intensidad = Number(tarjeta.dataset.inclinacion || 5);

          tarjeta.addEventListener("pointermove", (eventoPuntero) => {
            const rectangulo = tarjeta.getBoundingClientRect();
            const posicionX = (eventoPuntero.clientX - rectangulo.left) / rectangulo.width - 0.5;
            const posicionY = (eventoPuntero.clientY - rectangulo.top) / rectangulo.height - 0.5;

            tarjeta.style.setProperty("--inclinar-y", `${posicionX * intensidad}deg`);
            tarjeta.style.setProperty("--inclinar-x", `${posicionY * -intensidad}deg`);
          });

          tarjeta.addEventListener("pointerleave", () => {
            tarjeta.style.setProperty("--inclinar-x", "0deg");
            tarjeta.style.setProperty("--inclinar-y", "0deg");
          });
        });

        document.querySelectorAll("[data-magnetico]").forEach((boton) => {
          boton.addEventListener("pointermove", (eventoPuntero) => {
            const rectangulo = boton.getBoundingClientRect();
            const desplazamientoX = (eventoPuntero.clientX - rectangulo.left - rectangulo.width / 2) * 0.12;
            const desplazamientoY = (eventoPuntero.clientY - rectangulo.top - rectangulo.height / 2) * 0.18;

            boton.style.setProperty("--mov-x", `${desplazamientoX}px`);
            boton.style.setProperty("--mov-y", `${desplazamientoY}px`);
          });

          boton.addEventListener("pointerleave", () => {
            boton.style.setProperty("--mov-x", "0px");
            boton.style.setProperty("--mov-y", "0px");
          });
        });
      }
    })();
