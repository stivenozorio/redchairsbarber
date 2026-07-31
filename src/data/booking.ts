export const BARBERS = [
  { id: "any", name: "Sin preferencia" },
  { id: "camilo", name: "Camilo Torres" },
  { id: "alejandro", name: "Alejandro Reyes" },
];

// Universo de horas candidatas que ofrece el selector. El horario real
// (por ahora fijo 10am–8pm; desde el panel administrativo, dinámico por
// barbero y día) lo decide el servidor — /api/availability marca como no
// disponibles las horas fuera de turno. Se deja un rango amplio (7am–10pm)
// para que el panel pueda mover la apertura/cierre sin tener que tocar
// este archivo cada vez.
export const TIME_SLOTS = [
  "7:00 am",
  "8:00 am",
  "9:00 am",
  "10:00 am",
  "11:00 am",
  "12:00 pm",
  "1:00 pm",
  "2:00 pm",
  "3:00 pm",
  "4:00 pm",
  "5:00 pm",
  "6:00 pm",
  "7:00 pm",
  "8:00 pm",
  "9:00 pm",
  "10:00 pm",
];
