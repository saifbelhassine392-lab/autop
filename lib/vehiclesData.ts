export interface VehicleBrandData {
  name: string;
  popular?: boolean;
  models: string[];
}

export const VEHICLE_BRANDS_DATA: VehicleBrandData[] = [
  {
    name: "PEUGEOT",
    popular: true,
    models: [
      "106", "107", "108", "206", "206+", "207", "207+", "208", "301", "306", "307", "308", 
      "405", "406", "407", "408", "508", "607", "807", "1007", "2008", "3008", "4007", "4008", 
      "5008", "Partner", "Expert", "Boxer", "Rifter", "Bipper", "RCZ", "Pick Up"
    ]
  },
  {
    name: "RENAULT",
    popular: true,
    models: [
      "Clio", "Clio 2", "Clio 3", "Clio 4", "Clio 5", "Symbol", "Megane", "Megane 2", "Megane 3", 
      "Megane 4", "Fluence", "Scenic", "Grand Scenic", "Kadjar", "Captur", "Koleos", "Austral", 
      "Arkana", "Duster", "Twingo", "Kangoo", "Express", "Trafic", "Master", "Laguna", "Safrane", 
      "Talisman", "Espace", "Modus", "Kwid", "Triber"
    ]
  },
  {
    name: "CITROËN",
    popular: true,
    models: [
      "C1", "C2", "C3", "C3 Aircross", "C4", "C4 Cactus", "C4 Picasso", "Grand C4 Picasso", 
      "C5", "C5 Aircross", "C5 X", "C6", "C-Elysée", "Saxo", "Xsara", "Xsara Picasso", "Berlingo", 
      "Jumpy", "Jumper", "Nemo", "Ami", "DS3", "DS4", "DS5", "Spacetourer"
    ]
  },
  {
    name: "VOLKSWAGEN",
    popular: true,
    models: [
      "Golf", "Golf 4", "Golf 5", "Golf 6", "Golf 7", "Golf 8", "Polo", "Passat", "Tiguan", 
      "Touareg", "T-Roc", "T-Cross", "Taigo", "Caddy", "Amarok", "Transporter", "Crafter", 
      "Jetta", "Scirocco", "Bora", "Beetle / Coccinelle", "Arteon", "Up!", "Touran", "Sharan", "ID.3", "ID.4"
    ]
  },
  {
    name: "FIAT",
    popular: true,
    models: [
      "500", "500X", "500L", "Punto", "Grande Punto", "Punto Evo", "Panda", "Tipo", "Doblo", 
      "Ducato", "Fiorino", "Uno", "Palio", "Siena", "Bravo", "Stilo", "Linea", "Freemont", 
      "Qubo", "Talento", "Strada"
    ]
  },
  {
    name: "DACIA",
    popular: true,
    models: [
      "Logan", "Sandero", "Sandero Stepway", "Duster", "Lodgy", "Dokker", "Spring", "Jogger", "Solenza"
    ]
  },
  {
    name: "FORD",
    popular: true,
    models: [
      "Fiesta", "Focus", "Mondeo", "Kuga", "Ranger", "Transit", "Transit Custom", "Transit Connect", 
      "EcoSport", "Puma", "Mustang", "Mustang Mach-E", "Ka", "Escort", "Galaxy", "S-Max", "C-Max", "Explorer"
    ]
  },
  {
    name: "BMW",
    popular: true,
    models: [
      "Série 1", "Série 2", "Série 3", "Série 4", "Série 5", "Série 6", "Série 7", "Série 8", 
      "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "i7", "iX", "M2", "M3", "M4", "M5"
    ]
  },
  {
    name: "MERCEDES-BENZ",
    popular: true,
    models: [
      "Classe A", "Classe B", "Classe C", "Classe E", "Classe S", "CLA", "CLS", "GLA", "GLB", 
      "GLC", "GLE", "GLS", "Classe G", "Sprinter", "Vito", "Citan", "Classe V", "SLK", "SLC", "ML", "GL"
    ]
  },
  {
    name: "AUDI",
    popular: true,
    models: [
      "A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", 
      "TT", "R8", "e-tron", "S3", "S4", "S5", "RS3", "RS4", "RS6"
    ]
  },
  {
    name: "TOYOTA",
    popular: true,
    models: [
      "Yaris", "Yaris Cross", "Corolla", "Hilux", "RAV4", "Land Cruiser", "Aygo", "C-HR", 
      "Camry", "Avensis", "Prius", "Supra", "Proace", "Proace City", "Fortuner", "Auris", "Urban Cruiser"
    ]
  },
  {
    name: "HYUNDAI",
    popular: true,
    models: [
      "i10", "Grand i10", "i20", "i30", "Tucson", "Santa Fe", "Accent", "Elantra", "Kona", 
      "Creta", "Bayon", "Ioniq", "Ioniq 5", "H100", "H-1 / Starex", "Atos", "Getz", "Matrix"
    ]
  },
  {
    name: "KIA",
    popular: true,
    models: [
      "Picanto", "Rio", "Ceed", "Sportage", "Sorento", "Cerato", "Stonic", "Niro", "Seltos", 
      "Sonet", "K5", "Carnival", "EV6", "Soul", "Carens"
    ]
  },
  {
    name: "SEAT",
    popular: true,
    models: [
      "Ibiza", "Leon", "Ateca", "Arona", "Tarraco", "Toledo", "Altea", "Alhambra", "Cordoba"
    ]
  },
  {
    name: "SKODA",
    popular: true,
    models: [
      "Fabia", "Octavia", "Superb", "Kodiaq", "Karoq", "Kamiq", "Rapid", "Scala", "Enyaq", "Felicia"
    ]
  },
  {
    name: "NISSAN",
    popular: true,
    models: [
      "Micra", "Qashqai", "Juke", "X-Trail", "Patrol", "Navara", "Sunny", "Note", "Tiida", 
      "Sentra", "Leaf", "Kicks", "NV200", "Pathfinder"
    ]
  },
  {
    name: "OPEL",
    popular: true,
    models: [
      "Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Vivaro", 
      "Movano", "Zafira", "Meriva", "Adam", "Vectra"
    ]
  },
  {
    name: "ALFA ROMEO",
    popular: false,
    models: [
      "Giulietta", "Mito", "Giulia", "Stelvio", "Tonale", "147", "156", "159", "GT", "166"
    ]
  },
  {
    name: "SUZUKI",
    popular: true,
    models: [
      "Swift", "Vitara", "Grand Vitara", "Jimny", "Alto", "Baleno", "Celerio", "S-Cross", 
      "Ignis", "Ertiga", "Dzire", "SX4"
    ]
  },
  {
    name: "CHERY",
    popular: true,
    models: [
      "Tiggo 2", "Tiggo 3", "Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5", "Arrizo 6", "QQ", "Fulwin", "E5"
    ]
  },
  {
    name: "HAVAL",
    popular: true,
    models: [
      "H2", "H6", "H9", "Jolion", "Dargo", "H6 GT"
    ]
  },
  {
    name: "GREAT WALL",
    popular: true,
    models: [
      "Wingle 5", "Wingle 7", "Poer", "Steed", "C30", "M4"
    ]
  },
  {
    name: "GEELY",
    popular: true,
    models: [
      "Coolray", "Azkarra", "Emgrand", "GX3 Pro", "Okavango", "Tugella", "Geometry C"
    ]
  },
  {
    name: "MG",
    popular: true,
    models: [
      "MG 3", "MG 5", "MG 6", "ZS", "HS", "RX5", "GT", "Marvel R", "MG4"
    ]
  },
  {
    name: "BYD",
    popular: true,
    models: [
      "F3", "Tang", "Han", "Atto 3", "Dolphin", "Seal", "Song Plus", "Seagull"
    ]
  },
  {
    name: "MITSUBISHI",
    popular: true,
    models: [
      "L200", "Pajero", "Outlander", "ASX", "Mirage", "Eclipse Cross", "Colt", "Lancer", "Space Star"
    ]
  },
  {
    name: "CHEVROLET",
    popular: false,
    models: [
      "Aveo", "Spark", "Captiva", "Cruze", "Optra", "Trailblazer", "Tracker", "Tahoe", "Camaro", "Sail"
    ]
  },
  {
    name: "JEEP",
    popular: false,
    models: [
      "Renegade", "Compass", "Grand Cherokee", "Wrangler", "Cherokee", "Avenger", "Patriot"
    ]
  },
  {
    name: "LAND ROVER",
    popular: false,
    models: [
      "Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar", "Freelander"
    ]
  },
  {
    name: "ISUZU",
    popular: true,
    models: [
      "D-Max", "N-Series", "NPR", "NQR", "KB", "MU-X"
    ]
  },
  {
    name: "HONDA",
    popular: false,
    models: [
      "Civic", "CR-V", "HR-V", "Accord", "City", "Jazz / Fit", "Pilot"
    ]
  },
  {
    name: "VOLVO",
    popular: false,
    models: [
      "XC40", "XC60", "XC90", "S60", "S80", "S90", "V40", "V60", "V90", "C40"
    ]
  },
  {
    name: "PORSCHE",
    popular: false,
    models: [
      "Cayenne", "Macan", "Panamera", "911", "Boxster", "Cayman", "Taycan"
    ]
  },
  {
    name: "MAHINDRA",
    popular: true,
    models: [
      "KUV100", "XUV300", "XUV500", "XUV700", "Scorpio", "Thar", "Bolero", "Pik-Up"
    ]
  },
  {
    name: "DFSK / DONGFENG",
    popular: true,
    models: [
      "Glory 580", "Glory 560", "Glory 330", "K01", "K02", "Fengon 500", "iX5"
    ]
  },
  {
    name: "SSANGYONG",
    popular: false,
    models: [
      "Korando", "Rexton", "Tivoli", "Musso", "Actyon", "Kyron"
    ]
  },
  {
    name: "CUPRA",
    popular: false,
    models: [
      "Formentor", "Leon", "Ateca", "Born", "Tavascan"
    ]
  },
  {
    name: "MAZDA",
    popular: false,
    models: [
      "2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "CX-9", "BT-50", "MX-5"
    ]
  },
  {
    name: "MINI",
    popular: false,
    models: [
      "Cooper", "Countryman", "Clubman", "Paceman", "Cabrio", "One"
    ]
  },
  {
    name: "JAGUAR",
    popular: false,
    models: [
      "F-Pace", "E-Pace", "I-Pace", "XE", "XF", "XJ"
    ]
  },
  {
    name: "IVECO",
    popular: true,
    models: [
      "Daily", "Eurocargo"
    ]
  },
  {
    name: "SMART",
    popular: false,
    models: [
      "Fortwo", "Forfour"
    ]
  },
  {
    name: "TESLA",
    popular: false,
    models: [
      "Model 3", "Model Y", "Model S", "Model X"
    ]
  },
  {
    name: "LANCIA",
    popular: false,
    models: [
      "Ypsilon", "Delta", "Musa", "Phedra"
    ]
  },
  {
    name: "CHANGAN",
    popular: true,
    models: [
      "Alsvin", "CS35 Plus", "CS75 Plus", "CS85", "CS95", "Uni-K", "Uni-T", "Uni-V"
    ]
  },
  {
    name: "BAIC",
    popular: true,
    models: [
      "X3", "X55", "BJ40", "X35", "D20"
    ]
  },
  {
    name: "JAC",
    popular: true,
    models: [
      "J4", "JS2", "JS3", "JS4", "JS8", "T6", "T8", "Sunray"
    ]
  }
];

