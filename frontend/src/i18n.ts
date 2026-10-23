import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  ar: {
    translation: {
      app_name: "خدمات الصيانة",
      login_title: "تسجيل الدخول",
      email: "الإيميل",
    name: "الاسم",
      phone: "رقم الموبايل",
      email_optional: "الإيميل (اختياري)",
      send_code: "ابعت الكود",
      code: "الكود",
      verify: "تأكيد",
      logout: "خروج",
      request_title: "اطلب خدمة",
      placeholder: "اكتب مشكلتك...",
      submit: "إرسال",
      emergency_banner: "⚠️ حالة طوارئ — اتصل فوراً بـ ١٢٣",
      classified_as: "طلبك اتصنف تحت",
      categories: {
        home_appliances: "أجهزة منزلية",
        plumbing: "سباكة",
        electrical: "كهرباء",
        car_service: "خدمة سيارات",
        other: "أخرى",
        emergency: "طوارئ",
     
      },
    },
  },
  en: {
    translation: {
      app_name: "Maintenance Services",
      login_title: "Sign in",
      email: "Email",
      name: "Name",
      phone: "Mobile Number",
      email_optional: "Email (Optional)",
      send_code: "Send code",
      code: "Code",
      verify: "Verify",
      logout: "Log out",
      request_title: "Request a service",
      placeholder: "Describe your issue...",
      submit: "Submit",
      emergency_banner: "⚠️ Emergency — call 123 now",
      classified_as: "Classified as",
      categories: {
        home_appliances: "Home appliances",
        plumbing: "Plumbing",
        electrical: "Electrical",
        car_service: "Car service",
        other: "Other",
        emergency: "Emergency",
       
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "ar",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;