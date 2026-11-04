import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireStaffUserId, StaffAuthError, type StaffIdentity } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { getCalendarClient, getCalendarIdForBarber, isBarberId, TIMEZONE } from "../_lib/googleCalendar.js";
import { buildSlotRange, fitsWithinHours, InvalidScheduleInputError } from "../_lib/schedule.js";
import { getEffectiveHours } from "../_lib/scheduleRepo.js";
import { getActiveBarbers, getActiveServicesCatalog } from "../_lib/catalogRepo.js";
import { listBusyIntervals, isRangeFree } from "../_lib/availability.js";
import { createBookingRecord, attachGoogleEvent, discardBooking } from "../_lib/bookingsRepo.js";
import { sendApiError } from "../_lib/http.js";
import { applyCors } from "../_lib/cors.js";
import { sumServiceTotals, formatPriceNumber } from "../../src/data/services.js";

/**
 * Reservas hechas por el staff a nombre de un cliente presencial que
 * no quiere (o no puede) registrarse solo — ej. alguien mayor que se
 * le acerca a Camilo en el local. A diferencia de
 * api/staff/block-slot.ts (que solo bloquea el horario, sin cliente
 * real detrás), esto crea una reserva de verdad con servicios y un
 * `user_id` real, para que la visita cuente puntos y nivel igual que
 * si hubiera reservado desde la página.
 *
 * Dos acciones en un solo endpoint — igual que redeem-points.ts o
 * product-redemption.ts — por el tope de 12 funciones serverless del
 * plan Hobby de Vercel (con esta, quedan 12/12: cualquier endpoint
 * nuevo de aquí en adelante debe sumarse a uno existente).
 *
 * - "find-or-create-client": busca un perfil por teléfono; si no
 *   existe y se manda un nombre, lo crea.
 * - "book": crea la reserva real para el `clientUserId` ya resuelto.
 *
 * Cliente sin cuenta propia (decisión explícita, ver README →
 * "Clientes presenciales sin cuenta"): nunca necesita iniciar sesión.
 * El staff lo busca por teléfono la próxima vez y le informa su saldo
 * de puntos / le canjea el premio en persona (ya existe ese flujo en
 * api/staff/redeem-points.ts). Por eso el perfil se crea con un correo
 * inventado en el dominio reservado .invalid (RFC 2606 — nunca es un
 * dominio real): Supabase exige correo o teléfono para crear la cuenta,
 * pero nadie va a usar ese correo para nada.
 */

interface FindOrCreateClientBody {
  action: "find-or-create-client";
  phone?: string;
  fullName?: string;
}

interface BookBody {
  action: "book";
  clientUserId?: string;
  barberId?: string;
  date?: string;
  time?: string;
  services?: string[];
  notes?: string;
}

type RequestBody = FindOrCreateClientBody | BookBody;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);
    const body = (req.body ?? {}) as RequestBody;

    if (body.action === "find-or-create-client") {
      await handleFindOrCreateClient(body, res);
      return;
    }
    if (body.action === "book") {
      await handleBook(identity, body, res);
      return;
    }
    throw new InvalidScheduleInputError(
      "El campo 'action' debe ser 'find-or-create-client' o 'book'."
    );
  } catch (error) {
    sendApiError(res, error);
  }
}

async function handleFindOrCreateClient(body: FindOrCreateClientBody, res: VercelResponse) {
  const phone = body.phone?.trim();
  if (!phone) {
    throw new InvalidScheduleInputError("El campo 'phone' es requerido.");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "Supabase no está configurado." });
    return;
  }

  const { data: existing, error: findError } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("phone", phone)
    .maybeSingle();

  if (findError) {
    res.status(500).json({ error: findError.message });
    return;
  }

  if (existing) {
    res.status(200).json({ client: existing, created: false });
    return;
  }

  const fullName = body.fullName?.trim();
  if (!fullName) {
    res.status(404).json({
      error: "No hay ningún cliente con ese teléfono todavía.",
      needsName: true,
    });
    return;
  }

  const placeholderEmail = `walkin.${randomUUID()}@redchairsbarber.invalid`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: placeholderEmail,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createError || !created.user) {
    res.status(500).json({ error: createError?.message ?? "No se pudo crear el cliente." });
    return;
  }

  // El trigger handle_new_user (0002/0005) ya creó la fila en profiles
  // al crear el usuario — se vuelve a leer para devolver exactamente lo
  // que quedó guardado (por si el trigger ajustó algo).
  const { data: newProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", created.user.id)
    .maybeSingle();

  if (profileError || !newProfile) {
    res.status(500).json({
      error: "El cliente se creó pero no se pudo leer su perfil. Búscalo de nuevo por su teléfono.",
    });
    return;
  }

  res.status(201).json({ client: newProfile, created: true });
}

