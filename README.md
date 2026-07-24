# 🧠 2Brain

> **Plataforma de Memoria Semántica Local** para interconectar pensamientos, proyectos, ideas y tareas con búsqueda vectorial y clasificación de IA, ejecutable íntegramente en el navegador.

---

## 🌟 ¿Qué es 2Brain?

**2Brain** es una plataforma de gestión del conocimiento (Second Brain) que combina notas de texto con búsqueda semántica local y clasificación asistida por IA. Cada nota se representa como un nodo en un grafo interactivo, creando una red visual de tus conocimientos.

Lo único que necesitas es escribir. La IA:
- **Genera automáticamente** títulos concisos y descriptivos
- **Asigna categorías dinámicas** que evolucionan con tus notas
- **Crea tags semánticos** relevantes para cada nota
- **Calcula embeddings** para búsqueda por significado (no por palabras clave)

---

## 🚀 Características Principales

- **🕸️ Grafo 2D Interactivo**: Visualiza tu red de conocimiento como nodos conectados dinámicamente. Haz zoom, arrastra nodos, filtra por categoría o tag.

- **🔍 Búsqueda Semántica Híbrida**: Combina búsqueda por keywords y vectorial en tiempo real. Si tienes notas sin embedding, puedes re-indexarlas desde Settings.

- **✨ Clasificación IA Automática**: Al crear una nota, la IA genera:
  - Título limpio y conciso
  - Categoría (de las existentes o nueva)
  - Tags semánticos relevantes

- **⚙️ 4 Proveedores de IA en la Nube**: Configurable en Settings → AI Model:
  - **NVIDIA Build** (Gemma-4-31b-it) — default, acceso gratuito con límite diario
  - **OpenRouter** — modelos LLaMA gratuitos
  - **Groq** — inferencia ultrarrápida
  - **Google AI Studio** — Gemini con tier gratuito generoso
  - Las API keys se guardan localmente (no enviamos a servidores)

- **💾 Embeddings Locales**: El modelo `all-MiniLM-L6-v2` (~90 MB) ejecuta localmente en tu navegador vía `@huggingface/transformers`. Tu contenido nunca sale de tu máquina para búsqueda semántica.

- **🔐 Privacidad y Seguridad**:
  - Base de datos cifrada (AES-256-GCM) en IndexedDB
  - Backup y restauración cifrada
  - PIN biométrico opcional
  - Seed de recuperación de 12 palabras
  - Auto-lock tras inactividad

- **🎯 Filtrado Avanzado**: Filtra por categoría, tag, o búsqueda semántica. Combina múltiples filtros simultaneamente.

- **⌨️ Paleta de Comandos**: Cmd+K para búsqueda rápida y acciones del sistema.

- **📊 Categorías Dinámicas**: Las categorías crecen con tu contenido. No limitadas a una lista estática.

---

## 🛠️ Stack Técnico

**Frontend & UI:**
- React 19 (hooks, funcionales)
- TypeScript 5.8
- Vite 6.4 (bundler, dev server con proxy CORS)
- Tailwind CSS 4 (utilitarios)
- Lucide React (iconografía SVG)
- Motion (animaciones)

**IA & Embeddings:**
- `@huggingface/transformers` 4.2+ (ONNX Runtime Web + WebAssembly)
  - `all-MiniLM-L6-v2` para embeddings locales (384-dim, cosine similarity)
  - APIs cloud OpenAI-compatibles (NVIDIA Build, OpenRouter, Groq, Google)

**Base de Datos & Persistencia:**
- sql.js 1.14 (SQLite en memoria, indexedDB via wa-sqlite)
- IndexedDB nativo del navegador
- Migrations versionadas (v1 inicial, v2 embeddings + auto_categorized)

**Grafos:**
- `react-force-graph-2d` 1.29 (nodos, conexiones, física)
- Three.js 0.185 (soporte para 3D futuro)

**Seguridad:**
- TweetNaCl.js (cifrado NaCl Box, key derivation)
- bip39 (seed de recuperación)

---

## 💻 Requisitos Previos

- **Node.js** 18+ 
- **pnpm** (recomendado) o npm
- **Chrome/Edge** 113+ o navegador con WebGPU (para LLM en navegador si lo necesitas; las APIs cloud funcionan en cualquier navegador)

---

## ⚡ Instalación y Uso Local

