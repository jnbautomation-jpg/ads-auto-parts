// Spanish strings.
//
// Typed as `Dictionary`, so a key added to en.ts and not translated here is a
// compile error — the failure mode this prevents is an English string quietly
// appearing on the Spanish site months later.
//
// Register: neutral Latin American Spanish using "usted", which is what a
// Central Florida body shop expects from a supplier. Trade vocabulary follows
// what Orlando shops actually say ("cofre" is the Mexican term for hood and is
// widely understood here; "capó" would read as Spain).

import type { Dictionary } from "./en";

export const es: Dictionary = {
  nav: {
    signIn: "Iniciar sesión",
    myAccount: "Mi cuenta",
    uploadEstimate: "Subir presupuesto",
    searchByVin: "Buscar por VIN",
    tradePricing: "Precio mayorista",
    backToCatalog: "← Volver al catálogo",
    backToResults: "← Volver a los resultados",
    backToHome: "Volver al inicio",
  },

  availability: {
    IN_STOCK: "EN EXISTENCIA",
    LOW_STOCK: "POCAS UNIDADES",
    CALL: "LLÁMENOS",
  },

  partType: {
    DOOR: "Puerta",
    HOOD: "Cofre",
    TAILGATE: "Compuerta trasera",
    TRUNK: "Cajuela",
    LIFTGATE: "Puerta levadiza",
    REAR_BODY_PANEL: "Panel trasero",
    QUARTER_PANEL: "Panel lateral",
    FENDER: "Salpicadera",
    BUMPER: "Defensa",
    GRILLE: "Parrilla",
    HINGE: "Bisagra",
    RADIATOR_SUPPORT: "Soporte de radiador",
    REINFORCEMENT_BAR: "Barra de refuerzo",
  },

  position: {
    FRONT_LEFT: "Delantera izquierda",
    FRONT_RIGHT: "Delantera derecha",
    REAR_LEFT: "Trasera izquierda",
    REAR_RIGHT: "Trasera derecha",
    FRONT: "Delantera",
    REAR: "Trasera",
    none: "—",
  },

  catalog: {
    findYourPart: "Encuentre su pieza",
    year: "Año",
    make: "Marca",
    model: "Modelo",
    partType: "Tipo de pieza",
    search: "Buscar",
    filters: "Filtros",
    capaOnly: "Solo certificadas CAPA",
    partsOne: "pieza",
    partsOther: "piezas",
    showingEverything: "Mostrando todo lo disponible",
    noMatchTitle: "No hay piezas que coincidan",
    noMatchBody:
      "Tenemos más de lo que aparece en línea. Llámenos — si es una pieza de carrocería, probablemente la conseguimos el mismo día.",
    callUs: "Llame al",
  },

  product: {
    capaCertified: "Certificada CAPA",
    newAftermarket: "Nueva, aftermarket",
    newAftermarketCapa: "Nueva, aftermarket · Certificada CAPA",
    tradePrice: "Precio mayorista",
    partTypeLabel: "Tipo de pieza",
    positionLabel: "Posición",
    conditionLabel: "Condición",
    grade: "Grado",
    fitsThese: "Compatible con estos vehículos",
    deliveryPickup: "Entrega y recolección",
    sameDay: "Entrega el mismo día en Florida Central",
    freeOrlando: "Entrega gratis en Orlando",
    localPickup: "Recolección local disponible",
    phones247: "Contestamos el teléfono 24/7",
    notFoundTitle: "No encontramos esa pieza",
    notFoundBody:
      "Puede que se haya vendido o que el enlace esté desactualizado. Tenemos mucho más de lo que publicamos en línea — busque en el catálogo o llámenos y revisamos el almacén por usted.",
    oftenNeededWith: "Suele necesitarse con esta pieza",
    browseCatalog: "Ver el catálogo",
  },

    fitment: {
      heading: "Detalle de la pieza",
      oemNumber: "Referencia OEM",
      construction: "Construcción",
      shell: "Puerta completa",
      skin: "Solo lámina exterior",
      material: "Material",
      steel: "Acero",
      aluminum: "Aluminio",
      paintPrep: "Preparación para pintura",
      bare: "Sin tratamiento",
      primed: "Con primer",
      edp: "Con recubrimiento EDP",
      mirrorHole: "Orificio del espejo",
      handleHole: "Orificio de la manija",
      preCut: "Ya cortado",
      notCut: "Sin cortar",
      askUs: "Si algo no aparece aquí, llámenos — revisamos la pieza física en el almacén.",
    },

    account: {
      signInTitle: "Iniciar sesión",
      signInIntro:
        "Las cuentas mayoristas ven precios de mayoreo una vez aprobadas. Los clientes minoristas pueden guardar vehículos para cotizar más rápido.",
      signUpTitle: "Cree una cuenta",
      signUpIntro:
        "Guarde los vehículos en los que trabaja. Los talleres pueden solicitar una cuenta mayorista una vez que inicien sesión — el precio de mayoreo lo aprueba nuestro equipo, no es automático.",
      email: "Correo electrónico",
      password: "Contraseña",
      passwordHint: "Mínimo 8 caracteres.",
      name: "Nombre",
      phone: "Teléfono",
      optional: "(opcional)",
      createAccount: "Crear cuenta",
      signIn: "Iniciar sesión",
      working: "Procesando…",
      haveAccount: "¿Ya tiene una cuenta?",
      needAccount: "¿Necesita una cuenta?",
      createOne: "Cree una",
      title: "Su cuenta",
      signOut: "Cerrar sesión",
      yourPricing: "Sus precios",
      tradeAccount: "Cuenta mayorista",
      retail: "Minorista",
      wholesaleActive: "Está viendo precios de mayoreo en todo el catálogo.",
      retailExplain: "Está viendo precios minoristas.",
      tradeHeading: "Precio mayorista",
      applicationReceived: "Solicitud recibida",
      applicationPending:
        "La estamos revisando. Las solicitudes las aprueba una persona, no es automático, así que denos un poco de tiempo — llámenos si es urgente.",
      applicationRejected: "No pudimos aprobar esa solicitud",
      applyAgain: "Si algo ha cambiado, puede solicitarla de nuevo abajo o llamarnos.",
      areYouAShop: "¿Tiene un taller de carrocería?",
      applyIntro:
        "Las cuentas mayoristas obtienen precio de mayoreo en todas las piezas. Díganos quién es y la configuramos — las aprobamos a mano.",
      shopName: "Nombre del taller o negocio",
      bestPhone: "Mejor número de teléfono",
      applyButton: "Solicitar precio mayorista",
      sending: "Enviando…",
      ordersHeading: "Pedidos",
      ordersIntro:
        "Su historial de pedidos, y puede repetir con un clic cualquier compra anterior.",
      viewOrders: "Ver pedidos",
      yourOrders: "Sus pedidos",
      reorderIntro: "Repita cualquier compra anterior.",
      nothingYet: "Todavía nada. Cuando haga un pedido, aparecerá aquí.",
      reorder: "Repetir pedido",
      backToAccount: "← VOLVER A LA CUENTA",
      backToOrders: "← VOLVER A LOS PEDIDOS",
      orderPlaced: "Pedido realizado — nos pondremos en contacto.",
      savedVehicles: "Vehículos guardados",
      savedVehiclesIntro:
        "Los carros en los que más trabaja. Le evita escribirlos cada vez que necesita una pieza.",
      nothingSaved: "Todavía no ha guardado ninguno.",
      save: "Guardar",
      saving: "Guardando…",
      remove: "Quitar",
      year: "Año",
      make: "Marca",
      model: "Modelo",
      checkBeforeOrder: "Revise esto antes de pedir",
      reorderExplain:
        "Las existencias y los precios cambian. Así se ve ese pedido hoy.",
      somethingChanged: "Algunas cosas cambiaron desde la última vez — vea las notas abajo.",
      totalToday: "Total hoy",
      placeOrder: "Realizar este pedido",
      placingOrder: "Realizando pedido…",
      noneAvailable:
        "Ninguna de estas está disponible ahora — llámenos y se las conseguimos.",
      statusUnchanged: "Igual que la última vez",
      statusPriceChanged: "Cambió el precio",
      statusPartial: "Solo algunas disponibles",
      statusOutOfStock: "Agotada",
      statusDiscontinued: "Ya no está en el catálogo",
    },

    accountErrors: {
      emailAndPassword: "Escriba un correo electrónico y una contraseña.",
      emailOrPassword: "Escriba su correo electrónico y contraseña.",
      passwordTooShort: "Use al menos 8 caracteres para su contraseña.",
      phoneInvalid: "Ese número de teléfono no parece correcto.",
      tooLong: "Eso es más largo de lo que podemos aceptar — por favor acórtelo.",
      createFailed: "No pudimos crear esa cuenta. Intente iniciar sesión.",
      invalidCredentials: "Correo electrónico o contraseña incorrectos.",
      serverProblem: "Hubo un problema de nuestro lado — por favor llámenos.",
      confirmEmail:
        "Cuenta creada — revise su correo para confirmarla y luego inicie sesión.",
      shopNameRequired: "Escriba el nombre de su taller o negocio.",
      shopNameTooLong: "Ese nombre de negocio es demasiado largo.",
      applicationSent: "Solicitud recibida — la revisaremos y le responderemos.",
      alreadyApplied: "Ya tenemos su solicitud — nos pondremos en contacto.",
      alreadyTrade: "Ya tiene una cuenta mayorista.",
      vehicleRequired: "Escriba la marca y el modelo.",
      yearInvalid: "Escriba un año válido.",
      vehicleSaved: "Vehículo guardado.",
      vehicleDuplicate: "Ese vehículo ya está guardado.",
      orderNotFound: "No encontramos ese pedido.",
      nothingAvailable: "Ninguna de esas piezas está disponible ahora.",
    },

  quote: {
    heading: "Solicitar cotización",
    name: "Nombre",
    phone: "Teléfono",
    email: "Correo electrónico",
    vehicle: "Vehículo (año, marca, modelo)",
    partNeeded: "Pieza que necesita",
    notes: "¿Algo más? (código de pintura, lado, fotos por enviar…)",
    notesLabel: "¿Algo más?",
    messageLabel: "Mensaje",
    message: "Mensaje — vehículo, pieza, color, cuándo la necesita…",
    send: "Enviar solicitud",
    sending: "Enviando…",
    success: "Solicitud enviada — le respondemos pronto.",
    fields: {
      name: "nombre",
      phone: "número de teléfono",
      email: "correo electrónico",
      vehicle: "vehículo",
      partNeeded: "pieza",
      notes: "mensaje",
    },
  },

  vin: {
    title: "Busque piezas por VIN",
    intro:
      "Escriba el VIN de 17 caracteres y decodificamos el vehículo para mostrarle lo que tenemos. El VIN está en el marco de la puerta del conductor, en la base del parabrisas o en su tarjeta de seguro.",
    label: "VIN",
    helper: "En su registración, tarjeta de seguro, o la placa donde el parabrisas se une al tablero.",
    submit: "Buscar mis piezas",
    checking: "Consultando…",
    decodedTitle: "¿Es este su vehículo?",
    confirmBody: "Confirme que coincide antes de pedir — las piezas cambian según la versión.",
    trim: "Versión",
    body: "Carrocería",
    partsFor: "Piezas que tenemos para este vehículo",
    seeAll: "Ver todas las piezas para este vehículo",
    nothingTitle: "Todavía no hay piezas publicadas para ese vehículo",
    nothingBody:
      "Tenemos mucho más de lo que publicamos en línea. Llámenos con el VIN y revisamos el almacén.",
    checkDigitWarning:
      "El dígito verificador de ese VIN no coincide, así que puede estar mal escrito — lo decodificamos de todos modos.",
  },

  errors: {
    generic: "Hubo un problema de nuestro lado — por favor llámenos o envíenos un mensaje.",
    tryAgain: "Intentar de nuevo",
    somethingWrong: "Algo salió mal",
    pageErrorBody:
      "Esta página no cargó. Es de nuestro lado, no del suyo — intente de nuevo o llame al taller y resolvemos la pieza por teléfono.",
    reference: "Referencia",
    notFoundTitle: "Página no encontrada",
    notFoundBody: "La página que buscaba no existe o fue movida.",
    nameAndPhoneRequired: "El nombre y el teléfono son obligatorios.",
    phoneInvalid: "Escriba un número de teléfono donde podamos localizarlo.",
    emailInvalid: "Ese correo electrónico no parece correcto.",
    // "El campo <label>" rather than "Ese <label>": the field names are not
    // all the same gender, so a leading demonstrative cannot agree with all
    // of them.
    tooLongBefore: "El campo ",
    tooLongAfter: " es demasiado largo — por favor acórtelo.",
    alreadyGotRequest: "Ya recibimos su solicitud — llámenos si es urgente.",
    vinLength: "Un VIN tiene 17 caracteres",
    vinAlphabet: "Ese VIN tiene una letra que los VIN nunca usan (I, O o Q). Revise si es un 1 o un 0.",
    vinEmpty: "Escriba un VIN.",
    vinDecodeFailed:
      "No pudimos decodificar ese VIN en este momento. Llámenos y lo buscamos por usted.",
  },

  landing: {
    hero: {
      eyebrow: "PIEZAS DE CARROCERÍA NUEVAS · ORLANDO, FL",
      line1: "Encuentre su pieza.",
      line2: "Nueva. Hoy mismo.",
      sub: "Puertas, cofres, salpicaderas, defensas y más — nuevas, certificadas CAPA, entregadas el mismo día en toda Florida Central en pedidos antes de las 12 PM.",
      searchByVehicle: "BUSQUE POR VEHÍCULO",
      searchParts: "BUSCAR PIEZAS",
    },
    nav: {
      parts: "PIEZAS",
      why: "POR QUÉ ADS",
      delivery: "ENTREGA",
      contact: "CONTACTO",
    },
    heroBadges: {
      capa: "CERTIFICADAS CAPA",
      sameDay: "MISMO DÍA FLORIDA CENTRAL",
      sameDayTail: " · ENTREGA",
      dispatch: "ENVÍO EN 24 H",
      freeDelivery: "ENTREGA GRATIS EN ORLANDO",
    },
    ticker: "ENTREGA EL MISMO DÍA EN TODA FLORIDA CENTRAL — PIDA ANTES DE LAS 12 PM",
    tickerTail: " · LA MAYORÍA DE LOS PEDIDOS SALEN EN 24 HORAS",
    footer: {
      site: "SITIO",
      tagline:
        "Piezas de carrocería nuevas alternativas — nunca usadas ni de deshuesadero. Ajuste y acabado certificados CAPA, salen de Orlando en 24 horas.",
      strip: "ENTREGA EL MISMO DÍA EN TODA FLORIDA CENTRAL · PIDA ANTES DE LAS 12 PM",
    },
    contact: {
      call: "LLAMAR",
      text: "MENSAJE",
      email: "CORREO",
      visit: "VISITAR",
      hours: "HORARIO",
    },
    allModels: "Todos los modelos",
    browseByPart: "Busque por tipo de pieza",
    whyHeading: "Por qué ADS",
    deliveryHeading: "Entrega y recolección",
    contactHeading: "Hable con un especialista en piezas",
    warehouse: "ALMACÉN ADS",
    warehouseTail: " — RECOLECCIÓN LOCAL DISPONIBLE",
    openInMaps: "ABRIR EN ",
    maps: "MAPAS →",
    tiles: {
      doors: { name: "Puertas", note: "Delanteras y traseras · completas y láminas" },
      hoods: { name: "Cofres", note: "Acero y aluminio" },
      fenders: { name: "Salpicaderas", note: "Izquierda y derecha" },
      bumpers: { name: "Defensas", note: "Cubiertas y refuerzos" },
      "tailgates-trunks": { name: "Compuertas y cajuelas", note: "Camionetas y sedanes" },
      liftgates: { name: "Puertas levadizas", note: "SUVs y hatchbacks" },
      "quarter-panels": { name: "Paneles laterales", note: "Completos y parciales" },
      "rear-body-panels": { name: "Paneles traseros", note: "Panel trasero y faldón" },
      grilles: { name: "Parrillas", note: "Estilo cromado y deportivo" },
      hinges: { name: "Bisagras", note: "Herrajes de puerta y cofre" },
      "radiator-support": { name: "Soportes de radiador", note: "Ensambles de soporte" },
      "reinforcement-bars": { name: "Barras de refuerzo", note: "Refuerzo de defensa y carrocería" },
    },
    why: {
      capaTitle: "Calidad certificada CAPA",
      capaBody:
        "Piezas nuevas aftermarket fabricadas según estándares certificados de ajuste y acabado — nunca de deshuesadero.",
      sameDayTitle: "Mismo día en Florida Central",
      sameDayBody:
        "Pida antes de las 12 PM y la pieza llega el mismo día a cualquier punto de Florida Central.",
      dispatchTitle: "Envío en 24 horas",
      dispatchBody: "La mayoría de los pedidos salen de nuestro almacén en Orlando en 24 horas.",
      freeTitle: "Entrega gratis en Orlando",
      freeBody: "Sin cargo de entrega dentro de los límites de Orlando — siempre, sin mínimo.",
    },
    stats: {
      dispatch: "ENVÍO",
      cutoff: "CORTE MISMO DÍA",
      newParts: "PIEZAS NUEVAS",
      categories: "CATEGORÍAS",
    },
    steps: {
      orderTitle: "Pida antes de las 12 PM",
      orderBody:
        "Llame, envíe un mensaje o use el formulario de cotización con su vehículo y la pieza que necesita.",
      dispatchTitle: "Enviado en 24 horas",
      dispatchBody: "La mayoría de los pedidos salen de nuestro almacén en Orlando el mismo día.",
      deliverTitle: "Mismo día en toda Florida Central",
      deliverBody:
        "Entregamos en su taller o domicilio — gratis dentro de Orlando — o recoja en el almacén sin esperar.",
    },
  },

  estimate: {
    title: "Suba un presupuesto",
    intro:
      "Suba un presupuesto de CCC, Mitchell o Audatex y le leemos el VIN y los paneles que trae, y después le mostramos qué tenemos en el almacén para ese vehículo exacto. Más rápido que escribirlo todo — y siempre le mostramos lo que leímos para que lo revise.",
    fileLabel: "Presupuesto en PDF",
    submit: "Ver qué tenemos",
    submitting: "Leyendo el presupuesto…",
    privacy:
      "Leemos el VIN y las piezas de la lista, y después borramos el archivo. No guardamos nada del presupuesto.",
    scannedTitle: "Eso parece un escaneo",
    scannedBody:
      "Ese PDF no tiene texto legible, así que probablemente sea una foto o un escaneo. Envíenoslo y lo cotizamos a mano — o escriba el VIN aquí.",
    whatWeRead: "Lo que leímos",
    noVehicle: "No pudimos identificar el vehículo en ese presupuesto.",
    checkBeforeOrdering:
      "Revise que esto coincida con su presupuesto antes de pedir — lo leemos automáticamente.",
    inStockTitle: "Lo que tenemos en existencia",
    noMatches:
      "Ahora mismo no tenemos publicado nada para esas piezas en ese vehículo — pero tenemos mucho más de lo que publicamos. Llámenos con el presupuesto y lo revisamos.",
    unmatchedTitle: "Sin coincidencia",
    unmatchedBefore:
      "Estas venían en el presupuesto pero no las tenemos publicadas para este vehículo:",
    unmatchedAfter: "Llámenos y se las conseguimos.",
    chooseFile: "Elija un presupuesto en PDF para subir.",
    tooLarge: "Ese archivo es demasiado grande — suba solamente el PDF del presupuesto.",
    notPdf: "Por favor suba un PDF.",
    unreadable: "No pudimos leer ese PDF. Envíenoslo y lo cotizamos a mano.",
    vinCheckDigit:
      "El VIN de este presupuesto no pasa su dígito verificador — confírmelo antes de pedir.",
  },

  returns: {
    eyebrow: "Devoluciones y garantía",
    title: "Si algo no está bien",
    intro:
      "Los paneles de carrocería son grandes, pesados y fáciles de dañar en el transporte. Así lo manejamos cuando una pieza llega dañada, no ajusta o no era la que necesitaba.",
    freightTitle: "Daño en el transporte",
    freightBody:
      "Revise la pieza antes de firmar. Si el empaque está roto o aplastado, o el panel tiene un golpe visible, anótelo en los papeles de entrega y tómele fotos antes de que se vaya el chofer — ese registro es lo que nos permite reemplazarla rápido. Después llámenos el mismo día y ponemos el reemplazo en camino.",
    freightAfter:
      "Si descubre el daño después de que se fue el chofer, llámenos de todos modos. Tome fotos del empaque además de la pieza.",
    fitTitle: "Pieza equivocada o que no ajusta",
    fitBefore:
      "Las piezas cambian según la versión, y el VIN es la forma más segura de acertar — puede",
    fitLink: "revisar su VIN aquí",
    fitAfter:
      "antes de pedir. Si aun así la pieza no ajusta, llámenos antes de modificarla o prepararla para pintura: una vez que un panel se perfora, se corta o se pinta, ya no se puede devolver.",
    capaTitle: "Piezas certificadas CAPA",
    capaBody:
      "Las piezas marcadas CAPA fueron probadas de forma independiente contra la pieza original del fabricante en ajuste, grosor y protección contra la corrosión, y llevan un sello numerado. Deje el sello puesto hasta que la pieza esté instalada — es la prueba que respalda cualquier reclamo.",
    talkTitle: "Hable con nosotros primero",
    talkBefore: "Cada reclamo lo atiende una persona, no un formulario. Llame al",
    talkMiddle: "o escriba a",
    talkAfter: "con su número de pedido y una foto, y le decimos qué sigue.",
  },

  trust: {
    eyebrow: "Por qué puede comprar con confianza",
    capaTitle: "Qué significa realmente la certificación CAPA",
    capaBody:
      "CAPA es una entidad independiente que prueba las piezas de carrocería alternativas contra la pieza original del fabricante — el grosor del panel, la calidad de la soldadura, la protección contra la corrosión y qué tan exacto queda el ajuste en el carro. Una pieza marcada CAPA pasó esas pruebas y lleva un sello numerado. No es una pieza de deshuesadero ni una copia que \"se parece\". Si una pieza de este sitio está marcada CAPA, aprobó.",
    newPartsBadge: "Solo piezas nuevas",
    newPartsBody: "Nunca usadas ni de deshuesadero. Todos los paneles se envían nuevos.",
    warehouseBadge: "Almacén propio",
    warehouseBefore: "almacena y envía desde su propio almacén en",
    warehouseAfter: "— o recoja en persona si lo prefiere.",
    personBadge: "Hable con una persona",
    personAfter: "— contestamos 24/7, y quien contesta conoce las piezas.",
    findUs: "Encuéntrenos en",
    ebayStore: "Tienda de eBay",
    returnsPrompt: "¿Preguntas sobre ajuste, daño en el transporte o devoluciones?",
    returnsLink: "Lea la política de devoluciones y garantía",
  },

  chat: {
    title: "Asistente de piezas",
    subtitle: "Consulta existencias en vivo · Español e inglés",
    greeting: "Hola — puedo revisar qué tenemos en existencia para su vehículo. ¿Qué necesita?",
    checking: "Revisando el catálogo…",
    placeholder: "¿Puerta para un RAV4 2021?",
    send: "Enviar",
    open: "Abrir el asistente de piezas",
    close: "Cerrar el asistente de piezas",
    closeChat: "Cerrar el chat",
    failedBefore: "No pude comunicarme con el taller ahora mismo — por favor llame al",
  },

  footer: {
    tagline:
      "Piezas de carrocería nuevas alternativas — nunca usadas ni de deshuesadero. Salen de nuestro almacén en Orlando.",
    parts: "Piezas",
    makes: "Marcas",
    areas: "Zonas donde entregamos",
    visitOrCall: "Visítenos o llame",
  },
};
