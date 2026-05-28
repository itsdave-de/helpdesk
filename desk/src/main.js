import { createApp, h } from "vue";
import {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  FeatherIcon,
  FormControl,
  frappeRequest,
  FrappeUI,
  Input,
  setConfig,
  TextInput,
  toast,
  Tooltip,
} from "frappe-ui";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createDialog } from "./components/dialogs";
import "./index.css";
import { router } from "./router";
import { telemetryPlugin } from "frappe-ui/frappe";
import { isCustomerPortal } from "@/utils";
import { translationPlugin } from "./translation";
import CircleAlert from "~icons/lucide/circle-alert";
import { initSocket } from "./socket";

const globalComponents = {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  FeatherIcon,
  FormControl,
  Input,
  Tooltip,
  TextInput,
};

setConfig("resourceFetcher", frappeRequest);
setConfig("serverMessagesHandler", (msgs) => {
  if (isCustomerPortal.value) {
    return;
  }
  msgs.forEach((msg) => {
    msg = JSON.parse(msg);
    if (msg && msg.message == "Feedback email has been sent to the customer.") {
      toast.success(msg.message);
      return;
    }
    toast.create({
      message: msg.message,
      icon: h(CircleAlert, { class: "text-ink-blue-2" }),
    });
  });
});
setConfig("fallbackErrorHandler", (error) => {
  const msg = error.exc_type
    ? (error.messages || error.message || []).join(", ")
    : error.message;
  toast.error(msg);
});

const pinia = createPinia();
const app = createApp(App);

app.use(FrappeUI);
app.use(pinia);
app.use(router);
app.use(translationPlugin);
app.use(telemetryPlugin, { app_name: "helpdesk" });

for (const c in globalComponents) {
  app.component(c, globalComponents[c]);
}

app.config.globalProperties.$dialog = createDialog;

// Load helpdesk addon questionnaire scripts
(function loadQuestionnaireAddon() {
  console.log('🔌 Loading Helpdesk Addon Questionnaire...');

  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log('✅ Loaded:', src);
      if (callback) callback();
    };
    script.onerror = () => console.error('❌ Failed to load:', src);
    document.head.appendChild(script);
  }

  function loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  // Bei Aenderungen an questionnaire_integration.js / questionnaire.iife.js
  // diesen Wert bumpen, damit der Browser nicht die alte Version aus dem
  // HTTP-Cache liefert (statische Dateien werden ohne Hash ausgeliefert).
  const v = '?v=20260528e';
  loadCSS('/assets/helpdesk_addon/dist/questionnaire.css' + v);
  loadScript('/assets/helpdesk_addon/dist/questionnaire.iife.js' + v, () => {
    loadScript('/assets/helpdesk_addon/js/questionnaire_integration.js' + v);
  });
  loadScript('/assets/helpdesk_addon/js/close_with_comment.js' + v);
})();

let socket;
if (import.meta.env.DEV) {
  frappeRequest({
    url: "/api/method/helpdesk.www.helpdesk.index.get_context_for_dev",
  }).then((values) => {
    for (let key in values) {
      window[key] = values[key];
    }
    socket = initSocket();
    app.config.globalProperties.$socket = socket;
    app.mount("#app");
  });
} else {
  socket = initSocket();
  app.config.globalProperties.$socket = socket;
  app.mount("#app");
}
