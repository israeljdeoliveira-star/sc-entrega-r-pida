import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ExternalScripts() {
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("gtm_id, ga4_id, google_verification, facebook_pixel_id, custom_tracking_code")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return;

        // Google Tag Manager
        if (data.gtm_id) {
          const s = document.createElement("script");
          s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${data.gtm_id}');`;
          document.head.appendChild(s);
        }

        // GA4
        if (data.ga4_id) {
          const s1 = document.createElement("script");
          s1.async = true;
          s1.src = `https://www.googletagmanager.com/gtag/js?id=${data.ga4_id}`;
          document.head.appendChild(s1);
          const s2 = document.createElement("script");
          s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${data.ga4_id}');`;
          document.head.appendChild(s2);
        }

        // Google Verification
        if (data.google_verification) {
          const meta = document.createElement("meta");
          meta.name = "google-site-verification";
          meta.content = data.google_verification;
          document.head.appendChild(meta);
        }

        // Facebook Pixel
        if (data.facebook_pixel_id) {
          const s = document.createElement("script");
          s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${data.facebook_pixel_id}');fbq('track','PageView');`;
          document.head.appendChild(s);
        }

        // Custom tracking code
        if (data.custom_tracking_code) {
          const code = data.custom_tracking_code.trim();
          // If code contains <script> tags, extract inner content
          const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
          let match;
          let hasScriptTags = false;
          while ((match = scriptRegex.exec(code)) !== null) {
            hasScriptTags = true;
            const inner = match[1].trim();
            if (inner) {
              const s = document.createElement("script");
              s.innerHTML = inner;
              document.head.appendChild(s);
            }
          }
          // If no script tags found, treat as raw JS
          if (!hasScriptTags) {
            const s = document.createElement("script");
            s.innerHTML = code;
            document.head.appendChild(s);
          }
        }
      });
  }, []);

  return null;
}
