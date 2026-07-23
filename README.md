# 🧠 2Brain

> **Plataforma de Memoria Semántica Relacional** para interconectar pensamientos, proyectos, ideas y tareas con lenguaje natural y búsqueda vectorial ejecutable en el navegador.

---

## 🌟 ¿Qué es 2Brain?

**2Brain** es una plataforma de gestión del conocimiento de segunda generación (Second Brain) diseñada para ayudarte a capturar, estructurar y descubrir relaciones entre tus ideas de forma orgánica y fluida.

A diferencia de las herramientas de notas tradicionales basadas en carpetas rígidas o jerarquías estáticas, **2Brain** representa cada nota, audio, checklist o recurso como un **nodo interconectado en una red neuronal visual**. Gracias a la **Búsqueda Vectorial (Semántica)** impulsada por modelos ultraligeros como **Gemma 2B** y `@xenova/transformers`, puedes realizar consultas en lenguaje natural y encontrar información relevante de forma instantánea, sin necesidad de recordar las palabras clave exactas.

---

## 🚀 Características Principales

- 🕸️ **Visualización en Grafo Interactivo (2D & 3D)**: Visualiza tu red de conocimiento como nodos y conexiones dinámicas interactivas.
- ⚡ **Búsqueda Vectorial Semántica Local**: Ejecuta la búsqueda semántica e inferencia directamente en el navegador con `@xenova/transformers` y Gemma 2B. Sin latencia de servidor y con máxima privacidad.
- 💡 **Paleta de Comandos (Cmd + K)**: Búsqueda rápida, atajos del sistema y síntesis de memoria asistida por Inteligencia Artificial.
- 📋 **Tipos de Notas Multimodales**:
  - 📐 **Arquitectura y Texto**: Documentación técnica o notas estructuradas.
  - 🎙️ **Notas de Voz**: Captura de ideas habladas con duración de audio.
  - 💥 **Listas de Verificación (Checklists)**: Tareas y listas interactiva con estado de cumplimiento.
  - 🎨 **Recursos Visuales**: Notas enriquecidas con imágenes y gráficos.
  - 📊 **Métricas de Entidad**: Seguimiento cuantitativo o porcentual de progreso.
- 🎯 **Filtrado por Categorías de Contexto**: Clasifica y filtra tus nodos en contextos como *Deep Work*, *Philosophical*, *Infrastructure*, *Visuals*, o explora globalmente en *Everywhere*.
- 🔒 **Privacidad y Bajo Consumo**: Diseñado para correr localmente en máquinas de recursos modestos sin depender de GPUs en la nube.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilos y Animaciones**: [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **Renderizado de Grafos**: `react-force-graph-2d`, [Three.js](https://threejs.org/)
- **IA y Búsqueda Vectorial**: `@xenova/transformers` (WASM / ONNX embeddings), Gemma 2B
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Gestor de Paquetes**: [pnpm](https://pnpm.io/)

---

## 💻 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- **Node.js** (versión 18 o superior)
- **pnpm** (recomendado) o `npm`

---

## ⚡ Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd 2Brain
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

4. **Abrir en el navegador:**
   Visita `http://localhost:3000` en tu navegador.

---

## 📜 Scripts Disponibles

- `pnpm dev` - Inicia el servidor de desarrollo local de Vite en el puerto 3000.
- `pnpm build` - Compila la aplicación para producción.
- `pnpm preview` - Sirve la build de producción localmente.
- `pnpm lint` - Ejecuta la verificación de tipos con TypeScript (`tsc --noEmit`).

---

## 📂 Estructura del Proyecto

```text
2Brain/
├── src/
│   ├── components/         # Componentes UI (Grafo, Cards, Modales, Header)
│   │   ├── CmdKModal.tsx      # Paleta de comandos e interacción con IA
│   │   ├── Graph2D.tsx        # Renderizado de grafo 2D de nodos interconectados
│   │   ├── Graph3D.tsx        # Renderizado en 3D con Three.js
│   │   ├── Header.tsx         # Barra superior y control de búsqueda
│   │   ├── NewNoteModal.tsx   # Creación de nuevas memorias / nodos
│   │   └── NoteCard.tsx       # Tarjetas dinámicas de notas y tareas
│   ├── data/               # Nodos y memorias de ejemplo iniciales
│   ├── types.ts            # Definición de interfaces TypeScript
│   ├── App.tsx             # Estado principal y coordinación de componentes
│   └── main.tsx            # Punto de entrada React
├── index.html              # HTML base
├── vite.config.ts          # Configuración de Vite
└── package.json            # Dependencias y scripts del proyecto
```

---

## 📄 Licencia

Licencia MIT. ¡Siéntete libre de utilizar, modificar y extender 2Brain!
