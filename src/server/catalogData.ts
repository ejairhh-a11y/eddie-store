import type { MotorcycleImage, SpecGroup, SpecRow } from "./schema";

// Catálogo inicial (PRD › Alcance, Supuestos: datos ficticios inspirados en la gama YZ 2025).
// Fuente única del seed local y de la migración de datos (ADR 0016 §cambio 2026-10-26).

export type CatalogSeed = {
  slug: string;
  name: string;
  modelYear: number;
  engineType: "4T" | "2T";
  category: "COMPETICION" | "YOUTH";
  displacementCc: number;
  priceCents: number;
  stockTotal: number;
  tagline: string;
  badge: string | null;
  cardSpecs: SpecRow[];
  specGroups: SpecGroup[];
  images: MotorcycleImage[];
  isFeatured: boolean;
  sortOrder: number;
};

const img = (src: string, alt: string, height = 279): MotorcycleImage => ({ src, alt, width: 512, height });

export const CATALOG: CatalogSeed[] = [
  {
    slug: "yz450f",
    name: "Yamaha YZ450F",
    modelYear: 2025,
    engineType: "4T",
    category: "COMPETICION",
    displacementCc: 450,
    priceCents: 1_049_900,
    stockTotal: 3,
    tagline:
      "Motor 450cc 4T invertido de máxima compresión con inyección DFI, App Power Tuner integrada y chasis de viga bilateral de aluminio rediseñado.",
    badge: "Best Seller MXGP",
    cardSpecs: [
      { label: "Cilindrada", value: "450 cc" },
      { label: "Peso en orden de marcha", value: "109 kg" },
      { label: "Horquilla", value: "KYB AOS" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor e inyección DOHC",
        rows: [
          { label: "Tipo de motor", value: "4T monocilíndrico DOHC invertido" },
          { label: "Válvulas", value: "4 válvulas de titanio" },
          { label: "Relación de compresión", value: "13,0 : 1" },
          { label: "Alimentación", value: "Inyección Mikuni Ø 44 mm" },
        ],
        note: "Culata invertida de alto flujo con admisión frontal directa y pistón forjado aligerado.",
      },
      {
        title: "02. Chasis de doble viga de aluminio y suspensión KYB",
        rows: [
          { label: "Bastidor", value: "Viga de aluminio hidroformado" },
          { label: "Horquilla delantera", value: "KYB SSS 48 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico Nissin 270 mm" },
        ],
      },
      {
        title: "03. Geometría, depósito y dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "6,2 L" },
          { label: "Altura del asiento", value: "965 mm" },
          { label: "Distancia entre ejes", value: "1.480 mm" },
          { label: "Distancia mínima al suelo", value: "350 mm" },
        ],
      },
    ],
    images: [
      img("/images/yz450f-lateral.jpg", "Yamaha YZ450F 2025, vista lateral"),
      img("/images/yz450f-perfil.jpg", "Yamaha YZ450F 2025, perfil", 512),
      img("/images/yz450f-motor.jpg", "Motor invertido de la Yamaha YZ450F"),
      img("/images/yz450f-escape.jpg", "Línea de escape de la Yamaha YZ450F"),
      img("/images/yz450f-cockpit.jpg", "Manillar y app Power Tuner de la Yamaha YZ450F"),
    ],
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "yz250f",
    name: "Yamaha YZ250F",
    modelYear: 2025,
    engineType: "4T",
    category: "COMPETICION",
    displacementCc: 250,
    priceCents: 939_900,
    stockTotal: 4,
    tagline:
      "Motor 250cc 4T invertido de altísimo régimen de giro, nuevo conducto de admisión y suspensión KYB SSS líder en su categoría.",
    badge: "Campeona MX2",
    cardSpecs: [
      { label: "Cilindrada", value: "250 cc" },
      { label: "Peso en orden de marcha", value: "105 kg" },
      { label: "Suspensión", value: "KYB SSS" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor",
        rows: [
          { label: "Tipo de motor", value: "4T monocilíndrico DOHC invertido" },
          { label: "Válvulas", value: "4 válvulas de titanio" },
          { label: "Relación de compresión", value: "13,8 : 1" },
          { label: "Alimentación", value: "Inyección Keihin Ø 44 mm" },
        ],
      },
      {
        title: "02. Chasis y suspensión",
        rows: [
          { label: "Bastidor", value: "Viga de aluminio bilateral" },
          { label: "Horquilla delantera", value: "KYB SSS 48 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico 270 mm" },
        ],
      },
      {
        title: "03. Dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "6,2 L" },
          { label: "Altura del asiento", value: "970 mm" },
          { label: "Distancia entre ejes", value: "1.475 mm" },
          { label: "Distancia mínima al suelo", value: "335 mm" },
        ],
      },
    ],
    images: [img("/images/yz250f.jpg", "Yamaha YZ250F 2025 trazando una curva en arena")],
    isFeatured: false,
    sortOrder: 2,
  },
  {
    slug: "yz250",
    name: "Yamaha YZ250 (2T)",
    modelYear: 2025,
    engineType: "2T",
    category: "COMPETICION",
    displacementCc: 249,
    priceCents: 889_900,
    stockTotal: 2,
    tagline:
      "Pura adrenalina de dos tiempos: válvula de escape Yamaha Power Valve (YPVS), chasis ágil y frenos sobredimensionados.",
    badge: "Pure 2-Stroke Power",
    cardSpecs: [
      { label: "Cilindrada", value: "249 cc (2T)" },
      { label: "Peso en orden de marcha", value: "103 kg" },
      { label: "Válvula", value: "YPVS" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor",
        rows: [
          { label: "Tipo de motor", value: "2T monocilíndrico refrigerado por líquido" },
          { label: "Válvula de escape", value: "YPVS" },
          { label: "Alimentación", value: "Carburador Keihin PWK38S" },
          { label: "Caja de cambios", value: "5 velocidades" },
        ],
      },
      {
        title: "02. Chasis y suspensión",
        rows: [
          { label: "Bastidor", value: "Semidoble cuna de aluminio" },
          { label: "Horquilla delantera", value: "KYB SSS 48 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico 270 mm" },
        ],
      },
      {
        title: "03. Dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "7,0 L" },
          { label: "Altura del asiento", value: "965 mm" },
          { label: "Distancia entre ejes", value: "1.445 mm" },
          { label: "Distancia mínima al suelo", value: "360 mm" },
        ],
      },
    ],
    images: [img("/images/yz250.jpg", "Yamaha YZ250 2025 de dos tiempos en el box")],
    isFeatured: false,
    sortOrder: 3,
  },
  {
    slug: "yz125",
    name: "Yamaha YZ125 (2T)",
    modelYear: 2025,
    engineType: "2T",
    category: "COMPETICION",
    displacementCc: 125,
    priceCents: 799_900,
    stockTotal: 5,
    tagline:
      "La referencia del octavo de litro: carburador Keihin PWK38S, admisión V-Force4 y solo 95 kg para pasar por curva como ninguna.",
    badge: "Escuela de Campeones",
    cardSpecs: [
      { label: "Cilindrada", value: "125 cc (2T)" },
      { label: "Peso en seco", value: "95 kg" },
      { label: "Admisión", value: "Keihin PWK" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor",
        rows: [
          { label: "Tipo de motor", value: "2T monocilíndrico refrigerado por líquido" },
          { label: "Admisión", value: "V-Force4" },
          { label: "Alimentación", value: "Carburador Keihin PWK38S" },
          { label: "Caja de cambios", value: "6 velocidades" },
        ],
      },
      {
        title: "02. Chasis y suspensión",
        rows: [
          { label: "Bastidor", value: "Semidoble cuna de aluminio" },
          { label: "Horquilla delantera", value: "KYB SSS 48 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico 270 mm" },
        ],
      },
      {
        title: "03. Dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "7,0 L" },
          { label: "Altura del asiento", value: "970 mm" },
          { label: "Distancia entre ejes", value: "1.445 mm" },
          { label: "Distancia mínima al suelo", value: "370 mm" },
        ],
      },
    ],
    images: [img("/images/yz125.jpg", "Yamaha YZ125 2025 de dos tiempos")],
    isFeatured: false,
    sortOrder: 4,
  },
  {
    slug: "yz85",
    name: "Yamaha YZ85",
    modelYear: 2025,
    engineType: "2T",
    category: "YOUTH",
    displacementCc: 85,
    priceCents: 529_900,
    stockTotal: 3,
    tagline:
      "Pensada para las jóvenes promesas: subchasis de aluminio desmontable, ergonomía ajustable y respuesta de motor progresiva.",
    badge: "Iniciación Competición",
    cardSpecs: [
      { label: "Cilindrada", value: "85 cc (2T)" },
      { label: "Peso en orden de marcha", value: "73 kg" },
      { label: "Manillar", value: "4 posiciones" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor",
        rows: [
          { label: "Tipo de motor", value: "2T monocilíndrico refrigerado por líquido" },
          { label: "Válvula de escape", value: "YPVS" },
          { label: "Alimentación", value: "Carburador Keihin PWK28" },
          { label: "Caja de cambios", value: "6 velocidades" },
        ],
      },
      {
        title: "02. Chasis y suspensión",
        rows: [
          { label: "Bastidor", value: "Semidoble cuna de acero" },
          { label: "Horquilla delantera", value: "KYB 36 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico 220 mm" },
        ],
      },
      {
        title: "03. Dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "5,0 L" },
          { label: "Altura del asiento", value: "875 mm" },
          { label: "Distancia entre ejes", value: "1.255 mm" },
          { label: "Distancia mínima al suelo", value: "350 mm" },
        ],
      },
    ],
    images: [img("/images/yz85-yz65.jpg", "Yamaha YZ85 y YZ65 2025 aparcadas en el paddock")],
    isFeatured: false,
    sortOrder: 5,
  },
  {
    slug: "yz65",
    name: "Yamaha YZ65",
    modelYear: 2025,
    engineType: "2T",
    category: "YOUTH",
    displacementCc: 65,
    priceCents: 489_900,
    stockTotal: 0,
    tagline:
      "La primera moto de competición: motor de 65cc progresivo, frenos de disco y suspensión ajustable para crecer con el piloto.",
    badge: "Iniciación Competición",
    cardSpecs: [
      { label: "Cilindrada", value: "65 cc (2T)" },
      { label: "Peso en orden de marcha", value: "61 kg" },
      { label: "Manillar", value: "4 posiciones" },
    ],
    specGroups: [
      {
        title: "01. Grupo propulsor",
        rows: [
          { label: "Tipo de motor", value: "2T monocilíndrico refrigerado por líquido" },
          { label: "Válvula de escape", value: "YPVS" },
          { label: "Alimentación", value: "Carburador Mikuni VM24" },
          { label: "Caja de cambios", value: "6 velocidades" },
        ],
      },
      {
        title: "02. Chasis y suspensión",
        rows: [
          { label: "Bastidor", value: "Semidoble cuna de acero" },
          { label: "Horquilla delantera", value: "KYB 36 mm" },
          { label: "Suspensión trasera", value: "Monoamortiguador KYB" },
          { label: "Freno delantero", value: "Disco hidráulico 198 mm" },
        ],
      },
      {
        title: "03. Dimensiones",
        rows: [
          { label: "Capacidad del depósito", value: "3,5 L" },
          { label: "Altura del asiento", value: "760 mm" },
          { label: "Distancia entre ejes", value: "1.140 mm" },
          { label: "Distancia mínima al suelo", value: "275 mm" },
        ],
      },
    ],
    images: [img("/images/yz85-yz65.jpg", "Yamaha YZ85 y YZ65 2025 aparcadas en el paddock")],
    isFeatured: false,
    sortOrder: 6,
  },
];
