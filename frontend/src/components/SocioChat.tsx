import { useEffect } from "react";
import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";

type SocioChatProps = {
  webhookUrl?: string;
  socioId?: string | number;
  socioEmail?: string;
  rol?: string;
  mode?: "window" | "fullscreen";
};

/**
 * Chat embebido para socios usando n8n Chat.
 * Solo se monta si hay webhook configurado.
 */
export default function SocioChat({ webhookUrl, socioId, socioEmail, rol, mode = "window" }: SocioChatProps) {
  useEffect(() => {
    if (!webhookUrl) return;

    const targetId = "cooprestamos-chat";
    const target = document.getElementById(targetId);
    if (!target) return;

    const chatInstance = createChat({
      webhookUrl,
      target: `#${targetId}`,
      mode,
      defaultLanguage: "en", // n8n chat solo acepta 'en' en los tipos actuales
      metadata: { socioId, socioEmail, rol },
      initialMessages: [
        "¡Hola! ✌️\nSoy el asistente virtual de COOPRESTAMOS, estoy aquí para brindarte una guía por el sitio web. Puedo ayudarte en cosas como decirte dónde solicitar tus préstamos, hasta una simulación rápida de uno. Estoy aquí para aclarar tus dudas, que no se te olvide. 😊",
      ],
      loadPreviousSession: true,
      showWelcomeScreen: false,
      i18n: {
        en: {
          title: "¡Hola! ✌️",
          subtitle:
            "Soy el asistente virtual de COOPRESTAMOS. Pregúntame dónde solicitar tus préstamos o haz una simulación rápida.",
          footer: "",
          getStarted: "Nueva conversación",
          inputPlaceholder: "Escribe tu pregunta...",
          closeButtonTooltip: "Cerrar chat",
        },
      },
    });

    return () => {
      if (chatInstance && typeof (chatInstance as any).destroy === "function") {
        (chatInstance as any).destroy();
      } else {
        target.innerHTML = "";
      }
    };
  }, [webhookUrl, socioId, socioEmail, rol, mode]);

  if (!webhookUrl) return null;

  return <div id="cooprestamos-chat" aria-label="Chat socios Cooprestamos" />;
}
