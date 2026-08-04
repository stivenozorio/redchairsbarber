export const BARBERS = [
  { id: "any", name: "Sin preferencia" },
  { id: "camilo", name: "Camilo Torres" },
  { id: "alejandro", name: "Alejandro Reyes" },
];

// "7:00 am" / "12:30 pm" — mismo formato que espera parseTimeLabel en
// api/_lib/schedule.ts.
function formatSlotLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function generateTimeSlots(startHour: number, endHour: number, stepMinutes: number): string[] {
  const slots: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
    slots.push(formatSlotLabel(m));
  }
  return slots;
}

// Universo de horas candidatas que ofrece el selector. El horario real
// (por ahora fijo 10am–9pm; desde el panel administrativo, dinámico por
// barbero y día) lo decide el servidor — /api/availability marca como no
// disponibles las horas fuera de turno. Se deja un rango amplio (7am–10pm)
// para que el panel pueda mover la apertura/cierre sin tener que tocar
// este archivo cada vez.
//
// Cada 30 minutos, no cada hora: varios servicios duran menos de una
// hora (p. ej. un corte de barba de 20-30 min), así que si solo se
// ofrecieran horas en punto, el cupo que deja libre esa cita nunca se
// podría volver a reservar — se perdería media hora de agenda por cada
// cita corta.
export const TIME_SLOTS = generateTimeSlots(7, 22, 30);
