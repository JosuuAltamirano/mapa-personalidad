// texts.js — Textos de la interfaz nueva y glosario. Se pueden retocar sin miedo: no afectan al cálculo.
// Los huecos {n}, {m}, {min}, {tipo}, {p}, {otra}, {fecha} los rellena app.js.

const TEXTOS = {
  titulo: 'Tu mapa de personalidad',

  entrada: {
    kicker: 'Un cuaderno para conocerte',
    lede: 'Cuatro resultados a partir de cosas que has vivido: tu tipo MBTI, tu eneatipo con su ala, tu orden de instintos y tu tritipo.',
    partes: {
      mbti: {nombre: 'MBTI', que: 'Cómo piensas y decides', preguntas: 40, min: 13},
      enea: {nombre: 'Eneagrama', que: 'Lo que te mueve por dentro', preguntas: 45, min: 15},
      inst: {nombre: 'Instintos', que: 'Dónde pones tu energía', preguntas: 24, min: 8}
    },
    partesTotal: 'Entre 109 y 124 preguntas · unos 36 min en total',
    partesNota: 'Si dos resultados quedan muy cerca, saldrán unas preguntas más para desempatar (15 como mucho).',
    partesTitulo: 'Índice',
    preguntas: '{n} preguntas',
    minutos: '{n} min',
    comoTitulo: 'Cómo contestar',
    como: [
      'Piensa en lo que hiciste de verdad, no en lo que te gustaría hacer.',
      'Si otra opción también va contigo, tócala después: contará la mitad.',
      'Si una situación no te ha pasado, sáltala.'
    ],
    auto: 'Pasar solo a la siguiente',
    autoAyuda: 'Al elegir, avanza en un segundo. En ese tiempo puedes marcar otra.',
    privacidad: 'Se guarda solo en este navegador. No se envía a ningún sitio.',
    empezar: 'Empezar',
    continuar: 'Continuar por la pregunta {n}',
    continuarAyuda: 'Llevas {n} de unas {m} preguntas.',
    deCero: 'Empezar de cero',
    deCeroPregunta: '¿Borrar todas tus respuestas y empezar de cero?',
    deCeroSi: 'Sí, borrar y empezar',
    cancelar: 'Cancelar',
    queEs: 'Qué es y qué no es este test',
    cerrar: 'Cerrar'
  },

  pregunta: {
    contador: '{n} de {m}',
    contadorRevision: 'Revisando · {n} de {m}',
    quedan: 'Te quedan unos {min} min',
    quedaPoco: 'Ya casi está',
    saltar: 'No me ha pasado',          // bloques A, B, C, D, EG, E5, IP
    saltarPreferencia: 'Ninguna encaja', // bloques IB, TBF, TBEI, TBE, WG, TBI
    siguiente: 'Siguiente',
    atras: 'Atrás',
    ayuda: 'Ayuda',
    principal: 'Principal',
    tambien: 'También',
    volverLista: 'Volver a la lista',
    anuncio: 'Pregunta {n} de {m}. {texto}',
    anuncioPrincipal: 'Elegida: {texto}',
    anuncioTambien: 'También: {texto}',
    anuncioQuitada: 'Quitada: {texto}',
    teclas: 'Teclas: A–D o 1–4 para elegir · Intro, siguiente · ←, atrás · ?, ayuda',
    progreso: 'Progreso: {n} de {m} preguntas contestadas',
    sinGuardar: 'Tu navegador no deja guardar el progreso: si cierras o recargas la página, se perderán tus respuestas.'
  },

  ayuda: {
    titulo: 'Cómo contestar',
    puntos: [
      'Piensa en lo que hiciste de verdad, no en lo que te gustaría hacer.',
      'Toca la opción que más se parezca a ti. Si otra también va contigo, tócala después: cuenta la mitad.',
      'Tocar otra vez una opción la quita.',
      'Si una situación no te ha pasado, o ninguna frase encaja, sáltala.',
      'Puedes volver atrás cuando quieras. Todo se guarda solo.'
    ],
    cerrar: 'Entendido',
    auto: 'Pasar solo a la siguiente',
    autoAyuda: 'Al elegir, avanza en un segundo. En ese tiempo puedes marcar otra.',
    teclas: 'Atajos de teclado',
    teclasAyuda: 'Letras y números eligen opciones; ← vuelve atrás; ? abre esta ayuda.'
  },

  // Pantallas de paso. Se muestran una vez, al avanzar (no al volver atrás ni al revisar).
  transiciones: {
    mbti: {insignia: 'Parte 1 de 3', titulo: 'MBTI: cómo piensas y decides', texto: 'Situaciones de tu vida: estudios, trabajo, amigos. Elige lo que más se parezca a lo que hiciste de verdad.', meta: '40 preguntas · unos 13 min'},
    C: {insignia: 'Momentos raros', titulo: 'Cuando no parecías tú', texto: 'Ahora piensa en épocas de mucho estrés o agotamiento. No en lo que haces siempre que te agobias, sino en lo que te sorprendió de ti. Si no te ha pasado, sáltala.', meta: '4 preguntas · 1 min', aviso: 'Momentos en que no parecías tú'},
    enea: {insignia: 'Parte 2 de 3', titulo: 'Eneagrama: lo que te mueve por dentro', texto: 'Aquí importa el porqué: qué buscas y qué temes, más que lo que haces por fuera.', meta: '45 preguntas · unos 15 min'},
    inst: {insignia: 'Parte 3 de 3', titulo: 'Instintos: dónde pones tu energía', texto: 'Hacia dónde se te va la energía sin darte cuenta: tu bienestar, tu gente o tus vínculos intensos.', meta: '24 preguntas · unos 8 min'},
    IB: {insignia: 'Ahora, al revés', titulo: 'Elige lo que menos atiendes', texto: 'En las 6 preguntas siguientes no buscamos lo que haces, sino lo que se te queda descuidado sin darte cuenta.', meta: '6 preguntas · unos 2 min', aviso: 'Al revés: elige lo que menos atiendes'},
    desempate: {insignia: 'Desempate', titulo: 'Afinemos un poco', texto: 'Tus dos resultados más probables están muy cerca. Con unas preguntas más saldremos de dudas: elige la frase que más se parezca a ti.', meta: '{n} preguntas más · unos {min} min', aviso: 'Desempate: elige la que más se parezca a ti'},
    ala: {insignia: 'Tu ala', titulo: '¿Hacia qué vecino tiras?', texto: 'Tres preguntas para saber cuál de los dos tipos vecinos matiza el tuyo.', meta: '3 preguntas · 1 min', aviso: 'Tu ala: elige la que más se parezca a ti'},
    seguir: 'Empezar',
    entendido: 'Entendido'
  },

  parcial: {
    hecho: 'Parte {n} de 3 terminada',
    segundo: 'El segundo más probable es {tipo} ({p} %)',
    letras: 'Cada letra por separado',
    letrasClaras: 'Cada letra sale clara; la duda está en la combinación.',
    seguir: {mbti: 'Seguir con el eneagrama', enea: 'Seguir con los instintos', inst: 'Ver tu mapa completo'},
    luego: 'Tu tritipo y tu subtipo saldrán al final, porque necesitan las tres partes.',
    parar: 'Parar aquí y seguir otro día',
    parado: 'Guardado. Cuando vuelvas, seguirás por aquí.',
    confianza: 'Confianza {nivel} · {p} %',
    tipo: {mbti: 'Tu tipo más probable', enea: 'Tu eneatipo más probable'}
  },

  resultados: {
    fecha: 'Hecho el {fecha}',
    confianza: {alta: 'Alta', media: 'Media', baja: 'Baja'},
    confianzaAyuda: {
      alta: 'Tus respuestas apuntan con claridad a este resultado.',
      media: 'Es el más probable, pero el segundo también puede encajar.',
      baja: 'No es concluyente: lee también el segundo.'
    },
    o: 'o {tipo} ({p} %)',
    elRestoDelTest: 'El test: {tipo} ({p} %)',
    elegidoPorTi: 'Elegido por ti',
    deshacer: 'Volver al resultado del test',
    acciones: {compartir: 'Compartir imagen', copiar: 'Copiar texto', copiado: 'Copiado', copiaManual: 'Cópialo del recuadro', revisar: 'Revisar respuestas', repetir: 'Repetir el test', comoSeCalcula: 'Cómo se calcula'},
    pestanas: {mbti: 'MBTI', enea: 'Eneagrama', inst: 'Instintos', tri: 'Tritipo'},
    titulos: {
      mbti: 'Tu tipo más probable es {tipo}: {nombre}',
      mbtiElegido: 'Tu tipo es {tipo}: {nombre}',
      enea: 'Tu eneatipo más probable es el {tipo}: {nombre}',
      eneaElegido: 'Tu eneatipo es el {tipo}: {nombre}',
      inst: 'Tu orden de instintos más probable es {tipo}',
      instElegido: 'Tu orden de instintos es {tipo}',
      tri: 'Tu tritipo es {tipo}'
    },
    letras: 'Cada letra por separado',
    letraDudosa: 'Letra dudosa: por separado, {otra} es algo más probable ({p} %).',
    letrasClaras: 'Cada letra sale clara; la duda está en la combinación.',
    letrasClarasEntre: 'Cada letra sale clara; la duda está en la combinación, sobre todo entre {a} y {b}.',
    pestanasNombre: 'Resultados por sistema',
    // Subtítulos y bloques de cada panel. [[texto|Término]] marca un término del glosario.
    h3: {
      tipos: 'Los cinco tipos más probables', decides: 'Cómo decides', percibes: 'Cómo percibes',
      funciones: 'Tus funciones, en orden', fortalezas: 'Fortalezas', retos: 'Tus retos',
      eneatipos: 'Los nueve eneatipos', grupos: 'Tu perfil por grupos', ordenes: 'Los seis órdenes', tipo: 'Tu tipo'
    },
    funcionesUso: 'Porcentaje de veces que elegiste cada función. Energía: {p} % de respuestas de extraversión.',
    funcionesAyuda: 'Las cuatro [[funciones cognitivas|Funciones cognitivas]] de tu tipo, de la que más usas a la que menos.',
    gruposAyuda: 'En rosa, el grupo que corresponde a tu eneatipo.',
    ala: 'Tu [[ala|Ala]] {w} le añade {texto}.',
    datos: {deseo: 'Deseo básico', miedo: 'Miedo básico', pasion: 'Pasión', virtud: 'Virtud', reto: 'Tu reto', centro: '[[Centro]]', crecimiento: 'En [[crecimiento|Crecimiento]]', estres: 'En [[estrés|Estrés]]', hacia: 'Hacia el {t}: {texto}'},
    leyenda: {crecimiento: '[[Crecimiento]]: hacia el {t}', estres: '[[Estrés]]: hacia el {t}'},
    instCartas: ['[[Dominante]]', 'Secundario', '[[Punto ciego]]'],
    subtipo: '[[Subtipo]]',
    subtipoTitulo: 'Tu subtipo es {tipo}: {nombre}',
    contratipo: '[[Contratipo|Contratipo]]',
    contratipoNota: 'Un contratipo va a contracorriente de la pasión de su tipo; por eso a veces cuesta reconocerse en la descripción general.',
    naranjo: 'Nombres de subtipos según Claudio Naranjo.',
    triCartas: ['Núcleo', 'Segundo', 'Tercero'],
    tuEneatipo: 'Tu eneatipo',
    elegidoPct: 'Elegido el {p} % de las veces en su centro',
    triExplica: 'El [[tritipo|Tritipo]] junta tu tipo más fuerte de cada [[centro|Centro]]: instinto, corazón y cabeza. El primero es tu eneatipo; los otros dos van ordenados por lo claros que han salido en las preguntas de motivación.',
    anuncioElegido: 'Elegido por ti: {tipo}. Tu mapa se ha actualizado.',
    anuncioDeshecho: 'Vuelves al resultado del test: {tipo}.',
    instFigura: 'Tamaño según tu orden de [[instintos|Instintos]]: el más grande es el [[dominante|Dominante]] y el de borde discontinuo, tu [[punto ciego|Punto ciego]].',
    instDominante: 'Probabilidad de que sea tu dominante: {p} %',
    empate: {
      titulo: {mbti: 'Tu MBTI está entre dos tipos', enea: 'Tu eneatipo está entre dos tipos', inst: 'Tus instintos están entre dos órdenes'},
      texto: 'Lee qué cambia y quédate con el que describa mejor lo que haces cuando nadie te mira.',
      masProbable: 'Más probable',
      elegir: 'Me reconozco más en este',
      elegido: 'Elegido por ti',
      nota: 'Elegir no cambia los porcentajes: marca cuál tomar como tuyo en el resto del mapa (subtipo y tritipo incluidos). Puedes deshacerlo.',
      mismoDominante: 'Los dos empiezan por {ins}.',
      filas: {dominante: 'Dominante: {f}', auxiliar: 'Auxiliar: {f}', como: 'Cómo es', segundo: 'Segundo: {x}', ciego: 'Punto ciego: {x}'},
      ciego: {sp: 'lo práctico', so: 'lo social', sx: 'la intensidad'}
    },
    repetirPregunta: '¿Repetir el test? Tus respuestas se borrarán; este resultado se guardará en tu historial.',
    repetirSi: 'Sí, repetir',
    copiaCabecera: 'Mis resultados en «Tu mapa de personalidad»'
  },

  revision: {
    titulo: 'Tus respuestas',
    ayuda: 'Toca una pregunta para cambiar tu respuesta.',
    sin: 'Sin contestar',
    generada: {TBF: 'Desempate', TBEI: 'Desempate', TBE: 'Desempate', TBI: 'Desempate', WG: 'Ala'},
    verResultados: 'Ver resultados',
    nuevas: 'Tus cambios han abierto preguntas nuevas de desempate. Contéstalas y verás tu mapa actualizado.',
    pendientes: 'Te queda alguna pregunta sin contestar. Contéstala y verás tu mapa actualizado.',
    tambien: 'También: {l}'
  },

  glosario: {cerrar: 'Cerrar'},

  // Prioridad 3
  dispositivo: {
    titulo: 'Seguir en otro dispositivo',
    explica: 'Copia un código con tus respuestas y pégalo en la entrada del test en el otro dispositivo. No lleva datos personales.',
    copiar: 'Copiar código',
    copiarLargo: 'Copiar código para otro dispositivo',
    copiado: 'Código copiado',
    copiaManual: 'Cópialo del recuadro',
    etiquetaCodigo: 'Código con tus respuestas',
    pegarTitulo: '¿Empezaste en otro dispositivo?',
    pegarAyuda: 'Pega aquí el código que copiaste allí.',
    cargar: 'Cargar mis respuestas',
    sustituir: '¿Cambiar las respuestas de este dispositivo por las del código?',
    sustituirSi: 'Sí, cambiarlas',
    cargado: 'Listo: ya tienes aquí tus respuestas.',
    invalido: 'Ese código no es válido. Cópialo otra vez y pégalo entero.',
    sinSoporte: 'Este navegador no puede leer el código. Prueba con uno más reciente.'
  },

  historial: {
    otraVez: 'La otra vez, el {fecha}: {codigos}.',
    igual: 'Te ha salido lo mismo.',
    cambia1: 'Esta vez cambia {lista}.',
    cambiaN: 'Esta vez cambian {lista}.',
    antes: 'Antes: {tipo}',
    nombres: {mbti: 'el MBTI', enea: 'el eneagrama', inst: 'los instintos', tri: 'el tritipo'}
  },

  repetirParte: {
    boton: 'Repetir la parte de {parte}',
    pregunta: '¿Repetir la parte de {parte}? Se borrarán sus respuestas; las de las otras partes se quedan.',
    si: 'Sí, repetir esta parte',
    partes: {mbti: 'MBTI', enea: 'eneagrama', inst: 'instintos'},
    nota: 'El tritipo sale de tus respuestas del eneagrama: para repetirlo, repite esa parte.'
  },

  imprimir: 'Imprimir o guardar en PDF',

  comparar: {
    titulo: 'Comparar con otra persona',
    ayuda: 'Pídele que pulse «Copiar texto» en sus resultados y pega aquí lo que te pase: verás vuestros dos mapas lado a lado. No se envía a ningún sitio.',
    etiqueta: 'Texto de la otra persona',
    boton: 'Comparar',
    sistema: 'Sistema',
    tu: 'Tú',
    otra: 'La otra persona',
    coincide: 'Coincidís',
    letras: '{n} de 4 letras en común',
    mismoEneatipo: 'Mismo eneatipo',
    mismoDominante: 'Mismo instinto dominante',
    resumen: 'Coincidís en {n} de 4.',
    invalido: 'No encuentro un resultado en ese texto. Pídele que use «Copiar texto» y pégalo entero.'
  },

  compartir: {
    pie: 'Tu mapa de personalidad',
    archivo: 'mi-mapa-de-personalidad.png',
    descargada: 'Imagen descargada',
    error: 'No se ha podido crear la imagen'
  },

  metodo: {
    titulo: 'Cómo se calcula y qué no es este test',
    parrafos: [
      'Para cada tipo posible, el test estima la [[probabilidad|Probabilidad]] de que alguien así diera tus respuestas. Los porcentajes están calibrados para que signifiquen lo que dicen: de cada 100 resultados con un 70 %, unos 70 aciertan.',
      'Si los dos resultados más probables quedan cerca, el test añade preguntas de [[desempate|Desempate]].',
      'En simulaciones con decenas de miles de personas virtuales acierta el tipo MBTI un 63 % de las veces (77 % con desempate), el eneatipo un 87 % (91 %) y el instinto dominante un 87 %. Son cifras de simulación: con personas reales dependen de lo bien que funcione cada pregunta.',
      'Es un test de autoconocimiento, no un diagnóstico. No es el [[MBTI]]® oficial de The Myers-Briggs Company ni una prueba clínica.',
      'Los grupos del eneagrama siguen a Don Riso y Russ Hudson; los subtipos, a Claudio Naranjo; el concepto de tritipo es de Katherine Chernick Fauvre.',
      'Si algo no te encaja, lee también los resultados que han quedado cerca.'
    ]
  }
};