### 1. Clonar y preparar
```bash
git clone <URL_DEL_REPOSITORIO>
cd 2Brain
pnpm install
```

### 2. Configurar API keys (opcional, solo para clasificación IA)

Crea un archivo `.env` en la raíz del proyecto con las claves que desees usar:

```bash
# NVIDIA Build (default) — gemma-4-31b-it
VITE_NVIDIA_API_KEY="nvapi-tu-clave-aqui"

# OpenRouter — gemma-3-27b-it:free
VITE_OPENROUTER_API_KEY="tu-clave"

# Groq — llama-3.1-8b-instant
VITE_GROQ_API_KEY="tu-clave"

# Google AI Studio — gemini-2.0-flash-lite
VITE_GOOGLE_API_KEY="tu-clave"
```

Opciones para conseguir claves gratuitas:
- NVIDIA Build: https://build.nvidia.com
- OpenRouter: https://openrouter.ai/keys
- Groq: https://console.groq.com/keys
- Google AI Studio: https://aistudio.google.com/apikey

### 3. Iniciar el desarrollo
```bash
pnpm dev
```

Visita `http://localhost:3000`. El Vite dev server incluye proxy CORS para las APIs de IA.

---

## 📜 Scripts Disponibles

- `pnpm dev` — Inicia el servidor de desarrollo Vite en puerto 3000
- `pnpm build` — Compila TypeScript + bundle Vite para producción en `dist/`
- `pnpm preview` — Sirve la build de producción localmente
- `pnpm lint` — Verifica tipos con TypeScript (`tsc --noEmit`)

---

## 📂 Estructura del Proyecto

```text
2Brain/
├── src/
│   ├── ai/                    # Motor de IA
│   │   ├── EmbeddingService.ts   # all-MiniLM-L6-v2 local (embeddings)
│   │   ├── LlmService.ts         # Cloud APIs (NVIDIA, OpenRouter, Groq, Google)
│   │   ├── Pipeline.ts           # Orquestador: embedding + clasificación
│   │   ├── prompts.ts            # Construye prompts para clasificación
│   │   └── index.ts              # Exports
│   ├── auth/                  # Autenticación y seguridad
│   │   ├── AuthProvider.tsx      # Context de auth + lógica PIN/biometric
│   │   └── useKeypadInput.ts     # Hook para entrada PIN
│   ├── components/            # UI React
│   │   ├── Header.tsx            # Barra superior + search
│   │   ├── FilterBar.tsx         # Filtros categoria/tag/búsqueda
│   │   ├── Graph2D.tsx           # Grafo 2D interactivo
│   │   ├── NoteCard.tsx          # Tarjeta de nota
│   │   ├── NewNoteModal.tsx      # Modal crear nota (content-first)
│   │   ├── NoteDetailModal.tsx   # Modal ver/editar nota
│   │   ├── SettingsModal.tsx     # Settings + AI config + re-index
│   │   ├── CmdKModal.tsx         # Paleta de comandos
│   │   └── index.ts              # Exports
│   ├── db/                    # Base de datos
│   │   ├── DbClient.ts           # sql.js wrapper
│   │   ├── NotesRepository.ts    # CRUD de notas
│   │   ├── VectorRepository.ts   # KNN búsqueda vectorial (cosine sim)
│   │   ├── migrations.ts         # Versionado de schema
│   │   ├── schema.ts             # Definiciones SQL
│   │   ├── types.ts              # Interfaces DB
│   │   └── index.ts              # Exports
│   ├── security/              # Criptografía
│   │   ├── cipher.ts             # AES-256-GCM encriptación
│   │   ├── keystore.ts           # Manejo de claves maestra
│   │   ├── kdf.ts                # Derivación de claves
│   │   ├── backup.ts             # Backup/restore cifrado
│   │   ├── recoverySeed.ts       # Generador BIP39
│   │   ├── logSanitizer.ts       # Logging seguro
│   │   └── index.ts              # Exports
│   ├── App.tsx                # Componente raíz + orquestación
│   ├── types.ts               # Tipos globales (NoteItem, Category, etc)
│   ├── main.tsx               # Entry point React
│   ├── index.css              # Estilos globales
│   └── vite-env.d.ts          # Tipos Vite
├── index.html                 # HTML base
├── vite.config.ts             # Config Vite + proxy CORS
├── tsconfig.json              # Configuración TypeScript
├── tailwind.config.js         # Configuración Tailwind
├── .env.example               # Template de vars de entorno
├── package.json               # Dependencias
└── README.md                  # Este archivo
```

