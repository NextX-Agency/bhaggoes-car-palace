import { comboKey } from "./combo-options";
import vpicSnapshot from "./vehicle-models-vpic.json";

// Suggestions only: the editor accepts any model, so new, regional and rare vehicles remain listable.
// Focused on what is common on the Surinamese used-import market (Japanese imports especially).
const curatedVehicleModels: Record<string, readonly string[]> = {
  Toyota: [
    "4Runner", "86", "Allion", "Alphard", "Aqua", "Auris", "Avanza", "Axio", "Belta", "Blade", "bB", "Camry", "C-HR", "Corolla", "Corolla Cross",
    "Corolla Fielder", "Corolla Rumion", "Corona", "Coaster", "Crown", "Dyna", "Estima", "Fielder", "Fortuner", "FJ Cruiser", "Harrier", "Hiace",
    "Highlander", "Hilux", "Innova", "IST", "Kluger", "Land Cruiser", "Land Cruiser Prado", "Mark II", "Mark X", "Noah", "Passo", "Passo Moda",
    "Premio", "Prius", "Prius Alpha", "Probox", "Ractis", "Raize", "RAV4", "Rush", "Sequoia", "Sienta", "Spade", "Succeed", "Supra", "Tacoma",
    "Tundra", "ToyoAce", "Vellfire", "Vitz", "Voxy", "Wigo", "Wish", "Yaris", "Yaris Cross",
  ],
  Nissan: [
    "AD Van", "Almera", "Altima", "Armada", "Bluebird Sylphy", "Caravan", "Cube", "Dayz", "Elgrand", "Frontier", "Juke", "Kicks", "Latio", "Leaf",
    "March", "Murano", "Navara", "Note", "NP200", "NP300", "NV200", "NV350", "Pathfinder", "Patrol", "Primera", "Qashqai", "Rogue", "Sentra",
    "Serena", "Skyline", "Sunny", "Sylphy", "Teana", "Terrano", "Tiida", "Titan", "Urvan", "Versa", "Wingroad", "X-Trail", "Xterra",
  ],
  Mazda: [
    "2", "3", "5", "6", "Atenza", "Axela", "BT-50", "Bongo", "Carol", "CX-3", "CX-30", "CX-5", "CX-7", "CX-9", "Demio", "Familia", "MX-5",
    "Premacy", "Titan", "Tribute", "Verisa",
  ],
  Honda: [
    "Accord", "Airwave", "City", "Civic", "CR-V", "Edix", "Fit", "Fit Shuttle", "Freed", "HR-V", "Insight", "Jazz", "Mobilio", "N-Box", "N-One",
    "N-WGN", "Odyssey", "Pilot", "Ridgeline", "Shuttle", "Stepwgn", "Stream", "Vezel", "Zest",
  ],
  Isuzu: [
    "Bighorn", "D-Max", "Elf", "Forward", "Giga", "MU-X", "N-Series", "NKR", "NPR", "NQR", "Rodeo", "Trooper", "Wizard",
  ],
  Suzuki: [
    "Alto", "Baleno", "Celerio", "Ertiga", "Every", "Grand Vitara", "Hustler", "Ignis", "Jimny", "Kizashi", "Lapin", "MR Wagon", "Palette",
    "S-Presso", "Solio", "Spacia", "Splash", "Swift", "SX4", "Vitara", "Wagon R", "XL7",
  ],
  Mitsubishi: [
    "ASX", "Attrage", "Canter", "Colt", "Delica", "Eclipse Cross", "eK Wagon", "Fuso", "L200", "Lancer", "Mirage", "Montero", "Outlander",
    "Pajero", "Pajero Mini", "Pajero Sport", "RVR", "Triton", "Xpander",
  ],
  Hyundai: [
    "Accent", "Atos", "Creta", "Elantra", "Getz", "Grand i10", "H-1", "H100", "i10", "i20", "i30", "Ioniq", "Kona", "Palisade", "Santa Fe",
    "Sonata", "Starex", "Tucson", "Venue",
  ],
  Kia: [
    "Carens", "Carnival", "Ceed", "Cerato", "K5", "Niro", "Optima", "Picanto", "Rio", "Seltos", "Sorento", "Soul", "Sportage", "Stonic",
    "Telluride",
  ],
  Lexus: [
    "CT 200h", "ES", "GS", "GX", "IS", "LC", "LS", "LX", "NX", "RC", "RX", "UX",
  ],
  Subaru: [
    "BRZ", "Crosstrek", "Exiga", "Forester", "Impreza", "Justy", "Legacy", "Levorg", "Outback", "Sambar", "Stella", "Tribeca", "WRX", "XV",
  ],
  Daihatsu: [
    "Atrai", "Boon", "Cast", "Copen", "Hijet", "Mira", "Move", "Rocky", "Sirion", "Tanto", "Terios", "Thor", "Wake",
  ],
  Ford: [
    "Bronco", "EcoSport", "Edge", "Escape", "Everest", "Expedition", "Explorer", "F-150", "F-250", "F-350", "Fiesta", "Focus", "Fusion",
    "Mustang", "Ranger", "Territory", "Transit", "Transit Connect",
  ],
  Chevrolet: [
    "Aveo", "Blazer", "Camaro", "Captiva", "Colorado", "Corvette", "Cruze", "Equinox", "Malibu", "Silverado", "Spark", "Suburban", "Tahoe",
    "Trailblazer", "Traverse", "Trax",
  ],
  Volkswagen: [
    "Amarok", "Arteon", "Beetle", "Caddy", "Crafter", "Golf", "Jetta", "Passat", "Polo", "T-Cross", "T-Roc", "Tiguan", "Touareg", "Transporter",
    "Up",
  ],
  BMW: [
    "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "i3", "i4", "iX", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4",
  ],
  "Mercedes-Benz": [
    "A-Class", "B-Class", "C-Class", "CLA", "E-Class", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "ML", "S-Class", "Sprinter", "V-Class",
    "Vito",
  ],
  Audi: [
    "A1", "A3", "A4", "A5", "A6", "A7", "A8", "e-tron", "Q2", "Q3", "Q5", "Q7", "Q8", "TT",
  ],
  "Land Rover": [
    "Defender", "Discovery", "Discovery Sport", "Freelander", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar",
  ],
  Jeep: [
    "Cherokee", "Commander", "Compass", "Gladiator", "Grand Cherokee", "Liberty", "Patriot", "Renegade", "Wrangler",
  ],
  RAM: [
    "1500", "2500", "3500", "ProMaster", "Rebel", "TRX",
  ],
  Dodge: [
    "Caliber", "Challenger", "Charger", "Dakota", "Durango", "Grand Caravan", "Journey", "Nitro", "Ram",
  ],
  Mahindra: [
    "Bolero", "KUV100", "Pik-Up", "Scorpio", "Thar", "TUV300", "XUV300", "XUV500", "XUV700",
  ],
  Tata: [
    "Ace", "Harrier", "Indica", "Nexon", "Safari", "Sumo", "Tiago", "Xenon", "Yodha",
  ],
  Foton: [
    "Aumark", "Tunland", "View",
  ],
  JAC: [
    "J7", "JS4", "Refine", "T6", "T8", "X200",
  ],
  Chery: [
    "Arrizo", "QQ", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8",
  ],
  BYD: [
    "Atto 3", "Dolphin", "Han", "Qin", "Seagull", "Seal", "Song", "Tang", "Yuan",
  ],
  Geely: [
    "Coolray", "Emgrand", "Okavango", "Tugella",
  ],
  MG: [
    "3", "5", "6", "GS", "HS", "RX5", "RX8", "ZS", "ZS EV",
  ],
  "Great Wall": [
    "Poer", "Steed", "Wingle 5", "Wingle 7",
  ],
  Haval: [
    "H2", "H6", "H9", "Jolion",
  ],
  Tesla: [
    "Model 3", "Model S", "Model X", "Model Y", "Cybertruck",
  ],
  Volvo: [
    "S60", "S80", "S90", "V40", "V60", "XC40", "XC60", "XC70", "XC90",
  ],
  Peugeot: [
    "2008", "206", "207", "208", "3008", "301", "308", "407", "5008", "508", "Partner", "Boxer",
  ],
  Renault: [
    "Captur", "Clio", "Duster", "Kangoo", "Kwid", "Logan", "Megane", "Sandero", "Trafic",
  ],
  Fiat: [
    "500", "Doblo", "Ducato", "Panda", "Punto", "Strada", "Uno",
  ],
  Opel: [
    "Astra", "Combo", "Corsa", "Insignia", "Meriva", "Mokka", "Vectra", "Zafira",
  ],
  Citroën: [
    "Berlingo", "C-Elysée", "C3", "C4", "C5", "Jumpy",
  ],
  Porsche: [
    "718", "911", "Cayenne", "Macan", "Panamera", "Taycan",
  ],
  Jaguar: [
    "E-Pace", "F-Pace", "F-Type", "XE", "XF", "XJ",
  ],
  MINI: [
    "Clubman", "Cooper", "Countryman", "Paceman",
  ],
  Infiniti: [
    "FX35", "Q50", "Q60", "QX50", "QX56", "QX60", "QX80",
  ],
  Acura: [
    "ILX", "MDX", "RDX", "TLX", "TSX",
  ],
  GMC: [
    "Acadia", "Canyon", "Sierra", "Terrain", "Yukon",
  ],
  Cadillac: [
    "ATS", "CTS", "Escalade", "SRX", "XT5",
  ],
  Chrysler: [
    "300", "Pacifica", "PT Cruiser", "Town & Country", "Voyager",
  ],
  Lincoln: [
    "Aviator", "MKZ", "Navigator",
  ],
  SsangYong: [
    "Korando", "Musso", "Rexton", "Tivoli",
  ],
  Škoda: [
    "Fabia", "Kodiaq", "Octavia", "Rapid", "Superb", "Yeti",
  ],
  SEAT: [
    "Ibiza", "Leon", "Ateca", "Arona",
  ],
  Proton: [
    "Persona", "Saga", "Wira", "X50", "X70",
  ],
  Hino: [
    "300", "500", "Dutro", "Ranger",
  ],
  Dacia: [
    "Duster", "Logan", "Sandero",
  ],
  Wuling: [
    "Almaz", "Confero", "Hongguang Mini EV",
  ],
};

