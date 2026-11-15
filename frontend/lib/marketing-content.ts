export type MarketingSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type MarketingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: MarketingSection[];
};

export const marketingPages: Record<string, MarketingPageContent> = {
  "how-it-works": {
    eyebrow: "Qanday ishlaydi",
    title: "Sinashdan xaridgacha — sodda yo‘l",
    description:
      "MIRROR raqamli katalog va jismoniy do‘kon tajribasini bir joyga olib keladi. Xaridor ko‘radi, sinaydi va keyingi qadamni o‘zi tanlaydi.",
    sections: [
      {
        title: "Katalogni tayyorlang",
        body: "Mahsulot, variant va narx ma’lumotlarini brend katalogidan boshqaring. Mahsulot tasvirlari haqiqiy katalog ma’lumotlariga bog‘lanadi.",
        bullets: ["Mahsulot va variantlar", "Haqiqiy narx hamda mavjudlik", "Brendga mos taqdimot"],
      },
      {
        title: "Virtual oynada ko‘ring",
        body: "Xaridor kategoriya bo‘yicha tanlaydi va kamera ishlatilishidan oldin ruxsat beradi. Interfeys telefon, planshet va do‘kon kioski uchun moslashadi.",
        bullets: ["Kamera faqat tanlovdan keyin yoqiladi", "Ro‘yxatdan o‘tish majburiy emas", "Til va ekran yo‘nalishiga mos UI"],
      },
      {
        title: "Do‘kon bilan davom eting",
        body: "MIRROR katalogdagi mahsulot tafsilotlarini va filial bo‘yicha mavjudlikni ko‘rsatish uchun mo‘ljallangan. Xarid yo‘li do‘kon jarayoningizga mos sozlanadi.",
        bullets: ["Filial bo‘yicha mahsulot ko‘rinishi", "Xaridga o‘tish uchun aniq CTA", "Jamoa uchun boshqaruv paneli"],
      },
    ],
  },
  features: {
    eyebrow: "Imkoniyatlar",
    title: "Sinov xonasi va retail boshqaruvi — yagona tajribada",
    description:
      "MIRROR xaridor interfeysi bilan brend va do‘kon jamoalarining kundalik ishini bog‘lash uchun ishlab chiqilmoqda.",
    sections: [
      {
        title: "Virtual kiyib ko‘rish",
        body: "Kiyim, poyabzal va aksessuarlarni vizual ko‘rib chiqish uchun mo‘ljallangan kiosk interfeysi.",
        bullets: ["Landscape va portrait ekranlar", "Kamera ruxsati va xatolik holatlari", "Kategoriya va variant tanlovi"],
      },
      {
        title: "Mahsulot va zaxira",
        body: "Mahsulot, variant, filial biriktiruvi va zaxira ma’lumotlarini yagona katalogda boshqarish imkoniyati.",
        bullets: ["Variant va SKU ma’lumotlari", "Filial kesimidagi mavjudlik", "Mahsulot holati va o‘zgarish tarixi"],
      },
      {
        title: "Jamoa boshqaruvi",
        body: "Brand, store va staff rollari uchun alohida ish maydonlari hamda ruxsatlar bilan kengaytiriladigan boshqaruv.",
        bullets: ["Rolga mos ish maydoni", "Filial doirasida cheklangan ko‘rinish", "Muhim amallar uchun audit izi"],
      },
    ],
  },
  "for-brands": {
    eyebrow: "Brendlar uchun",
    title: "Brend tajribasini do‘konning o‘zida davom ettiring",
    description:
      "MIRROR brend katalogi, virtual kiyib ko‘rish va filialdagi mahsulot ma’lumotlarini bir oqimda birlashtirishga yordam beradi.",
    sections: [
      {
        title: "Brendingizga mos ko‘rinish",
        body: "Kiosk va mahsulot taqdimoti brend identifikatsiyasiga mos sozlanishi mumkin. Xaridor e’tibori mahsulotning o‘zida qoladi.",
        bullets: ["Brend nomi va katalogi", "Mahsulot tafsilotlari", "Mobil va kiosk ekranlari"],
      },
      {
        title: "Filiallarni tartibli boshqaring",
        body: "Brend ichidagi filiallar va qurilmalar uchun alohida ko‘rinish, mahsulot biriktiruvi va operatsion holatni rejalashtiring.",
        bullets: ["Filial bo‘yicha assortiment", "Qurilma va filial holati", "Jamoa rollari uchun kengaytiriladigan model"],
      },
    ],
  },
  pricing: {
    eyebrow: "Tariflar",
    title: "Biznesingiz ko‘lamiga mos yondashuv",
    description:
      "Filiallar, qurilmalar va kerakli imkoniyatlar har bir biznesda farq qiladi. Shu sababli narxni real ehtiyojlar asosida muhokama qilamiz.",
    sections: [
      {
        title: "Avval ehtiyojni aniqlaymiz",
        body: "Demo davomida joriy katalog, do‘konlar va ish jarayonini ko‘rib chiqamiz. Hech qanday tasdiqlanmagan narx yoki limit ko‘rsatilmaydi.",
        bullets: ["Filial va qurilmalar soni", "Katalog va zaxira talablari", "Joriy tizimlar bilan ishlash ehtiyoji"],
      },
      {
        title: "Aniq taklif, shaffof tarkib",
        body: "Sizga mos taklif funksiyalar, qo‘llab-quvvatlash va joriy etish doirasini aniq bayon qiladi.",
        bullets: ["Oldindan kelishilgan doira", "Qo‘shimcha talablarni alohida muhokama qilish", "Demo so‘rovi bepul"],
      },
    ],
  },
  "privacy-security": {
    eyebrow: "Maxfiylik va xavfsizlik",
    title: "Ishonch — tajribaning bir qismi",
    description:
      "Kamera, akkaunt va shaxsiy ma’lumotlar haqida tanlov foydalanuvchining o‘zida bo‘lishi kerak. MIRROR tajribasi shu tamoyil bilan quriladi.",
    sections: [
      {
        title: "Kamera ruxsati sizdan boshlanadi",
        body: "Kamera ruxsati so‘ralishidan oldin foydalanuvchiga nima uchun kerakligi tushuntiriladi. Ruxsat berilmasa ham sahifani ko‘rish mumkin.",
        bullets: ["Kamera faqat foydalanuvchi tanlaganda ishga tushadi", "Kamera mavjud bo‘lmagan holat uchun alohida yo‘l", "Rozilikni istalgan payt bekor qilish mumkin"],
      },
      {
        title: "Faqat zarur ma’lumot",
        body: "Demo so‘rovida yuborilgan aloqa ma’lumotlari so‘rovni ko‘rib chiqish uchun ishlatiladi. Maxfiylik siyosati ma’lumotlardan foydalanish va saqlash tartibini belgilaydi.",
        bullets: ["So‘rov shaklida aniq maqsad", "Kirishlar serverda tekshiriladi", "Ma’muriy amallar audit tarixiga yoziladi"],
      },
    ],
  },
  about: {
    eyebrow: "Biz haqimizda",
    title: "Do‘kondagi tanlovni yanada aniqroq qilish uchun",
    description:
      "MIRROR — moda chakana savdosi uchun virtual kiyib ko‘rish va operatsion boshqaruv platformasi.",
    sections: [
      {
        title: "Mahsulot birinchi o‘rinda",
        body: "Texnologiya xaridorga mahsulotni yaxshiroq tushunishga yordam berishi kerak. MIRROR do‘kon tajribasini murakkablashtirmasdan, ko‘rish va tanlash jarayonini soddalashtirishga qaratilgan.",
      },
      {
        title: "Xaridor va jamoa uchun",
        body: "Xaridor virtual sinov xonasidan foydalanadi, jamoa esa katalog, variant va filial ma’lumotlarini tartibli boshqarish uchun yagona ish maydoniga ega bo‘ladi.",
      },
    ],
  },
  faq: {
    eyebrow: "Savol-javob",
    title: "MIRROR haqida ko‘p beriladigan savollar",
    description: "Virtual fitting, maxfiylik, mahsulot katalogi va demo jarayoni haqida qisqa javoblar.",
    sections: [],
  },
};

