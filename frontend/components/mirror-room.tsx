"use client";


import { useText } from "@/components/marketing-language";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
  type WheelEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import useSWR from "swr";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useMarketingLanguage } from "./marketing-language";
import { MirrorLiveFitting } from "./mirror-live-fitting";
import {
  mirrorColorTranslations,
  mirrorInterfaceCopy,
  mirrorLanguageCodes,
  mirrorLanguageLocale,
  mirrorLanguageNames,
  mirrorLanguages,
  type MirrorCategory,
  type MirrorLanguage,
} from "@/lib/mirror-locale";

import { mirrorCopy as copy } from "@/lib/translations/mirror";
import { localizedProductName } from "@/lib/catalog-locale";
import { apiFetch, apiURL } from "@/lib/api";

type Category = MirrorCategory;
type Language = MirrorLanguage;

type ProductVariant = {
  id: string;
  size: string;
  color: string;
  inStock: boolean;
};

type Product = {
  id: string;
  name: string;
  nameTranslations?: Partial<Record<Language, string>>;
  price: number;
  originalPrice?: number;
  image: string;
  variants: ProductVariant[];
  demo?: boolean;
};

type CartItem = Product & {
  variantId: string;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
};

const categories: Category[] = ["Full Body", "Top Body", "Head", "Pants", "Footwear"];
const languages = mirrorLanguages;


type MirrorCopyKey = keyof typeof copy.UZ;

const getProductName = localizedProductName;

const getColorName = (color: string, language: Language) =>
  mirrorColorTranslations[language][color] ?? color;

const fetchProducts = async (url: string): Promise<Product[]> => {
  const response = await apiFetch(url);
  if (response.status === 401 && typeof window !== "undefined") {
    // The catalog is tenant-scoped and needs a session: send kiosks to sign-in and back.
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("The catalog response is not a product list.");
  }

  return data as Product[];
};

