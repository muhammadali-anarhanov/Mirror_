export type MirrorLanguage = "UZ" | "EN" | "RU" | "KK" | "AR" | "TR";

export type MirrorCategory = "Full Body" | "Top Body" | "Head" | "Pants" | "Footwear";

export const mirrorLanguages: MirrorLanguage[] = ["EN", "UZ", "RU", "KK", "AR", "TR"];

export const mirrorLanguageLocale: Record<MirrorLanguage, string> = {
  UZ: "uz-UZ",
  EN: "en-US",
  RU: "ru-RU",
  KK: "kk-KZ",
  AR: "ar",
  TR: "tr-TR",
};

export const mirrorLanguageCodes: Record<MirrorLanguage, string> = {
  UZ: "UZ",
  EN: "EN",
  RU: "RU",
  KK: "KK",
  AR: "AR",
  TR: "TR",
};

export const mirrorLanguageNames: Record<MirrorLanguage, string> = {
  UZ: "O‘zbekcha",
  EN: "English",
  RU: "Русский",
  KK: "Қазақша",
  AR: "العربية",
  TR: "Türkçe",
};

export const mirrorDemoProductNames: Record<string, Partial<Record<MirrorLanguage, string>>> = {
  "demo-cream-set": {
    UZ: "Krem rang trikotaj va shimlar to‘plami", EN: "Cream Knit & Trouser Set", RU: "Комплект из кремового трикотажа и брюк", KK: "Крем түсті трикотаж бен шалбар жиынтығы", AR: "طقم من التريكو الكريمي والبنطال", TR: "Krem Triko ve Pantolon Takımı",
  },
  "demo-navy-set": {
    UZ: "To‘q ko‘k shahar obrazi", EN: "Navy City Outfit", RU: "Городской образ в тёмно-синем цвете", KK: "Қою көк қалалық образ", AR: "إطلالة مدينية باللون الكحلي", TR: "Lacivert Şehir Kombini",
  },
  "demo-ivory-sweatshirt": {
    UZ: "Fil suyagi rangli trikotaj svitshot", EN: "Ivory Knit Sweatshirt", RU: "Трикотажный свитшот цвета слоновой кости", KK: "Піл сүйегі түсті трикотаж свитшоты", AR: "سترة تريكو بلون العاج", TR: "Fildişi Triko Sweatshirt",
  },
  "demo-blue-oxford": {
    UZ: "Och ko‘k Oksford ko‘ylagi", EN: "Pale Blue Oxford Shirt", RU: "Голубая рубашка оксфорд", KK: "Ашық көк Оксфорд жейдесі", AR: "قميص أكسفورد أزرق فاتح", TR: "Açık Mavi Oxford Gömlek",
  },
  "demo-olive-overshirt": {
    UZ: "Zaytun rangli paxta ustki ko‘ylagi", EN: "Olive Cotton Overshirt", RU: "Хлопковая верхняя рубашка оливкового цвета", KK: "Зәйтүн түсті мақтадан тігілген жейде", AR: "قميص قطني خارجي بلون الزيتون", TR: "Zeytin Yeşili Pamuklu Gömlek",
  },
  "demo-black-cap": {
    UZ: "Klassik qora kepka", EN: "Classic Black Cap", RU: "Классическая чёрная кепка", KK: "Классикалық қара кепка", AR: "قبعة سوداء كلاسيكية", TR: "Klasik Siyah Şapka",
  },
  "demo-camel-beanie": {
    UZ: "Tuya rangli trikotaj qalpoq", EN: "Camel Knit Beanie", RU: "Вязаная шапка верблюжьего цвета", KK: "Түйе түсті тоқыма бас киім", AR: "قبعة صوفية بلون الجملي", TR: "Deve Tüyü Triko Bere",
  },
  "demo-charcoal-trousers": {
    UZ: "To‘q kulrang klassik shim", EN: "Charcoal Tailored Trousers", RU: "Классические брюки графитового цвета", KK: "Қою сұр классикалық шалбар", AR: "بنطال رسمي بلون الفحم", TR: "Antrasit Klasik Pantolon",
  },
  "demo-indigo-denim": {
    UZ: "Indigo rangli to‘g‘ri bichimli jinsi", EN: "Indigo Straight Jeans", RU: "Прямые джинсы цвета индиго", KK: "Индиго түсті тік пішімді джинсы", AR: "جينز مستقيم بلون النيلي", TR: "İndigo Düz Kesim Kot Pantolon",
  },
  "demo-white-sneakers": {
    UZ: "Minimal oq krossovkalar", EN: "Minimal White Sneakers", RU: "Минималистичные белые кроссовки", KK: "Ақ түсті минималистік кроссовкалар", AR: "حذاء رياضي أبيض بتصميم بسيط", TR: "Minimal Beyaz Spor Ayakkabı",
  },
  "demo-leather-loafers": {
    UZ: "Charm penny-loafer tuflilari", EN: "Leather Penny Loafers", RU: "Кожаные лоферы с перемычкой", KK: "Көлденең бауы бар былғары лоферлер", AR: "حذاء لوفر جلدي بتفصيل شريطي", TR: "Deri Penny Loafer Ayakkabı",
  },
};

