import "../styles/LandingHome.css";

type LandingHomeProps = {
  onSolicitar?: () => void;
};

export default function LandingHome({ onSolicitar }: LandingHomeProps) {
  return (
    <div className="landing">
      <header className="landing__navbar">
        <div className="landing__brand">
          <img src="/logo-cooprestamos-vector.svg" alt="Cooprestamos logo" />
        </div>
        <nav className="landing__links">
          <a href="#hero">Inicio</a>
          <a href="#servicios">Servicios</a>
          <a href="#simulador">Simulador</a>
          <a href="#sobre-nosotros">Sobre nosotros</a>
        </nav>
        <div className="landing__actions">
          <button type="button" className="landing__ghost" onClick={onSolicitar}>
            Solicitar
          </button>
          <button className="landing__primary">Mis prestamos</button>
        </div>
      </header>

      <main>
        <section className="landing__hero landing-section" id="hero">
          <div className="landing__hero-copy">
            <p className="landing__eyebrow">COOPRESTAMOS</p>
            <h1>Tu aliado financiero para crecer juntos</h1>
            <p className="landing__subtext">
              Ofrecemos soluciones financieras personalizadas que impulsan tus proyectos. Trabajamos con
              compromiso para transformar tus metas en realidad.
            </p>
            <div className="landing__cta">
              <button className="landing__primary" type="button" onClick={onSolicitar}>
                Simular
              </button>
              <button className="landing__ghost">Contactar</button>
            </div>
          </div>
          <div className="landing__hero-visual">
            <img src="/hero-aliado-financiero.png" alt="Equipo analizando crecimiento financiero" />
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__solidaridad landing-section" id="solidaridad">
          <div className="solidaridad__content">
            <div className="solidaridad__icon">
              <img src="/solo-logo-cooprestamos-vector.svg" alt="Cooperativa" />
            </div>
            <p className="landing__eyebrow">Cooperativa</p>
            <h2>Construyendo futuro con solidaridad financiera</h2>
            <p className="landing__subtext center">
              COOPRESTAMOS nace del compromiso de apoyar a socios con servicios financieros transparentes y accesibles.
              Trabajamos para empoderar a cada socio.
            </p>
          </div>
          <div className="solidaridad__image">
            <img src="/solidaridad-financiera.png" alt="Personas colaborando y planificando finanzas" />
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__creditos landing-section" id="creditos">
          <div className="creditos__image">
            <img src="/creditos-personalizados.png" alt="Equipo diseñando créditos adaptados" />
          </div>
          <div className="creditos__copy">
            <p className="landing__eyebrow">Créditos personalizados</p>
            <h2>Diseñamos créditos adaptados a tu perfil</h2>
            <p className="landing__subtext">
              Evaluamos tu situación financiera para ofrecerte las mejores condiciones. Nuestras cuotas se ajustan a tus
              metas.
            </p>
            <div className="landing__cta">
              <button className="landing__primary">Simular</button>
              <button className="landing__ghost">Detalles</button>
            </div>
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__tecnologia landing-section" id="tecnologia">
          <div className="tecnologia__copy">
            <p className="landing__eyebrow">Innovación</p>
            <h2>Plataforma digital segura y accesible</h2>
            <p className="landing__subtext">
              Desarrollamos herramientas tecnológicas que simplifican tus trámites financieros con total seguridad.
            </p>
          </div>
          <div className="tecnologia__image">
            <img src="/plataforma-digital.png" alt="Aplicación financiera en un smartphone" />
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__asesoria landing-section" id="asesoria">
          <div className="asesoria__image">
            <img src="/asesoria-integral.png" alt="Consultores financieros conversando con clientes" />
          </div>
          <div className="asesoria__copy">
            <p className="landing__eyebrow">Acompañamiento</p>
            <h2>Consultores financieros a tu servicio</h2>
            <p className="landing__subtext">
              Nuestros expertos te guían en cada decisión para alcanzar tus metas económicas.
            </p>
            <div className="landing__cta">
              <button className="landing__primary">Agendar</button>
              <button className="landing__ghost">Contactar</button>
            </div>
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__servicios landing-section" id="servicios">
          <div className="servicios__content">
            <p className="landing__eyebrow">Servicios</p>
            <h2>Soluciones financieras para cada objetivo</h2>
            <p className="landing__subtext center">
              Crédito personal, hipotecario, vehicular y líneas flexibles para emprendedores. Ajustamos montos y plazos
              a tu realidad.
            </p>
            <div className="servicios__grid">
              <div className="servicio-card">
                <i className="bx bx-user-check servicio-icon" aria-hidden="true" />
                <h3>Préstamo personal</h3>
                <p>Liquidez rápida para metas inmediatas, con cuotas diseñadas según tu flujo.</p>
              </div>
              <div className="servicio-card">
                <i className="bx bx-home-heart servicio-icon" aria-hidden="true" />
                <h3>Hipotecario</h3>
                <p>Financia tu vivienda con tasas competitivas y asesoría personalizada en cada paso.</p>
              </div>
              <div className="servicio-card">
                <i className="bx bx-car servicio-icon" aria-hidden="true" />
                <h3>Vehicular</h3>
                <p>Estrena vehículo con planes flexibles y aprobación ágil para que no detengas tu camino.</p>
              </div>
              <div className="servicio-card">
                <i className="bx bx-rocket servicio-icon" aria-hidden="true" />
                <h3>Emprendedores</h3>
                <p>Capital de trabajo, líneas de crédito y apoyo financiero para impulsar tu negocio.</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__sobre landing-section" id="sobre-nosotros">
          <div className="sobre__content">
            <p className="landing__eyebrow">Sobre nosotros</p>
            <h2>Una cooperativa basada en confianza y acompañamiento</h2>
            <p className="landing__subtext center">
              Trabajamos con transparencia, educación financiera y asesoría continua para que tomes decisiones informadas
              y seguras.
            </p>
            <div className="sobre__grid">
              <div className="sobre-card">
                <i className="bx bx-shield sobre-icon" aria-hidden="true" />
                <h3>Propósito</h3>
                <p>Proteger y hacer crecer el patrimonio de nuestros socios con productos claros y justos.</p>
              </div>
              <div className="sobre-card">
                <i className="bx bx-group sobre-icon" aria-hidden="true" />
                <h3>Acompañamiento</h3>
                <p>Equipos de asesores que te guían en cada meta: vivienda, negocios y bienestar financiero.</p>
              </div>
              <div className="sobre-card">
                <i className="bx bx-book-open sobre-icon" aria-hidden="true" />
                <h3>Educación</h3>
                <p>Capacitaciones y herramientas para planificar mejor, reducir riesgos y tomar decisiones informadas.</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="landing__divider" />

        <section className="landing__testimonios landing-section" id="testimonios">
          <div className="testimonios__header">
            <h2>Testimonios</h2>
            <p className="landing__subtext center">Lo que dicen nuestros socios</p>
          </div>
          <div className="testimonios__grid">
            <article className="testimonio">
              <p className="testimonio__quote">"COOPRESTAMOS me ayudó a concretar mi sueño empresarial"</p>
              <div className="testimonio__avatar">☺</div>
              <p className="testimonio__name">María Rodríguez</p>
              <p className="testimonio__role">Emprendedora</p>
            </article>
            <article className="testimonio">
              <p className="testimonio__quote">"Nunca había tenido un servicio financiero tan personalizado"</p>
              <div className="testimonio__avatar">☺</div>
              <p className="testimonio__name">Carlos Mendoza</p>
              <p className="testimonio__role">Profesional independiente</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="footer__columns">
          <div className="footer__brand-col">
            <img src="/logo-cooprestamos-vector.svg" alt="Cooprestamos" />
          </div>
          <div className="footer__col">
            <h4>COOPRESTAMOS</h4>
            <a href="#hero">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#simulador">Simulador</a>
            <a href="#sobre-nosotros">Sobre nosotros</a>
          </div>
          <div className="footer__col">
            <h4>Recursos</h4>
            <a href="#faq">Preguntas frecuentes</a>
            <a href="#guias">Guías</a>
            <a href="#blog">Blog</a>
            <a href="#comunidad">Comunidad</a>
          </div>
          <div className="footer__col">
            <h4>Legal</h4>
            <a href="#terminos">Términos</a>
            <a href="#privacidad">Privacidad</a>
            <a href="#cookies">Cookies</a>
            <a href="#aviso-legal">Aviso legal</a>
            <a href="#suscribirse">Suscribirse</a>
          </div>
          <div className="footer__col footer__boletin">
            <h4>Boletín</h4>
            <p className="footer__subtext">
              Recibe información financiera y novedades de COOPRESTAMOS directamente en tu correo.
            </p>
            <div className="footer__newsletter">
              <input type="email" placeholder="Correo electrónico" />
              <button type="button">Enviar</button>
            </div>
            <small>Al suscribirte, aceptas nuestra política de privacidad</small>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2025 COOPRESTAMOS. Todos los derechos reservados</p>
          <div className="footer__links">
            <a href="#privacidad">Política de privacidad</a>
            <a href="#terminos">Términos del servicio</a>
            <a href="#cookies">Configuración de cookies</a>
          </div>
          <div className="footer__social">
            <a href="#facebook" aria-label="Facebook"></a>
            <a href="#twitter" aria-label="Twitter"></a>
            <a href="#whatsapp" aria-label="WhatsApp"></a>
            <a href="#instagram" aria-label="Instagram"></a>
            <a href="#linkedin" aria-label="LinkedIn"></a>
            <a href="#youtube" aria-label="YouTube"></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