const money = (amount: number, language: Language) =>
  new Intl.NumberFormat(mirrorLanguageLocale[language], { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

function GarmentImage({ src, name, className }: { src: string; name: string; className?: string }) {
  const t = useText();

  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className="mirror-image-unavailable" role="status">{t("Garment image unavailable")}</span>;
  return <img src={src} alt={name} className={className} onError={() => setFailed(true)} />;
}

function ProductPreview({
  product,
  side,
  onSelect,
  onNavigate,
  disabled,
  language,
  labels,
}: {
  product?: Product;
  side: "left" | "right";
  onSelect: () => void;
  onNavigate: () => void;
  disabled: boolean;
  language: Language;
  labels: (typeof mirrorInterfaceCopy)[Language];
}) {
  const t = useText();

  const Arrow = side === "left" ? ArrowLeft : ArrowRight;

  return (
    <div className={`mirror-product-preview mirror-product-preview-${side}`}>
      <button
        type="button"
        className="mirror-product-arrow"
        onClick={onNavigate}
        disabled={disabled}
        aria-label={side === "left" ? labels.previousProduct : labels.nextProduct}
      >
        <Arrow aria-hidden="true" />
      </button>
      {product && (
        <button
          type="button"
          className="mirror-side-product"
          onClick={onSelect}
          aria-label={`${labels.selectProduct}: ${getProductName(product, language)}, ${money(product.price, language)}`}
        >
          <GarmentImage src={product.image} name={getProductName(product, language)} />
          <span className="mirror-side-product-name">{getProductName(product, language)}</span>
          <span className="mirror-side-product-price">{money(product.price, language)}</span>
        </button>
      )}
    </div>
  );
}

function CartPanel({
  items,
  total,
  count,
  strings,
  labels,
  language,
  busy,
  error,
  onClose,
  onQuantity,
  onRemove,
  onCheckout,
}: {
  items: CartItem[];
  total: number;
  count: number;
  strings: Record<MirrorCopyKey, string>;
  labels: (typeof mirrorInterfaceCopy)[Language];
  language: Language;
  busy: boolean;
  error: string;
  onClose: () => void;
  onQuantity: (variantId: string, amount: number) => void;
  onRemove: (variantId: string) => void;
  onCheckout: () => void;
}) {
  const t = useText();

  return (
    <>
      <motion.button
        className="mirror-cart-backdrop"
        aria-label={labels.closeShoppingCart}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.aside
        className="mirror-cart-panel"
        aria-label={strings.cart}
        initial={{ opacity: 0, x: language === "AR" ? -28 : 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: language === "AR" ? -28 : 28 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <header className="mirror-cart-header">
          <div>
            <span className="mirror-eyebrow">{strings.tryOn.toLocaleUpperCase(mirrorLanguageLocale[language])}</span>
            <h2>{strings.cart}</h2>
            <p>{count} {strings.cartCount}</p>
          </div>
          <button className="mirror-icon-button" type="button" onClick={onClose} aria-label={labels.closeCart}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="mirror-cart-list">
          {items.length === 0 ? (
            <div className="mirror-empty-cart">
              <ShoppingBag aria-hidden="true" />
              <p>{strings.emptyCart}</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.article
                className="mirror-cart-item"
                key={item.variantId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <img src={item.image} alt={getProductName(item, language)} />
                <div className="mirror-cart-item-details">
                  <h3>{getProductName(item, language)}</h3>
                  <p>{strings.size} {item.selectedSize} <span>·</span> {getColorName(item.selectedColor, language)}</p>
                  <strong>{money(item.price, language)} <small>/ {labels.each}</small></strong>
                  <div className="mirror-quantity-control" aria-label={`${labels.quantity}: ${item.quantity}`}>
                    <button type="button" onClick={() => onQuantity(item.variantId, -1)} aria-label={labels.decreaseQuantity}>
                      <Minus aria-hidden="true" />
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onQuantity(item.variantId, 1)} aria-label={labels.increaseQuantity}>
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <button
                  className="mirror-remove-button"
                  type="button"
                  onClick={() => onRemove(item.variantId)}
                  aria-label={`${labels.removeItem}: ${getProductName(item, language)}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </motion.article>
            ))
          )}
        </div>
        <footer className="mirror-cart-footer">
          {error && <p className="mirror-inline-error" role="alert">{t(error)}</p>}
          <div className="mirror-cart-total"><span>{labels.total}</span><strong>{money(total, language)}</strong></div>
          <button
            type="button"
            className="mirror-primary-button mirror-checkout-button"
            onClick={onCheckout}
            disabled={items.length === 0 || busy}
          >
            {busy ? <LoaderCircle className="mirror-spin" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
            {busy ? labels.sending : strings.checkout}
          </button>
        </footer>
      </motion.aside>
    </>
  );
}

export default function MirrorRoom() {
  const t = useText();

  const [activeCategory, setActiveCategory] = useState<Category>("Top Body");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  // Keep the in-progress shopping basket when visiting the dedicated fitting page.
  const [cartRestored, setCartRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("mirror-shopping-cart") || "[]");
      if (Array.isArray(saved)) setCart(saved.filter(item => item && typeof item.variantId === "string" && typeof item.quantity === "number"));
    } catch { /* Storage may be disabled by the browser. */ }
    setCartRestored(true);
  }, []);
  useEffect(() => {
    if (cartRestored) {
      try { sessionStorage.setItem("mirror-shopping-cart", JSON.stringify(cart)); } catch { /* The server cart remains available. */ }
    }
  }, [cart, cartRestored]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const {language,setLanguage} = useMarketingLanguage();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<MirrorCopyKey | "">("");
  const [cartSyncError, setCartSyncError] = useState<MirrorCopyKey | "">("");
  const [cartNotice, setCartNotice] = useState<MirrorCopyKey | "">("");
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastWheelChangeAt = useRef(0);
  const strings = copy[language] as Record<MirrorCopyKey, string>;
  const labels = mirrorInterfaceCopy[language];

  const productKey = apiURL(`/products?category=${encodeURIComponent(activeCategory)}`);
  const { data, error: productError, isLoading } = useSWR<Product[]>(productKey, fetchProducts, {
    keepPreviousData: false,
    revalidateOnFocus: false,
  });
  const products = data ?? [];
  const currentProduct = products[currentIndex];
  const selectedVariant = useMemo(() => {
    if (!currentProduct) return null;
    return currentProduct.variants?.find((variant) => variant.id === selectedVariantId)
      ?? currentProduct.variants?.find((variant) => variant.inStock)
      ?? currentProduct.variants?.[0]
      ?? null;
  }, [currentProduct, selectedVariantId]);
  const prevProductIndex = products.length > 2
    ? (currentIndex - 1 + products.length) % products.length
    : products.length === 2 ? currentIndex : -1;
  const nextProductIndex = products.length > 1 ? (currentIndex + 1) % products.length : -1;
  const prevProduct = prevProductIndex >= 0 ? products[prevProductIndex] : undefined;
  const nextProduct = nextProductIndex >= 0 ? products[nextProductIndex] : undefined;
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const availableSizes = [...new Set((currentProduct?.variants ?? []).map((variant) => variant.size))];
  const availableColors = [...new Set((currentProduct?.variants ?? []).map((variant) => variant.color))];

  useEffect(() => {
    const closeLanguageMenu = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLanguageOpen(false);
    };

    document.addEventListener("mousedown", closeLanguageMenu);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", closeLanguageMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectProduct = (index: number) => {
    if (!products.length) return;
    const productIndex = ((index % products.length) + products.length) % products.length;
    const product = products[productIndex];
    const variant = product.variants?.find((item) => item.inStock) ?? product.variants?.[0];
    setCurrentIndex(productIndex);
    setSelectedVariantId(variant?.id ?? "");
    setIsEditOpen(false);
    // Product browsing must never automatically submit a paid generation.
  };

  const changeProduct = (direction: "left" | "right") => {
    selectProduct(direction === "left" ? currentIndex - 1 : currentIndex + 1);
  };

  const chooseSize = (size: string) => {
    const variant = currentProduct?.variants?.find((item) => item.size === size && item.color === selectedVariant?.color)
      ?? currentProduct?.variants?.find((item) => item.size === size);
    if (variant) setSelectedVariantId(variant.id);
  };

  const chooseColor = (color: string) => {
    const variant = currentProduct?.variants?.find((item) => item.color === color && item.size === selectedVariant?.size)
      ?? currentProduct?.variants?.find((item) => item.color === color);
    if (variant) setSelectedVariantId(variant.id);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX === "number") {
      const delta = endX - touchStartX.current;
      if (Math.abs(delta) > 70) changeProduct(delta > 0 ? "left" : "right");
    }
    touchStartX.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 35) return;
    if (Date.now() - lastWheelChangeAt.current < 320) return;

    event.preventDefault();
    lastWheelChangeAt.current = Date.now();
    changeProduct(delta > 0 ? "right" : "left");
  };

  const addToCart = async () => {
    if (!currentProduct || currentProduct.demo || !selectedVariant || !selectedVariant.inStock) return;
    setCartSyncError("");
    setCartNotice("");
    setCart((previous) => {
      const existing = previous.find((item) => item.variantId === selectedVariant.id);
      if (existing) {
        return previous.map((item) => item.variantId === selectedVariant.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...previous, {
        ...currentProduct,
        variantId: selectedVariant.id,
        selectedSize: selectedVariant.size,
        selectedColor: selectedVariant.color,
        quantity: 1,
      }];
    });

    try {
      const response = await apiFetch("/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: currentProduct.id, variantId: selectedVariant.id, qty: 1 }),
      });
      if (!response.ok) throw new Error(`Cart request failed (${response.status}).`);
      setCartNotice("cartAdded");
    } catch (cause) {
      console.error("Cart sync error:", cause);
      setCartSyncError("cartSyncFailed");
    }
  };

  const changeQuantity = (variantId: string, amount: number) => {
    setCart((previous) => previous
      .map((item) => item.variantId === variantId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  };

  const removeFromCart = (variantId: string) => {
    setCart((previous) => previous.filter((item) => item.variantId !== variantId));
  };

  const sendToCashier = async () => {
    if (!cart.length || checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const response = await apiFetch("/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, variantId: item.variantId, qty: item.quantity })) }),
      });
      if (!response.ok) throw new Error(`Checkout request failed (${response.status}).`);
      setCart([]);
      setCartSyncError("");
      setCartNotice("orderSent");
      setIsCartOpen(false);
    } catch (cause) {
      console.error("Checkout error:", cause);
      setCheckoutError("checkoutFailed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const productStatus = useMemo(() => {
    if (isLoading) return strings.loading;
    if (productError) return strings.catalogError;
    if (!products.length) return strings.noProducts;
    return "";
  }, [isLoading, productError, products.length, strings]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="mirror-room" dir={language === "AR" ? "rtl" : "ltr"}>
      <div className="mirror-room-shade" aria-hidden="true" />
      <div className="mirror-glass-stage" aria-hidden="true" />

      <nav className="mirror-category-nav" aria-label={labels.categoryNavigation}>
        {categories.map((category) => (
          <motion.button
            type="button"
            key={category}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.14 }}
            onClick={() => {
              setActiveCategory(category);
              setCurrentIndex(0);
              setSelectedVariantId("");
            }}
            className={activeCategory === category ? "is-active" : ""}
            aria-pressed={activeCategory === category}
          >
            {labels.categories[category]}
          </motion.button>
        ))}
      </nav>

      <div className="mirror-top-right">
        <div className="mirror-language-menu" ref={languageMenuRef}>
          <button
            type="button"
            className="mirror-language-trigger"
            onClick={() => setIsLanguageOpen((open) => !open)}
            aria-expanded={isLanguageOpen}
            aria-controls="mirror-language-options"
            aria-label={`${labels.chooseLanguage}: ${mirrorLanguageNames[language]}`}
          >
            <span>{mirrorLanguageCodes[language]}</span>
            <ChevronDown aria-hidden="true" />
          </button>
          <AnimatePresence initial={false}>
            {isLanguageOpen && (
              <motion.div
                id="mirror-language-options"
                className="mirror-language-options"
                role="group"
                aria-label={labels.chooseLanguage}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16 }}
              >
              {languages.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={language === item ? "is-active" : ""}
                  onClick={() => {
                    setLanguage(item);
                    setIsLanguageOpen(false);
                  }}
                  aria-pressed={language === item}
                  aria-label={mirrorLanguageNames[item]}
                >
                  {mirrorLanguageCodes[item]}
                </button>
              ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <a className="mirror-icon-button mirror-profile-button" href="/login" aria-label={strings.customer} title={strings.customer}>
          <UserRound aria-hidden="true" />
        </a>
      </div>

      <aside className="mirror-side-nav" aria-label={labels.mainNavigation}>
        <button type="button" className={!isCartOpen ? "is-active" : ""} onClick={() => setIsCartOpen(false)} aria-label={strings.clothing} aria-pressed={!isCartOpen}>
          <Shirt aria-hidden="true" />
          <span>{strings.clothing}</span>
        </button>
        <button type="button" className={isCartOpen ? "is-active" : ""} onClick={() => setIsCartOpen(true)} aria-label={strings.cart} aria-pressed={isCartOpen}>
          <ShoppingCart aria-hidden="true" />
          <span>{strings.cart}</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </aside>

      <section className="mirror-toolbar" aria-label={labels.fittingRoomControls}>
        <div className="mirror-brand-pill"><span className="mirror-brand-mark"><Check aria-hidden="true" /></span>{t("MIRROR")}</div>
        <div className="mirror-toolbar-actions">
          <button type="button" onClick={addToCart} disabled={!selectedVariant?.inStock || currentProduct?.demo} className="mirror-toolbar-pill">
            <ShoppingCart aria-hidden="true" /> <span>{strings.addToCart}</span>
          </button>
          <button type="button" onClick={() => setIsCartOpen(true)} className="mirror-toolbar-pill">
            <CreditCard aria-hidden="true" /> <span>{strings.cart}</span>
          </button>
        </div>
      </section>

      <section
        className="mirror-fitting-stage"
        aria-label={labels.virtualFittingRoom}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {currentProduct && products.length > 1 && (
          <>
            <ProductPreview
              key={prevProduct?.id ?? "previous-empty"}
              product={prevProduct}
              side="left"
              disabled={!prevProduct}
              language={language}
              labels={labels}
              onSelect={() => selectProduct(prevProductIndex)}
              onNavigate={() => changeProduct("left")}
            />
            <ProductPreview
              key={nextProduct?.id ?? "next-empty"}
              product={nextProduct}
              side="right"
              disabled={!nextProduct}
              language={language}
              labels={labels}
              onSelect={() => selectProduct(nextProductIndex)}
              onNavigate={() => changeProduct("right")}
            />
          </>
        )}

        <MirrorLiveFitting product={currentProduct} />

        {productStatus && (
          <div className={`mirror-catalog-status ${productError ? "has-error" : ""}`} role={productError ? "alert" : "status"}>
            {isLoading && <LoaderCircle className="mirror-spin" aria-hidden="true" />}
            <span>{productStatus}</span>
          </div>
        )}
      </section>

      {currentProduct && (
        <motion.section
          key={currentProduct.id}
          className={`mirror-product-card ${isEditOpen ? "is-editing" : ""}`}
          aria-label={labels.selectedProduct}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mirror-product-heading">
            <div className="mirror-product-title">
              <span className="mirror-eyebrow">{labels.categories[activeCategory]}</span>
              <h2>{getProductName(currentProduct, language)}</h2>
            </div>
            <div className="mirror-product-price">
              {currentProduct.originalPrice && <del>{money(currentProduct.originalPrice, language)}</del>}
              <strong>{money(currentProduct.price, language)}</strong>
            </div>
          </div>
          <div className="mirror-product-options">
            <div className="mirror-option-group">
              <span>{strings.size}</span>
              <div className="mirror-option-list">
                {availableSizes.length ? availableSizes.map((size) => (
                  <button type="button" key={size} className={selectedVariant?.size === size ? "is-selected" : ""} onClick={() => chooseSize(size)} aria-pressed={selectedVariant?.size === size}>
                    {size}
                  </button>
                )) : <span className="mirror-unavailable">—</span>}
              </div>
            </div>
            <div className="mirror-option-group mirror-color-group">
              <span>{strings.color}</span>
              <div className="mirror-option-list">
                {availableColors.length ? availableColors.map((color) => (
                  <button type="button" key={color} className={`mirror-color-option ${selectedVariant?.color === color ? "is-selected" : ""}`} onClick={() => chooseColor(color)} aria-pressed={selectedVariant?.color === color}>
                    <span>{getColorName(color, language)}</span>
                  </button>
                )) : <span className="mirror-unavailable">—</span>}
              </div>
            </div>
            <button type="button" className="mirror-edit-button" onClick={() => setIsEditOpen((open) => !open)} aria-expanded={isEditOpen}>
              {strings.edit} <ChevronDown aria-hidden="true" />
            </button>
          </div>
          {isEditOpen && (
            <div className="mirror-variant-list" aria-label={labels.availableVariants}>
              {(currentProduct.variants ?? []).map((variant) => (
                <button type="button" key={variant.id} className={selectedVariant?.id === variant.id ? "is-selected" : ""} onClick={() => setSelectedVariantId(variant.id)}>
                  {variant.size} · {getColorName(variant.color, language)}{!variant.inStock ? ` · ${labels.soldOut}` : ""}
                </button>
              ))}
            </div>
          )}
          {cartNotice && !isCartOpen && <p className="mirror-cart-notice" role="status">{strings[cartNotice]}</p>}
          {cartSyncError && <p className="mirror-inline-error" role="alert">{strings[cartSyncError]}</p>}
          <div className="mirror-product-actions">
            <button type="button" className="mirror-secondary-button" onClick={() => { window.location.assign(`/mirror/try-on?productId=${encodeURIComponent(currentProduct.id)}`); }} disabled={!selectedVariant || !currentProduct.image || currentProduct.demo}>
              <Camera aria-hidden="true" /> {strings.tryOn}
            </button>
            <button type="button" className="mirror-primary-button" onClick={addToCart} disabled={!selectedVariant?.inStock || currentProduct.demo}>
              <ShoppingCart aria-hidden="true" /> {strings.addToCart}
            </button>
          </div>
        </motion.section>
      )}

      {!currentProduct && !isLoading && !productError && (
        <section className="mirror-no-product" aria-live="polite">
          <ShoppingBag aria-hidden="true" />
          <p>{strings.noProducts}</p>
        </section>
      )}

      {cartNotice && !isCartOpen && !currentProduct && <p className="mirror-floating-notice" role="status">{strings[cartNotice]}</p>}
      <AnimatePresence>
        {isCartOpen && (
        <CartPanel
          items={cart}
          total={cartTotal}
          count={cartCount}
          strings={strings}
          labels={labels}
          language={language}
          busy={checkoutLoading}
          error={checkoutError ? strings[checkoutError] : cartSyncError ? strings[cartSyncError] : ""}
          onClose={() => setIsCartOpen(false)}
          onQuantity={changeQuantity}
          onRemove={removeFromCart}
          onCheckout={sendToCashier}
        />
        )}
      </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