// Utility to normalize string for comparison (removes accents & converts to uppercase)
export function normalizeVehicleStr(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Filter brands based on user query.
 * If query is empty, returns all popular brands first.
 */
export function getBrandSuggestions(query: string): string[] {
  const normQuery = normalizeVehicleStr(query);
  if (!normQuery) {
    return VEHICLE_BRANDS_DATA.map(b => b.name);
  }

  // Exact starts-with matches first, then contains matches
  const startsWithMatches: string[] = [];
  const containsMatches: string[] = [];

  for (const item of VEHICLE_BRANDS_DATA) {
    const normName = normalizeVehicleStr(item.name);
    if (normName.startsWith(normQuery)) {
      startsWithMatches.push(item.name);
    } else if (normName.includes(normQuery)) {
      containsMatches.push(item.name);
    }
  }

  return [...startsWithMatches, ...containsMatches];
}

export interface ModelSuggestion {
  model: string;
  brand: string;
}

/**
 * Filter models based on selected brand and user query.
 */
export function getModelSuggestions(selectedBrand: string, query: string): ModelSuggestion[] {
  const normQuery = normalizeVehicleStr(query);
  const normBrand = normalizeVehicleStr(selectedBrand);

  let targetBrands = VEHICLE_BRANDS_DATA;

  // If a brand is selected and matches a known brand
  if (normBrand) {
    const matchedBrand = VEHICLE_BRANDS_DATA.find(b => normalizeVehicleStr(b.name) === normBrand);
    if (matchedBrand) {
      targetBrands = [matchedBrand];
    } else {
      // Fuzzy brand match if user typed partial brand name
      const fuzzyMatched = VEHICLE_BRANDS_DATA.filter(b => normalizeVehicleStr(b.name).includes(normBrand));
      if (fuzzyMatched.length > 0) {
        targetBrands = fuzzyMatched;
      }
    }
  }

  const results: ModelSuggestion[] = [];

  // If no query, return top models for the matched brand(s)
  if (!normQuery) {
    for (const b of targetBrands) {
      for (const m of b.models.slice(0, 15)) {
        results.push({ model: m, brand: b.name });
      }
    }
    return results.slice(0, 20);
  }

  // Search models matching query
  const startsWithMatches: ModelSuggestion[] = [];
  const containsMatches: ModelSuggestion[] = [];

  for (const b of targetBrands) {
    for (const m of b.models) {
      const normModel = normalizeVehicleStr(m);
      if (normModel.startsWith(normQuery)) {
        startsWithMatches.push({ model: m, brand: b.name });
      } else if (normModel.includes(normQuery)) {
        containsMatches.push({ model: m, brand: b.name });
      }
    }
  }

  return [...startsWithMatches, ...containsMatches].slice(0, 20);
}
