# Secretaria — Milgrup

App PWA para captura rápida de tareas (profesionales y personales) por voz o texto.

## Cómo probarla en local (Mac)

1. Abre Terminal y ve a la carpeta del proyecto:
   ```bash
   cd ruta/a/secretaria
   ```
2. Lanza un servidor local (Python ya viene en Mac):
   ```bash
   python3 -m http.server 8000
   ```
3. Abre Safari en `http://localhost:8000`

## Cómo subirla a GitHub Pages (para usarla en el iPhone)

1. Crea un repo nuevo en GitHub, p.ej. `secretaria`.
2. Sube todos los archivos de esta carpeta al repo.
3. En `Settings → Pages`, activa GitHub Pages desde la rama `main`.
4. En unos minutos tendrás una URL del tipo `https://jjauma.github.io/secretaria/`
5. Abre esa URL en Safari del iPhone → pulsa el botón **Compartir** → **Añadir a pantalla de inicio**.
6. Ya tienes el icono "S" en tu pantalla de inicio, funciona como app nativa.

## Cómo usarla

- **Escribir tarea**: escríbela y pulsa Enter o el botón `+`
- **Dictar tarea**: pulsa el micro, di la tarea, la añade automáticamente al terminar
- **Cambiar entre Profesional / Personal**: pestañas de arriba
- **Marcar hecha**: pulsa el círculo
- **Eliminar**: pulsa la `×`

## Estado actual (Fase 1)

- ✅ Captura por texto y voz (español de España)
- ✅ Separación Pro / Personal
- ✅ Persistencia local (se guarda en el navegador)
- ✅ Funciona offline
- ✅ Instalable como app en iPhone y Mac

## Próximos pasos (Fases 2-3)

- Sincronización entre dispositivos (Supabase)
- Clasificación automática Pro/Personal con Claude API
- Asignación de prioridad y fecha sugerida
- Resumen diario por la mañana
- Recordatorios

## Limitación importante de la Fase 1

Los datos se guardan **solo en el navegador donde los metas**. Si añades una tarea en el iPhone, NO aparece en el Mac todavía. Eso lo arreglamos en la Fase 2 con Supabase (gratis, 5 min de setup).
