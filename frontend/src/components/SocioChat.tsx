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
      defaultLanguage: "es",
      metadata: { socioId, socioEmail, rol },
      initialMessages: ["Hola, soy el asistente virtual de Cooprestamos. ¿En qué te ayudo hoy?"],
      loadPreviousSession: true,
      showWelcomeScreen: false,
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
