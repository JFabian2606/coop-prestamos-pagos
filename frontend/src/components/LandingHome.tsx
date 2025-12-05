import "../styles/LandingHome.css";

export default function LandingHome() {
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
          <button className="landing__ghost">Ingresar</button>
          <button className="landing__primary">Registro</button>
        </div>
      </header>

      <main>
        <section className="landing__hero" id="hero">
          <div className="landing__hero-copy">
            <p className="landing__eyebrow">COOPRESTAMOS</p>
            <h1>Tu aliado financiero para crecer juntos</h1>
            <p className="landing__subtext">
              Ofrecemos soluciones financieras personalizadas que impulsan tus proyectos. Trabajamos con
              compromiso para transformar tus metas en realidad.
            </p>
            <div className="landing__cta">
              <button className="landing__primary">Simular</button>
              <button className="landing__ghost">Contactar</button>
            </div>
          </div>
          <div className="landing__hero-visual">
            <img src="/hero-aliado-financiero.png" alt="Equipo analizando crecimiento financiero" />
          </div>
        </section>
      </main>
    </div>
  );
}
