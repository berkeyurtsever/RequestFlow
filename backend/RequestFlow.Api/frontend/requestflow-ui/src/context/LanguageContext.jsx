import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const STORAGE_KEY = "requestflow_language";

const LANGUAGES = {
  en: {
    locale: "en-US",
    label: "English"
  },
  tr: {
    locale: "tr-TR",
    label: "Türkçe"
  }
};

const translations = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.turkish": "Türkçe",
    "brand.subtitle": "Request Management",
    "navigation.main": "Main navigation",
    "navigation.open": "Open navigation menu",
    "navigation.close": "Close navigation menu",
    "navigation.overview": "Overview",
    "navigation.allRequests": "All Requests",
    "navigation.myRequests": "My Requests",
    "navigation.createRequest": "Create Request",
    "navigation.notifications": "Notifications",
    "navigation.knowledgeBase": "Knowledge Base",
    "navigation.assignedTasks": "Assigned Tasks",
    "navigation.reports": "Reports",
    "navigation.employees": "Employees",
    "navigation.auditLog": "Audit Log",
    "navigation.categories": "Categories",
    "navigation.settings": "Settings",
    "navigation.systemHealth": "System Health",
    "navigation.workspace": "WORKSPACE",
    "navigation.management": "MANAGEMENT",
    "navigation.profile": "Open profile",
    "department.it": "IT Department",
    "department.management": "Management",
    "department.standard": "Standard User",
    "role.admin": "Administrator",
    "role.supervisor": "Supervisor",
    "role.staff": "Staff Member",
    "role.user": "Standard User",
    "page.editRequest": "Edit Request",
    "page.profile": "My Profile",
    "page.changePassword": "Change Password",
    "page.accessDenied": "Access Denied",
    "page.notFound": "Page Not Found",
    "page.loaded": "{page} page loaded",
    "page.skip": "Skip to main content",
    "loading.page": "Loading page...",
    "loading.account": "Loading your account...",
    "navbar.searchPlaceholder": "Search RequestFlow...",
    "navbar.searchLabel": "Search RequestFlow",
    "navbar.clearSearch": "Clear search",
    "navbar.searchResults": "SEARCH RESULTS",
    "navbar.searching": "Searching RequestFlow...",
    "navbar.searchUnavailable": "Search unavailable",
    "navbar.noResults": "No results found",
    "navbar.noResultsHelp": "Search requests, help articles or people with another term.",
    "navbar.viewResults": "View all results for “{query}”",
    "navbar.untitled": "Untitled Request",
    "navbar.uncategorized": "Uncategorized",
    "navbar.unknown": "Unknown",
    "navbar.openNotifications": "Open notifications",
    "navbar.recentUpdates": "Recent request updates",
    "navbar.markAllRead": "Mark all read",
    "navbar.updating": "Updating...",
    "navbar.loadingNotifications": "Loading notifications...",
    "navbar.notificationsUnavailable": "Notifications unavailable",
    "navbar.tryAgain": "Try Again",
    "navbar.noNotifications": "No notifications",
    "navbar.notificationsHelp": "Request updates will appear here.",
    "navbar.viewNotifications": "View all notifications",
    "navbar.myProfile": "My Profile",
    "navbar.changePassword": "Change Password",
    "navbar.signOut": "Sign Out",
    "navbar.signingOut": "Signing Out...",
    "navbar.signOutTitle": "Sign out of RequestFlow?",
    "navbar.signOutMessage": "You will need to enter your email and password to access your account again.",
    "navbar.cancel": "Cancel",
    "time.justNow": "Just now",
    "time.minutesAgo": "{count} min ago",
    "time.hoursAgo": "{count} hr ago",
    "time.dayAgo": "{count} day ago",
    "time.daysAgo": "{count} days ago",
    "login.managementSystem": "Request Management System",
    "login.welcome": "WELCOME BACK",
    "login.heroTitle": "Manage company requests from one central platform.",
    "login.heroDescription": "Create, update, assign and monitor requests through a secure workflow.",
    "login.featureTrack": "Track all requests in real time",
    "login.featureAssign": "Assign tasks to authorized staff",
    "login.featureRoles": "Manage roles and categories securely",
    "login.secureFooter": "Secure company request management",
    "login.title": "Sign in to your account",
    "login.description": "Enter your credentials to continue.",
    "login.email": "Email Address",
    "login.password": "Password",
    "login.passwordPlaceholder": "Enter your password",
    "login.showPassword": "Show password",
    "login.hidePassword": "Hide password",
    "login.capsLock": "Caps Lock is on.",
    "login.remember": "Remember me",
    "login.forgot": "Forgot password?",
    "login.submit": "Sign In",
    "login.submitting": "Signing in...",
    "login.demoLabel": "PUBLIC DEMO",
    "login.demoTitle": "Explore with safe demo data",
    "login.demoOpen": "Explore Demo",
    "login.demoOpening": "Opening demo...",
    "login.development": "Development environment",
    "login.localAccount": "Use your local account",
    "login.emailRequired": "Email address is required.",
    "login.emailInvalid": "Enter a valid email address.",
    "login.passwordRequired": "Password is required.",
    "health.eyebrow": "OPERATIONS",
    "health.title": "System Health",
    "health.description": "Monitor the application services and operational resources.",
    "health.refresh": "Refresh",
    "health.refreshing": "Refreshing...",
    "health.lastChecked": "Last checked {time}",
    "health.overall": "Overall status",
    "health.healthy": "Healthy",
    "health.degraded": "Needs attention",
    "health.unavailable": "Unavailable",
    "health.disabled": "Disabled",
    "health.configured": "Configured",
    "health.uptime": "Uptime",
    "health.environment": "Environment",
    "health.version": "Version",
    "health.memory": "Working memory",
    "health.components": "Service status",
    "health.activity": "Operational summary",
    "health.users": "Users",
    "health.requests": "Requests",
    "health.openRequests": "Open requests",
    "health.overdue": "Overdue",
    "health.unread": "Unread notifications",
    "health.api": "API",
    "health.database": "Database",
    "health.email": "Email delivery",
    "health.realtime": "Real-time notifications",
    "health.monitoring": "Error monitoring",
    "health.background": "Background workers",
    "health.responseTime": "{milliseconds} ms response",
    "health.autoRefresh": "Updates automatically every 30 seconds",
    "health.detail.operational": "The API is responding normally.",
    "health.detail.connected": "The application database is connected.",
    "health.detail.databaseUnavailable": "The database connection could not be established.",
    "health.detail.emailEnabled": "SMTP delivery is enabled and configured.",
    "health.detail.emailDisabled": "Email delivery is disabled in this environment.",
    "health.detail.realtime": "The SignalR notification channel is available.",
    "health.detail.monitoringEnabled": "Central error monitoring is configured.",
    "health.detail.monitoringDisabled": "Central error monitoring is not configured.",
    "health.detail.workers": "Notification, SLA and report workers are registered.",
    "health.detail.workersDisabled": "Background workers are disabled during automated tests.",
    "health.loadError": "System health information could not be loaded.",
    "health.retry": "Try again",
    "health.onlyAdmin": "This page is available only to administrators.",
    "search.eyebrow": "DISCOVER",
    "search.title": "Global Search",
    "search.description": "Find requests, knowledge base articles and people from one place.",
    "search.placeholder": "Search by title, category, topic or person...",
    "search.label": "Global search",
    "search.submit": "Search",
    "search.summary": "{count} results for “{query}”",
    "search.start": "Enter at least two characters to search RequestFlow.",
    "search.loading": "Searching RequestFlow...",
    "search.error": "Search results could not be loaded.",
    "search.empty": "No matching results",
    "search.emptyHelp": "Try a broader title, category, topic or person name.",
    "search.type.request": "Request",
    "search.type.knowledge": "Knowledge",
    "search.type.person": "Person",
    "search.group.requests": "Requests",
    "search.group.knowledge": "Knowledge Base",
    "search.group.people": "People"
  },
  tr: {
    "language.label": "Dil",
    "language.english": "İngilizce",
    "language.turkish": "Türkçe",
    "brand.subtitle": "Talep Yönetimi",
    "navigation.main": "Ana menü",
    "navigation.open": "Menüyü aç",
    "navigation.close": "Menüyü kapat",
    "navigation.overview": "Genel Bakış",
    "navigation.allRequests": "Tüm Talepler",
    "navigation.myRequests": "Taleplerim",
    "navigation.createRequest": "Talep Oluştur",
    "navigation.notifications": "Bildirimler",
    "navigation.knowledgeBase": "Bilgi Bankası",
    "navigation.assignedTasks": "Atanan İşler",
    "navigation.reports": "Raporlar",
    "navigation.employees": "Çalışanlar",
    "navigation.auditLog": "İşlem Kayıtları",
    "navigation.categories": "Kategoriler",
    "navigation.settings": "Ayarlar",
    "navigation.systemHealth": "Sistem Sağlığı",
    "navigation.workspace": "ÇALIŞMA ALANI",
    "navigation.management": "YÖNETİM",
    "navigation.profile": "Profili aç",
    "department.it": "Bilgi Teknolojileri",
    "department.management": "Yönetim",
    "department.standard": "Standart Kullanıcı",
    "role.admin": "Yönetici",
    "role.supervisor": "Süpervizör",
    "role.staff": "Personel",
    "role.user": "Standart Kullanıcı",
    "page.editRequest": "Talebi Düzenle",
    "page.profile": "Profilim",
    "page.changePassword": "Şifre Değiştir",
    "page.accessDenied": "Erişim Engellendi",
    "page.notFound": "Sayfa Bulunamadı",
    "page.loaded": "{page} sayfası yüklendi",
    "page.skip": "Ana içeriğe geç",
    "loading.page": "Sayfa yükleniyor...",
    "loading.account": "Hesabınız yükleniyor...",
    "navbar.searchPlaceholder": "RequestFlow'da ara...",
    "navbar.searchLabel": "RequestFlow'da ara",
    "navbar.clearSearch": "Aramayı temizle",
    "navbar.searchResults": "ARAMA SONUÇLARI",
    "navbar.searching": "RequestFlow aranıyor...",
    "navbar.searchUnavailable": "Arama kullanılamıyor",
    "navbar.noResults": "Sonuç bulunamadı",
    "navbar.noResultsHelp": "Talep, yardım yazısı veya kişi için farklı bir ifade deneyin.",
    "navbar.viewResults": "“{query}” için tüm sonuçları gör",
    "navbar.untitled": "Başlıksız Talep",
    "navbar.uncategorized": "Kategorisiz",
    "navbar.unknown": "Bilinmiyor",
    "navbar.openNotifications": "Bildirimleri aç",
    "navbar.recentUpdates": "Son talep güncellemeleri",
    "navbar.markAllRead": "Tümünü okundu işaretle",
    "navbar.updating": "Güncelleniyor...",
    "navbar.loadingNotifications": "Bildirimler yükleniyor...",
    "navbar.notificationsUnavailable": "Bildirimler kullanılamıyor",
    "navbar.tryAgain": "Tekrar Dene",
    "navbar.noNotifications": "Bildirim yok",
    "navbar.notificationsHelp": "Talep güncellemeleri burada görünecek.",
    "navbar.viewNotifications": "Tüm bildirimleri gör",
    "navbar.myProfile": "Profilim",
    "navbar.changePassword": "Şifre Değiştir",
    "navbar.signOut": "Çıkış Yap",
    "navbar.signingOut": "Çıkış yapılıyor...",
    "navbar.signOutTitle": "RequestFlow’dan çıkılsın mı?",
    "navbar.signOutMessage": "Hesabınıza yeniden erişmek için e-posta ve şifrenizi girmeniz gerekecek.",
    "navbar.cancel": "İptal",
    "time.justNow": "Şimdi",
    "time.minutesAgo": "{count} dk önce",
    "time.hoursAgo": "{count} sa önce",
    "time.dayAgo": "{count} gün önce",
    "time.daysAgo": "{count} gün önce",
    "login.managementSystem": "Talep Yönetim Sistemi",
    "login.welcome": "TEKRAR HOŞ GELDİNİZ",
    "login.heroTitle": "Şirket taleplerini tek bir merkezden yönetin.",
    "login.heroDescription": "Talepleri güvenli bir iş akışıyla oluşturun, güncelleyin, atayın ve izleyin.",
    "login.featureTrack": "Tüm talepleri gerçek zamanlı takip edin",
    "login.featureAssign": "İşleri yetkili personele atayın",
    "login.featureRoles": "Rolleri ve kategorileri güvenle yönetin",
    "login.secureFooter": "Güvenli şirket talep yönetimi",
    "login.title": "Hesabınıza giriş yapın",
    "login.description": "Devam etmek için bilgilerinizi girin.",
    "login.email": "E-posta Adresi",
    "login.password": "Şifre",
    "login.passwordPlaceholder": "Şifrenizi girin",
    "login.showPassword": "Şifreyi göster",
    "login.hidePassword": "Şifreyi gizle",
    "login.capsLock": "Caps Lock açık.",
    "login.remember": "Beni hatırla",
    "login.forgot": "Şifrenizi mi unuttunuz?",
    "login.submit": "Giriş Yap",
    "login.submitting": "Giriş yapılıyor...",
    "login.demoLabel": "HERKESE AÇIK DEMO",
    "login.demoTitle": "Güvenli demo verileriyle inceleyin",
    "login.demoOpen": "Demoyu İncele",
    "login.demoOpening": "Demo açılıyor...",
    "login.development": "Geliştirme ortamı",
    "login.localAccount": "Yerel hesabınızı kullanın",
    "login.emailRequired": "E-posta adresi gereklidir.",
    "login.emailInvalid": "Geçerli bir e-posta adresi girin.",
    "login.passwordRequired": "Şifre gereklidir.",
    "health.eyebrow": "OPERASYON",
    "health.title": "Sistem Sağlığı",
    "health.description": "Uygulama servislerini ve operasyonel kaynakları izleyin.",
    "health.refresh": "Yenile",
    "health.refreshing": "Yenileniyor...",
    "health.lastChecked": "Son kontrol: {time}",
    "health.overall": "Genel durum",
    "health.healthy": "Sağlıklı",
    "health.degraded": "İncelenmeli",
    "health.unavailable": "Kullanılamıyor",
    "health.disabled": "Kapalı",
    "health.configured": "Yapılandırıldı",
    "health.uptime": "Çalışma süresi",
    "health.environment": "Ortam",
    "health.version": "Sürüm",
    "health.memory": "Kullanılan bellek",
    "health.components": "Servis durumu",
    "health.activity": "Operasyon özeti",
    "health.users": "Kullanıcılar",
    "health.requests": "Talepler",
    "health.openRequests": "Açık talepler",
    "health.overdue": "Gecikenler",
    "health.unread": "Okunmamış bildirimler",
    "health.api": "API",
    "health.database": "Veritabanı",
    "health.email": "E-posta gönderimi",
    "health.realtime": "Gerçek zamanlı bildirimler",
    "health.monitoring": "Hata takibi",
    "health.background": "Arka plan görevleri",
    "health.responseTime": "{milliseconds} ms yanıt",
    "health.autoRefresh": "Her 30 saniyede otomatik güncellenir",
    "health.detail.operational": "API normal şekilde yanıt veriyor.",
    "health.detail.connected": "Uygulama veritabanına bağlı.",
    "health.detail.databaseUnavailable": "Veritabanı bağlantısı kurulamadı.",
    "health.detail.emailEnabled": "SMTP gönderimi açık ve yapılandırılmış.",
    "health.detail.emailDisabled": "Bu ortamda e-posta gönderimi kapalı.",
    "health.detail.realtime": "SignalR bildirim kanalı kullanılabilir.",
    "health.detail.monitoringEnabled": "Merkezi hata takibi yapılandırılmış.",
    "health.detail.monitoringDisabled": "Merkezi hata takibi yapılandırılmamış.",
    "health.detail.workers": "Bildirim, SLA ve rapor görevleri kayıtlı.",
    "health.detail.workersDisabled": "Otomatik testlerde arka plan görevleri kapalıdır.",
    "health.loadError": "Sistem sağlığı bilgileri yüklenemedi.",
    "health.retry": "Tekrar dene",
    "health.onlyAdmin": "Bu sayfa yalnızca yöneticilere açıktır.",
    "search.eyebrow": "KEŞFET",
    "search.title": "Genel Arama",
    "search.description": "Talepleri, bilgi bankası yazılarını ve kişileri tek yerden bulun.",
    "search.placeholder": "Başlık, kategori, konu veya kişiyle arayın...",
    "search.label": "Genel arama",
    "search.submit": "Ara",
    "search.summary": "“{query}” için {count} sonuç",
    "search.start": "RequestFlow'da aramak için en az iki karakter girin.",
    "search.loading": "RequestFlow aranıyor...",
    "search.error": "Arama sonuçları yüklenemedi.",
    "search.empty": "Eşleşen sonuç yok",
    "search.emptyHelp": "Daha genel bir başlık, kategori, konu veya kişi adı deneyin.",
    "search.type.request": "Talep",
    "search.type.knowledge": "Bilgi",
    "search.type.person": "Kişi",
    "search.group.requests": "Talepler",
    "search.group.knowledge": "Bilgi Bankası",
    "search.group.people": "Kişiler"
  }
};

