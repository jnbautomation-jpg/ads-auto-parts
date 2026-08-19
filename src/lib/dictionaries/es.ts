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
    browseCatalog: "Ver el catálogo",
  },

  quote: {
    heading: "Solicitar cotización",
    name: "Nombre",
    phone: "Teléfono",
    email: "Correo electrónico",
    vehicle: "Vehículo (año, marca, modelo)",
    partNeeded: "Pieza que necesita",
    notes: "¿Algo más? (código de pintura, lado, fotos por enviar…)",
    send: "Enviar solicitud",
    sending: "Enviando…",
    success: "Solicitud enviada — le respondemos pronto.",
  },

  vin: {
    title: "Busque piezas por VIN",
    intro:
      "Escriba el VIN de 17 caracteres y decodificamos el vehículo para mostrarle lo que tenemos. El VIN está en el marco de la puerta del conductor, en la base del parabrisas o en su tarjeta de seguro.",
    label: "VIN",
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
    nameAndPhoneRequired: "El nombre y el teléfono son obligatorios.",
    phoneInvalid: "Escriba un número de teléfono donde podamos localizarlo.",
    emailInvalid: "Ese correo electrónico no parece correcto.",
    tooLong: "Eso es más largo de lo que podemos aceptar — por favor acórtelo.",
    alreadyGotRequest: "Ya recibimos su solicitud — llámenos si es urgente.",
    vinLength: "Un VIN tiene 17 caracteres",
    vinAlphabet: "Ese VIN tiene una letra que los VIN nunca usan (I, O o Q). Revise si es un 1 o un 0.",
    vinEmpty: "Escriba un VIN.",
    vinDecodeFailed:
      "No pudimos decodificar ese VIN en este momento. Llámenos y lo buscamos por usted.",
  },

  footer: {
    hours: "Horario",
    address: "Dirección",
    openInMaps: "ABRIR EN MAPAS →",
  },
};
