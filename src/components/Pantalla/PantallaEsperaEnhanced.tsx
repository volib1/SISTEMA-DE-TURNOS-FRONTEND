import { useEffect, useState, useRef } from 'react';
import { Monitor, Clock, Wifi, WifiOff, Calendar, Play, Pause, SkipForward, SkipBack, Image, RefreshCw } from 'lucide-react';
import { PantallaFeedAPI } from '../../services/pantalla-feed.service';
import { MediaAPI } from '../../services/media.service';
import { getMediaUrl } from '../../services/http';
import type { TicketLlamadoDto } from '../../services/pantalla-feed.service';
import type { MediaFileDTO, MediaConfigDTO } from '../../services/media.service';
import '../../styles/PantallaEspera.enhanced.css';

interface PantallaEsperaEnhancedProps {
  disableVoice?: boolean;
}

export default function PantallaEsperaEnhanced({ disableVoice = false }: PantallaEsperaEnhancedProps = {}) {
  const [llamados, setLlamados] = useState<TicketLlamadoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados para multimedia
  const [mediaFiles, setMediaFiles] = useState<MediaFileDTO[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mediaConfig, setMediaConfig] = useState<MediaConfigDTO | null>(null);
  const mediaIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Estados para sintesis de voz
  const [voiceEnabled, setVoiceEnabled] = useState(!disableVoice);
  const lastAnnouncedRef = useRef<Set<string>>(new Set());
  const esPrimeraCargaRef = useRef(true); // Para no anunciar turnos antiguos al abrir la pantalla

  // Estado para hora en tiempo real
  const [horaActual, setHoraActual] = useState(
    new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  );

  /**
   * Anuncia un turno usando sintesis de voz
   */
  const anunciarTurno = (llamado: TicketLlamadoDto) => {
    console.log('[PantallaEnhanced] Intentando anunciar turno:', llamado);

    if (!voiceEnabled) {
      console.log('[PantallaEnhanced] Voz deshabilitada');
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error('[PantallaEnhanced] SpeechSynthesis no disponible');
      return;
    }

    // ✅ Usar timestamp exacto del llamado del backend como parte de la clave
    // Esto permite detectar cuando es el MISMO llamado (mismo turno, mismo timestamp)
    // vs cuando es un RE-LLAMADO (mismo turno, timestamp diferente)
    // IMPORTANTE: Usar horaTimestamp (milisegundos) en lugar de hora (HH:MM) para detectar re-llamados
    const horaLlamado = llamado.horaTimestamp || Date.now();
    const key = `${llamado.ticket}-${llamado.ventanilla}-${horaLlamado}`;

    // Verificar si ya fue anunciado
    if (lastAnnouncedRef.current.has(key)) {
      console.log('[PantallaEnhanced] ⏭️ Turno ya anunciado, omitiendo:', key);
      return;
    }

    console.log('[PantallaEnhanced] 🔊 Anunciando turno NUEVO con clave:', key);

    lastAnnouncedRef.current.add(key);

    // Limpiar cache antiguo (mantener ultimos 10)
    if (lastAnnouncedRef.current.size > 10) {
      const valores = Array.from(lastAnnouncedRef.current);
      lastAnnouncedRef.current = new Set(valores.slice(-10));
    }

    console.log('[PantallaEnhanced] Mensaje para ticket:', llamado.ticket, 'ventanilla:', llamado.ventanilla);

    window.speechSynthesis.cancel();

    setTimeout(() => {
      // Construir mensaje completo y fluido
      const numeroVentanilla = llamado.ventanilla.replace(/[^\d]/g, '');

      // Convertir dígitos a palabras en español
      const numerosEspanol: Record<string, string> = {
        '0': 'CERO',
        '1': 'UNO',
        '2': 'DOS',
        '3': 'TRES',
        '4': 'CUATRO',
        '5': 'CINCO',
        '6': 'SEIS',
        '7': 'SIETE',
        '8': 'OCHO',
        '9': 'NUEVE'
      };

      // Separar TODOS los caracteres del código con comas
      // Ejemplo: "AA006" → "A, A, CERO, CERO, SEIS" (pausas entre cada carácter)
      const codigo = llamado.ticket;

      // Separar cada carácter, convertir números a palabras y unir con comas
      const codigoConPausas = codigo.split('').map(char => {
        // Si es un dígito, convertirlo a palabra en español
        if (/\d/.test(char)) {
          return numerosEspanol[char];
        }
        // Si es letra, mantenerla como está
        return char;
      }).join(', ');

      // Mensaje completo con pausas entre cada carácter
      // La coma después de "cliente" crea una pausa antes de decir el código
      const mensajeCompleto = `Turno del cliente, ${codigoConPausas}. Diríjase a la ventanilla ${numeroVentanilla}`;

      const utterance = new SpeechSynthesisUtterance(mensajeCompleto);
      utterance.lang = 'es-419'; // Español latinoamericano neutro (más cercano a El Salvador)
      utterance.rate = 0.9; // Velocidad moderada, clara pero no demasiado lenta
      utterance.pitch = 1.0; // Tono neutral y natural
      utterance.volume = 1.0;

      // Seleccionar voces naturales y profesionales (estilo banco)
      const voices = window.speechSynthesis.getVoices();

      const preferredVoices = [
        'Google español de Estados Unidos', // ⭐ MEJOR: Voz latina neutral
        'Microsoft Sabina',       // Voz mexicana neutra (cercana a Centroamérica)
        'es-US-Standard-A',       // Google Cloud latina
        'Paulina',                // macOS voz mexicana neutra
        'Google español',         // Fallback general
        'Microsoft Helena',       // Voz española (backup)
      ];

      let selectedVoice = null;

      // 1. Buscar voces preferidas en orden de prioridad
      for (const preferred of preferredVoices) {
        selectedVoice = voices.find(v =>
          v.name.includes(preferred) && v.lang.startsWith('es')
        );
        if (selectedVoice) break;
      }

      // 2. Fallback: buscar voces latinoamericanas (MX, US, 419)
      if (!selectedVoice) {
        selectedVoice = voices.find(v =>
          (v.lang === 'es-US' || v.lang === 'es-MX' || v.lang === 'es-419') &&
          (v.name.toLowerCase().includes('female') ||
           v.name.toLowerCase().includes('sabina') ||
           v.name.toLowerCase().includes('paulina'))
        );
      }

      // 3. Fallback: cualquier voz latina online (mejor calidad)
      if (!selectedVoice) {
        selectedVoice = voices.find(v =>
          (v.lang === 'es-US' || v.lang === 'es-MX' || v.lang === 'es-419') && !v.localService
        );
      }

      // 4. Fallback: cualquier voz española online
      if (!selectedVoice) {
        selectedVoice = voices.find(v =>
          v.lang.startsWith('es') && !v.localService
        );
      }

      // 5. Último fallback: cualquier voz española disponible
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('es'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('[PantallaEnhanced] 🎙️ Voz seleccionada (estilo banco):', selectedVoice.name);
      }

      utterance.onend = () => console.log('[PantallaEnhanced] ✅ Anuncio completado');
      utterance.onerror = (e) => console.error('[PantallaEnhanced] ❌ Error:', e);

      console.log('[PantallaEnhanced] 🔊 Anunciando:', mensajeCompleto);
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PantallaFeedAPI.ultimosLlamados();

      console.log('[PantallaEnhanced] Carga de datos - Nuevos:', data.length, 'Previos:', llamados.length);

      // Detectar turnos nuevos que no estaban antes
      // IMPORTANTE: Comparar también horaTimestamp para detectar RE-LLAMADOS del mismo turno
      const nuevosLlamados = data.filter(nuevoLlamado => {
        const existeAntes = llamados.some(
          existente => existente.ticket === nuevoLlamado.ticket &&
                       existente.ventanilla === nuevoLlamado.ventanilla &&
                       existente.horaTimestamp === nuevoLlamado.horaTimestamp // ✅ CRÍTICO para detectar re-llamados
        );

        if (!existeAntes) {
          console.log('[PantallaEnhanced] NUEVO TURNO:', nuevoLlamado.ticket, 'Vent:', nuevoLlamado.ventanilla, 'Timestamp:', nuevoLlamado.horaTimestamp);
        }

        return !existeAntes;
      });

      console.log('[PantallaEnhanced] Total NUEVOS:', nuevosLlamados.length);

      // ✅ NO anunciar en la primera carga (turnos antiguos del historial)
      // Solo anunciar cuando ya hay datos previos y llega un turno realmente nuevo
      if (nuevosLlamados.length > 0 && !esPrimeraCargaRef.current) {
        const turnoMasReciente = nuevosLlamados[0]; // Solo el primer turno nuevo

        // ✅ CRÍTICO: Solo anunciar si está en estado "Llamando", NO si ya está "Atendido"
        if (turnoMasReciente.estado === 'Llamando') {
          console.log('[PantallaEnhanced] 🔊 ANUNCIANDO turno más reciente:', turnoMasReciente.ticket, '- Estado:', turnoMasReciente.estado);
          setTimeout(() => {
            anunciarTurno(turnoMasReciente);
          }, 100);
        } else {
          console.log('[PantallaEnhanced] ⏭️ Turno nuevo pero ya está', turnoMasReciente.estado, '- NO anunciar:', turnoMasReciente.ticket);
        }
      } else if (esPrimeraCargaRef.current) {
        console.log('[PantallaEnhanced] 🔇 Primera carga - NO anunciar turnos del historial');
        esPrimeraCargaRef.current = false; // Marcar que ya no es la primera carga
      }

      // El backend ya devuelve el historial ordenado y limitado a 10 turnos
      console.log('[PantallaEnhanced] Historial recibido del backend:', data.length, 'turnos');
      setLlamados(data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMediaArchivos = async () => {
    try {
      const [files, config] = await Promise.all([
        MediaAPI.getActiveFiles(),
        MediaAPI.getConfig()
      ]);
      setMediaFiles(files);
      setMediaConfig(config);
    } catch (error) {
      console.error('Error cargando archivos multimedia:', error);
    }
  };

  const nextMedia = () => {
    if (mediaFiles.length > 0) {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaFiles.length);
    }
  };

  const prevMedia = () => {
    if (mediaFiles.length > 0) {
      setCurrentMediaIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentMedia = mediaFiles[currentMediaIndex];
  const displayInterval = mediaConfig?.mediaRotationInterval || 15000;

  // Efecto para inicializar las voces
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[PantallaEnhanced] Voces cargadas:', voices.length);
        voices.forEach((voice, index) => {
          console.log(`[PantallaEnhanced] Voz ${index}: ${voice.name} (${voice.lang})`);
        });
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Efecto para escuchar notificaciones de re-llamado via localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'turno-notification' && e.newValue) {
        try {
          const notificacion = JSON.parse(e.newValue);
          console.log('[PantallaEnhanced] Notificacion recibida:', notificacion);
          
          if (notificacion.accion === 'rellamar') {
            const { idTicket } = notificacion;
            
            const turnoRellamado = llamados.find(t => 
              String(t.ticket).toLowerCase().includes(String(idTicket).toLowerCase()) ||
              t.ticket === String(idTicket)
            );
            
            if (turnoRellamado) {
              const key = `${turnoRellamado.ticket}-${turnoRellamado.ventanilla}`;
              lastAnnouncedRef.current.delete(key);
              
              console.log('[PantallaEnhanced] Re-anunciando turno:', turnoRellamado.ticket);
              anunciarTurno(turnoRellamado);
            } else {
              console.log('[PantallaEnhanced] Turno no encontrado, actualizando...');
              cargarDatos();
            }
          }
        } catch (error) {
          console.error('[PantallaEnhanced] Error procesando notificacion:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [llamados]);

  useEffect(() => {
    // Cargar datos iniciales
    cargarDatos();
    cargarMediaArchivos();
    
    // Auto-refresh cada 5 segundos para mantener actualizado
    const interval = setInterval(cargarDatos, 5000);
    
    // Escuchar cambios de conectividad
    const handleOnline = () => {
      setIsOnline(true);
      cargarDatos();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efecto para rotación automática de multimedia
  useEffect(() => {
    if (mediaFiles.length > 0 && isPlaying) {
      if (mediaIntervalRef.current) {
        clearInterval(mediaIntervalRef.current);
      }

      const intervalId = window.setInterval(() => {
        nextMedia();
      }, displayInterval);

      mediaIntervalRef.current = intervalId;

      return () => {
        if (mediaIntervalRef.current) {
          clearInterval(mediaIntervalRef.current);
        }
      };
    }
  }, [mediaFiles.length, currentMediaIndex, isPlaying, displayInterval]);

  // Manejar finalización de videos
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && currentMedia?.type === 'video') {
      const handleEnded = () => {
        nextMedia();
      };
      videoElement.addEventListener('ended', handleEnded);
      return () => videoElement.removeEventListener('ended', handleEnded);
    }
  }, [currentMedia]);

  // Suscripción a SignalR para actualizaciones en tiempo real
  useEffect(() => {
    let hubClient: any = null;

    const connectSignalR = async () => {
      try {
        console.log('[PantallaEnhanced] 🔌 Conectando a SignalR...');
        const { createTurnosHubClient } = await import('../../realtime/turnosHub.client');

        hubClient = createTurnosHubClient({
          onTicketLlamado: (data) => {
            console.log('[PantallaEnhanced] 📞 Turno llamado via SignalR:', data);

            // Crear el nuevo turno con estado "Llamando"
            const nuevoTurno: TicketLlamadoDto = {
              ticket: data.codigo,
              servicio: data.servicio,
              ventanilla: data.ventanilla,
              hora: data.hora,
              horaTimestamp: new Date(data.hora).getTime(),
              estado: 'Llamando'
            };

            // Anunciar el turno inmediatamente
            anunciarTurno(nuevoTurno);

            // Actualizar la lista de turnos
            setLlamados(prevLlamados => {
              // Verificar si el turno ya existe
              const existe = prevLlamados.some(
                t => t.ticket === nuevoTurno.ticket && t.ventanilla === nuevoTurno.ventanilla
              );

              if (!existe) {
                // Agregar al inicio y mantener solo los últimos 6
                return [nuevoTurno, ...prevLlamados].slice(0, 6);
              }

              return prevLlamados;
            });
          },
          onTicketEstado: (data) => {
            console.log('[PantallaEnhanced] 🔄 Estado de ticket actualizado via SignalR:', data);

            // Si el ticket fue finalizado, actualizar su estado en la lista
            if (data.estado === 'Atendido' || data.estado === 'Finalizado') {
              setLlamados(prevLlamados =>
                prevLlamados.map(t =>
                  t.ticket === data.codigo
                    ? { ...t, estado: 'Atendido' }
                    : t
                )
              );
            }
          }
        });

        // Conectar y unirse al grupo de pantalla pública
        await hubClient.joinPantalla();
        console.log('[PantallaEnhanced] ✅ Conectado a SignalR');
      } catch (error) {
        console.error('[PantallaEnhanced] ❌ Error conectando a SignalR:', error);
      }
    };

    connectSignalR();

    return () => {
      if (hubClient) {
        console.log('[PantallaEnhanced] 🔌 Desconectando SignalR...');
        hubClient.stop().catch((err: any) =>
          console.error('[PantallaEnhanced] Error al detener SignalR:', err)
        );
      }
    };
  }, []); // Solo ejecutar una vez al montar

  // Actualizar hora cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatHora = (fechaStr: string | null | undefined) => {
    if (!fechaStr) return '--:--';

    // Si ya es un string de hora formateado (ej: "14:30"), devolverlo directamente
    if (/^\d{1,2}:\d{2}$/.test(fechaStr)) {
      return fechaStr;
    }

    // Si no, intentar parsearlo como fecha
    try {
      const fecha = new Date(fechaStr);
      if (isNaN(fecha.getTime())) {
        console.warn('[PantallaEnhanced] Fecha inválida:', fechaStr);
        return '--:--';
      }
      return fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('[PantallaEnhanced] Error parseando fecha:', error);
      return '--:--';
    }
  };

  return (
    <div className="pantalla-container">
      {/* Header */}
      <div className="pantalla-header">
        <div className="header-content">
          <h1>ALCALDÍA MUNICIPAL DE SONSONATE OESTE</h1>
          <p className="header-subtitle">Sistema de Gestión de Turnos</p>
          
          <div className="status-bar">
            <div className={`status-item ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>
            
            <div className="status-item">
              <Calendar size={20} />
              <span>{fechaActual}</span>
            </div>
            
            <div className="status-item">
              <Clock size={20} />
              <span>{horaActual}</span>
            </div>

            <button
              onClick={cargarDatos}
              className="status-item"
              style={{ cursor: 'pointer', background: 'var(--glass-bg)' }}
              disabled={loading}
            >
              <RefreshCw size={20} className={loading ? 'spinning' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="pantalla-content">
        {/* Panel de turnos */}
        <div className="turnos-panel">
          <h2 className="panel-title">TURNOS LLAMADOS</h2>

          {loading && llamados.length === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando turnos...</p>
            </div>
          ) : error && llamados.length === 0 ? (
            <div className="error-container">
              <Monitor className="error-icon" />
              <h3>Error de conexión</h3>
              <p>{error}</p>
            </div>
          ) : llamados.length === 0 ? (
            <div className="empty-container">
              <Monitor size={60} style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
              <h3>No hay turnos llamados</h3>
              <p>Los turnos aparecerán aquí cuando sean llamados</p>
            </div>
          ) : (
            <>
              {/* Solo el último turno llamando (el más reciente) se muestra grande */}
              {(() => {
                const turnoActual = llamados.find(t => t.estado === 'Llamando');

                if (turnoActual) {
                  return (
                    <div className="turno-card llamando">
                      <div className="turno-header">
                        <div className="turno-codigo">{turnoActual.ticket}</div>
                        <div className="turno-estado llamando">
                          LLAMANDO
                        </div>
                      </div>

                      <div className="turno-body">
                        <div className="turno-info">
                          <Monitor />
                          <span className="info-label">Servicio:</span>
                          <span className="info-value">{turnoActual.servicio || 'Sin especificar'}</span>
                        </div>

                        <div className="turno-info">
                          <Clock />
                          <span className="info-label">Hora llamado:</span>
                          <span className="info-value">{formatHora(turnoActual.hora)}</span>
                        </div>

                        <div className="ventanilla-badge">
                          {turnoActual.ventanilla.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Historial: todos los demás turnos (los que no son el primero "Llamando") */}
              {(() => {
                const turnoActual = llamados.find(t => t.estado === 'Llamando');
                const historial = llamados.filter(t =>
                  t !== turnoActual // Excluir el turno actual que se muestra en grande
                );

                if (historial.length > 0) {
                  return (
                    <div className="historial-section">
                      <h3 className="historial-title">Historial reciente</h3>
                      <div className="historial-grid">
                        {historial.map((turno, index) => (
                          <div
                            key={`hist-${turno.ticket}-${index}`}
                            className="turno-card-small atendido"
                          >
                            <div className="small-ticket">{turno.ticket}</div>
                            <div className="small-ventanilla">{turno.ventanilla}</div>
                            <div className="small-hora">{formatHora(turno.hora)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
        </div>

        {/* Panel multimedia */}
        <div className="media-panel">
          <h2 className="panel-title">INFORMACIÓN</h2>
          
          <div className="media-container">
            {mediaFiles.length === 0 ? (
              <div className="media-placeholder">
                <Image />
                <p>No hay contenido multimedia</p>
              </div>
            ) : currentMedia?.type === 'image' ? (
              <img
                src={getMediaUrl(currentMedia.url)}
                alt={currentMedia.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : currentMedia?.type === 'video' ? (
              <video
                ref={videoRef}
                src={getMediaUrl(currentMedia.url)}
                autoPlay
                muted
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : null}
          </div>

          {mediaFiles.length > 0 && (
            <div className="media-controls">
              <button onClick={prevMedia} className="media-btn" title="Anterior">
                <SkipBack />
              </button>
              <button onClick={togglePlayPause} className="media-btn" title={isPlaying ? 'Pausar' : 'Reproducir'}>
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button onClick={nextMedia} className="media-btn" title="Siguiente">
                <SkipForward />
              </button>
            </div>
          )}

          {mediaFiles.length > 0 && (
            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
              {currentMediaIndex + 1} / {mediaFiles.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