export const mirrorColorTranslations: Record<MirrorLanguage, Record<string, string>> = {
  UZ: { Cream: "Krem", Navy: "To‘q ko‘k", Ivory: "Fil suyagi", "Sky blue": "Osmonrang", Olive: "Zaytunrang", Black: "Qora", Camel: "Tuya rang", Charcoal: "To‘q kulrang", Indigo: "Indigo", White: "Oq", Chestnut: "Kashtan rang" },
  EN: { Cream: "Cream", Navy: "Navy", Ivory: "Ivory", "Sky blue": "Sky blue", Olive: "Olive", Black: "Black", Camel: "Camel", Charcoal: "Charcoal", Indigo: "Indigo", White: "White", Chestnut: "Chestnut" },
  RU: { Cream: "Кремовый", Navy: "Тёмно-синий", Ivory: "Слоновая кость", "Sky blue": "Голубой", Olive: "Оливковый", Black: "Чёрный", Camel: "Верблюжий", Charcoal: "Графитовый", Indigo: "Индиго", White: "Белый", Chestnut: "Каштановый" },
  KK: { Cream: "Крем", Navy: "Қою көк", Ivory: "Піл сүйегі", "Sky blue": "Ашық көк", Olive: "Зәйтүн түсті", Black: "Қара", Camel: "Түйе түсті", Charcoal: "Қою сұр", Indigo: "Индиго", White: "Ақ", Chestnut: "Қоңыр" },
  AR: { Cream: "كريمي", Navy: "كحلي", Ivory: "عاجي", "Sky blue": "أزرق سماوي", Olive: "زيتوني", Black: "أسود", Camel: "جملي", Charcoal: "فحمي", Indigo: "نيلي", White: "أبيض", Chestnut: "كستنائي" },
  TR: { Cream: "Krem", Navy: "Lacivert", Ivory: "Fildişi", "Sky blue": "Açık mavi", Olive: "Zeytin yeşili", Black: "Siyah", Camel: "Deve tüyü", Charcoal: "Antrasit", Indigo: "İndigo", White: "Beyaz", Chestnut: "Kestane" },
};

