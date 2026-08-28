import { useCallback, useEffect, useRef, useState } from "react";
import { FaCamera, FaCheck, FaExclamationTriangle, FaPlus, FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatCop } from "../../lib/format";
import { calculateRedemptionCost } from "../../data/services";

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  price_cop: number;
  active: boolean;
  sort_order: number;
  image_url: string | null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Sube una foto al bucket público "products" (ver 0023_products_images.sql)
 * y devuelve su URL pública. Un nombre de archivo aleatorio evita
 * choques entre productos distintos; no se intenta borrar la foto
 * anterior al reemplazarla — para un catálogo de este tamaño no vale
 * la pena la complejidad extra de rastrear archivos huérfanos. */
async function uploadProductImage(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: "Supabase no está configurado." };
  if (!file.type.startsWith("image/")) return { url: null, error: "El archivo debe ser una imagen." };
  if (file.size > MAX_IMAGE_BYTES) return { url: null, error: "La imagen no debe pesar más de 5 MB." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

function ProductImagePicker({
  imageUrl,
  onUploaded,
}: {
  imageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadProductImage(file);
    setUploading(false);
    if (result.error || !result.url) {
      setError(result.error ?? "No se pudo subir la imagen.");
      return;
    }
    onUploaded(result.url);
  };

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-gold/30 text-bone/30">
          <FaCamera size={18} />
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-outline !py-2 !px-4 text-xs disabled:opacity-50"
        >
          {uploading ? <FaSpinner className="animate-spin" /> : <FaCamera size={11} />}
          <span className="ml-2">{imageUrl ? "Cambiar foto" : "Subir foto"}</span>
        </button>
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

function ProductRowItem({
  product,
  onSaved,
}: {
  product: ProductRow;
  onSaved: (updated: ProductRow) => void;
}) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category ?? "");
  const [price, setPrice] = useState(String(product.price_cop));
  const [active, setActive] = useState(product.active);
  const [imageUrl, setImageUrl] = useState(product.image_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        category: category.trim() || null,
        price_cop: Math.max(0, Math.round(Number(price) || 0)),
        active,
        image_url: imageUrl,
      })
      .eq("id", product.id)
      .select("id, name, category, price_cop, active, sort_order, image_url")
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "No se pudo guardar.");
      return;
    }
    onSaved(data as ProductRow);
    setDirty(false);
  };

  const priceCop = Math.max(0, Math.round(Number(price) || 0));

  return (
    <div className={`card-lux ${!active ? "opacity-60" : ""}`}>
      <div className="mb-4">
        <ProductImagePicker
          imageUrl={imageUrl}
          onUploaded={(url) => {
            setImageUrl(url);
            setDirty(true);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <div>
          <label className={labelClass}>Nombre</label>
          <input value={name} onChange={(e) => markDirty(setName)(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <input
            value={category}
            onChange={(e) => markDirty(setCategory)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Precio (COP)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => markDirty(setPrice)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => markDirty(setActive)(e.target.checked)}
              className="accent-gold"
            />
            Activo
          </label>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
            className="btn-gold !py-2 !px-4 text-xs disabled:opacity-40"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          </button>
        </div>
      </div>
      {!dirty && (
        <p className="mt-3 text-xs text-bone/40">
          {formatCop(product.price_cop)} · ≈ {calculateRedemptionCost(product.price_cop)} puntos si se
          canjeara
        </p>
      )}
      {dirty && priceCop > 0 && (
        <p className="mt-3 text-xs text-bone/40">≈ {calculateRedemptionCost(priceCop)} puntos si se canjeara</p>
      )}
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function NewProductForm({ onCreated }: { onCreated: (created: ProductRow) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!supabase) return;
    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        category: category.trim() || null,
        price_cop: Math.max(0, Math.round(Number(price) || 0)),
        active: true,
        image_url: imageUrl,
      })
      .select("id, name, category, price_cop, active, sort_order, image_url")
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "No se pudo crear el producto.");
      return;
    }
    onCreated(data as ProductRow);
    setName("");
    setCategory("");
    setPrice("");
    setImageUrl(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        <FaPlus size={11} className="mr-2 inline" /> Nuevo producto
      </button>
    );
  }

  return (
    <div className="card-lux border-gold/30">
      <div className="mb-4">
        <ProductImagePicker imageUrl={imageUrl} onUploaded={setImageUrl} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej. Cuidado de barba"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Precio (COP)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
        </div>
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleCreate()}
          className="btn-gold !py-2 !px-5 text-xs disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : "Crear"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline !py-2 !px-5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Catálogo de productos — primera etapa: solo administrarlo desde
 * aquí (nombre, categoría, precio, activo/inactivo). Todavía NO
 * aparece en /reservar ni se puede canjear con puntos de verdad; el
 * "≈ N puntos" que se muestra es solo informativo, calculado con la
 * misma tasa que un servicio (piso(precio / 300)), para tener el
 * número listo cuando se decida activar el canje. Ver
 * 0022_products.sql. */
export default function AdminProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, name, category, price_cop, active, sort_order, image_url")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts((data as ProductRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: ProductRow) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };
  const handleCreated = (created: ProductRow) => {
    setProducts((prev) => [...prev, created]);
  };

  return (
    <div>
      <p className="text-sm text-bone/60">
        Catálogo de productos de la barbería (pomadas, aceites, etc.). Por ahora es solo
        administrativo: todavía no aparecen en /reservar ni se pueden canjear con puntos de
        verdad — el "≈ N puntos" es informativo, a la misma tasa que un servicio.
      </p>

      <div className="mt-6">
        <NewProductForm onCreated={handleCreated} />
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando productos...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los productos: {error}</p>
        ) : products.length === 0 ? (
          <div className="card-lux">
            <p className="text-sm text-bone/70">Todavía no hay productos. Agrega el primero arriba.</p>
          </div>
        ) : (
          products.map((product) => (
            <ProductRowItem key={product.id} product={product} onSaved={handleSaved} />
          ))
        )}
      </div>
    </div>
  );
}
