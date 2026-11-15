"use client";

import {
  useCallback,
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
  RotateCcw,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import PersonCutoutCamera from "./person-cutout-camera";
import {
  mirrorColorTranslations,
  mirrorDemoProductNames,
  mirrorInterfaceCopy,
  mirrorLanguageCodes,
  mirrorLanguageLocale,
  mirrorLanguageNames,
  mirrorLanguages,
  type MirrorCategory,
  type MirrorLanguage,
} from "@/lib/mirror-locale";

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

const makeDemoProduct = (
  id: string,
  name: string,
  price: number,
  image: string,
  sizes: string[],
  color: string,
): Product => ({
  id,
  name,
  price,
  image,
  demo: true,
  variants: sizes.map((size) => ({
    id: `${id}-${size.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    size,
    color,
    inStock: true,
  })),
});

const demoProductsByCategory: Record<Category, Product[]> = {
  "Full Body": [
    makeDemoProduct("demo-cream-set", "Cream Knit & Trouser Set", 189, "/products/demo-full-body-cream.png", ["S", "M", "L"], "Cream"),
    makeDemoProduct("demo-navy-set", "Navy City Outfit", 205, "/products/demo-full-body-navy.png", ["S", "M", "L"], "Navy"),
  ],
  "Top Body": [
    makeDemoProduct("demo-ivory-sweatshirt", "Ivory Knit Sweatshirt", 89, "/products/demo-top-sweater.png", ["S", "M", "L"], "Ivory"),
    makeDemoProduct("demo-blue-oxford", "Pale Blue Oxford Shirt", 78, "/products/demo-top-shirt.png", ["S", "M", "L"], "Sky blue"),
    makeDemoProduct("demo-olive-overshirt", "Olive Cotton Overshirt", 96, "/products/demo-top-overshirt.png", ["S", "M", "L"], "Olive"),
  ],
  Head: [
    makeDemoProduct("demo-black-cap", "Classic Black Cap", 32, "/products/demo-head-cap.png", ["One size"], "Black"),
    makeDemoProduct("demo-camel-beanie", "Camel Knit Beanie", 38, "/products/demo-head-beanie.png", ["One size"], "Camel"),
  ],
  Pants: [
    makeDemoProduct("demo-charcoal-trousers", "Charcoal Tailored Trousers", 94, "/products/demo-pants-trousers.png", ["30", "32", "34"], "Charcoal"),
    makeDemoProduct("demo-indigo-denim", "Indigo Straight Jeans", 82, "/products/demo-pants-denim.png", ["30", "32", "34"], "Indigo"),
  ],
  Footwear: [
    makeDemoProduct("demo-white-sneakers", "Minimal White Sneakers", 110, "/products/demo-footwear-sneaker.png", ["40", "41", "42"], "White"),
    makeDemoProduct("demo-leather-loafers", "Leather Penny Loafers", 138, "/products/demo-footwear-loafer.png", ["40", "41", "42"], "Chestnut"),
  ],
};

const copy = {
  UZ: {
    clothing: "Kiyimlar",
    cart: "Savatcha",
    tryOn: "Virtual kiyib ko‘rish",
    addToCart: "Savatchaga qo‘shish",
    checkout: "Kassaga yuborish",
    startCamera: "Kamerani yoqish",
    cameraStop: "Kamerani o‘chirish",
    cameraLive: "Kamera yoqilgan",
    cameraConnecting: "Kamera ulanmoqda…",
    cameraSecureError: "Kamerani ishlatish uchun sahifani HTTPS yoki localhost orqali oching.",
    cameraUnavailableError: "Bu brauzerda kamera mavjud emas.",
    cameraBlockedError: "Brauzer kameraga ruxsat bermadi. Sozlamalardan ruxsat bering yoki sahifani alohida oynada oching.",
    cameraNotFoundError: "Kamera topilmadi. Qurilma ulanganini tekshiring.",
    cameraBusyError: "Kamera boshqa ilovada band. Uni yoping va qayta urinib ko‘ring.",
    cameraGenericError: "Kamera ishga tushmadi. Qayta urinib ko‘ring.",
    cameraDisconnectedError: "Kamera uzildi. Uni qayta yoqing.",
    cameraPrompt: "Kameraga ruxsat bering — jonli tasvir butun ekran fonida ko‘rsatiladi.",
    backgroundRemoving: "Fon olib tashlanmoqda…",
    backgroundRemovalError: "Fon ajratilmadi — kamera tasviri asl holida ko‘rsatilmoqda.",
    cameraOff: "Kamera yoqilmagan",
    edit: "Tanlash",
    size: "O‘lcham",
    color: "Rang",
    emptyCart: "Savatcha hozircha bo‘sh",
    loading: "Katalog yuklanmoqda",
    catalogError: "Katalogni yuklab bo‘lmadi.",
    noProducts: "Bu kategoriyada hozircha mahsulot yo‘q.",
    demoCatalog: "Demo katalogi — namunaviy mahsulotlar. Savat va kiyib ko‘rish o‘chirilgan.",
    cartCount: "ta mahsulot",
    customer: "Mijoz profili",
    backToCamera: "Kameraga qaytish",
    cameraMustStart: "Avval kamerani yoqing.",
    tryOnFailed: "Virtual kiyib ko‘rish amalga oshmadi. Qayta urinib ko‘ring.",
    cartAdded: "Mahsulot savatchaga qo‘shildi.",
    cartSyncFailed: "Savatchani server bilan sinxronlab bo‘lmadi. Mahsulot shu oynada saqlandi.",
    orderSent: "Buyurtma kassaga yuborildi.",
    checkoutFailed: "Buyurtmani kassaga yuborib bo‘lmadi. Qayta urinib ko‘ring.",
  },
  EN: {
    clothing: "Clothing",
    cart: "Shopping cart",
    tryOn: "Virtual try on",
    addToCart: "Add to cart",
    checkout: "Send to cashier",
    startCamera: "Start camera",
    cameraStop: "Turn camera off",
    cameraLive: "Camera on",
    cameraConnecting: "Connecting camera…",
    cameraSecureError: "Open this page over HTTPS or localhost to use the camera.",
    cameraUnavailableError: "Camera access is not available in this browser.",
    cameraBlockedError: "Camera access was blocked. Allow it in browser settings or open the page in a separate tab.",
    cameraNotFoundError: "No camera was found. Check that a camera is connected.",
    cameraBusyError: "The camera is in use by another app. Close it and try again.",
    cameraGenericError: "The camera could not start. Please try again.",
    cameraDisconnectedError: "The camera disconnected. Turn it on again.",
    cameraPrompt: "Allow camera access to show the live video across the full screen.",
    backgroundRemoving: "Removing the background…",
    backgroundRemovalError: "Background removal failed; showing the live camera feed.",
    cameraOff: "Camera is off",
    edit: "Edit",
    size: "Size",
    color: "Color",
    emptyCart: "Your cart is empty",
    loading: "Loading catalog",
    catalogError: "Could not load the catalog.",
    noProducts: "No products in this category yet.",
    demoCatalog: "Demo catalog — sample items. Cart and try-on are disabled.",
    cartCount: "items",
    customer: "Customer profile",
    backToCamera: "Back to camera",
    cameraMustStart: "Turn on the camera first.",
    tryOnFailed: "Virtual try-on failed. Please try again.",
    cartAdded: "Product added to your cart.",
    cartSyncFailed: "Your cart could not sync with the server. The product is saved in this session.",
    orderSent: "Your order was sent to the cashier.",
    checkoutFailed: "Your order could not be sent. Please try again.",
  },
  RU: {
    clothing: "Одежда",
    cart: "Корзина",
    tryOn: "Виртуальная примерка",
    addToCart: "В корзину",
    checkout: "Отправить кассиру",
    startCamera: "Включить камеру",
    cameraStop: "Выключить камеру",
    cameraLive: "Камера включена",
    cameraConnecting: "Подключаем камеру…",
    cameraSecureError: "Откройте страницу по HTTPS или localhost, чтобы использовать камеру.",
    cameraUnavailableError: "Камера недоступна в этом браузере.",
    cameraBlockedError: "Браузер заблокировал камеру. Разрешите доступ или откройте страницу в отдельной вкладке.",
    cameraNotFoundError: "Камера не найдена. Проверьте подключение устройства.",
    cameraBusyError: "Камера занята другим приложением. Закройте его и попробуйте снова.",
    cameraGenericError: "Не удалось включить камеру. Попробуйте ещё раз.",
    cameraDisconnectedError: "Камера отключилась. Включите её снова.",
    cameraPrompt: "Разрешите доступ к камере, чтобы показать видео на весь экран.",
    backgroundRemoving: "Удаляем фон…",
    backgroundRemovalError: "Фон не удалён — показываем исходное изображение с камеры.",
    cameraOff: "Камера выключена",
    edit: "Изменить",
    size: "Размер",
    color: "Цвет",
    emptyCart: "Корзина пока пуста",
    loading: "Загрузка каталога",
    catalogError: "Не удалось загрузить каталог.",
    noProducts: "В этой категории пока нет товаров.",
    demoCatalog: "Демо-каталог — образцы. Корзина и примерка отключены.",
    cartCount: "товаров",
    customer: "Профиль клиента",
    backToCamera: "Вернуться к камере",
    cameraMustStart: "Сначала включите камеру.",
    tryOnFailed: "Не удалось выполнить виртуальную примерку. Попробуйте ещё раз.",
    cartAdded: "Товар добавлен в корзину.",
    cartSyncFailed: "Не удалось синхронизировать корзину с сервером. Товар сохранён в этой сессии.",
    orderSent: "Заказ отправлен кассиру.",
    checkoutFailed: "Не удалось отправить заказ. Попробуйте ещё раз.",
  },
  KK: {
    clothing: "Киімдер",
    cart: "Себет",
    tryOn: "Виртуалды киіп көру",
    addToCart: "Себетке қосу",
    checkout: "Кассирге жіберу",
    startCamera: "Камераны қосу",
    cameraStop: "Камераны өшіру",
    cameraLive: "Камера қосулы",
    cameraConnecting: "Камера қосылуда…",
    cameraSecureError: "Камераны пайдалану үшін бетті HTTPS немесе localhost арқылы ашыңыз.",
    cameraUnavailableError: "Бұл браузерде камера қолжетімді емес.",
    cameraBlockedError: "Браузер камераға рұқсат бермеді. Баптаулардан рұқсат беріңіз немесе бетті бөлек қойындыда ашыңыз.",
    cameraNotFoundError: "Камера құрылғысы табылмады.",
    cameraBusyError: "Камера басқа қолданбада. Оны жауып, қайта көріңіз.",
    cameraGenericError: "Камераны қосу мүмкін болмады. Қайта көріңіз.",
    cameraDisconnectedError: "Камера ажыратылды. Қайта қосыңыз.",
    cameraPrompt: "Камераға рұқсат беріңіз — тірі бейне толық экранда көрсетіледі.",
    backgroundRemoving: "Фон алынып жатыр…",
    backgroundRemovalError: "Фон алынбады — камераның бастапқы көрінісі көрсетіліп тұр.",
    cameraOff: "Камера өшірулі",
    edit: "Өзгерту",
    size: "Өлшем",
    color: "Түс",
    emptyCart: "Себет әзірге бос",
    loading: "Каталог жүктелуде",
    catalogError: "Каталогты жүктеу мүмкін болмады.",
    noProducts: "Бұл санатта әзірге тауар жоқ.",
    demoCatalog: "Демо каталогы — үлгілер. Себет пен киіп көру өшірілген.",
    cartCount: "тауар",
    customer: "Клиент профилі",
    backToCamera: "Камераға оралу",
    cameraMustStart: "Алдымен камераны қосыңыз.",
    tryOnFailed: "Виртуалды киіп көру сәтсіз аяқталды. Қайталап көріңіз.",
    cartAdded: "Тауар себетке қосылды.",
    cartSyncFailed: "Себетті сервермен синхрондау мүмкін болмады. Тауар осы сеанста сақталды.",
    orderSent: "Тапсырыс кассирге жіберілді.",
    checkoutFailed: "Тапсырысты жіберу мүмкін болмады. Қайталап көріңіз.",
  },
  AR: {
    clothing: "الملابس",
    cart: "سلة التسوق",
    tryOn: "تجربة افتراضية",
    addToCart: "أضف إلى السلة",
    checkout: "إرسال إلى أمين الصندوق",
    startCamera: "تشغيل الكاميرا",
    cameraStop: "إيقاف الكاميرا",
    cameraLive: "الكاميرا تعمل",
    cameraConnecting: "جارٍ توصيل الكاميرا…",
    cameraSecureError: "افتح الصفحة عبر HTTPS أو localhost لاستخدام الكاميرا.",
    cameraUnavailableError: "الكاميرا غير متاحة في هذا المتصفح.",
    cameraBlockedError: "حظر المتصفح الوصول إلى الكاميرا. اسمح بالوصول أو افتح الصفحة في علامة تبويب مستقلة.",
    cameraNotFoundError: "لم يتم العثور على كاميرا. تحقق من توصيل الجهاز.",
    cameraBusyError: "الكاميرا قيد الاستخدام في تطبيق آخر. أغلقه وحاول مجددًا.",
    cameraGenericError: "تعذر تشغيل الكاميرا. حاول مرة أخرى.",
    cameraDisconnectedError: "انقطع اتصال الكاميرا. أعد تشغيلها.",
    cameraPrompt: "اسمح بالوصول إلى الكاميرا لعرض البث المباشر على كامل الشاشة.",
    backgroundRemoving: "جارٍ إزالة الخلفية…",
    backgroundRemovalError: "تعذرت إزالة الخلفية — يتم عرض بث الكاميرا كما هو.",
    cameraOff: "الكاميرا متوقفة",
    edit: "تعديل",
    size: "المقاس",
    color: "اللون",
    emptyCart: "سلتك فارغة",
    loading: "جارٍ تحميل الكتالوج",
    catalogError: "تعذر تحميل الكتالوج.",
    noProducts: "لا توجد منتجات في هذه الفئة بعد.",
    demoCatalog: "كتالوج تجريبي — منتجات نموذجية. السلة والتجربة معطلتان.",
    cartCount: "منتجات",
    customer: "ملف العميل",
    backToCamera: "العودة إلى الكاميرا",
    cameraMustStart: "شغّل الكاميرا أولاً.",
    tryOnFailed: "تعذرت التجربة الافتراضية. حاول مرة أخرى.",
    cartAdded: "تمت إضافة المنتج إلى السلة.",
    cartSyncFailed: "تعذرت مزامنة السلة مع الخادم. تم حفظ المنتج في هذه الجلسة.",
    orderSent: "تم إرسال الطلب إلى أمين الصندوق.",
    checkoutFailed: "تعذر إرسال الطلب. حاول مرة أخرى.",
  },
  TR: {
    clothing: "Giyim",
    cart: "Sepet",
    tryOn: "Sanal deneme",
    addToCart: "Sepete ekle",
    checkout: "Kasiyere gönder",
    startCamera: "Kamerayı aç",
    cameraStop: "Kamerayı kapat",
    cameraLive: "Kamera açık",
    cameraConnecting: "Kamera bağlanıyor…",
    cameraSecureError: "Kamerayı kullanmak için bu sayfayı HTTPS veya localhost üzerinden açın.",
    cameraUnavailableError: "Bu tarayıcıda kamera kullanılamıyor.",
    cameraBlockedError: "Tarayıcı kamera erişimini engelledi. Ayarlardan izin verin veya sayfayı ayrı bir sekmede açın.",
    cameraNotFoundError: "Kamera bulunamadı. Cihaz bağlantısını kontrol edin.",
    cameraBusyError: "Kamera başka bir uygulama tarafından kullanılıyor. Uygulamayı kapatıp tekrar deneyin.",
    cameraGenericError: "Kamera başlatılamadı. Lütfen tekrar deneyin.",
    cameraDisconnectedError: "Kamera bağlantısı kesildi. Yeniden açın.",
    cameraPrompt: "Kamera erişimine izin verin; canlı görüntü tam ekranda gösterilir.",
    backgroundRemoving: "Arka plan kaldırılıyor…",
    backgroundRemovalError: "Arka plan kaldırılamadı; canlı kamera görüntüsü gösteriliyor.",
    cameraOff: "Kamera kapalı",
    edit: "Düzenle",
    size: "Beden",
    color: "Renk",
    emptyCart: "Sepetiniz boş",
    loading: "Katalog yükleniyor",
    catalogError: "Katalog yüklenemedi.",
    noProducts: "Bu kategoride henüz ürün yok.",
    demoCatalog: "Demo kataloğu — örnek ürünler. Sepet ve sanal deneme devre dışı.",
    cartCount: "ürün",
    customer: "Müşteri profili",
    backToCamera: "Kameraya dön",
    cameraMustStart: "Önce kamerayı açın.",
    tryOnFailed: "Sanal deneme başarısız oldu. Lütfen tekrar deneyin.",
    cartAdded: "Ürün sepetinize eklendi.",
    cartSyncFailed: "Sepet sunucuyla eşitlenemedi. Ürün bu oturumda kaydedildi.",
    orderSent: "Sipariş kasiyere gönderildi.",
    checkoutFailed: "Sipariş gönderilemedi. Lütfen tekrar deneyin.",
  },
} satisfies Record<Language, Record<string, string>>;

type MirrorCopyKey = keyof typeof copy.UZ;

const getProductName = (product: Product, language: Language) =>
  mirrorDemoProductNames[product.id]?.[language] ?? product.name;

const getColorName = (color: string, language: Language) =>
  mirrorColorTranslations[language][color] ?? color;

const fetchProducts = async (url: string): Promise<Product[]> => {
  const response = await apiFetch(url);
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
  new Intl.NumberFormat(mirrorLanguageLocale[language], {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

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
          <img src={product.image} alt={getProductName(product, language)} />
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
          {error && <p className="mirror-inline-error" role="alert">{error}</p>}
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
  const [activeCategory, setActiveCategory] = useState<Category>("Top Body");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("UZ");
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [segmentationReady, setSegmentationReady] = useState(false);
  const [cameraError, setCameraError] = useState<MirrorCopyKey | "">("");
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<MirrorCopyKey | "">("");
  const [cartSyncError, setCartSyncError] = useState<MirrorCopyKey | "">("");
  const [cartNotice, setCartNotice] = useState<MirrorCopyKey | "">("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastWheelChangeAt = useRef(0);
  const tryOnRequestId = useRef(0);
  const strings = copy[language] as Record<MirrorCopyKey, string>;
  const labels = mirrorInterfaceCopy[language];

  const productKey = apiURL(`/products?category=${encodeURIComponent(activeCategory)}`);
  const { data, error: productError, isLoading } = useSWR<Product[]>(productKey, fetchProducts, {
    keepPreviousData: false,
    revalidateOnFocus: false,
  });
  const usingDemoCatalog = process.env.NODE_ENV === "development" && !isLoading && !data?.length && (Boolean(productError) || Array.isArray(data));
  const products = data?.length ? data : usingDemoCatalog ? demoProductsByCategory[activeCategory] : [];
  const currentProduct = products[currentIndex];
  const selectedVariant = useMemo(() => {
    if (!currentProduct) return null;
    return currentProduct.variants?.find((variant) => variant.id === selectedVariantId)
      ?? currentProduct.variants?.find((variant) => variant.inStock)
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
  const availableSizes = [...new Set((currentProduct?.variants ?? []).filter((variant) => variant.inStock).map((variant) => variant.size))];
  const availableColors = [...new Set((currentProduct?.variants ?? []).filter((variant) => variant.inStock).map((variant) => variant.color))];

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const savedLanguage = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("mirror_language="))
      ?.split("=")[1];

    if (mirrorLanguages.includes(savedLanguage as Language)) {
      setLanguage(savedLanguage as Language);
    }
    setIsLanguageReady(true);
  }, []);

  useEffect(() => {
    if (!isLanguageReady) return;

    document.documentElement.lang = mirrorLanguageLocale[language];
    document.documentElement.dir = language === "AR" ? "rtl" : "ltr";
    document.cookie = `mirror_language=${language}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, [isLanguageReady, language]);

  useEffect(() => {
    return () => {
      document.documentElement.lang = "uz-UZ";
      document.documentElement.dir = "ltr";
    };
  }, []);

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

  const startCamera = useCallback(async () => {
    if (cameraStarted || isCameraStarting) return;
    setIsCameraStarting(true);
    setCameraError("");
    let stream: MediaStream | null = null;

    try {
      if (!window.isSecureContext) {
        setCameraError("cameraSecureError");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("cameraUnavailableError");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (cause) {
        if (!(cause instanceof Error) || cause.name !== "OverconstrainedError") throw cause;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera video element is unavailable.");
      video.srcObject = stream;
      await video.play();

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current !== stream) return;
          streamRef.current = null;
          setCameraStarted(false);
          setSegmentationReady(false);
          setCameraError("cameraDisconnectedError");
        };
      });
      setCameraStarted(true);
    } catch (cause) {
      console.error("Camera startup error:", cause);
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraStarted(false);

      const errorName = cause instanceof Error ? cause.name : "";
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setCameraError("cameraBlockedError");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setCameraError("cameraNotFoundError");
      } else if (errorName === "NotReadableError" || errorName === "AbortError") {
        setCameraError("cameraBusyError");
      } else {
        setCameraError("cameraGenericError");
      }
    } finally {
      setIsCameraStarting(false);
    }
  }, [cameraStarted, isCameraStarting, strings]);

  const stopCamera = () => {
    tryOnRequestId.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStarted(false);
    setSegmentationReady(false);
    setIsProcessingAI(false);
    setTryOnResult(null);
  };

  const selectProduct = (index: number) => {
    if (!products.length) return;
    const productIndex = ((index % products.length) + products.length) % products.length;
    const product = products[productIndex];
    const variant = product.variants?.find((item) => item.inStock);
    setCurrentIndex(productIndex);
    setSelectedVariantId(variant?.id ?? "");
    setTryOnResult(null);
    setIsEditOpen(false);
    if (cameraStarted && variant && !product.demo) void requestTryOn(product, variant);
  };

  const changeProduct = (direction: "left" | "right") => {
    selectProduct(direction === "left" ? currentIndex - 1 : currentIndex + 1);
  };

  const chooseSize = (size: string) => {
    const variant = currentProduct?.variants?.find((item) => item.inStock && item.size === size && item.color === selectedVariant?.color)
      ?? currentProduct?.variants?.find((item) => item.inStock && item.size === size);
    if (variant) setSelectedVariantId(variant.id);
  };

  const chooseColor = (color: string) => {
    const variant = currentProduct?.variants?.find((item) => item.inStock && item.color === color && item.size === selectedVariant?.size)
      ?? currentProduct?.variants?.find((item) => item.inStock && item.color === color);
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

  async function requestTryOn(product: Product, variant: ProductVariant) {
    if (!window.confirm("Send this single photo to the try-on service? Temporary images are private and deleted after 15 minutes. No continuous video is sent.")) return;
    const requestId = ++tryOnRequestId.current;
    const canvas = canvasRef.current;
    if (!cameraStarted || !canvas) {
      setCameraError("cameraMustStart");
      return;
    }
    if (!segmentationReady || !canvas.width || !canvas.height) {
      setCameraError("backgroundRemoving");
      return;
    }

    setCameraError("");
    setIsProcessingAI(true);
    setTryOnResult(null);
    try {
      const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!imageBlob) throw new Error("Kamera tasvirini tayyorlab bo‘lmadi.");
      if (requestId !== tryOnRequestId.current) return;
      const formData = new FormData();
      formData.append("user_image", imageBlob, "customer.png");
      formData.append("product_id", product.id);
      formData.append("variant_id", variant.id);
      formData.append("consent", "true");
      const response = await apiFetch("/try-on", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: formData });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`Try-on request failed (${response.status}).`);
      if (!result || typeof result !== "object" || !("result_image_url" in result) || typeof result.result_image_url !== "string") {
        throw new Error("The try-on service returned no result image.");
      }
      if (requestId === tryOnRequestId.current) setTryOnResult(result.result_image_url);
    } catch (cause) {
      console.error("Try-on request error:", cause);
      if (requestId === tryOnRequestId.current) {
        setCameraError("tryOnFailed");
      }
    } finally {
      if (requestId === tryOnRequestId.current) setIsProcessingAI(false);
    }
  }

  const handleTryOn = () => {
    if (currentProduct && !currentProduct.demo && selectedVariant) void requestTryOn(currentProduct, selectedVariant);
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
    if (usingDemoCatalog) return strings.demoCatalog;
    if (productError) return strings.catalogError;
    if (!products.length) return strings.noProducts;
    return "";
  }, [isLoading, productError, products.length, strings, usingDemoCatalog]);

  return (
    <MotionConfig reducedMotion="user">
      <main className={`mirror-room${cameraStarted ? " is-camera-live" : ""}`} dir={language === "AR" ? "rtl" : "ltr"}>
      <div className="mirror-camera-media-layer">
        <PersonCutoutCamera
          videoRef={videoRef}
          canvasRef={canvasRef}
          active={cameraStarted}
          showPreview={!tryOnResult}
          loadingText={strings.backgroundRemoving}
          errorText={strings.backgroundRemovalError}
          onReadyChange={setSegmentationReady}
        />
      </div>
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
              tryOnRequestId.current += 1;
              setIsProcessingAI(false);
              setActiveCategory(category);
              setCurrentIndex(0);
              setSelectedVariantId("");
              setTryOnResult(null);
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
        <div className="mirror-brand-pill"><span className="mirror-brand-mark"><Check aria-hidden="true" /></span> MIRROR</div>
        <div className="mirror-toolbar-actions">
          <button type="button" onClick={addToCart} disabled={!selectedVariant?.inStock || currentProduct?.demo} className="mirror-toolbar-pill">
            <ShoppingCart aria-hidden="true" /> <span>{strings.addToCart}</span>
          </button>
          <button type="button" onClick={() => setIsCartOpen(true)} className="mirror-toolbar-pill">
            <CreditCard aria-hidden="true" /> <span>{strings.cart}</span>
          </button>
          <button
            type="button"
            onClick={cameraStarted ? stopCamera : startCamera}
            disabled={isCameraStarting}
            className="mirror-icon-button"
            aria-busy={isCameraStarting}
            aria-label={isCameraStarting ? strings.cameraConnecting : cameraStarted ? strings.cameraStop : strings.startCamera}
            title={isCameraStarting ? strings.cameraConnecting : cameraStarted ? strings.cameraStop : strings.startCamera}
          >
            {isCameraStarting ? <LoaderCircle className="mirror-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
          </button>
        </div>
      </section>

      {cameraStarted && (
        <div className="mirror-camera-live-indicator" role="status">
          <span className="mirror-camera-live-dot" aria-hidden="true" />
          <span>{strings.cameraLive}</span>
          <strong>LIVE</strong>
        </div>
      )}

      <section
        className="mirror-fitting-stage"
        aria-label={labels.virtualFittingRoom}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {currentProduct && (
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

        <div className={`mirror-camera-frame ${cameraStarted ? "is-camera-on" : "is-camera-off"}`}>
          {tryOnResult && <img className="mirror-tryon-result" src={tryOnResult} alt={labels.tryOnResultAlt} />}
          {!cameraStarted && (
            <motion.div
              className="mirror-camera-cover"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <span className="mirror-camera-icon"><Camera aria-hidden="true" /></span>
              <span className="mirror-eyebrow">{strings.tryOn.toLocaleUpperCase(mirrorLanguageLocale[language])}</span>
              <h1>{strings.cameraOff}</h1>
              <p>{strings.cameraPrompt}</p>
              {cameraError && <p className="mirror-camera-error" role="alert">{strings[cameraError]}</p>}
              <button type="button" onClick={startCamera} disabled={isCameraStarting} aria-busy={isCameraStarting} className="mirror-primary-button">
                {isCameraStarting ? <LoaderCircle className="mirror-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
                {isCameraStarting ? strings.cameraConnecting : strings.startCamera}
              </button>
            </motion.div>
          )}
          {cameraStarted && cameraError && (
            <p className="mirror-camera-error-toast" role="alert">{strings[cameraError]}</p>
          )}
          {isProcessingAI && (
            <div className="mirror-processing" role="status">
              <LoaderCircle className="mirror-spin" aria-hidden="true" />
              <span>{labels.aiProcessing}</span>
            </div>
          )}
          {cameraStarted && (
            <div className="mirror-camera-actions">
              <button type="button" onClick={handleTryOn} disabled={!segmentationReady || !selectedVariant || currentProduct?.demo || isProcessingAI} className="mirror-primary-button">
                {isProcessingAI ? <LoaderCircle className="mirror-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
                {strings.tryOn}
              </button>
              {tryOnResult && (
                <button type="button" onClick={() => setTryOnResult(null)} className="mirror-secondary-button">
                  <RotateCcw aria-hidden="true" /> {strings.backToCamera}
                </button>
              )}
            </div>
          )}
        </div>

        {productStatus && (
          <div className={`mirror-catalog-status ${productError && !usingDemoCatalog ? "has-error" : ""}`} role={productError && !usingDemoCatalog ? "alert" : "status"}>
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
                <button type="button" key={variant.id} disabled={!variant.inStock} className={selectedVariant?.id === variant.id ? "is-selected" : ""} onClick={() => setSelectedVariantId(variant.id)}>
                  {variant.size} · {getColorName(variant.color, language)}{!variant.inStock ? ` · ${labels.soldOut}` : ""}
                </button>
              ))}
            </div>
          )}
          {cartNotice && !isCartOpen && <p className="mirror-cart-notice" role="status">{strings[cartNotice]}</p>}
          {cartSyncError && <p className="mirror-inline-error" role="alert">{strings[cartSyncError]}</p>}
          <div className="mirror-product-actions">
            <button type="button" className="mirror-secondary-button" onClick={handleTryOn} disabled={!cameraStarted || !selectedVariant || currentProduct.demo || isProcessingAI}>
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
