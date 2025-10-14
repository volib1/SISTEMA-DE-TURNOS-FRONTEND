# 🔊 Configuración de Síntesis de Voz en Brave Browser

## ⚠️ Problema
Brave Browser tiene configuraciones de privacidad que pueden bloquear la síntesis de voz (Speech Synthesis API).

## ✅ Solución - Configurar Brave

### Opción 1: Deshabilitar "Shields" para el sitio local

1. **Abre la pantalla de espera** en Brave
2. **Haz clic en el icono del león** (Brave Shields) en la barra de direcciones
3. **Desactiva los Shields** para `localhost` o tu dominio
4. **Recarga la página**

### Opción 2: Configuración de Privacidad

1. Ve a **Configuración** → `brave://settings/`
2. En el menú izquierdo, selecciona **Privacidad y seguridad**
3. Baja hasta **Configuración del sitio**
4. Busca **Permisos adicionales** → **Sonido**
5. Asegúrate de que **"Los sitios pueden reproducir sonido"** esté activado
6. También verifica **"Sin protección adicional"** en el apartado de Fingerprinting

### Opción 3: Permitir JavaScript

1. En **Configuración del sitio**
2. Busca **JavaScript**
3. Asegúrate de que esté en **"Los sitios pueden usar JavaScript"**

## 🧪 Cómo Probar

1. Abre la **Pantalla de Espera**
2. Presiona **F12** para abrir la consola del desarrollador
3. Haz clic en el botón **"🎤 Probar Voz"**
4. Observa los logs en la consola:

### ✅ Logs esperados si funciona:
```
[PantallaEspera] 🔊 Intentando anunciar turno: {ticket: "TEST01", ...}
[PantallaEspera] 🔊 Voz habilitada: true
[PantallaEspera] 🔊 SpeechSynthesis disponible: true
[PantallaEspera] 🎤 Voces disponibles: 21
[PantallaEspera] ✅ Voz en español seleccionada: Google español
[PantallaEspera] ▶️ Reproducción de voz iniciada
[PantallaEspera] ✅ Reproducción de voz finalizada
```

### ❌ Logs si hay error:
```
[PantallaEspera] ❌ SpeechSynthesis no está disponible en este navegador
```
o
```
[PantallaEspera] ❌ Error en reproducción de voz: ...
```

## 🎤 Voces Disponibles

El sistema buscará automáticamente voces en español. Voces comunes en Brave/Chrome:

- **Google español** (es-ES)
- **Google español de Estados Unidos** (es-US)
- **Microsoft Laura** (es-ES) - en Windows
- **Mónica** (es-MX) - en Windows

## 🔧 Alternativas si no funciona

### Prueba en Google Chrome
Brave está basado en Chromium, pero Chrome tiene mejor soporte:
```bash
# Abre el mismo localhost en Chrome
http://localhost:5173
```

### Prueba en Edge
Microsoft Edge también tiene excelente soporte:
```bash
# Abre en Edge
http://localhost:5173
```

## 📝 Verificación del Sistema

Ejecuta este código en la consola del navegador:

```javascript
// Verificar si la API está disponible
console.log('SpeechSynthesis:', 'speechSynthesis' in window);

// Listar voces disponibles
const voices = window.speechSynthesis.getVoices();
console.log('Voces totales:', voices.length);

// Filtrar voces en español
const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
console.log('Voces en español:', spanishVoices);

// Probar un anuncio simple
const test = new SpeechSynthesisUtterance('Prueba de voz');
test.lang = 'es-ES';
window.speechSynthesis.speak(test);
```

## 💡 Notas Importantes

1. **Volumen del sistema**: Verifica que el volumen de tu computadora esté activo
2. **Volumen del navegador**: Algunos sistemas tienen control de volumen por aplicación
3. **Primera interacción**: Los navegadores requieren que el usuario haga clic primero (política de autoplay)
4. **Privacidad de Brave**: Es normal que Brave bloquee esto por defecto - es parte de su filosofía de privacidad

## 🚀 Siguiente Paso

Una vez configurado Brave correctamente:
1. Haz clic en **"🎤 Probar Voz"**
2. Deberías escuchar: *"Turno TEST01, ventanilla 1"*
3. Si funciona, ¡ya está listo para anunciar turnos reales!

---

**¿Sigue sin funcionar?** Comparte los logs de la consola para diagnosticar el problema específico.