// Regional and newer brands are often absent from the US focused vPIC endpoint.
// These are editorial suggestions; unfamiliar models can always be typed in.
const additionalModels: Record<string, readonly string[]> = {
  Abarth: ["500", "595", "695", "124 Spider", "Punto", "Pulse"],
  Aion: ["Aion S", "Aion V", "Aion Y", "Hyper GT", "Hyper HT", "Hyper SSR"],
  "Ashok Leyland": ["Dost", "Partner", "Bada Dost", "Boss", "Ecomet", "Viking"],
  BAIC: ["BJ20", "BJ30", "BJ40", "BJ60", "EU5", "X35", "X55", "X7"],
  Bestune: ["B70", "B90", "T55", "T77", "T90"],
  Changan: ["Alsvin", "CS15", "CS35", "CS55", "CS75", "CS95", "Hunter", "Uni-K", "Uni-T", "Uni-V"],
  Chery: ["Arrizo 5", "Arrizo 8", "Tiggo 3", "Tiggo 5", "Tiggo 9"],
  "Citroën": ["Ami", "C1", "C2", "C3 Aircross", "C4 Cactus", "C4 Picasso", "C5 Aircross", "C6", "Jumper", "SpaceTourer"],
  Cupra: ["Ateca", "Born", "Formentor", "Leon", "Tavascan", "Terramar"],
  DAF: ["CF", "LF", "XB", "XD", "XF", "XG", "XG+"],
  Dacia: ["Bigster", "Dokker", "Jogger", "Lodgy", "Spring"],
  Deepal: ["G318", "S05", "S07", "SL03"],
  Denza: ["D9", "N7", "N8", "Z9"],
  "DS Automobiles": ["DS 3", "DS 4", "DS 5", "DS 7", "DS 9"],
  Exeed: ["LX", "RX", "TX", "TXL", "VX"],
  FAW: ["Besturn B50", "J6", "J7", "Oley", "V2", "Xiali"],
  Fuso: ["Canter", "eCanter", "Fighter", "Rosa", "Super Great"],
  GAC: ["Aion Y", "Emkoo", "Empow", "GS3", "GS4", "GS8", "M8"],
  "Great Wall": ["Cannon", "Haval H5", "M4", "Safe", "Tank 300", "Tank 500"],
  Haval: ["Dargo", "H1", "H5", "H8", "M6"],
  Honda: ["BR-V", "Crosstour", "CR-Z", "Element", "Elysion", "Integra", "Legend", "N-Van", "Prelude", "S2000", "WR-V"],
  Hongqi: ["E-HS9", "H5", "H9", "HS3", "HS5", "HS7"],
  Jetour: ["Dashing", "T1", "T2", "X70", "X90"],
  Lada: ["Granta", "Kalina", "Largus", "Niva", "Vesta", "XRAY"],
  Leapmotor: ["B10", "C01", "C10", "C11", "C16", "T03"],
  "Li Auto": ["L6", "L7", "L8", "L9", "MEGA"],
  "Lynk & Co": ["01", "02", "03", "05", "06", "08", "09", "Z10"],
  MAN: ["TGE", "TGL", "TGM", "TGS", "TGX"],
  NIO: ["EC6", "EC7", "EL6", "ES6", "ES8", "ET5", "ET7", "ET9"],
  Omoda: ["C5", "C7", "E5", "Omoda 5", "Omoda 7", "Omoda 9"],
  Ora: ["03", "07", "Black Cat", "Funky Cat", "Good Cat", "Lightning Cat"],
  Perodua: ["Alza", "Aruz", "Ativa", "Axia", "Bezza", "Kancil", "Kelisa", "Myvi", "Viva"],
  Proton: ["Exora", "Iriz", "S70", "X90"],
  "Renault Trucks": ["C", "D", "K", "T", "T High"],
  Scion: ["FR-S", "iA", "iM", "iQ", "tC", "xA", "xB", "xD"],
  Seres: ["3", "5", "7", "SF5"],
  Škoda: ["Citigo", "Enyaq", "Kamiq", "Karoq", "Scala"],
  SsangYong: ["Actyon", "Chairman", "Kyron", "Stavic", "Torres"],
  Tank: ["300", "400", "500", "700"],
  Tata: ["Altroz", "Curvv", "Nexon EV", "Punch", "Sierra", "Tigor"],
  "UD Trucks": ["Condor", "Croner", "Kazet", "Quester", "Quon"],
  Vauxhall: ["Adam", "Astra", "Corsa", "Crossland", "Grandland", "Insignia", "Mokka", "Vivaro", "Zafira"],
  Xpeng: ["G3", "G6", "G9", "Mona M03", "P5", "P7", "P7+", "X9"],
};

