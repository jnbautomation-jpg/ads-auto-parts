// English strings — the reference dictionary. es.ts is typed against this, so
// adding a key here without translating it is a compile error rather than a
// silent English string on the Spanish site.

export const en = {
  nav: {
    signIn: "Sign in",
    myAccount: "My account",
    searchByVin: "Search by VIN",
    tradePricing: "Trade pricing",
    backToCatalog: "← Back to catalog",
    backToResults: "← Back to results",
    backToHome: "Back to home",
  },

  // Stock states. The public site shows these labels and never a count.
  availability: {
    IN_STOCK: "IN STOCK",
    LOW_STOCK: "LOW STOCK",
    CALL: "CALL",
  },

  // Part categories — the spec calls these out specifically.
  partType: {
    DOOR: "Door",
    HOOD: "Hood",
    TAILGATE: "Tailgate",
    TRUNK: "Trunk",
    LIFTGATE: "Liftgate",
    REAR_BODY_PANEL: "Rear Body",
    QUARTER_PANEL: "Quarter Panel",
    FENDER: "Fender",
    BUMPER: "Bumper",
    GRILLE: "Grille",
    HINGE: "Hinge",
    RADIATOR_SUPPORT: "Radiator Support",
    REINFORCEMENT_BAR: "Reinforcement Bar",
  },

  position: {
    FRONT_LEFT: "Left Front",
    FRONT_RIGHT: "Right Front",
    REAR_LEFT: "Left Rear",
    REAR_RIGHT: "Right Rear",
    FRONT: "Front",
    REAR: "Rear",
    none: "—",
  },

  catalog: {
    findYourPart: "Find your part",
    year: "Year",
    make: "Make",
    model: "Model",
    partType: "Part Type",
    search: "Search",
    filters: "Filters",
    capaOnly: "CAPA certified only",
    partsOne: "part",
    partsOther: "parts",
    showingEverything: "Showing everything in stock",
    noMatchTitle: "No parts match",
    noMatchBody:
      "We stock more than we list. Call us — if it's a body part, we can probably get it same-day.",
    callUs: "Call",
  },

  product: {
    capaCertified: "CAPA certified",
    newAftermarket: "New aftermarket",
    newAftermarketCapa: "New aftermarket · CAPA certified",
    tradePrice: "Trade price",
    partTypeLabel: "Part type",
    positionLabel: "Position",
    conditionLabel: "Condition",
    grade: "Grade",
    fitsThese: "Fits these vehicles",
    deliveryPickup: "Delivery & pickup",
    sameDay: "Same-day delivery, Central FL",
    freeOrlando: "Free delivery in Orlando",
    localPickup: "Local pickup available",
    phones247: "Phones answered 24/7",
    notFoundTitle: "We can't find that part",
    notFoundBody:
      "It may have sold, or the link may be out of date. We stock far more than we list online — browse the catalog or call and we'll check the shelf for you.",
    oftenNeededWith: "Often needed with this",
    browseCatalog: "Browse the catalog",
  },

  quote: {
    heading: "Request a quote",
    name: "Name",
    phone: "Phone",
    email: "Email",
    vehicle: "Vehicle (year, make, model)",
    partNeeded: "Part needed",
    notes: "Anything else? (paint code, side, photos to follow…)",
    send: "Send request",
    sending: "Sending…",
    success: "Request sent — we'll get back to you fast.",
  },

  vin: {
    title: "Find parts by VIN",
    intro:
      "Enter the 17-character VIN and we'll decode the vehicle and show what we stock for it. The VIN is on the driver's door jamb, the base of the windscreen, or your insurance card.",
    label: "VIN",
    helper: "On your registration, insurance card, or the plate where the windshield meets the dash.",
    submit: "Find my parts",
    checking: "Checking…",
    decodedTitle: "Is this your vehicle?",
    confirmBody: "Check this matches before ordering — parts differ by trim.",
    trim: "Trim",
    body: "Body",
    partsFor: "Parts we stock for this vehicle",
    seeAll: "See all parts for this vehicle",
    nothingTitle: "Nothing listed for that vehicle yet",
    nothingBody:
      "We stock far more than we list online. Call us with the VIN and we'll check the shelf.",
    checkDigitWarning:
      "That VIN's check digit doesn't match, so it may be mistyped — decoding it anyway.",
  },

  // Spec: "Translate ... error messages — not just marketing copy."
  errors: {
    generic: "Something went wrong on our end — please call or text us instead.",
    tryAgain: "Try again",
    somethingWrong: "Something went wrong",
    pageErrorBody:
      "This page didn't load. It's on our end, not yours — try again, or call the shop and we'll sort the part out over the phone.",
    reference: "Reference",
    nameAndPhoneRequired: "Name and phone are required.",
    phoneInvalid: "Please enter a phone number we can reach you on.",
    emailInvalid: "That email address doesn't look right.",
    tooLong: "That's longer than we can accept — please shorten it.",
    alreadyGotRequest: "We've already got your request — give us a call if it's urgent.",
    vinLength: "A VIN is 17 characters",
    vinAlphabet: "That VIN contains a letter VINs never use (I, O or Q). Check for a 1 or 0.",
    vinEmpty: "Enter a VIN.",
    vinDecodeFailed:
      "We couldn't decode that VIN just now. Give us a call and we'll look it up for you.",
  },

  landing: {
    hero: {
      eyebrow: "NEW AFTERMARKET BODY PARTS · ORLANDO, FL",
      line1: "Find your part.",
      line2: "Brand new. Today.",
      sub: "Doors, hoods, fenders, bumpers and more — new, CAPA certified, delivered same-day across Central Florida on orders before 12 PM.",
      searchByVehicle: "SEARCH BY VEHICLE",
      searchParts: "SEARCH PARTS",
    },
    nav: {
      parts: "PARTS",
      why: "WHY ADS",
      delivery: "DELIVERY",
      contact: "CONTACT",
    },
    heroBadges: {
      capa: "CAPA CERTIFIED",
      sameDay: "SAME-DAY CENTRAL FL",
      sameDayTail: " DELIVERY",
      dispatch: "24-HR DISPATCH",
      freeDelivery: "FREE ORLANDO DELIVERY",
    },
    ticker: "SAME-DAY DELIVERY ACROSS CENTRAL FLORIDA — ORDER BY 12 PM",
    tickerTail: " · MOST ORDERS DISPATCHED WITHIN 24 HOURS",
    allModels: "All models",
    browseByPart: "Browse by part",
    whyHeading: "Why ADS",
    deliveryHeading: "Delivery & pickup",
    contactHeading: "Talk to a parts specialist",
    warehouse: "ADS WAREHOUSE",
    warehouseTail: " — LOCAL PICKUP AVAILABLE",
    openInMaps: "OPEN IN ",
    maps: "MAPS →",
    tiles: {
      doors: { name: "Doors", note: "Front & rear · shells & skins" },
      hoods: { name: "Hoods", note: "Steel & aluminum" },
      fenders: { name: "Fenders", note: "Left & right" },
      bumpers: { name: "Bumpers", note: "Covers & reinforcements" },
      "tailgates-trunks": { name: "Tailgates & Trunks", note: "Trucks & sedans" },
      liftgates: { name: "Liftgates", note: "SUVs & hatchbacks" },
      "quarter-panels": { name: "Quarter Panels", note: "Full & partial" },
      "rear-body-panels": { name: "Rear Body Panels", note: "Rear body & valance" },
      grilles: { name: "Grilles", note: "Chrome & sport styles" },
      hinges: { name: "Hinges", note: "Door & hood hardware" },
      "radiator-support": { name: "Radiator Supports", note: "Core support assemblies" },
      "reinforcement-bars": { name: "Reinforcement Bars", note: "Bumper & body reinforcement" },
    },
    why: {
      capaTitle: "CAPA Certified Quality",
      capaBody: "New aftermarket parts built to certified fit & finish standards — never used salvage.",
      sameDayTitle: "Same-Day Central FL",
      sameDayBody:
        "Order before 12 PM and it's on your bumper the same day, anywhere in Central Florida.",
      dispatchTitle: "24-Hour Dispatch",
      dispatchBody: "Most orders leave our Orlando warehouse within 24 hours of the order.",
      freeTitle: "Free Delivery In Orlando",
      freeBody: "No delivery fee on orders within Orlando city limits — every time, no minimum.",
    },
    stats: {
      dispatch: "DISPATCH",
      cutoff: "SAME-DAY CUTOFF",
      newParts: "NEW PARTS",
      categories: "PART CATEGORIES",
    },
    steps: {
      orderTitle: "Order by 12 PM",
      orderBody: "Call, text, or send the quote form with your vehicle and the part you need.",
      dispatchTitle: "Dispatched within 24 hours",
      dispatchBody: "Most orders leave our Orlando warehouse the same day they're placed.",
      deliverTitle: "Same-day across Central FL",
      deliverBody:
        "Delivered to your shop or door — free within Orlando — or skip the wait and pick up locally at the warehouse.",
    },
  },

  footer: {
    hours: "Hours",
    address: "Address",
    openInMaps: "OPEN IN MAPS →",
  },
} as const;

// Widens every leaf from its literal type to `string` while KEEPING the key
// structure. Without this, `as const` above would make Dictionary demand the
// exact English text, and no translation could satisfy it. Missing or
// misspelled keys are still compile errors — which is the point.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
