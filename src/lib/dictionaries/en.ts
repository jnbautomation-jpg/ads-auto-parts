// English strings — the reference dictionary. es.ts is typed against this, so
// adding a key here without translating it is a compile error rather than a
// silent English string on the Spanish site.

export const en = {
  nav: {
    signIn: "Sign in",
    myAccount: "My account",
    uploadEstimate: "Upload estimate",
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

    fitment: {
      heading: "Part detail",
      oemNumber: "OEM reference",
      construction: "Construction",
      shell: "Full shell",
      skin: "Skin only",
      material: "Material",
      steel: "Steel",
      aluminum: "Aluminum",
      paintPrep: "Paint prep",
      bare: "Bare",
      primed: "Primed",
      edp: "EDP coated",
      mirrorHole: "Mirror hole",
      handleHole: "Handle hole",
      preCut: "Pre-cut",
      notCut: "Not cut",
      askUs: "Anything not listed here, call us — we'll check the actual part on the shelf.",
    },

    account: {
      signInTitle: "Sign in",
      signInIntro:
        "Trade accounts see wholesale pricing once approved. Retail customers can save vehicles for faster quotes.",
      signUpTitle: "Create an account",
      signUpIntro:
        "Save the vehicles you work on. Body shops can apply for a trade account once signed in — wholesale pricing is approved by our team, not automatic.",
      email: "Email",
      password: "Password",
      passwordHint: "At least 8 characters.",
      name: "Name",
      phone: "Phone",
      optional: "(optional)",
      createAccount: "Create account",
      signIn: "Sign in",
      working: "Working…",
      haveAccount: "Already have an account?",
      needAccount: "Need an account?",
      createOne: "Create one",
      title: "Your account",
      signOut: "Sign out",
      yourPricing: "Your pricing",
      tradeAccount: "Trade account",
      retail: "Retail",
      wholesaleActive: "You're seeing wholesale pricing across the catalog.",
      retailExplain: "You're seeing retail pricing.",
      tradeHeading: "Trade pricing",
      applicationReceived: "Application received",
      applicationPending:
        "We're reviewing it. Applications are approved by a person, not automatically, so give us a little time — call us if it's urgent.",
      applicationRejected: "We couldn't approve that application",
      applyAgain: "If something has changed, you can apply again below or call us.",
      areYouAShop: "Are you a body shop?",
      applyIntro:
        "Trade accounts get wholesale pricing on every part. Tell us who you are and we'll set it up — we approve these by hand.",
      shopName: "Shop / business name",
      bestPhone: "Best phone number",
      applyButton: "Apply for trade pricing",
      sending: "Sending…",
      ordersHeading: "Orders",
      ordersIntro: "Your order history, and one-click reordering of anything you've bought before.",
      viewOrders: "View orders",
      yourOrders: "Your orders",
      reorderIntro: "Reorder anything you've bought before.",
      nothingYet: "Nothing yet. Once you order, it'll show up here.",
      reorder: "Reorder",
      backToAccount: "← BACK TO ACCOUNT",
      backToOrders: "← BACK TO ORDERS",
      orderPlaced: "Order placed — we'll be in touch.",
      savedVehicles: "Saved vehicles",
      savedVehiclesIntro:
        "The cars you work on most. Saves retyping them every time you need a part.",
      nothingSaved: "Nothing saved yet.",
      save: "Save",
      saving: "Saving…",
      remove: "Remove",
      year: "Year",
      make: "Make",
      model: "Model",
      checkBeforeOrder: "Check this before you order",
      reorderExplain: "Stock and prices change. Here's what that order looks like today.",
      somethingChanged: "Some things have changed since last time — see the notes below.",
      totalToday: "Total today",
      placeOrder: "Place this order",
      placingOrder: "Placing order…",
      noneAvailable:
        "None of these are available right now — call us and we'll find them for you.",
      statusUnchanged: "Same as last time",
      statusPriceChanged: "Price changed",
      statusPartial: "Only some available",
      statusOutOfStock: "Out of stock",
      statusDiscontinued: "No longer listed",
    },

    accountErrors: {
      emailAndPassword: "Enter an email address and a password.",
      emailOrPassword: "Enter your email and password.",
      passwordTooShort: "Use at least 8 characters for your password.",
      phoneInvalid: "That phone number doesn't look right.",
      tooLong: "That's longer than we can accept — please shorten it.",
      createFailed: "We couldn't create that account. Try signing in instead.",
      invalidCredentials: "Invalid email or password.",
      serverProblem: "Something went wrong on our end — please call us instead.",
      confirmEmail: "Account created — check your email to confirm it, then sign in.",
      shopNameRequired: "Enter your shop or business name.",
      shopNameTooLong: "That business name is too long.",
      applicationSent: "Application received — we'll review it and get back to you.",
      alreadyApplied: "Your application is already with us — we'll be in touch.",
      alreadyTrade: "You already have a trade account.",
      vehicleRequired: "Enter a make and model.",
      yearInvalid: "Enter a valid year.",
      vehicleSaved: "Vehicle saved.",
      vehicleDuplicate: "That vehicle is already saved.",
      orderNotFound: "We couldn't find that order.",
      nothingAvailable: "None of those parts are available right now.",
    },

  quote: {
    heading: "Request a quote",
    name: "Name",
    phone: "Phone",
    email: "Email",
    vehicle: "Vehicle (year, make, model)",
    partNeeded: "Part needed",
    notes: "Anything else? (paint code, side, photos to follow…)",
    notesLabel: "Anything else?",
    messageLabel: "Message",
    message: "Message — vehicle, part, color, timing…",
    send: "Send request",
    sending: "Sending…",
    success: "Request sent — we'll get back to you fast.",
    // Named in the "that <field> is too long" message below. Lower case
    // because they appear mid-sentence.
    fields: {
      name: "name",
      phone: "phone number",
      email: "email address",
      vehicle: "vehicle",
      partNeeded: "part",
      notes: "message",
    },
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
    // The site-wide 404, for a URL that matches no route at all. The
    // "we can't find that part" copy under (public) is product.notFound*.
    notFoundTitle: "Page not found",
    notFoundBody: "The page you were looking for doesn't exist or has moved.",
    nameAndPhoneRequired: "Name and phone are required.",
    phoneInvalid: "Please enter a phone number we can reach you on.",
    emailInvalid: "That email address doesn't look right.",
    // Wraps a quote.fields label: "That phone number is too long — please
    // shorten it." Split rather than interpolated because the two languages
    // put the field name in different places.
    tooLongBefore: "That ",
    tooLongAfter: " is too long — please shorten it.",
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
    // The landing page has its own footer, separate from the shared
    // SiteFooter — see CLAUDE.md on why that page deliberately diverges.
    footer: {
      site: "SITE",
      tagline:
        "New aftermarket auto body parts — never used salvage. CAPA certified fit and finish, dispatched from Orlando within 24 hours.",
      strip: "SAME-DAY DELIVERY ACROSS CENTRAL FLORIDA · ORDER BY 12 PM",
    },
    contact: {
      call: "CALL",
      text: "TEXT",
      email: "EMAIL",
      visit: "VISIT",
      hours: "HOURS",
    },
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

  // Insurance estimate upload (/estimate and /es/estimate).
  estimate: {
    title: "Upload an estimate",
    intro:
      "Drop in a CCC, Mitchell or Audatex estimate and we'll read the VIN and the panels off it, then show you what's on our shelf for that exact vehicle. Faster than typing it all out — and we'll always show you what we read so you can check it.",
    fileLabel: "Estimate PDF",
    submit: "Check what we have",
    submitting: "Reading the estimate…",
    privacy:
      "We read the VIN and the parts listed, then delete the file. Nothing from the estimate is stored.",
    scannedTitle: "That looks like a scan",
    scannedBody:
      "There's no readable text in that PDF, so it's probably a photo or a scan. Send it to us and we'll quote it by hand — or type the VIN in instead.",
    whatWeRead: "What we read",
    noVehicle: "We couldn't identify the vehicle from that estimate.",
    checkBeforeOrdering:
      "Check this matches your estimate before ordering — we read it automatically.",
    inStockTitle: "What we have in stock",
    noMatches:
      "We don't have anything listed for those parts on that vehicle right now — but we stock far more than we list. Call us with the estimate and we'll check.",
    unmatchedTitle: "Not matched",
    unmatchedBefore: "These were on the estimate but we don't have them listed for this vehicle:",
    unmatchedAfter: "Call and we'll source them.",
    // Returned by the server action, so they have to be translated too —
    // an English error on the Spanish page is the failure this file exists to
    // prevent.
    chooseFile: "Choose an estimate PDF to upload.",
    tooLarge: "That file is too large — please upload the estimate PDF only.",
    notPdf: "Please upload a PDF.",
    unreadable: "We couldn't read that PDF. Send it to us and we'll quote it by hand.",
    vinCheckDigit:
      "The VIN on this estimate doesn't pass its check digit — confirm it before ordering.",
  },

  // Returns & warranty (/returns and /es/returns).
  returns: {
    eyebrow: "Returns & warranty",
    title: "If something isn't right",
    intro:
      "Body panels are big, heavy and easy to damage in transit. Here's how we handle it when a part arrives damaged, doesn't fit, or isn't what you needed.",
    freightTitle: "Freight damage",
    freightBody:
      "Inspect the part before you sign for it. If the packaging is torn, crushed or the panel is visibly dented, note it on the delivery paperwork and photograph it before the driver leaves — that record is what lets us replace it quickly. Then call us the same day and we'll get a replacement moving.",
    freightAfter:
      "If you find damage after the driver has gone, call us anyway. Photograph the packaging as well as the part.",
    fitTitle: "Wrong part or doesn't fit",
    fitBefore: "Parts differ by trim, and a VIN is the surest way to get it right — you can",
    fitLink: "check your VIN here",
    fitAfter:
      "before ordering. If a part still doesn't fit, call us before attempting any modification or paint prep: once a panel has been drilled, cut or painted it can no longer be returned.",
    capaTitle: "CAPA certified parts",
    capaBody:
      "Parts marked CAPA have been independently tested against the manufacturer's original for fit, thickness and corrosion protection, and carry a numbered seal. Leave the seal on until the part is fitted — it's the evidence behind any claim.",
    talkTitle: "Talk to us first",
    talkBefore: "Every claim is handled by a person, not a form. Call",
    talkMiddle: "or email",
    talkAfter: "with your order number and a photo, and we'll tell you what happens next.",
  },

  // Trust signals band — rendered on both landing pages.
  trust: {
    eyebrow: "Why you can buy with confidence",
    capaTitle: "What CAPA certified actually means",
    capaBody:
      "CAPA is an independent body that tests aftermarket body parts against the original manufacturer's part — panel thickness, weld quality, corrosion protection, and how precisely it lines up on the car. A CAPA-marked part has been through that testing and carries a numbered seal. It is not a salvage-yard part and it is not a copy that \"looks about right\". If a part on this site is marked CAPA, it passed.",
    newPartsBadge: "New parts only",
    newPartsBody: "Never used salvage. Every panel ships new.",
    warehouseBadge: "Real warehouse",
    warehouseBefore: "stocks and ships from its own warehouse in",
    warehouseAfter: "— collect in person if you'd rather.",
    personBadge: "Talk to a person",
    personAfter: "— answered 24/7, by someone who knows the parts.",
    findUs: "Find us on",
    ebayStore: "eBay store",
    returnsPrompt: "Questions about fit, freight damage or returns?",
    returnsLink: "Read the returns & warranty policy",
  },

  footer: {
    tagline:
      "New aftermarket auto body parts — never used salvage. Dispatched from our Orlando warehouse.",
    parts: "Parts",
    makes: "Makes",
    areas: "Areas we deliver",
    visitOrCall: "Visit or call",
  },
} as const;

// Widens every leaf from its literal type to `string` while KEEPING the key
// structure. Without this, `as const` above would make Dictionary demand the
// exact English text, and no translation could satisfy it. Missing or
// misspelled keys are still compile errors — which is the point.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