// The dated vPIC snapshot broadens suggestions for every catalog make. The local list
// comes first because it includes regional/Japanese import names absent from vPIC.
// Both the admin editor and public filters still accept custom model text.
const vpicModels: Record<string, string[]> = vpicSnapshot.models;
export const vehicleModels: Record<string, readonly string[]> = Object.fromEntries(
  Object.keys(vpicModels).map((make) => {
    const seen = new Set<string>();
    const merged = [...(curatedVehicleModels[make] ?? []), ...(additionalModels[make] ?? []), ...vpicModels[make]]
      .filter((model) => !(make === "Toyota" && /^Scion\b/i.test(model)))
      .filter((model) => {
        const key = comboKey(model);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return [make, merged];
  }),
);

// Typed shorthand -> catalog name, so "Benz", "VW" or "Chevy" still offers the right models.
const makeAliases: Record<string, string> = {
  benz: "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  merc: "Mercedes-Benz",
  vw: "Volkswagen",
  chevy: "Chevrolet",
  landrover: "Land Rover",
  rangerover: "Land Rover",
  gwm: "Great Wall",
  mini: "MINI",
  citroen: "Citroën",
  skoda: "Škoda",
  ssangyong: "SsangYong",
  ram: "RAM",
};

const modelsByKey = new Map<string, readonly string[]>(
  Object.entries(vehicleModels).map(([make, models]) => [comboKey(make), models]),
);

/** Common models for a make; matching ignores case, accents and punctuation. Unknown makes return an empty list (any model can still be typed). */
export function modelsForMake(make: string): readonly string[] {
  const key = comboKey(make);
  if (!key) return [];
  const alias = makeAliases[key];
  return modelsByKey.get(alias ? comboKey(alias) : key) ?? [];
}
