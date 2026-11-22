// Isi file ini, lalu unggah bersama index.html dan admin.html ke GitHub.
// backend: "none" (tanpa database), "supabase", atau "firebase"
window.SP_CONFIG = {
  backend: "supabase",
  supabase: {
    url: "https://hemfmhvklalknoyvpwwv.supabase.co",
    anonKey: "sb_publishable_Hk_pd5JojlLbk8dn--z-bw_hTRhA8wE"
  },
  firebase: { projectId: "PROJECT_ID", apiKey: "WEB_API_KEY" },
  // Notifikasi email lewat EmailJS (opsional). provider: "none" atau "emailjs"
  email: { provider: "none", serviceId: "service_xxx", templateId: "template_xxx", publicKey: "PUBLIC_KEY" }
};