const LanguageContext = createContext(null);

function translate(language, key, values = {}) {
  const template =
    translations[language]?.[key] ??
    translations.en[key] ??
    key;

  return Object.entries(values).reduce(
    (result, [name, value]) =>
      result.replaceAll(`{${name}}`, String(value)),
    template
  );
}

const fallbackLanguageContext = {
  language: "en",
  locale: LANGUAGES.en.locale,
  languages: LANGUAGES,
  setLanguage: () => {},
  t: (key, values) =>
    translate("en", key, values)
};

function getStoredLanguage() {
  try {
    const storedLanguage = localStorage.getItem(
      STORAGE_KEY
    );

    if (LANGUAGES[storedLanguage]) {
      return storedLanguage;
    }
  } catch (storageError) {
    console.error(
      "Language preference could not be read:",
      storageError
    );
  }

  return navigator.language
    ?.toLowerCase()
    .startsWith("tr")
    ? "tr"
    : "en";
}

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(
    getStoredLanguage
  );

  useEffect(() => {
    document.documentElement.lang = language;

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (storageError) {
      console.error(
        "Language preference could not be saved:",
        storageError
      );
    }
  }, [language]);

  const setLanguage = nextLanguage => {
    if (LANGUAGES[nextLanguage]) {
      setLanguageState(nextLanguage);
    }
  };

  const value = useMemo(
    () => ({
      language,
      locale: LANGUAGES[language].locale,
      languages: LANGUAGES,
      setLanguage,
      t: (key, values) =>
        translate(language, key, values)
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

function useLanguage() {
  const context = useContext(LanguageContext);

  if (context) {
    return context;
  }

  return fallbackLanguageContext;
}

export {
  LanguageProvider,
  useLanguage
};
