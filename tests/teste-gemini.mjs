const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY não configurada");
}

const model = "gemini-2.5-flash-lite";

const inicio = performance.now();

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Explique em uma frase o que é uma VPN.",
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  }
);

const data = await response.json();

console.log("Status HTTP:", response.status);
console.log(
  "Tempo:",
  Math.round(performance.now() - inicio),
  "ms"
);

if (!response.ok) {
  console.error("Erro da API:", data.error?.message);
} else {
  console.log(
    "Resposta:",
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
  );
}