// Glosario: se abre al tocar un término subrayado en los resultados.
const GLOSARIO = {
  'MBTI': 'Sistema de 16 tipos basado en las ideas de Carl Jung. Aquí se calcula a partir de tus funciones cognitivas. MBTI® es una marca de The Myers-Briggs Company; este test no es el oficial.',
  'Funciones cognitivas': 'Las ocho maneras de percibir y de decidir de la teoría de Jung. Cada tipo usa cuatro, en este orden: dominante, auxiliar, terciaria e inferior.',
  'Ti': 'Pensamiento introvertido: entender cómo funciona algo por dentro y que todo encaje con una lógica propia.',
  'Te': 'Pensamiento extravertido: organizar, medir y decidir por resultados y eficacia.',
  'Fi': 'Sentimiento introvertido: decidir según tus valores y lo que sientes auténtico.',
  'Fe': 'Sentimiento extravertido: decidir pensando en las personas, en el ambiente y en la armonía del grupo.',
  'Ni': 'Intuición introvertida: ver hacia dónde van las cosas y llegar a una visión de conjunto.',
  'Ne': 'Intuición extravertida: ver posibilidades, conexiones e ideas nuevas en todo.',
  'Si': 'Sensación introvertida: apoyarte en la experiencia, en los detalles y en lo que ya conoces.',
  'Se': 'Sensación extravertida: vivir el momento, fijarte en lo que pasa ahora y actuar.',
  'Dominante': 'La función que más usas y en la que más confías.',
  'Auxiliar': 'La segunda función: equilibra a la dominante.',
  'Terciaria': 'La tercera función: se desarrolla con los años.',
  'Inferior': 'La función menos desarrollada. Con mucho estrés puede tomar el control y hacer que no parezcas tú.',
  'Temperamento': 'Agrupación de los 16 tipos en cuatro estilos (racional NT, idealista NF, guardián SJ y artesano SP), según David Keirsey.',
  'Eneatipo': 'Uno de los nueve tipos del eneagrama. Lo define la motivación de fondo, lo que buscas y lo que temes, no la conducta.',
  'Ala': 'Uno de los dos tipos vecinos de tu eneatipo, que le da un matiz. Un 6w5 es un 6 con ala 5.',
  'Centro': 'Grupo de tres eneatipos con una emoción de fondo común: instinto (ira: 8, 9 y 1), corazón (vergüenza: 2, 3 y 4) y cabeza (miedo: 5, 6 y 7).',
  'Crecimiento': 'La flecha que sigue tu eneatipo cuando estás bien: tomas lo mejor de otro tipo.',
  'Estrés': 'La flecha que sigue tu eneatipo cuando estás desbordado: aparecen rasgos difíciles de otro tipo.',
  'Instintos': 'Tres impulsos que todos tenemos, en distinto orden: autoconservación (sp), social (so) y sexual o uno a uno (sx).',
  'sp': 'Autoconservación: tu bienestar, tu seguridad, tu casa, tu dinero y tu salud.',
  'so': 'Social: tu lugar en los grupos, tu gente, la pertenencia y las causas compartidas.',
  'sx': 'Sexual o uno a uno: la intensidad, la química y los vínculos profundos con una persona o una pasión.',
  'Orden de instintos': 'En qué orden atiendes los tres: el primero se lleva casi toda tu energía y el último es tu punto ciego. Se escribe con los dos primeros, como so/sp.',
  'Punto ciego': 'El instinto que menos atiendes: lo que se te queda descuidado sin darte cuenta.',
  'Subtipo': 'Tu eneatipo combinado con tu instinto dominante, por ejemplo 6 social. Hay 27, descritos por Claudio Naranjo.',
  'Contratipo': 'Subtipo que va a contracorriente de la pasión de su tipo. Por eso a veces cuesta reconocerse en la descripción general.',
  'Tritipo': 'Tu tipo más fuerte en cada centro (instinto, corazón y cabeza). El primero es tu eneatipo. Concepto de Katherine Chernick Fauvre.',
  'Probabilidad': 'Cuánto fiarte del resultado con tus respuestas. Está calibrada: en las simulaciones, de cada 100 resultados con un 70 %, unos 70 aciertan.',
  'Desempate': 'Preguntas extra que salen cuando los dos resultados más probables quedan muy cerca.'
};
