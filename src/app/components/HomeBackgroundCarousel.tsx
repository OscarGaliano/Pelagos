import Slider from 'react-slick';

const IMAGES = [
  'https://images.unsplash.com/photo-1717935492829-fce9ce727a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwc3BlYXJmaXNoaW5nJTIwYXBuZWF8ZW58MXx8fHwxNzcwMTk3OTMzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1462947760324-15811216b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bmRlcndhdGVyJTIwZnJlZWRpdmVyJTIwc3BlYXJ8ZW58MXx8fHwxNzcwMTk3OTM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1621451611787-fe22bb474d48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwdW5kZXJ3YXRlciUyMGJsdWUlMjBvY2VhbnxlbnwxfHx8fDE3NzAxOTc5MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

const SLIDER_SETTINGS = {
  dots: true,
  infinite: true,
  speed: 800,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 5000,
  fade: true,
  arrows: false,
};

/** Carrusel de fondo: mismo ancho que la app (pantalla del móvil / max-w-md), como en login. */
export function HomeBackgroundCarousel() {
  return (
    <div
      className="home-bg-carousel absolute inset-0 z-[1] overflow-hidden"
      style={{ height: '100vh', minHeight: '100dvh' }}
    >
      <div className="h-full w-full" style={{ height: '100%' }}>
        <Slider {...SLIDER_SETTINGS} className="h-full">
          {IMAGES.map((img, index) => (
            <div key={index} className="relative h-full">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1628]/95" />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
}