export const mirrorInterfaceCopy = {
  UZ: {
    categories: { "Full Body": "To‘liq obraz", "Top Body": "Ustki kiyim", Head: "Bosh kiyim", Pants: "Shimlar", Footwear: "Oyoq kiyim" },
    categoryNavigation: "Mahsulot kategoriyalari",
    mainNavigation: "Asosiy navigatsiya",
    fittingRoomControls: "Sinov xonasi boshqaruvi",
    virtualFittingRoom: "Virtual kiyib ko‘rish xonasi",
    previousProduct: "Oldingi mahsulot",
    nextProduct: "Keyingi mahsulot",
    selectProduct: "Mahsulotni tanlash",
    closeShoppingCart: "Savatchani yopish",
    closeCart: "Savatchani yopish",
    quantity: "Miqdor",
    decreaseQuantity: "Miqdorni kamaytirish",
    increaseQuantity: "Miqdorni oshirish",
    removeItem: "Mahsulotni olib tashlash",
    each: "dona",
    total: "Jami",
    sending: "Yuborilmoqda…",
    selectedProduct: "Tanlangan mahsulot",
    availableVariants: "Mavjud variantlar",
    soldOut: "sotuvda yo‘q",
    chooseLanguage: "Tilni tanlang",
    aiProcessing: "AI uslubingizni tayyorlamoqda…",
    tryOnResultAlt: "Sun’iy intellekt yaratgan virtual kiyib ko‘rish natijasi",
  },
  EN: {
    categories: { "Full Body": "Full body", "Top Body": "Tops", Head: "Headwear", Pants: "Pants", Footwear: "Footwear" },
    categoryNavigation: "Product categories",
    mainNavigation: "Main navigation",
    fittingRoomControls: "Fitting room controls",
    virtualFittingRoom: "Virtual fitting room",
    previousProduct: "Previous product",
    nextProduct: "Next product",
    selectProduct: "Select product",
    closeShoppingCart: "Close shopping cart",
    closeCart: "Close cart",
    quantity: "Quantity",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    removeItem: "Remove product",
    each: "each",
    total: "Total",
    sending: "Sending…",
    selectedProduct: "Selected product",
    availableVariants: "Available product variants",
    soldOut: "sold out",
    chooseLanguage: "Choose language",
    aiProcessing: "AI is preparing your look…",
    tryOnResultAlt: "AI-generated virtual try-on result",
  },
  RU: {
    categories: { "Full Body": "Полный образ", "Top Body": "Верх", Head: "Головные уборы", Pants: "Брюки", Footwear: "Обувь" },
    categoryNavigation: "Категории товаров",
    mainNavigation: "Главная навигация",
    fittingRoomControls: "Управление примерочной",
    virtualFittingRoom: "Виртуальная примерочная",
    previousProduct: "Предыдущий товар",
    nextProduct: "Следующий товар",
    selectProduct: "Выбрать товар",
    closeShoppingCart: "Закрыть корзину",
    closeCart: "Закрыть корзину",
    quantity: "Количество",
    decreaseQuantity: "Уменьшить количество",
    increaseQuantity: "Увеличить количество",
    removeItem: "Убрать товар",
    each: "за шт.",
    total: "Итого",
    sending: "Отправка…",
    selectedProduct: "Выбранный товар",
    availableVariants: "Доступные варианты товара",
    soldOut: "нет в наличии",
    chooseLanguage: "Выберите язык",
    aiProcessing: "ИИ подготавливает ваш образ…",
    tryOnResultAlt: "Результат виртуальной примерки, созданный ИИ",
  },
  KK: {
    categories: { "Full Body": "Толық образ", "Top Body": "Үстіңгі киім", Head: "Бас киім", Pants: "Шалбар", Footwear: "Аяқ киім" },
    categoryNavigation: "Өнім санаттары",
    mainNavigation: "Негізгі навигация",
    fittingRoomControls: "Өлшеу бөлмесін басқару",
    virtualFittingRoom: "Виртуалды өлшеу бөлмесі",
    previousProduct: "Алдыңғы тауар",
    nextProduct: "Келесі тауар",
    selectProduct: "Тауарды таңдау",
    closeShoppingCart: "Себетті жабу",
    closeCart: "Себетті жабу",
    quantity: "Саны",
    decreaseQuantity: "Санын азайту",
    increaseQuantity: "Санын көбейту",
    removeItem: "Тауарды алып тастау",
    each: "дана",
    total: "Барлығы",
    sending: "Жіберілуде…",
    selectedProduct: "Таңдалған тауар",
    availableVariants: "Қолжетімді тауар нұсқалары",
    soldOut: "сатылымда жоқ",
    chooseLanguage: "Тілді таңдаңыз",
    aiProcessing: "Жасанды интеллект образыңызды дайындап жатыр…",
    tryOnResultAlt: "Жасанды интеллект жасаған виртуалды өлшеу нәтижесі",
  },
  AR: {
    categories: { "Full Body": "إطلالة كاملة", "Top Body": "ملابس علوية", Head: "أغطية الرأس", Pants: "سراويل", Footwear: "أحذية" },
    categoryNavigation: "فئات المنتجات",
    mainNavigation: "التنقل الرئيسي",
    fittingRoomControls: "عناصر التحكم في غرفة القياس",
    virtualFittingRoom: "غرفة القياس الافتراضية",
    previousProduct: "المنتج السابق",
    nextProduct: "المنتج التالي",
    selectProduct: "اختيار المنتج",
    closeShoppingCart: "إغلاق سلة التسوق",
    closeCart: "إغلاق السلة",
    quantity: "الكمية",
    decreaseQuantity: "تقليل الكمية",
    increaseQuantity: "زيادة الكمية",
    removeItem: "إزالة المنتج",
    each: "للقطعة",
    total: "الإجمالي",
    sending: "جارٍ الإرسال…",
    selectedProduct: "المنتج المحدد",
    availableVariants: "خيارات المنتج المتاحة",
    soldOut: "نفد المخزون",
    chooseLanguage: "اختر اللغة",
    aiProcessing: "يتم تجهيز إطلالتك بواسطة الذكاء الاصطناعي…",
    tryOnResultAlt: "نتيجة تجربة افتراضية أنشأها الذكاء الاصطناعي",
  },
  TR: {
    categories: { "Full Body": "Tam kombin", "Top Body": "Üst giyim", Head: "Baş aksesuarları", Pants: "Pantolon", Footwear: "Ayakkabı" },
    categoryNavigation: "Ürün kategorileri",
    mainNavigation: "Ana gezinme",
    fittingRoomControls: "Deneme odası kontrolleri",
    virtualFittingRoom: "Sanal deneme odası",
    previousProduct: "Önceki ürün",
    nextProduct: "Sonraki ürün",
    selectProduct: "Ürünü seç",
    closeShoppingCart: "Sepeti kapat",
    closeCart: "Sepeti kapat",
    quantity: "Adet",
    decreaseQuantity: "Adedi azalt",
    increaseQuantity: "Adedi artır",
    removeItem: "Ürünü kaldır",
    each: "adet başına",
    total: "Toplam",
    sending: "Gönderiliyor…",
    selectedProduct: "Seçili ürün",
    availableVariants: "Mevcut ürün seçenekleri",
    soldOut: "stokta yok",
    chooseLanguage: "Dil seçin",
    aiProcessing: "Yapay zekâ görünümünüzü hazırlıyor…",
    tryOnResultAlt: "Yapay zekâ tarafından oluşturulan sanal deneme sonucu",
  },
} as const satisfies Record<MirrorLanguage, {
  categories: Record<MirrorCategory, string>;
  categoryNavigation: string;
  mainNavigation: string;
  fittingRoomControls: string;
  virtualFittingRoom: string;
  previousProduct: string;
  nextProduct: string;
  selectProduct: string;
  closeShoppingCart: string;
  closeCart: string;
  quantity: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  removeItem: string;
  each: string;
  total: string;
  sending: string;
  selectedProduct: string;
  availableVariants: string;
  soldOut: string;
  chooseLanguage: string;
  aiProcessing: string;
  tryOnResultAlt: string;
}>;

export type MirrorInterfaceLabels = (typeof mirrorInterfaceCopy)[MirrorLanguage];