---

## 🔄 Cómo Funciona la Clasificación IA

### Flujo al crear una nota

1. **Escribes contenido**, dejas el título en blanco. Haces clic en "Create Note".
2. **App.tsx** crea la nota con placeholder title ("Processing...") y estado initial.
3. **Pipeline.ts** orquesta:
   - `initEmbeddings()` → descarga/carga all-MiniLM-L6-v2 si no existe
   - `extractEmbedding(content)` → genera vector 384-dim del contenido
   - `initLlm()` → conecta al provider de IA configurado (NVIDIA, OpenRouter, etc)
   - `classify()` → envía el contenido + categorías/tags existentes al LLM
   - LLM responde con JSON: `{title, category, tags}`
4. **VectorRepository.upsertEmbedding()** guarda el embedding en la BD
5. **Nota se actualiza** con título, categoría y tags generados

### Búsqueda semántica

Cuando escribes en el search bar:
- `App.tsx` genera un embedding de tu query con all-MiniLM-L6-v2 (local)
- `VectorRepository.search()` busca las notas más similares por cosine similarity
- Se combinan resultados keyword + semánticos, keywords primero

### Re-indexación

Settings → AI Model → Semantic Index:
- "Index missing" → genera embeddings solo para notas que no los tengan
- "Re-index all" → regenera embeddings para todas las notas
- Muestra progreso y estadísticas (notas indexadas vs faltantes)

---

## � Seguridad

- **DB cifrada**: AES-256-GCM, la clave se deriva de tu PIN vía Argon2
- **Sin servidor**: Toda la IA se ejecuta localmente o en APIs que no guardan tu contenido
- **Backup cifrado**: Puedes exportar tu DB entera, cifrada con tu PIN
- **Recovery seed**: 12 palabras BIP39 para recuperar acceso si pierdes el PIN
- **API keys locales**: Se guardan en localStorage por provider, nunca enviadas a servidores propios

---

## 📊 Notas sobre Rendimiento

- **Embeddings locales**: ~0.5 seg por nota en CPU moderno. Se ejecuta en el thread principal de JavaScript pero no bloquea la UI de manera perceptible.
- **LLM**: Depende del provider y modelo. NVIDIA Build con Gemma-4 toma ~2-5 seg típicamente.
- **Base de datos**: sql.js + IndexedDB maneja fácilmente 10k+ notas en navegadores modernos.
- **Grafo 2D**: Force-physics actualiza ~60fps con hasta 1000 nodos sin hilos de trabajo. Más allá requiere optimización.

---

## 📄 Licencia

MIT. Eres libre de usar, modificar y extender 2Brain.

---

## Changelog

### [1.0.0] - 2026-07-24

#### Agregado
- Autenticación con PIN biométrico, DB cifrada AES-256-GCM, auto-lock
- Onboarding con generación de seed de recuperación BIP39
- Grafo neuronal 2D interactivo con force-physics
- Backup/restauración cifrada vía IndexedDB
- Pipeline IA: embeddings locales + clasificación cloud
- 4 proveedores de IA: NVIDIA Build (Gemma-4), OpenRouter, Groq, Google AI Studio
- Búsqueda semántica híbrida (keywords + cosine similarity)
- Modal Settings con profile, PIN, categorías, config IA y re-index
- FilterBar dropdown con badges removibles
- Zoom-to-fit en grafo al quitar filtros
- Categorías dinámicas, schema DB v2 (embeddings + auto_categorized)
- Modal nueva nota content-first (solo escribir, IA genera todo)
- Re-indexación de embeddings desde Settings

#### Corregido
- Proxy CORS para APIs IA en Vite dev server
- Header responsive optimizado
- Wipe completo de vault, DB y localStorage
- Parsing de respuesta LLM con fallback multilinivel
- Desactivar thinking mode en NVIDIA/Gemma-4

#### Cambiado
- Modelo de datos simplificado: solo notas de texto
- Modal nueva nota rediseñada: no requiere título ni categoría
- Banner descarga: simplificado a solo embeddings
- Mensajes search: dinámicos según estado (cache vs descarga)