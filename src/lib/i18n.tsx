"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type Locale = "en" | "fr" | "ar"

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.patients": "Patients",
    "nav.appointments": "Appointments",
    "nav.visits": "Visits",
    "nav.prescriptions": "Prescriptions",
    "nav.payments": "Payments",
    "nav.inventory": "Inventory",
    "nav.payroll": "Payroll",
    "nav.analytics": "Analytics",
    "nav.audit_log": "Audit Log",
    "nav.reports": "Reports",
    "nav.staff_scheduling": "Staff Schedule",
    "nav.settings": "Settings",
    "nav.expenses": "Expenses",
    "nav.leaves": "Leave Mgmt",
    "nav.bulk_notify": "Notifications",
    "nav.waiting_room": "Waiting Room",
    "nav.calendar": "Calendar",
    "nav.chat": "Chat",
    "nav.users": "Staff",
    "nav.surveys": "Surveys",
    "nav.rooms": "Rooms",
    "nav.tasks": "Task Board",
    "nav.referral_tracking": "Referrals",
    "nav.staff_reviews": "Reviews",
    "nav.clinics": "Branches",
    "nav.recurring_appointments": "Recurring",
    "nav.budgeting": "Budgeting",
    "nav.consent_forms": "Consents",
    "nav.guide": "Guide",
    "nav.logout": "Log out",

    "dashboard.greeting_morning": "Good morning",
    "dashboard.greeting_afternoon": "Good afternoon",
    "dashboard.greeting_evening": "Good evening",
    "dashboard.today_patients": "Today's Patients",
    "dashboard.monthly_revenue": "Monthly Revenue",
    "dashboard.active_employees": "Active Employees",
    "dashboard.this_month": "This Month",
    "dashboard.appointment_overview": "Appointment Overview",
    "dashboard.status_distribution": "Status Distribution",
    "dashboard.revenue_trend": "Revenue Trend",
    "dashboard.appointment_trend": "Appointment Trend",
    "dashboard.recent_activity": "Recent Activity",
    "dashboard.quick_actions": "Quick Actions",
    "dashboard.recent_payments": "Recent Payments",

    "patients.title": "Patients",
    "patients.description": "Manage your clinic's patients",
    "patients.add": "Add Patient",
    "patients.edit": "Edit Patient",
    "patients.search": "Search patients...",
    "patients.export": "Export",
    "patients.no_patients": "No patients yet",
    "patients.no_results": "No patients found",

    "appointments.title": "Appointments",
    "appointments.description": "Schedule and manage patient appointments",
    "appointments.new": "New Appointment",
    "appointments.edit": "Edit Appointment",
    "appointments.search": "Search by patient name...",
    "appointments.all_statuses": "All Statuses",

    "payments.title": "Payments",
    "payments.description": "Track and manage patient payments",
    "payments.record": "Record Payment",

    "visits.title": "Visits",
    "visits.description": "Track patient consultations",

    "prescriptions.title": "Prescriptions",
    "prescriptions.description": "Manage patient prescriptions",

    "settings.title": "Settings",
    "settings.description": "Configure your preferences",
    "settings.appearance": "Appearance",
    "settings.profile": "Profile",
    "settings.about": "About",
    "settings.data": "Data",
    "settings.theme": "Theme",
    "settings.language": "Language",
    "settings.backup": "Database Backup",
    "settings.restore": "Restore Database",
    "settings.download_backup": "Download Backup",
    "settings.upload_restore": "Upload & Restore",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.export": "Export",
    "common.loading": "Loading...",
    "common.no_data": "No data available",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.date": "Date",
    "common.patient": "Patient",
    "common.doctor": "Doctor",
    "common.amount": "Amount",
    "common.type": "Type",

    "auth.login": "Sign in",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.login_title": "Welcome back",
    "auth.login_subtitle": "Sign in to your account",
  },

  fr: {
    "nav.dashboard": "Tableau de bord",
    "nav.patients": "Patients",
    "nav.appointments": "Rendez-vous",
    "nav.visits": "Visites",
    "nav.prescriptions": "Ordonnances",
    "nav.payments": "Paiements",
    "nav.inventory": "Inventaire",
    "nav.payroll": "Paie",
    "nav.analytics": "Analytique",
    "nav.audit_log": "Journal d'audit",
    "nav.reports": "Rapports",
    "nav.staff_scheduling": "Planning du personnel",
    "nav.settings": "Paramètres",
    "nav.expenses": "Dépenses",
    "nav.leaves": "Congés",
    "nav.bulk_notify": "Notifications",
    "nav.waiting_room": "Salle d'attente",
    "nav.calendar": "Calendrier",
    "nav.chat": "Messagerie",
    "nav.users": "Personnel",
    "nav.surveys": "Enquêtes",
    "nav.rooms": "Salles",
    "nav.tasks": "Tableau des tâches",
    "nav.referral_tracking": "Orientations",
    "nav.staff_reviews": "Évaluations",
    "nav.clinics": "Succursales",
    "nav.recurring_appointments": "Récurrents",
    "nav.budgeting": "Budget",
    "nav.consent_forms": "Consentements",
    "nav.guide": "Guide",
    "nav.logout": "Déconnexion",

    "dashboard.greeting_morning": "Bonjour",
    "dashboard.greeting_afternoon": "Bon après-midi",
    "dashboard.greeting_evening": "Bonsoir",
    "dashboard.today_patients": "Patients du jour",
    "dashboard.monthly_revenue": "Revenu mensuel",
    "dashboard.active_employees": "Employés actifs",
    "dashboard.this_month": "Ce mois",
    "dashboard.appointment_overview": "Aperçu des rendez-vous",
    "dashboard.status_distribution": "Distribution des statuts",
    "dashboard.revenue_trend": "Tendance des revenus",
    "dashboard.appointment_trend": "Tendance des rendez-vous",
    "dashboard.recent_activity": "Activité récente",
    "dashboard.quick_actions": "Actions rapides",
    "dashboard.recent_payments": "Paiements récents",

    "patients.title": "Patients",
    "patients.description": "Gérer les patients de votre clinique",
    "patients.add": "Ajouter un patient",
    "patients.edit": "Modifier le patient",
    "patients.search": "Rechercher des patients...",
    "patients.export": "Exporter",
    "patients.no_patients": "Aucun patient",
    "patients.no_results": "Aucun patient trouvé",

    "appointments.title": "Rendez-vous",
    "appointments.description": "Planifier et gérer les rendez-vous",
    "appointments.new": "Nouveau rendez-vous",
    "appointments.edit": "Modifier le rendez-vous",
    "appointments.search": "Rechercher par nom du patient...",
    "appointments.all_statuses": "Tous les statuts",

    "payments.title": "Paiements",
    "payments.description": "Suivre et gérer les paiements",
    "payments.record": "Enregistrer un paiement",

    "visits.title": "Visites",
    "visits.description": "Suivi des consultations",

    "prescriptions.title": "Ordonnances",
    "prescriptions.description": "Gérer les ordonnances",

    "settings.title": "Paramètres",
    "settings.description": "Configurer vos préférences",
    "settings.appearance": "Apparence",
    "settings.profile": "Profil",
    "settings.about": "À propos",
    "settings.data": "Données",
    "settings.theme": "Thème",
    "settings.language": "Langue",
    "settings.backup": "Sauvegarde de la base de données",
    "settings.restore": "Restaurer la base de données",
    "settings.download_backup": "Télécharger la sauvegarde",
    "settings.upload_restore": "Importer et restaurer",

    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.search": "Rechercher",
    "common.export": "Exporter",
    "common.loading": "Chargement...",
    "common.no_data": "Aucune donnée disponible",
    "common.actions": "Actions",
    "common.status": "Statut",
    "common.date": "Date",
    "common.patient": "Patient",
    "common.doctor": "Médecin",
    "common.amount": "Montant",
    "common.type": "Type",

    "auth.login": "Se connecter",
    "auth.email": "Adresse e-mail",
    "auth.password": "Mot de passe",
    "auth.login_title": "Bienvenue",
    "auth.login_subtitle": "Connectez-vous à votre compte",
  },

  ar: {
    "nav.dashboard": "لوحة التحكم",
    "nav.patients": "المرضى",
    "nav.appointments": "المواعيد",
    "nav.visits": "الزيارات",
    "nav.prescriptions": "الوصفات",
    "nav.payments": "المدفوعات",
    "nav.inventory": "المخزون",
    "nav.payroll": "الرواتب",
    "nav.analytics": "التحليلات",
    "nav.audit_log": "سجل المراجعة",
    "nav.reports": "التقارير",
    "nav.staff_scheduling": "جدول الموظفين",
    "nav.settings": "الإعدادات",
    "nav.expenses": "المصروفات",
    "nav.leaves": "الإجازات",
    "nav.bulk_notify": "الإشعارات",
    "nav.waiting_room": "غرفة الانتظار",
    "nav.calendar": "التقويم",
    "nav.chat": "المحادثات",
    "nav.users": "الموظفون",
    "nav.surveys": "الاستبيانات",
    "nav.rooms": "الغرف",
    "nav.tasks": "لوحة المهام",
    "nav.referral_tracking": "الإحالات",
    "nav.staff_reviews": "التقييمات",
    "nav.clinics": "الفروع",
    "nav.recurring_appointments": "المتكررة",
    "nav.budgeting": "الميزانية",
    "nav.consent_forms": "الموافقات",
    "nav.guide": "الدليل",
    "nav.logout": "تسجيل الخروج",

    "dashboard.greeting_morning": "صباح الخير",
    "dashboard.greeting_afternoon": "مساء الخير",
    "dashboard.greeting_evening": "مساء الخير",
    "dashboard.today_patients": "مرضى اليوم",
    "dashboard.monthly_revenue": "الإيرادات الشهرية",
    "dashboard.active_employees": "الموظفون النشطون",
    "dashboard.this_month": "هذا الشهر",
    "dashboard.appointment_overview": "نظرة عامة على المواعيد",
    "dashboard.status_distribution": "توزيع الحالات",
    "dashboard.revenue_trend": "اتجاه الإيرادات",
    "dashboard.appointment_trend": "اتجاه المواعيد",
    "dashboard.recent_activity": "النشاط الأخير",
    "dashboard.quick_actions": "إجراءات سريعة",
    "dashboard.recent_payments": "المدفوعات الأخيرة",

    "patients.title": "المرضى",
    "patients.description": "إدارة مرضى العيادة",
    "patients.add": "إضافة مريض",
    "patients.edit": "تعديل المريض",
    "patients.search": "البحث عن مرضى...",
    "patients.export": "تصدير",
    "patients.no_patients": "لا يوجد مرضى",
    "patients.no_results": "لم يتم العثور على مرضى",

    "appointments.title": "المواعيد",
    "appointments.description": "جدولة وإدارة المواعيد",
    "appointments.new": "موعد جديد",
    "appointments.edit": "تعديل الموعد",
    "appointments.search": "البحث باسم المريض...",
    "appointments.all_statuses": "جميع الحالات",

    "payments.title": "المدفوعات",
    "payments.description": "تتبع وإدارة المدفوعات",
    "payments.record": "تسجيل دفعة",

    "visits.title": "الزيارات",
    "visits.description": "متابعة الاستشارات",

    "prescriptions.title": "الوصفات",
    "prescriptions.description": "إدارة الوصفات الطبية",

    "settings.title": "الإعدادات",
    "settings.description": "تكوين التفضيلات",
    "settings.appearance": "المظهر",
    "settings.profile": "الملف الشخصي",
    "settings.about": "حول",
    "settings.data": "البيانات",
    "settings.theme": "السمة",
    "settings.language": "اللغة",
    "settings.backup": "نسخ قاعدة البيانات",
    "settings.restore": "استعادة قاعدة البيانات",
    "settings.download_backup": "تحميل النسخة",
    "settings.upload_restore": "رفع واستعادة",

    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.create": "إنشاء",
    "common.search": "بحث",
    "common.export": "تصدير",
    "common.loading": "جاري التحميل...",
    "common.no_data": "لا توجد بيانات",
    "common.actions": "إجراءات",
    "common.status": "الحالة",
    "common.date": "التاريخ",
    "common.patient": "المريض",
    "common.doctor": "الطبيب",
    "common.amount": "المبلغ",
    "common.type": "النوع",

    "auth.login": "تسجيل الدخول",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.login_title": "مرحباً بك",
    "auth.login_subtitle": "سجّل الدخول إلى حسابك",
  },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  dir: "ltr" | "rtl"
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  dir: "ltr",
})

export function useI18n() {
  return useContext(I18nContext)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const saved = localStorage.getItem("clinic_locale") as Locale | null
    if (saved && translations[saved]) setLocaleState(saved)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem("clinic_locale", l)
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = l
  }, [])

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: string) => translations[locale]?.[key] ?? translations.en[key] ?? key,
    [locale]
  )

  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <I18nContext value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext>
  )
}

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
}