async function handleBook(identity: StaffIdentity, body: BookBody, res: VercelResponse) {
  const { clientUserId, barberId, date, time, services, notes } = body;

  if (!clientUserId || typeof clientUserId !== "string") {
    throw new InvalidScheduleInputError("Selecciona un cliente.");
  }
  if (!barberId || !isBarberId(barberId)) {
    throw new InvalidScheduleInputError("Selecciona un barbero válido.");
  }
  if (!date || typeof date !== "string") {
    throw new InvalidScheduleInputError("El campo 'date' es requerido (YYYY-MM-DD).");
  }
  if (!time || typeof time !== "string") {
    throw new InvalidScheduleInputError("El campo 'time' es requerido.");
  }
  if (!Array.isArray(services) || services.length === 0) {
    throw new InvalidScheduleInputError("Selecciona al menos un servicio.");
  }

  if (identity.role === "barber") {
    if (!identity.barberId) {
      throw new StaffAuthError(
        "Tu cuenta todavía no está vinculada a ningún barbero. Pide que un administrador te vincule.",
        403
      );
    }
    if (identity.barberId !== barberId) {
      throw new StaffAuthError("No puedes reservar para otro barbero.", 403);
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "Supabase no está configurado." });
    return;
  }

  const { data: clientProfile, error: clientError } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", clientUserId)
    .maybeSingle();

  if (clientError || !clientProfile) {
    res.status(404).json({ error: "No se encontró el cliente seleccionado." });
    return;
  }

  const servicesCatalog = await getActiveServicesCatalog();
  const { totalMinutes, totalPrice, services: resolvedServices } = sumServiceTotals(
    services,
    servicesCatalog
  );
  if (totalMinutes <= 0) {
    throw new InvalidScheduleInputError("No se reconoció ningún servicio válido.");
  }

  const { startISO, endISO } = buildSlotRange(date, time, totalMinutes);

  const hours = await getEffectiveHours(barberId, date);
  if (!hours || !fitsWithinHours(time, totalMinutes, hours)) {
    res.status(409).json({ error: "Ese horario está fuera del horario de atención de ese día." });
    return;
  }

  const calendar = getCalendarClient();
  const calendarId = getCalendarIdForBarber(barberId);
  const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
  if (!isRangeFree(busyIntervals, startISO, endISO)) {
    res.status(409).json({ error: "Ese horario ya no está disponible. Elige otro." });
    return;
  }

  const activeBarbers = await getActiveBarbers();
  const barberName = activeBarbers.find((b) => b.id === barberId)?.name ?? barberId;
  const trimmedNotes = notes?.trim() || "";
  const customerName = clientProfile.full_name || "Cliente presencial";
  const customerPhone = clientProfile.phone || "-";

  const { bookingId, error: dbError } = await createBookingRecord({
    userId: clientUserId,
    barberId,
    startISO,
    endISO,
    totalPriceCop: totalPrice,
    totalDurationMinutes: totalMinutes,
    customerName,
    customerPhone,
    notes: trimmedNotes || undefined,
    services: resolvedServices,
    source: "walkin",
  });

  if (dbError) {
    res.status(500).json({ error: "No fue posible registrar la reserva.", detail: dbError });
    return;
  }

  const servicesList = resolvedServices.map((s) => `- ${s.name} (${s.price})`).join("\n");
  let event;
  try {
    event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${resolvedServices.map((s) => s.name).join(" + ")} — ${customerName}`,
        description: [
          `Cliente: ${customerName}`,
          `Teléfono: ${customerPhone}`,
          `Barbero: ${barberName}`,
          "Servicios:",
          servicesList,
          `Valor total: ${formatPriceNumber(totalPrice)}`,
          "Agendado en el local por el staff.",
          trimmedNotes ? `Observaciones: ${trimmedNotes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startISO, timeZone: TIMEZONE },
        end: { dateTime: endISO, timeZone: TIMEZONE },
        extendedProperties: {
          private: { source: "redchairs-walkin", barberId },
        },
      },
    });
  } catch (calendarError) {
    if (bookingId) await discardBooking(bookingId);
    throw calendarError;
  }

  if (bookingId && event.data.id) {
    await attachGoogleEvent(bookingId, event.data.id);
  }

  res.status(201).json({
    bookingId,
    googleEventId: event.data.id,
    barberId,
    barberName,
    start: startISO,
    end: endISO,
    totalMinutes,
    totalPrice,
  });
}