export const faqItems = [
  {
    question: "Virtual oynani ishlatish uchun akkaunt kerakmi?",
    answer: "Yo‘q. Virtual oynani ko‘rish va katalogni sinash uchun akkaunt talab qilinmaydi.",
  },
  {
    question: "Kamera qachon yoqiladi?",
    answer: "Kamera faqat foydalanuvchi ruxsat berish tugmasini bosgandan keyin yoqiladi. Ruxsat rad etilsa, kamera talab qilmaydigan holat ko‘rsatiladi.",
  },
  {
    question: "Mahsulot narxi yoki mavjudligi qayerdan olinadi?",
    answer: "Mahsulot ma’lumoti brend katalogi va filial ma’lumotlariga bog‘lanadi. Demo vaqtida joriy ma’lumot manbalaringizni muhokama qilamiz.",
  },
  {
    question: "Narxlar qanday belgilanadi?",
    answer: "Narx filiallar, qurilmalar va kerakli imkoniyatlarga qarab kelishiladi. Saytda tasdiqlanmagan narxlar ko‘rsatilmaydi.",
  },
  {
    question: "Demo qanday so‘raladi?",
    answer: "Demo sahifasidagi qisqa shaklni yuboring. Jamoa so‘rovingizni ko‘rib chiqib, siz bilan bog‘lanadi.",
  },
];
