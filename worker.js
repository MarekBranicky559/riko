\
    /**
     * Riko OS API proxy for Cloudflare Workers.
     *
     * Required Worker secrets:
     *   OPENAI_API_KEY
     *   GEMINI_API_KEY
     *
     * Required variable:
     *   ALLOWED_ORIGIN = https://YOUR-USERNAME.github.io
     *
     * Optional variables:
     *   CHAT_MODEL  = gpt-4o-mini
     *   IMAGE_MODEL = gemini-2.5-flash-image
     */

    const json = (data, status, headers) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
      });

    function corsHeaders(request, env) {
      const origin = request.headers.get("Origin") || "";
      const allowed = (env.ALLOWED_ORIGIN || "").replace(/\/+$/, "");
      const headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      };
      if (origin && allowed && origin.replace(/\/+$/, "") === allowed) {
        headers["Access-Control-Allow-Origin"] = origin;
      }
      return headers;
    }

    function safeError(message, status = 500) {
      return { error: String(message || "Nastala neznáma chyba.").slice(0, 500), status };
    }

    export default {
      async fetch(request, env) {
        const headers = corsHeaders(request, env);
        const origin = request.headers.get("Origin") || "";
        const allowed = (env.ALLOWED_ORIGIN || "").replace(/\/+$/, "");

        if (request.method === "OPTIONS") {
          if (!allowed || origin.replace(/\/+$/, "") !== allowed) {
            return new Response(null, { status: 403 });
          }
          return new Response(null, { status: 204, headers });
        }

        if (!allowed || origin.replace(/\/+$/, "") !== allowed) {
          return json(safeError("Táto webová adresa nemá povolený prístup.", 403), 403, headers);
        }

        if (request.method !== "POST") {
          return json(safeError("Použi metódu POST.", 405), 405, headers);
        }

        const url = new URL(request.url);
        let body;
        try {
          body = await request.json();
        } catch {
          return json(safeError("Neplatné JSON údaje.", 400), 400, headers);
        }

        try {
          if (url.pathname === "/chat") {
            if (!env.OPENAI_API_KEY) {
              return json(safeError("Na serveri chýba tajná premenná OPENAI_API_KEY.", 500), 500, headers);
            }
            if (!Array.isArray(body.messages) || body.messages.length === 0) {
              return json(safeError("Správa je prázdna." , 400), 400, headers);
            }

            const messages = body.messages.slice(-30).map(item => ({
              role: item.role === "assistant" ? "assistant" : "user",
              content: String(item.content || "").slice(0, 12000)
            }));

            const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: env.CHAT_MODEL || "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: "Voláš sa Riko. Odpovedaj po slovensky, prirodzene, priateľsky a zrozumiteľne. Pri školských otázkach vysvetľuj primerane veku žiaka. Ak si nie si istý, povedz to."
                  },
                  ...messages
                ],
                temperature: 0.7,
                max_tokens: 1200
              })
            });

            const data = await upstream.json().catch(() => ({}));
            if (!upstream.ok) {
              const message = data?.error?.message || `OpenAI API chyba (${upstream.status}).`;
              return json(safeError(message, upstream.status), upstream.status, headers);
            }

            const answer = data?.choices?.[0]?.message?.content;
            if (!answer) return json(safeError("AI nevrátilo textovú odpoveď."), 502, headers);
            return json({ text: answer }, 200, headers);
          }

          if (url.pathname === "/image") {
            if (!env.GEMINI_API_KEY) {
              return json(safeError("Na serveri chýba tajná premenná GEMINI_API_KEY."), 500, headers);
            }
            const prompt = String(body.prompt || "").trim().slice(0, 4000);
            if (!prompt) return json(safeError("Najprv opíš obrázok." , 400), 400, headers);

            const model = env.IMAGE_MODEL || "gemini-2.5-flash-image";
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
            const upstream = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
              })
            });

            const data = await upstream.json().catch(() => ({}));
            if (!upstream.ok) {
              const message = data?.error?.message || `Gemini API chyba (${upstream.status}).`;
              return json(safeError(message, upstream.status), upstream.status, headers);
            }

            const parts = data?.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find(part => part.inlineData?.data);
            if (!imagePart) {
              const detail = parts.find(part => part.text)?.text;
              return json(safeError(detail || "Gemini nevrátil obrázok. Skús upraviť opis."), 502, headers);
            }
            return json({
              mime: imagePart.inlineData.mimeType || "image/png",
              image: imagePart.inlineData.data
            }, 200, headers);
          }

          return json(safeError("Neznámy endpoint.", 404), 404, headers);
        } catch (error) {
          return json(safeError(error?.message || "Chyba pri komunikácii so serverom."), 500, headers);
        }
      }
    };
